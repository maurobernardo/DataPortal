import { db } from '@/lib/db'

/**
 * Resultados da detecção de contradições entre datasets alfanuméricos (ver detectar-contradicoes.ts
 * para a lógica em si — isto é só o armazenamento).
 *
 * Um par de datasets pode ter mais do que uma coluna comparável (ex.: "população total" E "área"),
 * e cada coluna comparável produz uma linha por geografia/período em comum. Por isso a chave de
 * substituição ao reprocessar um par é (par de datasets, par de colunas) — reprocessar apaga só as
 * linhas dessa combinação e volta a inserir, nunca acumula duplicados nem mistura resultados de
 * colunas diferentes.
 */

let tabelasGarantidas = false

async function garantirTabelas() {
  if (tabelasGarantidas) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS dataset_contradicao (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dataset_a_id INT NOT NULL,
      dataset_b_id INT NOT NULL,
      coluna_a VARCHAR(190) NOT NULL,
      coluna_b VARCHAR(190) NOT NULL,
      geografia VARCHAR(190) NOT NULL,
      periodo INT NULL,
      valor_a DOUBLE NOT NULL,
      valor_b DOUBLE NOT NULL,
      estado VARCHAR(12) NOT NULL,
      diferenca_relativa_pct DOUBLE NULL,
      detectado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_dataset_a (dataset_a_id),
      INDEX idx_dataset_b (dataset_b_id),
      INDEX idx_par (dataset_a_id, dataset_b_id, coluna_a, coluna_b)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  )
  // Quando um par de datasets (e um par de colunas dentro dele) já foi comparado, e quando: para o
  // lote periódico avançar pelo catálogo todo em vez de tentar sempre os mesmos pares primeiro.
  await db.execute(
    `CREATE TABLE IF NOT EXISTS dataset_par_verificado (
      dataset_a_id INT NOT NULL,
      dataset_b_id INT NOT NULL,
      coluna_a VARCHAR(190) NOT NULL,
      coluna_b VARCHAR(190) NOT NULL,
      verificado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (dataset_a_id, dataset_b_id, coluna_a, coluna_b)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  )
  tabelasGarantidas = true
}

export type EstadoContradicao = 'confirma' | 'diverge'

export type RegistoContradicao = {
  datasetAId: number
  datasetBId: number
  colunaA: string
  colunaB: string
  geografia: string
  periodo: number | null
  valorA: number
  valorB: number
  estado: EstadoContradicao
  diferencaRelativaPct: number | null
}

/**
 * Substitui os resultados de UM par de colunas entre dois datasets: apaga o que lá estava para essa
 * combinação exacta e insere os novos. Sempre `datasetAId < datasetBId` do lado de fora, para um
 * par nunca ficar guardado duas vezes trocado (A,B) e (B,A).
 */
export async function guardarResultadosDoPar(
  datasetAId: number,
  datasetBId: number,
  colunaA: string,
  colunaB: string,
  registos: RegistoContradicao[]
): Promise<void> {
  await garantirTabelas()
  await db.execute(
    `DELETE FROM dataset_contradicao WHERE dataset_a_id = ? AND dataset_b_id = ? AND coluna_a = ? AND coluna_b = ?`,
    [datasetAId, datasetBId, colunaA, colunaB]
  )
  for (const r of registos) {
    await db.execute(
      `INSERT INTO dataset_contradicao
        (dataset_a_id, dataset_b_id, coluna_a, coluna_b, geografia, periodo, valor_a, valor_b, estado, diferenca_relativa_pct)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.datasetAId,
        r.datasetBId,
        r.colunaA,
        r.colunaB,
        r.geografia,
        r.periodo,
        r.valorA,
        r.valorB,
        r.estado,
        r.diferencaRelativaPct,
      ]
    )
  }
  await db.execute(
    `INSERT INTO dataset_par_verificado (dataset_a_id, dataset_b_id, coluna_a, coluna_b)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE verificado_em = CURRENT_TIMESTAMP`,
    [datasetAId, datasetBId, colunaA, colunaB]
  )
}

