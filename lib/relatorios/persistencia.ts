import { db } from '@/lib/db'

/**
 * O que o processamento de um relatório produz, guardado à parte da tabela `Report` (legado, sem
 * migração fácil): o texto por página, o digesto estruturado (em português e, a pedido, em
 * inglês) e o estado do processamento.
 */

export type EstadoRelatorio = 'pendente' | 'a_processar' | 'pronto' | 'erro' | 'digitalizado'

let tabelasGarantidas = false

async function garantirTabelas() {
  if (tabelasGarantidas) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS relatorio_paginas (
      report_id INT NOT NULL,
      pagina INT NOT NULL,
      texto MEDIUMTEXT NOT NULL,
      PRIMARY KEY (report_id, pagina)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  )
  await db.execute(
    `CREATE TABLE IF NOT EXISTS relatorio_digesto (
      report_id INT NOT NULL,
      idioma VARCHAR(2) NOT NULL DEFAULT 'pt',
      digesto LONGTEXT NOT NULL,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (report_id, idioma)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  )
  await db.execute(
    `CREATE TABLE IF NOT EXISTS relatorio_estado (
      report_id INT PRIMARY KEY,
      estado VARCHAR(16) NOT NULL DEFAULT 'pendente',
      mensagem VARCHAR(500) NULL,
      total_paginas INT NULL,
      actualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  )
  // O digesto é processado uma vez (o custo é por RELATÓRIO), mas VER o resultado é por PESSOA: a
  // primeira versão desta funcionalidade mostrava o resumo já pronto a qualquer visitante, e isso
  // era exactamente o oposto do que devia acontecer com uma funcionalidade paga — quem nunca pediu
  // nem pagou via o resumo de outra pessoa de graça. Esta tabela é a lista de quem já desbloqueou
  // cada relatório; gerar o digesto e dar acesso a ele são agora duas coisas separadas.
  await db.execute(
    `CREATE TABLE IF NOT EXISTS relatorio_acesso (
      report_id INT NOT NULL,
      utilizador_id BIGINT NOT NULL,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (report_id, utilizador_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  )
  // Auditoria de custos (painel /admin/custos-ia): um registo por CHAMADA à IA, não por relatório
  // — ao contrário do digesto (uma vez por relatório), "perguntar" pode acontecer muitas vezes por
  // pessoas diferentes, por isso é sempre um log a crescer, nunca uma linha a substituir.
  await db.execute(
    `CREATE TABLE IF NOT EXISTS relatorio_uso_ia (
      id INT AUTO_INCREMENT PRIMARY KEY,
      report_id INT NOT NULL,
      utilizador_id BIGINT NULL,
      tipo VARCHAR(20) NOT NULL,
      modelo VARCHAR(40) NOT NULL,
      tokens_entrada INT NOT NULL DEFAULT 0,
      tokens_saida INT NOT NULL DEFAULT 0,
      custo_usd DECIMAL(10,4) NOT NULL DEFAULT 0,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_uso_ia_report (report_id),
      KEY idx_uso_ia_utilizador (utilizador_id),
      KEY idx_uso_ia_criado (criado_em)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  )
  tabelasGarantidas = true
}

export type TipoUsoIaRelatorio = 'digesto' | 'perguntar' | 'traducao'

/** Chamada em cada ponto que gasta tokens de IA sobre um relatório — nunca descartar o custo
 *  calculado, é exactamente o que faltava para o painel de auditoria poder existir. */
export async function registarUsoIaRelatorio(dados: {
  reportId: number
  utilizadorId: number | null
  tipo: TipoUsoIaRelatorio
  modelo: string
  tokensEntrada: number
  tokensSaida: number
  custoUsd: number
}): Promise<void> {
  await garantirTabelas()
  await db.execute(
    `INSERT INTO relatorio_uso_ia
       (report_id, utilizador_id, tipo, modelo, tokens_entrada, tokens_saida, custo_usd)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      dados.reportId,
      dados.utilizadorId,
      dados.tipo,
      dados.modelo,
      dados.tokensEntrada,
      dados.tokensSaida,
      dados.custoUsd,
    ]
  )
}

export async function guardarPaginas(reportId: number, paginas: { pagina: number; texto: string }[]) {
  await garantirTabelas()
  await db.execute('DELETE FROM relatorio_paginas WHERE report_id = ?', [reportId])
  // Uma linha de cada vez: `mysql2` não tem um `INSERT ... VALUES (?), (?), (?)` genérico embutido
  // sem construir a query à mão, e um relatório tem no máximo algumas centenas de páginas, por
  // isso o custo de várias instruções pequenas é irrelevante face ao resto do processamento.
  for (const p of paginas) {
    await db.execute('INSERT INTO relatorio_paginas (report_id, pagina, texto) VALUES (?, ?, ?)', [
      reportId,
      p.pagina,
      p.texto,
    ])
  }
}

export async function obterPaginas(reportId: number): Promise<{ pagina: number; texto: string }[]> {
  await garantirTabelas()
  const [linhas] = (await db.execute(
    'SELECT pagina, texto FROM relatorio_paginas WHERE report_id = ? ORDER BY pagina ASC',
    [reportId]
  )) as [any[], unknown]
  return linhas.map((l) => ({ pagina: Number(l.pagina), texto: String(l.texto || '') }))
}

export async function guardarDigesto(reportId: number, idioma: 'pt' | 'en', digesto: unknown) {
  await garantirTabelas()
  await db.execute(
    `INSERT INTO relatorio_digesto (report_id, idioma, digesto) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE digesto = VALUES(digesto), criado_em = NOW()`,
    [reportId, idioma, JSON.stringify(digesto)]
  )
}

export async function obterDigesto(reportId: number, idioma: 'pt' | 'en'): Promise<any | null> {
  await garantirTabelas()
  const [linhas] = (await db.execute(
    'SELECT digesto FROM relatorio_digesto WHERE report_id = ? AND idioma = ? LIMIT 1',
    [reportId, idioma]
  )) as [any[], unknown]
  const bruto = linhas[0]?.digesto
  if (!bruto) return null
  try {
    return typeof bruto === 'string' ? JSON.parse(bruto) : bruto
  } catch {
    return null
  }
}

export async function definirEstado(
  reportId: number,
  estado: EstadoRelatorio,
  extra?: { mensagem?: string; totalPaginas?: number }
) {
  await garantirTabelas()
  await db.execute(
    `INSERT INTO relatorio_estado (report_id, estado, mensagem, total_paginas)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE estado = VALUES(estado), mensagem = VALUES(mensagem),
       total_paginas = COALESCE(VALUES(total_paginas), total_paginas)`,
    [reportId, estado, extra?.mensagem ?? null, extra?.totalPaginas ?? null]
  )
}

export async function obterEstado(
  reportId: number
): Promise<{
  estado: EstadoRelatorio
  mensagem: string | null
  totalPaginas: number | null
  actualizadoEm: Date
} | null> {
  await garantirTabelas()
  const [linhas] = (await db.execute(
    'SELECT estado, mensagem, total_paginas, actualizado_em FROM relatorio_estado WHERE report_id = ? LIMIT 1',
    [reportId]
  )) as [any[], unknown]
  if (!linhas[0]) return null
  return {
    estado: linhas[0].estado as EstadoRelatorio,
    mensagem: linhas[0].mensagem ? String(linhas[0].mensagem) : null,
    totalPaginas: linhas[0].total_paginas != null ? Number(linhas[0].total_paginas) : null,
    actualizadoEm: new Date(linhas[0].actualizado_em),
  }
}

/** Quantos relatórios já têm um resumo pronto. Um número real, para o dizer na página de
 *  relatórios sem inventar uma estatística de propósito. */
export async function contarProcessados(): Promise<number> {
  await garantirTabelas()
  const [linhas] = (await db.execute("SELECT COUNT(*) AS n FROM relatorio_estado WHERE estado = 'pronto'")) as [
    any[],
    unknown,
  ]
  return Number(linhas[0]?.n ?? 0)
}

/** Regista que esta pessoa pode ver o resumo deste relatório. Chamado sempre que alguém pede a
 *  análise, mesmo quando o resultado já existia e foi só reaproveitado. */
export async function concederAcesso(reportId: number, utilizadorId: number): Promise<void> {
  await garantirTabelas()
  await db.execute(
    `INSERT INTO relatorio_acesso (report_id, utilizador_id) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE report_id = report_id`,
    [reportId, utilizadorId]
  )
}

export async function temAcesso(reportId: number, utilizadorId: number): Promise<boolean> {
  await garantirTabelas()
  const [linhas] = (await db.execute(
    'SELECT 1 FROM relatorio_acesso WHERE report_id = ? AND utilizador_id = ? LIMIT 1',
    [reportId, utilizadorId]
  )) as [any[], unknown]
  return linhas.length > 0
}

export type UsoRelatorio = {
  reportId: number
  titulo: string
  nUtilizadores: number
  ultimoAcesso: string | null
}

/** Quantas pessoas distintas já desbloquearam cada relatório, e quando foi a última vez — para a
 *  vistoria de uso no admin. `LEFT JOIN` de propósito: um relatório nunca pedido continua a
 *  aparecer com 0, que é exactamente o que um admin quer ver ("isto nunca foi usado"), não some
 *  da lista por falta de linhas em `relatorio_acesso`. A chave primária composta da tabela
 *  (report_id, utilizador_id) já garante que cada pessoa só conta uma vez por relatório. */
export async function listarUsoRelatorios(): Promise<UsoRelatorio[]> {
  await garantirTabelas()
  const [linhas] = (await db.execute(
    `SELECT r.id AS reportId, r.title AS titulo,
            COUNT(ra.utilizador_id) AS nUtilizadores,
            MAX(ra.criado_em) AS ultimoAcesso
     FROM Report r
     LEFT JOIN relatorio_acesso ra ON ra.report_id = r.id
     GROUP BY r.id, r.title
     ORDER BY nUtilizadores DESC, r.title ASC`
  )) as [any[], unknown]
  return linhas.map((l) => ({
    reportId: Number(l.reportId),
    titulo: String(l.titulo),
    nUtilizadores: Number(l.nUtilizadores),
    ultimoAcesso: l.ultimoAcesso ? new Date(l.ultimoAcesso).toISOString() : null,
  }))
}

export type AcessoRelatorio = { nome: string; email: string; criadoEm: string }

/** Quem, exactamente, desbloqueou este relatório — a lista por trás do número em
 *  `listarUsoRelatorios`, pedida só quando um admin abre um relatório específico na vistoria. */
export async function listarAcessosDoRelatorio(reportId: number): Promise<AcessoRelatorio[]> {
  await garantirTabelas()
  const [linhas] = (await db.execute(
    `SELECT u.name AS nome, u.email AS email, ra.criado_em AS criadoEm
     FROM relatorio_acesso ra
     INNER JOIN users u ON u.id = ra.utilizador_id
     WHERE ra.report_id = ?
     ORDER BY ra.criado_em DESC`,
    [reportId]
  )) as [any[], unknown]
  return linhas.map((l) => ({
    nome: String(l.nome || l.email),
    email: String(l.email),
    criadoEm: new Date(l.criadoEm).toISOString(),
  }))
}

export type EstatisticasCustoRelatorios = {
  totais: {
    nChamadas: number
    custoTotalUsd: number
    custoMedioUsd: number
    /** Custo médio por RELATÓRIO (soma das chamadas desse relatório), não por chamada: um digesto
     *  mais várias perguntas sobre o mesmo relatório contam como um só relatório aqui. */
    custoMedioPorRelatorioUsd: number
    nRelatoriosDistintos: number
    tokensEntrada: number
    tokensSaida: number
  }
  porTipo: { tipo: TipoUsoIaRelatorio; nChamadas: number; custoTotalUsd: number }[]
  porRelatorio: {
    reportId: number
    titulo: string
    nChamadas: number
    custoTotalUsd: number
  }[]
  recentes: {
    id: number
    reportId: number
    titulo: string
    tipo: TipoUsoIaRelatorio
    modelo: string
    nome: string | null
    email: string | null
    custoUsd: number
    tokensEntrada: number
    tokensSaida: number
    criadoEm: string
  }[]
}

/** O equivalente, para relatórios, de `obterEstatisticasCustoAnalises`: quanto cada digesto,
 *  pergunta ou tradução gasta de facto, para a mesma decisão de "quanto cobrar". Ao contrário das
 *  análises (uma linha por análise), aqui é um log a crescer — `listarUsoRelatorios` já mostra
 *  QUEM desbloqueou cada relatório; isto mostra quanto cada acção de IA sobre ele custou. */
export async function obterEstatisticasCustoRelatorios(
  desde: Date | null = null
): Promise<EstatisticasCustoRelatorios> {
  await garantirTabelas()
  const filtroPeriodo = desde ? 'AND criado_em >= ?' : ''
  const paramsPeriodo = desde ? [desde] : []

  const [totaisRows] = (await db.execute(
    `SELECT COUNT(*) as nChamadas, COALESCE(SUM(custo_usd), 0) as custoTotalUsd,
       COALESCE(AVG(custo_usd), 0) as custoMedioUsd,
       COALESCE(SUM(tokens_entrada), 0) as tokensEntrada, COALESCE(SUM(tokens_saida), 0) as tokensSaida
     FROM relatorio_uso_ia WHERE 1=1 ${filtroPeriodo}`,
    paramsPeriodo
  )) as [any[], unknown]

  // Média por RELATÓRIO, não por chamada: agrega primeiro por report_id, só depois tira a média.
  const [porRelatorioMediaRows] = (await db.execute(
    `SELECT COUNT(*) as nRelatoriosDistintos, COALESCE(AVG(totalPorRelatorio), 0) as custoMedioPorRelatorioUsd
     FROM (
       SELECT report_id, SUM(custo_usd) as totalPorRelatorio
       FROM relatorio_uso_ia
       WHERE 1=1 ${filtroPeriodo}
       GROUP BY report_id
     ) t`,
    paramsPeriodo
  )) as [any[], unknown]

  const [porTipoRows] = (await db.execute(
    `SELECT tipo, COUNT(*) as nChamadas, COALESCE(SUM(custo_usd), 0) as custoTotalUsd
     FROM relatorio_uso_ia WHERE 1=1 ${filtroPeriodo} GROUP BY tipo ORDER BY custoTotalUsd DESC`,
    paramsPeriodo
  )) as [any[], unknown]

  const [porRelatorioRows] = (await db.execute(
    `SELECT ui.report_id as reportId, r.title as titulo,
       COUNT(*) as nChamadas, COALESCE(SUM(ui.custo_usd), 0) as custoTotalUsd
     FROM relatorio_uso_ia ui
     LEFT JOIN Report r ON r.id = ui.report_id
     WHERE 1=1 ${filtroPeriodo}
     GROUP BY ui.report_id, r.title
     ORDER BY custoTotalUsd DESC
     LIMIT 50`,
    paramsPeriodo
  )) as [any[], unknown]

  const [recentesListaRows] = (await db.execute(
    `SELECT ui.id, ui.report_id as reportId, r.title as titulo, ui.tipo, ui.modelo,
       u.name as nome, u.email as email,
       ui.custo_usd as custoUsd, ui.tokens_entrada as tokensEntrada, ui.tokens_saida as tokensSaida,
       ui.criado_em as criadoEm
     FROM relatorio_uso_ia ui
     LEFT JOIN Report r ON r.id = ui.report_id
     LEFT JOIN users u ON u.id = ui.utilizador_id
     WHERE 1=1 ${filtroPeriodo}
     ORDER BY ui.criado_em DESC
     LIMIT 50`,
    paramsPeriodo
  )) as [any[], unknown]

  const t = totaisRows[0] || {}
  const pr = porRelatorioMediaRows[0] || {}

  return {
    totais: {
      nChamadas: Number(t.nChamadas) || 0,
      custoTotalUsd: Number(t.custoTotalUsd) || 0,
      custoMedioUsd: Number(t.custoMedioUsd) || 0,
      custoMedioPorRelatorioUsd: Number(pr.custoMedioPorRelatorioUsd) || 0,
      nRelatoriosDistintos: Number(pr.nRelatoriosDistintos) || 0,
      tokensEntrada: Number(t.tokensEntrada) || 0,
      tokensSaida: Number(t.tokensSaida) || 0,
    },
    porTipo: porTipoRows.map((row: any) => ({
      tipo: row.tipo,
      nChamadas: Number(row.nChamadas) || 0,
      custoTotalUsd: Number(row.custoTotalUsd) || 0,
    })),
    porRelatorio: porRelatorioRows.map((row: any) => ({
      reportId: row.reportId,
      titulo: row.titulo || `Relatório #${row.reportId}`,
      nChamadas: Number(row.nChamadas) || 0,
      custoTotalUsd: Number(row.custoTotalUsd) || 0,
    })),
    recentes: recentesListaRows.map((row: any) => ({
      id: row.id,
      reportId: row.reportId,
      titulo: row.titulo || `Relatório #${row.reportId}`,
      tipo: row.tipo,
      modelo: row.modelo,
      nome: row.nome,
      email: row.email,
      custoUsd: Number(row.custoUsd) || 0,
      tokensEntrada: row.tokensEntrada,
      tokensSaida: row.tokensSaida,
      criadoEm: row.criadoEm,
    })),
  }
}
