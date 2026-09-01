import { db } from './db'

const ROTULOS_EVENTO: Record<string, string> = {
  vista_dataset: 'Vista de dataset',
  download: 'Download',
  vista_mapa: 'Vista de mapa',
  pedido_mapa: 'Pedido de mapa',
  pedido_relatorio: 'Pedido de relatório',
  analise_ia: 'Análise de IA',
  contacto: 'Contacto',
}

export type ResumoOrigem = {
  totalEventos: number
  totalPaises: number
  paisPrincipal: { pais: string; total: number } | null
  porPais: { pais: string; total: number }[]
  porProvinciaMZ: { regiao: string; total: number }[]
  /** Acessos de Moçambique sem província identificada pelo IP — comum em redes móveis
   *  (Vodacom/Movitel/Tmcel), onde a base de geolocalização só sabe o país, não a província. Não
   *  é um acesso perdido: conta no total, só não aparece na repartição por província. */
  mzSemProvincia: number
  porTipoEvento: { tipoEvento: string; rotulo: string; total: number }[]
  recentes: { tipoEvento: string; rotulo: string; pais: string | null; regiao: string | null; cidade: string | null; criadoEm: string }[]
}

/** Resumo para /admin/origem-utilizadores — best-effort: se a tabela ainda não existir (migração
 *  por correr) devolve tudo a zero em vez de rebentar a página. */
export async function obterResumoOrigem(dias = 90): Promise<ResumoOrigem> {
  const vazio: ResumoOrigem = {
    totalEventos: 0,
    totalPaises: 0,
    paisPrincipal: null,
    porPais: [],
    porProvinciaMZ: [],
    mzSemProvincia: 0,
    porTipoEvento: [],
    recentes: [],
  }

  try {
    const [totalRows] = (await db.execute(
      `SELECT COUNT(*) AS total, COUNT(DISTINCT pais) AS paises
       FROM AcessoOrigem WHERE criado_em >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [dias]
    )) as [any[], unknown]

    const [porPaisRows] = (await db.execute(
      `SELECT pais, COUNT(*) AS total FROM AcessoOrigem
       WHERE criado_em >= DATE_SUB(NOW(), INTERVAL ? DAY) AND pais IS NOT NULL
       GROUP BY pais ORDER BY total DESC LIMIT 30`,
      [dias]
    )) as [any[], unknown]

    const [porProvinciaRows] = (await db.execute(
      `SELECT regiao, COUNT(*) AS total FROM AcessoOrigem
       WHERE criado_em >= DATE_SUB(NOW(), INTERVAL ? DAY) AND pais = 'MZ' AND regiao IS NOT NULL
       GROUP BY regiao ORDER BY total DESC LIMIT 20`,
      [dias]
    )) as [any[], unknown]

    const [mzSemProvinciaRows] = (await db.execute(
      `SELECT COUNT(*) AS total FROM AcessoOrigem
       WHERE criado_em >= DATE_SUB(NOW(), INTERVAL ? DAY) AND pais = 'MZ' AND regiao IS NULL`,
      [dias]
    )) as [any[], unknown]

    const [porTipoRows] = (await db.execute(
      `SELECT tipo_evento, COUNT(*) AS total FROM AcessoOrigem
       WHERE criado_em >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY tipo_evento ORDER BY total DESC`,
      [dias]
    )) as [any[], unknown]

    const [recentesRows] = (await db.execute(
      `SELECT tipo_evento, pais, regiao, cidade, criado_em FROM AcessoOrigem
       ORDER BY criado_em DESC LIMIT 30`
    )) as [any[], unknown]

    return {
      totalEventos: Number(totalRows[0]?.total ?? 0),
      totalPaises: Number(totalRows[0]?.paises ?? 0),
      paisPrincipal: porPaisRows[0] ? { pais: porPaisRows[0].pais, total: Number(porPaisRows[0].total) } : null,
      porPais: porPaisRows.map((r: any) => ({ pais: r.pais, total: Number(r.total) })),
      porProvinciaMZ: porProvinciaRows.map((r: any) => ({ regiao: r.regiao, total: Number(r.total) })),
      mzSemProvincia: Number(mzSemProvinciaRows[0]?.total ?? 0),
      porTipoEvento: porTipoRows.map((r: any) => ({
        tipoEvento: r.tipo_evento,
        rotulo: ROTULOS_EVENTO[r.tipo_evento] || r.tipo_evento,
        total: Number(r.total),
      })),
      recentes: recentesRows.map((r: any) => ({
        tipoEvento: r.tipo_evento,
        rotulo: ROTULOS_EVENTO[r.tipo_evento] || r.tipo_evento,
        pais: r.pais,
        regiao: r.regiao,
        cidade: r.cidade,
        criadoEm: r.criado_em,
      })),
    }
  } catch {
    return vazio
  }
}
