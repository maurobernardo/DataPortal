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
  tabelasGarantidas = true
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
): Promise<{ estado: EstadoRelatorio; mensagem: string | null; totalPaginas: number | null } | null> {
  await garantirTabelas()
  const [linhas] = (await db.execute(
    'SELECT estado, mensagem, total_paginas FROM relatorio_estado WHERE report_id = ? LIMIT 1',
    [reportId]
  )) as [any[], unknown]
  if (!linhas[0]) return null
  return {
    estado: linhas[0].estado as EstadoRelatorio,
    mensagem: linhas[0].mensagem ? String(linhas[0].mensagem) : null,
    totalPaginas: linhas[0].total_paginas != null ? Number(linhas[0].total_paginas) : null,
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
