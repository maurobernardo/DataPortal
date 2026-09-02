import { db } from '@/lib/db'
import type { ResultadoPipeline } from './pipeline'
import type { EstadoAnalise, EvidenciaLacuna, PerguntaViavel } from './types'
import { compor } from './compositor'

/**
 * Persistência de análises (R11: toda a análise é reproduzível).
 *
 * Guarda-se o plano, os resultados brutos e os passos executados, não apenas o texto final:
 * sem isso não seria possível reproduzir nem auditar de onde veio cada número.
 */

let colunaConfiancaDetalheGarantida = false
let colunasTokensGarantidas = false

/** Auditoria de custos (painel /admin/custos-ia): tokens brutos por análise, ao lado do
 *  `custo_usd` já calculado, para se poder decompor por modelo/preço sem reprocessar nada. */
async function garantirColunasTokens() {
  if (colunasTokensGarantidas) return
  try {
    await db.execute('ALTER TABLE analises ADD COLUMN tokens_entrada INT NULL')
  } catch {
    // já existe
  }
  try {
    await db.execute('ALTER TABLE analises ADD COLUMN tokens_saida INT NULL')
  } catch {
    // já existe
  }
  colunasTokensGarantidas = true
}

/** PLANO-DATAPROPROMAX.md, Fase 1: o painel de confiança (ligações geográficas, completude,
 *  valores derivados) é um objecto estruturado, não cabe na coluna `confianca` (um único float
 *  já usado para outra coisa) — precisa da sua própria coluna. */
async function garantirColunaConfiancaDetalhe() {
  if (colunaConfiancaDetalheGarantida) return
  try {
    await db.execute('ALTER TABLE analises ADD COLUMN confianca_detalhe LONGTEXT NULL')
  } catch {
    // já existe
  }
  colunaConfiancaDetalheGarantida = true
}

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
  await garantirColunaConfiancaDetalhe()
  await garantirColunasTokens()
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
       narrativa = ?, dashboard_spec = ?, fontes = ?, confianca = ?, custo_usd = ?, duracao_ms = ?,
       confianca_detalhe = ?, tokens_entrada = ?, tokens_saida = ?
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
        listas: contexto.listas,
        multiplos: contexto.multiplos,
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
      JSON.stringify(r.confianca),
      r.tokens_entrada,
      r.tokens_saida,
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

/**
 * Quando o pipeline falha por completo (mesmo depois de repetir), o utilizador nunca pode ver o
 * ecrã de "não publicada": isso já causou perda de confiança. Em vez disso, guarda-se uma análise
 * válida (estado 'pronto', narrativa com `resolvida`) que explica honestamente a falha, para que a
 * página de análise renderize o mesmo layout de sempre em vez do bloqueio.
 */
export async function registarFalhaDegradada(id: string, pergunta: string, mensagem: string): Promise<void> {
  const resolvida = {
    titulo: 'Não foi possível concluir esta análise',
    subtitulo: pergunta,
    resposta_directa: mensagem,
    numeros_chave: [] as { calc_id: string; rotulo: string; contexto: string; valor: string }[],
    o_que_mostram: 'Nenhum cálculo pôde ser produzido a partir dos dados seleccionados.',
    porque:
      'Pode ser uma falha temporária de rede ou de processamento, ou os dados seleccionados não terem ' +
      'informação suficiente para responder a esta pergunta em concreto.',
    o_que_nao_diz: [
      'Esta resposta não contém números: nenhum cálculo foi validado.',
      'Tente reformular a pergunta ou seleccionar outros datasets.',
    ],
    como_chegamos: 'A análise foi tentada, mas não produziu resultados suficientes para publicar.',
    fontes: [] as { instituicao: string; documento?: string; ano?: number; url?: string }[],
  }

  await db.execute(
    `UPDATE analises SET
       estado = 'pronto', resultados = ?, achados = ?, narrativa = ?, dashboard_spec = ?
     WHERE id = ?`,
    [
      JSON.stringify({ calcs: {}, series: [], graficos: [], destaques: [], camadasBrutas: [], avisos: [], qualidade: [], codigoExecutado: [] }),
      JSON.stringify([]),
      JSON.stringify({ bruta: resolvida, resolvida, critica: null }),
      JSON.stringify(null),
      id,
    ]
  )
}

/**
 * Regista uma análise que o motor recusou por os dados não responderem à pergunta.
 *
 * Guarda-se em estado próprio ('inviavel'), e não como erro: nada falhou tecnicamente, e contar
 * isto como falha estragaria as métricas de fiabilidade do motor. A pergunta fica registada de
 * propósito: uma pergunta que o portal não conseguiu responder é o sinal mais forte que existe
 * sobre que dados faltam ao catálogo, e é exactamente o que `sugestoes-datasets.ts` procura.
 */
