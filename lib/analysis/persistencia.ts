import { db } from '@/lib/db'
import type { ResultadoPipeline } from './pipeline'
import type { EstadoAnalise } from './types'
import { compor } from './compositor'

/**
 * Persistência de análises (R11: toda a análise é reproduzível).
 *
 * Guarda-se o plano, os resultados brutos e os passos executados, não apenas o texto final:
 * sem isso não seria possível reproduzir nem auditar de onde veio cada número.
 */

export async function criarAnalise(
  id: string,
  pergunta: string,
  datasetIds: number[],
  utilizadorId: number | null
): Promise<void> {
  await db.execute(
    `INSERT INTO analises (id, utilizador_id, pergunta, datasets_ids, estado)
     VALUES (?, ?, ?, ?, 'planeando')`,
    [id, utilizadorId, pergunta, JSON.stringify(datasetIds)]
  )
}

export async function actualizarEstado(id: string, estado: EstadoAnalise): Promise<void> {
  await db.execute('UPDATE analises SET estado = ? WHERE id = ?', [estado, id])
}

export async function guardarResultado(r: ResultadoPipeline): Promise<void> {
  const { contexto } = r

  // R5: a ordem dos blocos varia com o arquétipo, calculada aqui porque é o único ponto que já
  // sabe simultaneamente o arquétipo (da Compreensão) e o que a análise realmente produziu (há
  // mapa? há gráficos?) — sem isso o compositor arriscaria prometer um bloco vazio.
  const dashboardSpec = compor(r.compreensao.arquetipo_sugerido, {
    mapa: contexto.series.length > 0 || contexto.destaques.length > 0 || contexto.camadasBrutas.length > 0,
    graficos: contexto.graficos.length > 0,
  })

  await db.execute(
    `UPDATE analises SET
       arquetipo = ?, estado = ?, plano = ?, resultados = ?, achados = ?,
       narrativa = ?, dashboard_spec = ?, fontes = ?, confianca = ?, custo_usd = ?, duracao_ms = ?
     WHERE id = ?`,
    [
      r.compreensao.arquetipo_sugerido,
      r.critica.bloqueia_publicacao ? 'erro' : 'pronto',
      JSON.stringify(r.plano),
      JSON.stringify({
        calcs: contexto.calcs,
        series: contexto.series,
        graficos: contexto.graficos,
        destaques: contexto.destaques,
        camadasBrutas: contexto.camadasBrutas,
        avisos: contexto.avisos,
        qualidade: contexto.qualidade,
        codigoExecutado: contexto.codigoExecutado,
      }),
      JSON.stringify(r.achados),
      JSON.stringify({
        bruta: r.narrativa,
        resolvida: r.narrativa_resolvida,
        critica: r.critica,
      }),
      JSON.stringify(dashboardSpec),
      JSON.stringify(r.narrativa.fontes),
      r.suficiencia.confianca_sem_enriquecimento,
      r.custo_usd,
      r.duracao_ms,
      r.analise_id,
    ]
  )

  // Um registo por passo: é o que permite responder a "de onde veio este número" sem reexecutar.
  for (const passo of r.plano.passos) {
    const calcsDoPasso = Object.values(contexto.calcs).filter((c) => c.passo_id === passo.id)
    await db.execute(
      `INSERT INTO analise_execucoes (analise_id, passo, codigo, resultado, erro)
       VALUES (?, ?, ?, ?, ?)`,
      [
        r.analise_id,
        passo.id,
        `${passo.metodo}(${JSON.stringify((passo as any).coluna_metrica ?? null)})`,
        JSON.stringify(calcsDoPasso),
        calcsDoPasso.length === 0 ? 'Passo não produziu cálculos' : null,
      ]
    )
  }
}

export async function registarErro(id: string, mensagem: string): Promise<void> {
  await db.execute('UPDATE analises SET estado = ?, narrativa = ? WHERE id = ?', [
    'erro',
    JSON.stringify({ erro: mensagem }),
    id,
  ])
}