/** Todas as linhas guardadas para um dataset (dos dois lados do par), mais recentes primeiro. */
export async function listarContradicoesDoDataset(datasetId: number): Promise<
  (RegistoContradicao & { outroDatasetId: number })[]
> {
  await garantirTabelas()
  const [linhas] = (await db.execute(
    `SELECT dataset_a_id, dataset_b_id, coluna_a, coluna_b, geografia, periodo, valor_a, valor_b, estado, diferenca_relativa_pct
     FROM dataset_contradicao
     WHERE dataset_a_id = ? OR dataset_b_id = ?
     ORDER BY detectado_em DESC
     LIMIT 200`,
    [datasetId, datasetId]
  )) as [any[], unknown]
  return linhas.map((l) => ({
    datasetAId: l.dataset_a_id,
    datasetBId: l.dataset_b_id,
    colunaA: l.coluna_a,
    colunaB: l.coluna_b,
    geografia: l.geografia,
    periodo: l.periodo,
    valorA: Number(l.valor_a),
    valorB: Number(l.valor_b),
    estado: l.estado,
    diferencaRelativaPct: l.diferenca_relativa_pct === null ? null : Number(l.diferenca_relativa_pct),
    outroDatasetId: l.dataset_a_id === datasetId ? l.dataset_b_id : l.dataset_a_id,
  }))
}

/** Todas as contradições do catálogo (não de um dataset só), com o título dos dois datasets já
 *  juntos, para a página dedicada em /admin/qualidade-dados. */
export async function listarTodasContradicoes(limite = 300): Promise<
  (RegistoContradicao & { datasetATitulo: string; datasetBTitulo: string })[]
> {
  await garantirTabelas()
  const [linhas] = (await db.execute(
    `SELECT c.dataset_a_id, c.dataset_b_id, c.coluna_a, c.coluna_b, c.geografia, c.periodo,
            c.valor_a, c.valor_b, c.estado, c.diferenca_relativa_pct,
            da.title AS dataset_a_titulo, db_.title AS dataset_b_titulo
     FROM dataset_contradicao c
     LEFT JOIN Dataset da ON da.id = c.dataset_a_id
     LEFT JOIN Dataset db_ ON db_.id = c.dataset_b_id
     ORDER BY c.detectado_em DESC
     LIMIT ?`,
    [limite]
  )) as [any[], unknown]
  return linhas.map((l) => ({
    datasetAId: l.dataset_a_id,
    datasetBId: l.dataset_b_id,
    colunaA: l.coluna_a,
    colunaB: l.coluna_b,
    geografia: l.geografia,
    periodo: l.periodo,
    valorA: Number(l.valor_a),
    valorB: Number(l.valor_b),
    estado: l.estado,
    diferencaRelativaPct: l.diferenca_relativa_pct === null ? null : Number(l.diferenca_relativa_pct),
    datasetATitulo: l.dataset_a_titulo || `Dataset #${l.dataset_a_id}`,
    datasetBTitulo: l.dataset_b_titulo || `Dataset #${l.dataset_b_id}`,
  }))
}

/** Pares (dataset, dataset, coluna, coluna) ainda por verificar, ou verificados há mais tempo,
 *  para o lote periódico avançar pelo catálogo inteiro ao longo de várias corridas, e voltar a
 *  verificar pares antigos quando já não sobrarem novos (um dataset actualizado pode passar a
 *  divergir de outro que antes confirmava). */
export async function ultimaVerificacaoPorPar(): Promise<Map<string, Date>> {
  await garantirTabelas()
  const [linhas] = (await db.execute(
    `SELECT dataset_a_id, dataset_b_id, coluna_a, coluna_b, verificado_em FROM dataset_par_verificado`
  )) as [any[], unknown]
  const mapa = new Map<string, Date>()
  for (const l of linhas) {
    mapa.set(`${l.dataset_a_id}:${l.dataset_b_id}:${l.coluna_a}:${l.coluna_b}`, new Date(l.verificado_em))
  }
  return mapa
}