let estadoInviavelGarantido = false

/**
 * `analises.estado` é um ENUM criado antes de existir o estado 'inviavel'. Sem esta migração o
 * MySQL não rejeita o UPDATE: guarda string vazia em silêncio (verificado ao vivo, com a análise
 * a ficar com estado '' e a evidência gravada na mesma). Corre uma vez por processo, como as
 * outras garantias de esquema deste ficheiro.
 */
async function garantirEstadoInviavel() {
  if (estadoInviavelGarantido) return
  try {
    const [linhas] = (await db.execute("SHOW COLUMNS FROM analises LIKE 'estado'")) as [any[], unknown]
    const tipo = String(linhas[0]?.Type || '')
    if (tipo && !tipo.includes("'inviavel'")) {
      await db.execute(
        `ALTER TABLE analises MODIFY COLUMN estado
         ENUM('planeando','executando','compondo','pronto','erro','inviavel')
         NOT NULL DEFAULT 'planeando'`
      )
    }
    estadoInviavelGarantido = true
  } catch {
    // Falhar aqui não pode impedir o registo: sem a migração o estado fica vazio, mas a evidência
    // e as sugestões continuam guardadas, que é o que o utilizador precisa de rever.
  }
}

/**
 * Uma recusa também se grava por inteiro.
 *
 * Antes escrevia-se só a narrativa, e `plano`, `resultados` e `achados` ficavam vazios. Ficava
 * assim a impossibilidade de responder à única pergunta que interessa depois de uma recusa: o que
 * é que o motor tentou, e onde é que parou. O plano e os avisos passam a ficar guardados nas
 * mesmas colunas que uma análise publicada usa, porque é onde qualquer diagnóstico os vai
 * procurar.
 */
let colunaTraducaoGarantida = false

/**
 * A coluna da versão inglesa, criada à chegada em vez de por migração à parte.
 *
 * É o mesmo padrão de `garantirEstadoInviavel`, e pela mesma razão: este portal corre em alojamento
 * partilhado sem passo de migração no arranque, e uma coluna que só existe depois de alguém correr
 * um comando à mão é uma coluna que não existe.
 */
async function garantirColunaTraducao() {
  if (colunaTraducaoGarantida) return
  try {
    const [linhas] = (await db.execute("SHOW COLUMNS FROM analises LIKE 'narrativa_en'")) as [any[], unknown]
    if (linhas.length === 0) {
      await db.execute('ALTER TABLE analises ADD COLUMN narrativa_en LONGTEXT NULL')
    }
    colunaTraducaoGarantida = true
  } catch {
    // Sem a coluna a tradução não se guarda, e o relatório continua a sair em português: é uma
    // funcionalidade a menos, não uma análise partida.
  }
}

export async function guardarTraducao(id: string, traduzida: unknown): Promise<void> {
  await garantirColunaTraducao()
  await db.execute('UPDATE analises SET narrativa_en = ? WHERE id = ?', [JSON.stringify(traduzida), id])
}

export async function obterTraducao(id: string): Promise<any | null> {
  await garantirColunaTraducao()
  try {
    const [linhas] = (await db.execute('SELECT narrativa_en FROM analises WHERE id = ? LIMIT 1', [id])) as [
      any[],
      unknown,
    ]
    const bruto = linhas[0]?.narrativa_en
    if (!bruto) return null
    return typeof bruto === 'string' ? JSON.parse(bruto) : bruto
  } catch {
    return null
  }
}