export type AnaliseGuardada = {
  id: string
  pergunta: string
  datasets_ids: number[]
  arquetipo: string | null
  estado: EstadoAnalise
  plano: any
  resultados: any
  achados: any
  narrativa: any
  dashboard_spec: import('./compositor').DashboardSpec | null
  confianca: number | null
  custo_usd: number | null
  duracao_ms: number | null
  publico: boolean
  guardado: boolean
  criado_em: string
  utilizador_id: number | null
}

/** MariaDB devolve colunas JSON como string; MySQL 8 devolve já desserializado. */
function comoJson<T>(valor: unknown, porDefeito: T): T {
  if (valor == null) return porDefeito
  if (typeof valor === 'string') {
    try {
      return JSON.parse(valor) as T
    } catch {
      return porDefeito
    }
  }
  return valor as T
}

export async function obterAnalise(id: string): Promise<AnaliseGuardada | null> {
  const [rows] = (await db.execute('SELECT * FROM analises WHERE id = ? LIMIT 1', [id])) as [
    any[],
    unknown,
  ]
  const r = rows[0]
  if (!r) return null

  return {
    id: r.id,
    pergunta: r.pergunta,
    datasets_ids: comoJson<number[]>(r.datasets_ids, []),
    arquetipo: r.arquetipo,
    estado: r.estado,
    plano: comoJson(r.plano, null),
    resultados: comoJson(r.resultados, null),
    achados: comoJson(r.achados, []),
    narrativa: comoJson(r.narrativa, null),
    dashboard_spec: comoJson(r.dashboard_spec, null),
    confianca: r.confianca != null ? Number(r.confianca) : null,
    custo_usd: r.custo_usd != null ? Number(r.custo_usd) : null,
    duracao_ms: r.duracao_ms,
    publico: Boolean(r.publico),
    guardado: Boolean(r.guardado),
    criado_em: r.criado_em,
    utilizador_id: r.utilizador_id,
  }
}

export async function definirGuardado(id: string, utilizadorId: number, guardado: boolean): Promise<boolean> {
  const [res]: any = await db.execute(
    'UPDATE analises SET guardado = ? WHERE id = ? AND utilizador_id = ?',
    [guardado ? 1 : 0, id, utilizadorId]
  )
  return res.affectedRows > 0
}

/** Torna a análise acessível por link, sem sessão, a quem o tiver — a mesma coluna `publico` que
 *  já controla se outra pessoa a consegue abrir. Só o dono pode alternar. */
export async function definirPublico(id: string, utilizadorId: number, publico: boolean): Promise<boolean> {
  const [res]: any = await db.execute(
    'UPDATE analises SET publico = ? WHERE id = ? AND utilizador_id = ?',
    [publico ? 1 : 0, id, utilizadorId]
  )
  return res.affectedRows > 0
}

/** "Outras pessoas também perguntaram": análises públicas de outros utilizadores sobre pelo menos
 *  um dataset em comum — zero dado novo, só a mesma tabela `analises` filtrada de outro ângulo. */
export async function listarAnalisesRelacionadas(
  datasetIds: number[],
  excluirId: string,
  limite = 4
): Promise<{ id: string; pergunta: string; criado_em: string }[]> {
  if (datasetIds.length === 0) return []
  const [rows] = (await db.execute(
    `SELECT id, pergunta, datasets_ids, criado_em
     FROM analises
     WHERE publico = 1 AND estado = 'pronto' AND id != ?
     ORDER BY criado_em DESC
     LIMIT 200`,
    [excluirId]
  )) as [any[], unknown]

  const relacionadas = rows.filter((r) => {
    const ids: number[] = typeof r.datasets_ids === 'string' ? JSON.parse(r.datasets_ids) : r.datasets_ids
    return ids.some((id) => datasetIds.includes(id))
  })
  return relacionadas.slice(0, limite).map((r) => ({ id: r.id, pergunta: r.pergunta, criado_em: r.criado_em }))
}

export async function listarAnalisesDoUtilizador(
  utilizadorId: number,
  limite = 20
): Promise<{ id: string; pergunta: string; estado: string; criado_em: string }[]> {
  const [rows] = (await db.execute(
    `SELECT id, pergunta, estado, criado_em FROM analises
     WHERE utilizador_id = ? ORDER BY criado_em DESC LIMIT ?`,
    [utilizadorId, limite]
  )) as [any[], unknown]
  return rows as any
}
