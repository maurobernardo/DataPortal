import { db } from '@/lib/db'

/**
 * Resultados da detecção de anomalias DENTRO de um único dataset (ver detectar-anomalias.ts) —
 * diferente de dataset_contradicao (que compara DOIS datasets): aqui o sinal vem só dos próprios
 * dados do dataset, contra si mesmo.
 */

let tabelasGarantidas = false

async function garantirTabelas() {
  if (tabelasGarantidas) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS dataset_anomalia (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dataset_id INT NOT NULL,
      coluna VARCHAR(190) NOT NULL,
      geografia VARCHAR(190) NOT NULL,
      periodo INT NULL,
      valor DOUBLE NOT NULL,
      tipo VARCHAR(20) NOT NULL,
      detalhe VARCHAR(300) NOT NULL,
      detectado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_dataset (dataset_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  )
  await db.execute(
    `CREATE TABLE IF NOT EXISTS dataset_anomalia_verificado (
      dataset_id INT PRIMARY KEY,
      verificado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  )
  tabelasGarantidas = true
}

export type TipoAnomalia = 'outlier_transversal' | 'salto_temporal'

export type RegistoAnomalia = {
  coluna: string
  geografia: string
  periodo: number | null
  valor: number
  tipo: TipoAnomalia
  detalhe: string
}

/** Substitui TODAS as anomalias guardadas deste dataset pelas novas — um dataset processado de
 *  novo já não tem as anomalias antigas por definição (ou continuam a aparecer, e são reinseridas
 *  na mesma). */
export async function guardarAnomaliasDoDataset(datasetId: number, registos: RegistoAnomalia[]): Promise<void> {
  await garantirTabelas()
  await db.execute(`DELETE FROM dataset_anomalia WHERE dataset_id = ?`, [datasetId])
  for (const r of registos) {
    await db.execute(
      `INSERT INTO dataset_anomalia (dataset_id, coluna, geografia, periodo, valor, tipo, detalhe)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [datasetId, r.coluna, r.geografia, r.periodo, r.valor, r.tipo, r.detalhe]
    )
  }
  await db.execute(
    `INSERT INTO dataset_anomalia_verificado (dataset_id) VALUES (?)
     ON DUPLICATE KEY UPDATE verificado_em = CURRENT_TIMESTAMP`,
    [datasetId]
  )
}

export async function listarAnomaliasDoDataset(datasetId: number): Promise<RegistoAnomalia[]> {
  await garantirTabelas()
  const [linhas] = (await db.execute(
    `SELECT coluna, geografia, periodo, valor, tipo, detalhe FROM dataset_anomalia
     WHERE dataset_id = ? ORDER BY detectado_em DESC LIMIT 100`,
    [datasetId]
  )) as [any[], unknown]
  return linhas.map((l) => ({
    coluna: l.coluna,
    geografia: l.geografia,
    periodo: l.periodo,
    valor: Number(l.valor),
    tipo: l.tipo,
    detalhe: l.detalhe,
  }))
}

/** Todas as anomalias do catálogo (não de um dataset só), com o título do dataset já junto, para
 *  a página dedicada em /admin/qualidade-dados. */
export async function listarTodasAnomalias(limite = 300): Promise<(RegistoAnomalia & { datasetId: number; datasetTitulo: string })[]> {
  await garantirTabelas()
  const [linhas] = (await db.execute(
    `SELECT a.dataset_id, a.coluna, a.geografia, a.periodo, a.valor, a.tipo, a.detalhe, d.title AS dataset_titulo
     FROM dataset_anomalia a
     LEFT JOIN Dataset d ON d.id = a.dataset_id
     ORDER BY a.detectado_em DESC
     LIMIT ?`,
    [limite]
  )) as [any[], unknown]
  return linhas.map((l) => ({
    datasetId: l.dataset_id,
    coluna: l.coluna,
    geografia: l.geografia,
    periodo: l.periodo,
    valor: Number(l.valor),
    tipo: l.tipo,
    detalhe: l.detalhe,
    datasetTitulo: l.dataset_titulo || `Dataset #${l.dataset_id}`,
  }))
}

/** IDs dos datasets alfanuméricos ainda por verificar, ou verificados há mais tempo, para o lote
 *  periódico avançar pelo catálogo inteiro (mesmo desenho do dataset_par_verificado). */
export async function datasetsAlfanumericosPorAntiguidade(limite: number): Promise<number[]> {
  await garantirTabelas()
  const [linhas] = (await db.execute(
    `SELECT d.id
     FROM Dataset d
     LEFT JOIN dataset_anomalia_verificado v ON v.dataset_id = d.id
     WHERE d.dataType = 'alfanumerico'
     ORDER BY v.verificado_em IS NOT NULL, v.verificado_em ASC
     LIMIT ?`,
    [limite]
  )) as [any[], unknown]
  return linhas.map((l) => Number(l.id))
}