export async function registarInviavel(
  id: string,
  evidencia: EvidenciaLacuna,
  sugestoes: PerguntaViavel[],
  diagnostico?: import('./viabilidade').DiagnosticoInviavel | null
): Promise<void> {
  await garantirEstadoInviavel()
  await db.execute(
    `UPDATE analises SET estado = 'inviavel', narrativa = ?, plano = ?, resultados = ? WHERE id = ?`,
    [
      JSON.stringify({ inviavel: { evidencia, sugestoes } }),
      diagnostico?.plano ? JSON.stringify(diagnostico.plano) : null,
      diagnostico
        ? JSON.stringify({
            portao: diagnostico.portao,
            avisos: diagnostico.avisos,
            passos_falhados: diagnostico.passos_falhados,
            calcs: diagnostico.calcs,
          })
        : null,
      id,
    ]
  )
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
  confianca_detalhe: import('./confianca').ConfiancaAnalise | null
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
  await garantirColunaConfiancaDetalhe()
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
    confianca_detalhe: comoJson(r.confianca_detalhe, null),
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

export type EstatisticasCustoAnalises = {
  totais: {
    nAnalises: number
    custoTotalUsd: number
    custoMedioUsd: number
    tokensEntrada: number
    tokensSaida: number
    duracaoMediaMs: number
  }
  porUtilizador: {
    utilizadorId: number | null
    nome: string | null
    email: string | null
    nAnalises: number
    custoTotalUsd: number
    custoMedioUsd: number
  }[]
  recentes: {
    id: string
    pergunta: string
    nome: string | null
    email: string | null
    custoUsd: number | null
    tokensEntrada: number | null
    tokensSaida: number | null
    duracaoMs: number | null
    criadoEm: string
  }[]
}

/**
 * A base do painel /admin/custos-ia: quanto cada análise custa de facto em tokens da Anthropic,
 * para decidir quanto cobrar por ela. Só entram análises com `custo_usd` preenchido (estado
 * 'pronto' ou 'erro' já passado pelo pipeline): uma análise ainda "a planear" não gastou nada
 * a sério ainda, ou o seu custo ainda não foi persistido.
 *
 * `desde`: filtro de período do painel (diário/semanal/mensal/trimestral/semestral/anual/tudo).
 * Null = sem filtro, o histórico inteiro.
 */
export async function obterEstatisticasCustoAnalises(desde: Date | null = null): Promise<EstatisticasCustoAnalises> {
  const filtroPeriodo = desde ? 'AND criado_em >= ?' : ''
  const paramsPeriodo = desde ? [desde] : []

  const [totaisRows] = (await db.execute(
    `SELECT
       COUNT(*) as nAnalises,
       COALESCE(SUM(custo_usd), 0) as custoTotalUsd,
       COALESCE(AVG(custo_usd), 0) as custoMedioUsd,
       COALESCE(SUM(tokens_entrada), 0) as tokensEntrada,
       COALESCE(SUM(tokens_saida), 0) as tokensSaida,
       COALESCE(AVG(duracao_ms), 0) as duracaoMediaMs
     FROM analises
     WHERE custo_usd IS NOT NULL ${filtroPeriodo}`,
    paramsPeriodo
  )) as [any[], unknown]

  const [porUtilizadorRows] = (await db.execute(
    `SELECT a.utilizador_id as utilizadorId, u.name as nome, u.email as email,
       COUNT(*) as nAnalises,
       COALESCE(SUM(a.custo_usd), 0) as custoTotalUsd,
       COALESCE(AVG(a.custo_usd), 0) as custoMedioUsd
     FROM analises a
     LEFT JOIN users u ON u.id = a.utilizador_id
     WHERE a.custo_usd IS NOT NULL ${filtroPeriodo}
     GROUP BY a.utilizador_id, u.name, u.email
     ORDER BY custoTotalUsd DESC
     LIMIT 50`,
    paramsPeriodo
  )) as [any[], unknown]

  const [recentesLista] = (await db.execute(
    `SELECT a.id, a.pergunta, u.name as nome, u.email as email,
       a.custo_usd as custoUsd, a.tokens_entrada as tokensEntrada, a.tokens_saida as tokensSaida,
       a.duracao_ms as duracaoMs, a.criado_em as criadoEm
     FROM analises a
     LEFT JOIN users u ON u.id = a.utilizador_id
     WHERE a.custo_usd IS NOT NULL ${filtroPeriodo}
     ORDER BY a.criado_em DESC
     LIMIT 50`,
    paramsPeriodo
  )) as [any[], unknown]

  const t = totaisRows[0] || {}

  return {
    totais: {
      nAnalises: Number(t.nAnalises) || 0,
      custoTotalUsd: Number(t.custoTotalUsd) || 0,
      custoMedioUsd: Number(t.custoMedioUsd) || 0,
      tokensEntrada: Number(t.tokensEntrada) || 0,
      tokensSaida: Number(t.tokensSaida) || 0,
      duracaoMediaMs: Number(t.duracaoMediaMs) || 0,
    },
    porUtilizador: porUtilizadorRows.map((row: any) => ({
      utilizadorId: row.utilizadorId,
      nome: row.nome,
      email: row.email,
      nAnalises: Number(row.nAnalises) || 0,
      custoTotalUsd: Number(row.custoTotalUsd) || 0,
      custoMedioUsd: Number(row.custoMedioUsd) || 0,
    })),
    recentes: recentesLista.map((row: any) => ({
      id: row.id,
      pergunta: row.pergunta,
      nome: row.nome,
      email: row.email,
      custoUsd: row.custoUsd != null ? Number(row.custoUsd) : null,
      tokensEntrada: row.tokensEntrada,
      tokensSaida: row.tokensSaida,
      duracaoMs: row.duracaoMs,
      criadoEm: row.criadoEm,
    })),
  }
}

