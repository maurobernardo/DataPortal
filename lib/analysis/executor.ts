import {
  carregarTabela,
  carregarUnidades,
  detectarColunaGeografica,
  agregarPorUnidade,
  colunaNumerica,
  colunaValores,
  resolverUnidadePorNome,
  restringirLigacoesAUnidade,
  type NivelAdmin,
  type ResultadoLigacao,
  type Tabela,
} from './dados'
import { detectarColunasCoordenadas, ligarPorCoordenadas, ligarPorGeometria, pontoRepresentativo } from './geo-join'
import { existeMetodo, invocarMetodo } from './library'
import { pesosKnn, type Ponto } from './library/geo'
import { distanciasParaMaisProximo, contarDentroDoRaio } from './library/proximidade'
import { paraNumero } from './library/numeric'
import { rotularColuna } from './rotulos-cliente'
import { executarComCodigo } from './execucao-codigo'
import { modeloPara, custoUsd } from './router'
import type { CelulaCalculada, PassoPlano } from './types'

/**
 * Executor de passos do plano.
 *
 * O modelo escolhe QUAL método aplicar e a QUE coluna; é este código que carrega os dados, liga
 * à geografia, normaliza e invoca a função tipada. O modelo nunca toca nos números: é essa
 * separação que torna R1 verificável em vez de ser uma promessa do prompt.
 */

export type SerieGeografica = {
  passo_id: string
  nivel: NivelAdmin
  /** Já normalizada quando o passo declara normalização (R9). */
  unidades: { codigo: string; nome: string; valor: number; categoria?: string }[]
  metrica: string
  normalizacao: string
  /** 'categorico' quando `categoria` é que deve ditar a cor no mapa (ex.: hotspot/coldspot LISA/Gi*), não `valor`. */
  modo?: 'continuo' | 'categorico'
}

/** Ordem de severidade para colorir categorias LISA/Gi* de forma consistente no mapa. */
const SEVERIDADE_CATEGORIA: Record<string, number> = {
  'hotspot_99': 3, 'hotspot_95': 2, 'hotspot_90': 1,
  'coldspot_90': -1, 'coldspot_95': -2, 'coldspot_99': -3,
  'alto-alto': 2, 'alto-baixo': 1, 'baixo-alto': -1, 'baixo-baixo': -2,
  'nao_significativo': 0, 'ns': 0,
}

/**
 * Gráfico não geográfico (Parte 9): curva de Lorenz, comparação de grupos, etc.
 *
 * Existe porque, antes disto, um método como curva_lorenz devolvia um array de pontos que
 * achatarResultado não sabia guardar como célula (um array não tem um número único) e ficava
 * descartado em silêncio: a análise calculava a curva e o resultado desaparecia sem chegar a
 * lado nenhum. Métodos que produzem uma FORMA e não um número isolado precisam deste caminho.
 */
export type GraficoResultado = {
  passo_id: string
  tipo: 'linha' | 'barra' | 'pizza' | 'dispersao' | 'area'
  titulo: string
  eixoX: string[]
  series: { nome: string; valores: (number | null)[] }[]
  /** Linha de referência opcional (ex.: diagonal de igualdade perfeita na curva de Lorenz). */
  referencia?: { nome: string; valores: (number | null)[] }
  /** Marca gráficos que merecem secção dedicada no dashboard ("Análise Comparativa" /
   *  "Tendências e Evolução") em vez de caírem na grelha genérica — só quando a pergunta
   *  realmente produziu esse tipo de cálculo, nunca por omissão. */
  categoria?: 'comparativo' | 'temporal'
}

/**
 * Uma unidade única em destaque (Parte 10-bis): "qual é o maior X" não é uma pergunta de
 * distribuição, é uma pergunta de localização de UM registo. Um coroplético com todas as
 * unidades responde à pergunta errada; isto guarda a geometria própria da linha vencedora
 * (já carregada em tabela.geometrias para datasets geoespaciais) para desenhar só essa, isolada.
 */
export type DestaqueGeografico = {
  passo_id: string
  titulo: string
  nome: string
  valor: number
  metrica: string
  geometry: any
}

export type ContextoExecucao = {
  tabelas: Map<number, Tabela>
  ligacoes: Map<number, ResultadoLigacao | null>
  calcs: Record<string, CelulaCalculada>
  series: SerieGeografica[]
  graficos: GraficoResultado[]
  destaques: DestaqueGeografico[]
  avisos: string[]
  /** Preenchido pelo estágio de Enriquecimento (R2) quando encontra denominador populacional
   *  noutro dataset do portal. Chave: nível administrativo -> código -> população. */
  enriquecimentoPopulacao: Map<NivelAdmin, Map<string, number>>
  /** Geometria própria de cada dataset geoespacial seleccionado (Parte 10-ter): um coroplético
   *  agregado por província responde "onde se concentra", mas não "onde está cada uma" — um
   *  dataset de pontos (ex.: unidades sanitárias) merece pontos no mapa, não só um total por
   *  distrito. */
  camadasBrutas: CamadaBruta[]
  /** Completude por coluna (Plano de Dashboard, item "cartão de qualidade"): um resumo visual de
   *  quão preenchido está cada coluna que algum passo perfilou, em vez de ficar escondido dentro
   *  do texto da narrativa. */
  qualidade: QualidadeColuna[]
  /** Auditoria de todo passo resolvido via execucao_codigo (PLANO-INTELIGENCIA-PRO-MAX.md, Fase
   *  2): guarda o código realmente corrido no sandbox, não só o resultado — o mesmo padrão de
   *  rastreabilidade que R1 já exige de qualquer outro cálculo. */
  codigoExecutado: { passo_id: string; instrucao: string; codigo: string }[]
  /** execucao_codigo custa uma chamada extra ao modelo, fora do estágio Planeamento/Narrativa que
   *  o pipeline já contabiliza — sem este acumulador o custo real da análise ficava subestimado. */
  custoExecucaoCodigo: number
}

export type QualidadeColuna = {
  coluna: string
  completude_pct: number
  n_distintos: number
  tipo: string
}

export type CamadaBruta = {
  dataset_id: number
  titulo: string
  /** Tipo GeoJSON da primeira feição: assume-se homogéneo dentro do mesmo dataset. */
  tipoGeometria: string
  /** Colunas candidatas a colorir/filtrar o mapa (ex.: "Tipologia", "Província") — o mapa deixa
   *  o utilizador escolher qual, em vez de fixar uma só: a mesma camada pode fazer sentido colorida
   *  por tipo de unidade OU por província, consoante a pergunta. */
  colunasCategoricas: string[]
  features: { nome: string; categorias: Record<string, string>; geometry: any }[]
  truncado: boolean
}

/**
 * max_allowed_packet do MySQL local foi subido de 1M para 16M (my.ini) especificamente para
 * guardar geometria bruta sem cortar feições — o mapa deve desenhar o dataset completo, nunca
 * uma amostra. 1513 estradas com 30 819 pontos (~1,4 MB de JSON) já cabem várias vezes dentro
 * dos 16 MB actuais.
 */
export async function criarContexto(datasetIds: number[]): Promise<ContextoExecucao> {
  const ctx: ContextoExecucao = {
    tabelas: new Map(),
    ligacoes: new Map(),
    calcs: {},
    series: [],
    graficos: [],
    destaques: [],
    avisos: [],
    enriquecimentoPopulacao: new Map(),
    camadasBrutas: [],
    qualidade: [],
    codigoExecutado: [],
    custoExecucaoCodigo: 0,
  }

  for (const id of datasetIds) {
    const t = await carregarTabela(id)
    if ('erro' in t) {
      ctx.avisos.push(`Dataset ${id} não pôde ser lido: ${t.erro}`)
      continue
    }
    ctx.tabelas.set(id, t)
    if (t.truncado) {
      ctx.avisos.push(
        `${t.titulo}: leitura truncada em ${t.n_linhas} linhas; os totais são um limite inferior.`
      )
    }

    if (t.geometrias && t.geometrias.length > 0) {
      const colunaNome = detectarColunaRotulo(t, [])
      const iColunaNome = colunaNome ? t.colunas.indexOf(colunaNome) : -1
      const colunasCategoricas = detectarColunasCategoricas(t, colunaNome ? [colunaNome] : [])
      const indicesCategoricas = colunasCategoricas.map((c) => t.colunas.indexOf(c))
      const tipoGeometria = t.geometrias.find((g) => g?.type)?.type || 'desconhecido'
      ctx.camadasBrutas.push({
        dataset_id: id,
        titulo: t.titulo,
        tipoGeometria,
        colunasCategoricas,
        features: t.geometrias.map((g, i) => ({
          nome: iColunaNome >= 0 ? t.linhas[i]?.[iColunaNome] || t.titulo : t.titulo,
          categorias: Object.fromEntries(
            colunasCategoricas
              .map((c, j) => [c, indicesCategoricas[j] >= 0 ? t.linhas[i]?.[indicesCategoricas[j]] : undefined])
              .filter(([, v]) => !!v)
          ),
          geometry: g,
        })),
        truncado: false,
      })
    }

    let lig = await detectarColunaGeografica(t)

    // R4: se o ficheiro tem coordenadas, o nível mais fino é derivável mesmo sem coluna que o
    // declare. Tenta-se do mais fino para o mais grosso e fica-se pelo primeiro que cubra a
    // maioria dos pontos; só se aceita sobre a ligação por nome se for mais fino ou melhor.
    if (detectarColunasCoordenadas(t)) {
      for (const nivel of ['admin3', 'admin2'] as NivelAdmin[]) {
        const espacial = await ligarPorCoordenadas(t, nivel)
        if (!espacial || espacial.taxa_correspondencia < 0.7) continue
        const ordem: Record<NivelAdmin, number> = { admin1: 1, admin2: 2, admin3: 3 }
        if (!lig || ordem[espacial.nivel] > ordem[lig.nivel]) {
          if (lig) {
            ctx.avisos.push(
              `${t.titulo}: o ficheiro declara apenas ${lig.nivel}, mas as coordenadas permitiram ` +
                `derivar ${espacial.nivel} por junção espacial ` +
                `(${(espacial.taxa_correspondencia * 100).toFixed(1)}% dos pontos dentro de uma unidade).`
            )
          }
          lig = espacial
        }
        break
      }
    }

    // Nem coluna de nome/código, nem lat/lon em separado: a maioria dos shapefiles reais não tem
    // nenhum dos dois, a localização está só na geometria. Sem isto, qualquer dataset de linhas
    // ou polígonos sem coluna "Provincia" ficava sempre sem ligação geográfica nenhuma — mesmo
    // tendo, na geometria, exactamente a informação necessária para responder.
    if (!lig && t.geometrias && t.geometrias.length > 0) {
      for (const nivel of ['admin3', 'admin2', 'admin1'] as NivelAdmin[]) {
        const porGeometria = await ligarPorGeometria(t, nivel)
        if (!porGeometria || porGeometria.taxa_correspondencia < 0.5) continue
        lig = porGeometria
        ctx.avisos.push(
          `${t.titulo}: sem coluna de província/distrito nem lat/lon separados; a província de ` +
            `cada feição foi derivada da própria geometria (ponto representativo, aproximação — ` +
            `uma linha longa que atravesse mais do que uma unidade fica atribuída só à unidade do ` +
            `seu ponto médio).`
        )
        break
      }
    }

    ctx.ligacoes.set(id, lig)
    if (lig && lig.nao_correspondidos.length > 0) {
      ctx.avisos.push(
        `${t.titulo}: ${lig.nao_correspondidos.length} valor(es) da coluna "${lig.coluna_usada}" não correspondem a unidades administrativas de Moçambique (${lig.nao_correspondidos.slice(0, 4).join(', ')}) e ficam fora dos totais por unidade.`
      )
    }
  }

  return ctx
}

/**
 * Coluna mais parecida com um "nome" para identificar uma linha (ex.: nome do parque, da
 * barragem) — não a métrica a comparar, para "qual é o maior X" poder responder QUAL, não só
 * QUANTO. Prefere o cabeçalho óbvio; sem isso, a coluna de texto com mais valores distintos.
 */
function detectarColunaRotulo(tabela: Tabela, excluir: string[]): string | null {
  const candidatos = tabela.colunas.filter((c) => !excluir.includes(c))
  const porNomeObvio = candidatos.find((c) => /nome|name|designa|t[íi]tulo|label/i.test(c))
  if (porNomeObvio) return porNomeObvio

  let melhor: { coluna: string; pontuacao: number } | null = null
  for (const c of candidatos) {
    const valores = colunaValores(tabela, c).filter(Boolean)
    if (valores.length < tabela.n_linhas * 0.5) continue
    const numericos = valores.filter((v) => paraNumero(v) !== null).length
    if (numericos / valores.length > 0.3) continue // maioritariamente numérica: não é um nome
    const distintos = new Set(valores).size
    const pontuacao = distintos / valores.length
    if (pontuacao > 0.3 && (!melhor || pontuacao > melhor.pontuacao)) melhor = { coluna: c, pontuacao }
  }
  return melhor?.coluna || null
}

/**
 * Colunas com poucos valores distintos que se repetem bastante (ex.: tipologia, propriedade,
 * província) — boas candidatas a colorir/filtrar o mapa de pontos/linhas/polígonos. Devolve até
 * 3, não só a "melhor": a mesma camada pode merecer ser vista por tipo de unidade OU por
 * província, consoante a pergunta, e só o utilizador sabe qual quer no momento — por isso o mapa
 * deixa escolher em vez de fixar automaticamente uma só dimensão (Parte 24).
 */
function detectarColunasCategoricas(tabela: Tabela, excluir: string[]): string[] {
  const candidatos = tabela.colunas.filter((c) => !excluir.includes(c))
  const avaliar = (c: string) => {
    const valores = colunaValores(tabela, c).filter(Boolean)
    if (valores.length < tabela.n_linhas * 0.5) return null
    const numericos = valores.filter((v) => paraNumero(v) !== null).length
    if (numericos / valores.length > 0.3) return null
    const distintos = new Set(valores).size
    // 20 (não 12): uma tipologia de unidade sanitária facilmente tem 15 categorias reais — um
    // tecto demasiado baixo excluía exactamente a coluna mais útil (tipo de unidade) e deixava
    // só colunas menos informativas (ex.: fonte de coordenadas com 2 valores) qualificarem-se.
    if (distintos < 2 || distintos > 20) return null
    return distintos
  }

  const pontuados = candidatos
    .map((c) => ({ coluna: c, distintos: avaliar(c) }))
    .filter((c): c is { coluna: string; distintos: number } => c.distintos !== null)

  const semanticas = pontuados.filter((c) => /tipo|categoria|classe|propriedade|regime|status|provinc|distrito|admin/i.test(c.coluna))
  const resto = pontuados.filter((c) => !semanticas.includes(c)).sort((a, b) => b.distintos - a.distintos)

  return [...semanticas, ...resto].slice(0, 3).map((c) => c.coluna)
}

function registarCalc(
  ctx: ContextoExecucao,
  id: string,
  valor: number | string,
  unidade: string,
  formato: string,
  passo: PassoPlano,
  datasets: string[],
  linhas: number
) {
  ctx.calcs[id] = {
    id,
    valor,
    unidade,
    formato,
    passo_id: passo.id,
    proveniencia: {
      datasets,
      linhas_usadas: linhas,
      metodo: passo.metodo,
      fontes: datasets,
    },
  }
}

/** Achata o objecto devolvido por um método em células calculadas com nomes determinísticos. */
function achatarResultado(
  ctx: ContextoExecucao,
  passo: PassoPlano,
  resultado: unknown,
  datasets: string[],
  linhas: number,
  unidadeBase = ''
) {
  if (resultado == null) return
  if (typeof resultado === 'number') {
    registarCalc(ctx, passo.id, resultado, unidadeBase, 'numero', passo, datasets, linhas)
    return
  }
  if (typeof resultado === 'string') {
    registarCalc(ctx, passo.id, resultado, '', 'texto', passo, datasets, linhas)
    return
  }
  if (typeof resultado !== 'object') return

  for (const [chave, valor] of Object.entries(resultado as Record<string, unknown>)) {
    // A chave pode ser um valor de dados (ex.: nome de categoria "National Park"), não um
    // identificador: sem sanitizar, um espaço ou acento parte CALC_TOKEN_REGEX
    // ([a-zA-Z0-9_]+) e o token {{calc:...}} nunca é resolvido, sobrevivendo cru no texto final.
    const chaveSegura = chave
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'v'
    const id = `${passo.id}_${chaveSegura}`
    if (typeof valor === 'number' && Number.isFinite(valor)) {
      const formato = /p$|^p_|pvalor|p_valor/i.test(chave)
        ? 'numero'
        : /percent|quota|proporcao/i.test(chave)
          ? 'percentagem'
          : 'numero'
      registarCalc(ctx, id, valor, unidadeBase, formato, passo, datasets, linhas)
    } else if (typeof valor === 'string') {
      registarCalc(ctx, id, valor, '', 'texto', passo, datasets, linhas)
    }
    // Arrays e objectos aninhados não viram células: alimentam gráficos, não texto.
  }
}

const DENSIDADE_MULTIPLICADOR = 1000

/**
 * Aplica a normalização pedida pelo plano (R9). Partilhada entre o caminho geoestatístico e o
 * genérico: antes desta função existir, "per_capita" e "por_1000" eram valores aceites pelo
 * schema do plano mas silenciosamente ignorados, devolvendo contagens absolutas com o rótulo
 * errado, que é exactamente o que R9 proíbe.
 *
 * Se o denominador (população ou área) faltar em mais de 20% das unidades, falha em vez de
 * normalizar parcialmente: um mapa com metade das unidades a zero por omissão é pior do que a
 * ausência do mapa, e a falha entra em avisos (R8) como limitação concreta.
 */
function normalizarPorUnidade(
  porUnidade: { codigo: string; nome: string; valor: number }[],
  porCodigo: Map<string, { area_km2: number | null; populacao: number | null }>,
  normalizacao: string,
  passoId: string
): number[] {
  if (normalizacao === 'percentagem_do_total') {
    const total = porUnidade.reduce((s, x) => s + x.valor, 0)
    return porUnidade.map((u) => (total ? (u.valor / total) * 100 : 0))
  }

  if (normalizacao === 'densidade_km2' || normalizacao === 'per_capita' || normalizacao === 'por_1000') {
    const campo = normalizacao === 'densidade_km2' ? 'area_km2' : 'populacao'
    const rotulo = campo === 'area_km2' ? 'área' : 'população'
    const semDenominador = porUnidade.filter((u) => !porCodigo.get(u.codigo)?.[campo])
    if (semDenominador.length > porUnidade.length * 0.2) {
      throw new Error(
        `Passo ${passoId}: ${rotulo} não está disponível para ${semDenominador.length} de ` +
          `${porUnidade.length} unidades a este nível; normalização "${normalizacao}" não pode ` +
          `ser aplicada com confiança`
      )
    }
    const multiplicador = normalizacao === 'per_capita' ? 1 : DENSIDADE_MULTIPLICADOR
    return porUnidade.map((u) => {
      const denom = porCodigo.get(u.codigo)?.[campo]
      return denom ? (u.valor / denom) * multiplicador : 0
    })
  }

  return porUnidade.map((u) => u.valor)
}

/**
 * Sobrepõe população vinda do enriquecimento (R2) à de geo_unidades: o enriquecimento é
 * resultado da pergunta actual e pode ter mais cobertura do que a carga de base, por isso ganha
 * quando existir para um código.
 */
function mesclarPopulacao(
  unidades: { codigo: string; area_km2: number | null; populacao: number | null; centroide: [number, number] }[],
  enriquecimento: Map<string, number> | undefined
): Map<string, { area_km2: number | null; populacao: number | null; centroide: [number, number] }> {
  return new Map(
    unidades.map((u) => [
      u.codigo,
      { ...u, populacao: enriquecimento?.get(u.codigo) ?? u.populacao },
    ])
  )
}

let proximoIdSintetico = -1

/**
 * Junta um dataset geoespacial e um alfanumérico (ou dois quaisquer) pela unidade administrativa
 * comum a que cada um já está ligado — não pede colunas-chave ao modelo porque a ligação
 * geográfica de cada dataset já foi resolvida em criarContexto. Sem isto, seleccionar dois
 * datasets no motor não tinha efeito nenhum: executarPasso só lia sempre o primeiro (ver nota em
 * `idEscolhido` acima) e o segundo dataset ficava carregado e nunca usado.
 *
 * Regista o resultado como uma tabela sintética em ctx.tabelas (id negativo, nunca colide com um
 * dataset_id real da base de dados) para que passos seguintes do plano possam encadear
 * correlação, comparação de grupos, etc. sobre a junção como se fosse mais um dataset.
 */
async function executarJuncaoDatasets(passo: PassoExecutavel, ctx: ContextoExecucao): Promise<void> {
  const idA = passo.dataset_id ?? Array.from(ctx.tabelas.keys())[0]
  const idB = passo.dataset_id_2
  if (idA === undefined || idB === undefined) {
    throw new Error(`Passo ${passo.id}: juntar_datasets exige dataset_id e dataset_id_2`)
  }
  const tabelaA = ctx.tabelas.get(idA)
  const tabelaB = ctx.tabelas.get(idB)
  if (!tabelaA || !tabelaB) throw new Error(`Passo ${passo.id}: dataset(s) não carregado(s)`)
  const ligA = ctx.ligacoes.get(idA)
  const ligB = ctx.ligacoes.get(idB)
  if (!ligA || !ligB) {
    throw new Error(
      `Passo ${passo.id}: os dois datasets têm de estar ligados a unidades administrativas para se poderem juntar`
    )
  }
  if (!passo.coluna_metrica || !passo.coluna_metrica_2) {
    throw new Error(
      `Passo ${passo.id}: juntar_datasets exige coluna_metrica (do primeiro dataset) e coluna_metrica_2 (do segundo)`
    )
  }

  // Nível comum: o mais grosso dos dois — agregar ao nível mais fino de um dataset que só chega
  // ao mais grosso do outro produziria unidades vazias em vez de uma junção real.
  const ordemNivel: Record<NivelAdmin, number> = { admin1: 1, admin2: 2, admin3: 3 }
  const nivel = (passo.nivel_geo as NivelAdmin) || (ordemNivel[ligA.nivel] <= ordemNivel[ligB.nivel] ? ligA.nivel : ligB.nivel)

  const porUnidadeA = await agregarPorUnidade(
    tabelaA, ligA, passo.coluna_metrica,
    colunaNumerica(tabelaA, passo.coluna_metrica).length ? 'soma' : 'contagem', nivel
  )
  const porUnidadeB = await agregarPorUnidade(
    tabelaB, ligB, passo.coluna_metrica_2,
    colunaNumerica(tabelaB, passo.coluna_metrica_2).length ? 'soma' : 'contagem', nivel
  )

  const mapaB = new Map(porUnidadeB.map((u) => [u.codigo, u.valor]))
  const combinadas = porUnidadeA
    .filter((u) => mapaB.has(u.codigo))
    .map((u) => ({ codigo: u.codigo, nome: u.nome, valorA: u.valor, valorB: mapaB.get(u.codigo)! }))

  if (combinadas.length < 3) {
    throw new Error(
      `Passo ${passo.id}: só ${combinadas.length} unidade(s) em comum entre "${tabelaA.titulo}" e ` +
        `"${tabelaB.titulo}" ao nível ${nivel}, insuficiente para juntar`
    )
  }
  if (combinadas.length < porUnidadeA.length) {
    ctx.avisos.push(
      `Junção "${passo.descricao_humana}": ${porUnidadeA.length - combinadas.length} unidade(s) de ` +
        `"${tabelaA.titulo}" não tinham correspondência em "${tabelaB.titulo}" e ficaram fora.`
    )
  }

  const idSintetico = proximoIdSintetico--
  ctx.tabelas.set(idSintetico, {
    dataset_id: idSintetico,
    titulo: `${tabelaA.titulo} × ${tabelaB.titulo} (por ${nivel})`,
    colunas: ['unidade', passo.coluna_metrica, passo.coluna_metrica_2],
    linhas: combinadas.map((c) => [c.nome, String(c.valorA), String(c.valorB)]),
    n_linhas: combinadas.length,
    truncado: false,
  })
  ctx.ligacoes.set(idSintetico, null)

  ctx.series.push({
    passo_id: `${passo.id}_a`,
    nivel,
    unidades: combinadas.map((c) => ({ codigo: c.codigo, nome: c.nome, valor: c.valorA })),
    metrica: `${rotularColuna(passo.coluna_metrica || '')} (${tabelaA.titulo})`,
    normalizacao: 'nenhuma',
  })
  ctx.series.push({
    passo_id: `${passo.id}_b`,
    nivel,
    unidades: combinadas.map((c) => ({ codigo: c.codigo, nome: c.nome, valor: c.valorB })),
    metrica: `${rotularColuna(passo.coluna_metrica_2 || '')} (${tabelaB.titulo})`,
    normalizacao: 'nenhuma',
  })

  ctx.graficos.push({
    passo_id: `${passo.id}_dispersao`,
    tipo: 'dispersao',
    titulo: passo.descricao_humana,
    eixoX: combinadas.map((c) => String(c.valorA)),
    series: [{ nome: `${passo.coluna_metrica_2} (${tabelaB.titulo})`, valores: combinadas.map((c) => c.valorB) }],
  })

  registarCalc(
    ctx, `${passo.id}_n_unidades`, combinadas.length, 'unidades', 'inteiro', passo,
    [tabelaA.titulo, tabelaB.titulo], combinadas.length
  )
}

/** Extrai o ponto representativo de cada feição de uma tabela geoespacial, descartando as sem
 *  geometria válida — usado por distancia_minima e contagem_buffer (Fase 3 do PLANO-INTELIGENCIA-
 *  PRO-MAX.md), que comparam geometrias REAIS entre dois datasets, ao contrário de
 *  juntar_datasets, que só compara valores já agregados por unidade administrativa comum. */
function pontosValidos(tabela: Tabela): { pontos: Ponto[]; indices: number[] } {
  const pontos: Ponto[] = []
  const indices: number[] = []
  ;(tabela.geometrias || []).forEach((g, i) => {
    const p = pontoRepresentativo(g)
    if (p) {
      pontos.push(p)
      indices.push(i)
    }
  })
  return { pontos, indices }
}

async function executarDistanciaMinima(passo: PassoExecutavel, ctx: ContextoExecucao): Promise<void> {
  const idA = passo.dataset_id ?? Array.from(ctx.tabelas.keys())[0]
  const idB = passo.dataset_id_2
  if (idA === undefined || idB === undefined) {
    throw new Error(`Passo ${passo.id}: distancia_minima exige dataset_id e dataset_id_2`)
  }
  const tabelaA = ctx.tabelas.get(idA)
  const tabelaB = ctx.tabelas.get(idB)
  if (!tabelaA || !tabelaB) throw new Error(`Passo ${passo.id}: dataset(s) não carregado(s)`)
  if (!tabelaA.geometrias?.length || !tabelaB.geometrias?.length) {
    throw new Error(`Passo ${passo.id}: distancia_minima exige geometria própria nos dois datasets`)
  }

  const { pontos: pontosA, indices: indicesA } = pontosValidos(tabelaA)
  const { pontos: pontosB } = pontosValidos(tabelaB)
  if (pontosA.length === 0 || pontosB.length === 0) {
    throw new Error(`Passo ${passo.id}: nenhuma geometria válida encontrada num dos datasets`)
  }

  const distancias = distanciasParaMaisProximo(pontosA, pontosB)
  const resumo: any = invocarMetodo('resumo_estatistico', [distancias])
  // "n" é uma contagem de escolas, não uma distância: achatarResultado aplicaria 'km' a TODOS os
  // campos indiscriminadamente, e a narrativa citava-o como "9535 km" em vez de "9535 escolas".
  const { n, ...resumoDistancias } = resumo ?? {}
  achatarResultado(ctx, passo, resumoDistancias, [tabelaA.titulo, tabelaB.titulo], distancias.length, 'km')
  if (typeof n === 'number') {
    registarCalc(ctx, `${passo.id}_n`, n, '', 'inteiro', passo, [tabelaA.titulo, tabelaB.titulo], distancias.length)
  }

  const limiarKm = limiarOuRaioKm(passo)
  if (limiarKm !== null) {
    const colunaNome = detectarColunaRotulo(tabelaA, [])
    const iNome = colunaNome ? tabelaA.colunas.indexOf(colunaNome) : -1
    const alemIdx = distancias
      .map((d, i) => (d > limiarKm ? i : -1))
      .filter((i) => i >= 0)

    registarCalc(ctx, `${passo.id}_n_alem_limiar`, alemIdx.length, '', 'inteiro', passo, [tabelaA.titulo], distancias.length)
    registarCalc(
      ctx,
      `${passo.id}_pct_alem_limiar`,
      distancias.length ? (alemIdx.length / distancias.length) * 100 : 0,
      '',
      'percentagem',
      passo,
      [tabelaA.titulo],
      distancias.length
    )

    if (colunaNome && iNome >= 0) {
      const nomes = alemIdx
        .map((i) => tabelaA.linhas[indicesA[i]]?.[iNome])
        .filter((n): n is string => !!n)
        .slice(0, 15)
      if (nomes.length) {
        registarCalc(ctx, `${passo.id}_nomes_alem_limiar`, nomes.join(', '), '', 'texto', passo, [tabelaA.titulo], distancias.length)
      }
    }
  }

  const colunaNome = detectarColunaRotulo(tabelaA, [])
  const iNome = colunaNome ? tabelaA.colunas.indexOf(colunaNome) : -1
  if (colunaNome && iNome >= 0) {
    const maisLonge = distancias
      .map((d, i) => ({ nome: tabelaA.linhas[indicesA[i]]?.[iNome], d }))
      .filter((x): x is { nome: string; d: number } => !!x.nome)
      .sort((a, b) => b.d - a.d)
      .slice(0, 15)
    if (maisLonge.length >= 2) {
      ctx.graficos.push({
        passo_id: `${passo.id}_distancias`,
        tipo: 'barra',
        titulo: passo.descricao_humana,
        eixoX: maisLonge.map((x) => x.nome),
        series: [{ nome: `Distância a "${tabelaB.titulo}" (km)`, valores: maisLonge.map((x) => Math.round(x.d * 100) / 100) }],
      })
    }
  }
}

async function executarContagemBuffer(passo: PassoExecutavel, ctx: ContextoExecucao): Promise<void> {
  const idA = passo.dataset_id ?? Array.from(ctx.tabelas.keys())[0]
  const idB = passo.dataset_id_2
  if (idA === undefined || idB === undefined) {
    throw new Error(`Passo ${passo.id}: contagem_buffer exige dataset_id e dataset_id_2`)
  }
  const raioKm = limiarOuRaioKm(passo)
  if (!raioKm || raioKm <= 0) {
    throw new Error(`Passo ${passo.id}: contagem_buffer exige coluna_grupo (o raio, em km, como texto) maior que zero`)
  }
  const tabelaA = ctx.tabelas.get(idA)
  const tabelaB = ctx.tabelas.get(idB)
  if (!tabelaA || !tabelaB) throw new Error(`Passo ${passo.id}: dataset(s) não carregado(s)`)
  if (!tabelaA.geometrias?.length || !tabelaB.geometrias?.length) {
    throw new Error(`Passo ${passo.id}: contagem_buffer exige geometria própria nos dois datasets`)
  }

  const { pontos: pontosA, indices: indicesA } = pontosValidos(tabelaA)
  const iMetricaB = passo.coluna_metrica_2 ? tabelaB.colunas.indexOf(passo.coluna_metrica_2) : -1

  const pontosB: Ponto[] = []
  const pesosB: number[] = []
  ;(tabelaB.geometrias || []).forEach((g, i) => {
    const p = pontoRepresentativo(g)
    if (!p) return
    pontosB.push(p)
    if (iMetricaB >= 0) pesosB.push(paraNumero(tabelaB.linhas[i]?.[iMetricaB]) ?? 0)
  })
  if (pontosA.length === 0 || pontosB.length === 0) {
    throw new Error(`Passo ${passo.id}: nenhuma geometria válida encontrada num dos datasets`)
  }

  const usaSoma = iMetricaB >= 0 && pesosB.length === pontosB.length
  const contagens = contarDentroDoRaio(pontosA, pontosB, raioKm, usaSoma ? pesosB : undefined)

  const resumo = invocarMetodo('resumo_estatistico', [contagens])
  achatarResultado(ctx, passo, resumo, [tabelaA.titulo, tabelaB.titulo], contagens.length)

  const colunaNome = detectarColunaRotulo(tabelaA, [])
  const iNome = colunaNome ? tabelaA.colunas.indexOf(colunaNome) : -1
  if (colunaNome && iNome >= 0) {
    const rotuloSerie = usaSoma
      ? rotularColuna(passo.coluna_metrica_2!)
      : `"${tabelaB.titulo}" num raio de ${raioKm}km`
    const top = contagens
      .map((v, i) => ({ nome: tabelaA.linhas[indicesA[i]]?.[iNome], v }))
      .filter((x): x is { nome: string; v: number } => !!x.nome)
      .sort((a, b) => b.v - a.v)
      .slice(0, 15)
    if (top.length >= 2) {
      ctx.graficos.push({
        passo_id: `${passo.id}_buffer`,
        tipo: 'barra',
        titulo: passo.descricao_humana,
        eixoX: top.map((x) => x.nome),
        series: [{ nome: rotuloSerie, valores: top.map((x) => x.v) }],
      })
    }
  }
}

export type PassoExecutavel = PassoPlano & {
  coluna_metrica?: string
  coluna_metrica_2?: string
  coluna_grupo?: string
  coluna_tempo?: string
  nivel_geo?: string
  normalizacao?: string
  /** Qual dos datasets seleccionados este passo lê. Sem isto, um plano com 2-3 datasets só
   *  conseguia mesmo usar o primeiro — os restantes eram carregados e nunca lidos. */
  dataset_id?: number
  /** Só para 'juntar_datasets': o segundo dataset a combinar com dataset_id. */
  dataset_id_2?: number
  /** Restringe uma agregação por nivel_geo a só as unidades dentro desta (ex.: "Inhambane" para
   *  "distritos de Inhambane" em vez de todos os distritos do país). Nome de uma unidade
   *  administrativa de qualquer nível, resolvido via resolverUnidadePorNome. */
  filtro_unidade?: string
}

/**
 * execucao_codigo, distancia_minima e contagem_buffer não têm campos de schema dedicados: a API
 * de saída estruturada recusa o schema do Planeamento acima de ~15-16 propriedades por passo
 * ("Grammar compilation timed out" / "Schema is too complex", confirmado ao vivo nesta sessão —
 * ver PLANO-INTELIGENCIA-PRO-MAX.md, Fase 3). Por isso estes três métodos reaproveitam campos já
 * existentes com um significado diferente do habitual, só quando o método é um destes: */
function instrucaoCodigo(passo: PassoExecutavel): string {
  return passo.coluna_metrica || passo.descricao_humana
}
function limiarOuRaioKm(passo: PassoExecutavel): number | null {
  return passo.coluna_grupo ? paraNumero(passo.coluna_grupo) : null
}

/**
 * Rótulo do período seguinte a uma série temporal, para a projecção do Mann-Kendall (Fase 5,
 * pilar 6). Quando os dois últimos rótulos são anos/números com um espaçamento regular,
 * extrapola-se o próximo; senão (rótulos de texto livre, ex.: nomes de ronda de inquérito), fica
 * um rótulo genérico em vez de inventar um ano que pode não corresponder a nada real.
 */
function proximoRotuloPeriodo(tempos: string[]): string {
  if (tempos.length < 2) return 'próximo período'
  const nums = tempos.slice(-2).map((t) => Number.parseFloat(t))
  if (nums.every((n) => Number.isFinite(n))) {
    const passo = nums[1] - nums[0]
    return String(Math.round(nums[1] + passo))
  }
  return 'próximo período'
}

export async function executarPasso(passo: PassoExecutavel, ctx: ContextoExecucao): Promise<void> {
  if (!existeMetodo(passo.metodo)) {
    throw new Error(`Passo ${passo.id}: método "${passo.metodo}" não existe no catálogo`)
  }

  if (passo.metodo === 'juntar_datasets') {
    await executarJuncaoDatasets(passo, ctx)
    return
  }
  if (passo.metodo === 'distancia_minima') {
    await executarDistanciaMinima(passo, ctx)
    return
  }
  if (passo.metodo === 'contagem_buffer') {
    await executarContagemBuffer(passo, ctx)
    return
  }

  const primeiroId = Array.from(ctx.tabelas.keys())[0]
  const idEscolhido = passo.dataset_id !== undefined && ctx.tabelas.has(passo.dataset_id)
    ? passo.dataset_id
    : primeiroId
  if (idEscolhido === undefined) throw new Error('Nenhum dataset legível')
  const tabela = ctx.tabelas.get(idEscolhido)!
  let ligacao = ctx.ligacoes.get(idEscolhido) || null
  const nomeDataset = tabela.titulo

  // "Distritos DENTRO de Inhambane" é diferente de "distritos do país inteiro": sem isto,
  // nivel_geo agregava sempre ao país inteiro, e um passo destinado a uma só província devolvia
  // (com rótulo enganador) o resultado nacional — errado em silêncio, sem nunca lançar um erro.
  if (passo.filtro_unidade && ligacao) {
    const unidadeFiltro = await resolverUnidadePorNome(passo.filtro_unidade)
    if (!unidadeFiltro) {
      throw new Error(
        `Passo ${passo.id}: "${passo.filtro_unidade}" não corresponde a nenhuma unidade administrativa conhecida`
      )
    }
    const ligacoesFiltradas = restringirLigacoesAUnidade(ligacao.ligacoes, unidadeFiltro.codigo)
    if (ligacoesFiltradas.size === 0) {
      throw new Error(
        `Passo ${passo.id}: nenhuma linha do dataset cai dentro de "${unidadeFiltro.nome}"`
      )
    }
    ligacao = { ...ligacao, ligacoes: ligacoesFiltradas }
  }

  // execucao_codigo (PLANO-INTELIGENCIA-PRO-MAX.md, Fase 2): último recurso do catálogo. Chega
  // aqui só quando o Planeamento decidiu explicitamente que nenhum método normal cobre a
  // sub-pergunta — o código corre de verdade sobre os dados reais deste dataset, num sandbox
  // isolado sem acesso à rede, nunca sobre memória do modelo (R1 continua a valer).
  if (passo.metodo === 'execucao_codigo') {
    const instrucao = instrucaoCodigo(passo)
    // Cobre a esmagadora maioria dos datasets do portal por inteiro (ex.: as 9 535 linhas de
    // Escolas cabem à vontade): um corte demasiado baixo não é só "menos preciso", é enviesado —
    // fica a ler só um PREFIXO da tabela, e um filtro por distrito/categoria pode ficar
    // sistematicamente sub-representado ou ausente consoante onde as suas linhas caem na ordem
    // original, em vez de uma amostra aleatória representativa.
    const LIMITE_LINHAS_CODIGO = 15000
    const saida = await executarComCodigo(
      { titulo: tabela.titulo, colunas: tabela.colunas, linhas: tabela.linhas, n_linhas: tabela.n_linhas },
      instrucao,
      LIMITE_LINHAS_CODIGO
    )
    ctx.custoExecucaoCodigo += custoUsd(modeloPara('codigo'), saida.tokens_entrada, saida.tokens_saida)
    ctx.codigoExecutado.push({ passo_id: passo.id, instrucao, codigo: saida.codigo })

    if (saida.resultado.tipo === 'impossivel') {
      throw new Error(`execucao_codigo: ${saida.resultado.motivo}`)
    }
    if (saida.resultado.tipo === 'escalar') {
      const { valor, unidade } = saida.resultado
      const formato = typeof valor === 'number' ? (Number.isInteger(valor) ? 'inteiro' : 'decimal') : 'texto'
      registarCalc(ctx, passo.id, valor, unidade || '', formato, passo, [nomeDataset], tabela.n_linhas)
    } else {
      for (const item of saida.resultado.itens) {
        const slug = item.nome
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '') || 'item'
        const formato = Number.isInteger(item.valor) ? 'inteiro' : 'decimal'
        registarCalc(ctx, `${passo.id}_${slug}`, item.valor, saida.resultado.unidade || '', formato, passo, [nomeDataset], tabela.n_linhas)
      }
      registarCalc(ctx, `${passo.id}_n_itens`, saida.resultado.itens.length, '', 'inteiro', passo, [nomeDataset], tabela.n_linhas)
    }
    if (tabela.n_linhas > LIMITE_LINHAS_CODIGO) {
      ctx.avisos.push(
        `${passo.descricao_humana}: o cálculo por código correu sobre uma amostra de ${LIMITE_LINHAS_CODIGO} das ${tabela.n_linhas} linhas de "${nomeDataset}".`
      )
    }
    return
  }

  // "Quais províncias têm hospital central" e afins: resumo_estatistico com nivel_geo só sabe
  // contar TODAS as linhas por unidade, sem separar por categoria; comparar_grupos só sabe
  // comparar categorias a nível nacional, sem as separar por unidade. Nenhum dos dois cruza as
  // duas dimensões ao mesmo tempo — é isso que fazia o mapa (filtro interactivo no browser, sobre
  // os pontos brutos) "saber" uma resposta que a narrativa dizia não conseguir calcular. Não é um
  // caso especial de um dataset: qualquer dataset com geometria + coluna categórica tem este
  // problema, por isso o método fica no catálogo, não escondido aqui.
  if (passo.metodo === 'distribuicao_categoria_geo') {
    if (!ligacao) throw new Error(`Passo ${passo.id}: dataset sem ligação geográfica`)
    if (!passo.coluna_grupo) throw new Error(`Passo ${passo.id}: distribuicao_categoria_geo exige coluna_grupo`)
    const nivel = (passo.nivel_geo as NivelAdmin) || ligacao.nivel

    const categorias = colunaValores(tabela, passo.coluna_grupo)
    const distintas = Array.from(new Set(categorias.filter((c) => c && c.trim())))
    if (distintas.length === 0) {
      throw new Error(`Passo ${passo.id}: coluna "${passo.coluna_grupo}" sem valores`)
    }
    if (distintas.length > 30) {
      throw new Error(
        `Passo ${passo.id}: "${passo.coluna_grupo}" tem ${distintas.length} categorias distintas, ` +
          `demasiadas para cruzar com geografia de forma legível`
      )
    }

    const unidades = await carregarUnidades(nivel)
    const nomePorCodigo = new Map(unidades.map((u) => [u.codigo, u.nome]))
    const digitos: Record<NivelAdmin, number> = { admin1: 2, admin2: 4, admin3: 6 }
    const cortar = (codigo: string) => codigo.slice(0, digitos[nivel])

    for (const categoria of distintas) {
      const codigosComCategoria = new Set<string>()
      let total = 0
      Array.from(ligacao.ligacoes).forEach(([indiceLinha, codigoOrigem]) => {
        if (categorias[indiceLinha] !== categoria) return
        const codigo = cortar(codigoOrigem)
        if (!nomePorCodigo.has(codigo)) return
        codigosComCategoria.add(codigo)
        total++
      })
      if (codigosComCategoria.size === 0) continue

      const nomesUnidades = Array.from(codigosComCategoria)
        .map((c) => nomePorCodigo.get(c)!)
        .sort()
      // Slug determinístico e estável a partir do valor real da categoria: é o que a narrativa
      // usa para citar {{calc:...}}, por isso tem de ser previsível a partir do texto da pergunta.
      const slug = categoria
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
      registarCalc(
        ctx,
        `${passo.id}_${slug}_unidades`,
        nomesUnidades.join(', '),
        '',
        'texto',
        passo,
        [nomeDataset],
        total
      )
      registarCalc(
        ctx,
        `${passo.id}_${slug}_n_unidades`,
        codigosComCategoria.size,
        nivel === 'admin1' ? 'províncias' : nivel === 'admin2' ? 'distritos' : 'postos',
        'inteiro',
        passo,
        [nomeDataset],
        total
      )
      registarCalc(ctx, `${passo.id}_${slug}_total`, total, '', 'inteiro', passo, [nomeDataset], total)
    }
    return
  }

  const familiaGeo = [
    'moran_global',
    'moran_local_lisa',
    'getis_ord_gi_estrela',
    'geary_c',
  ].includes(passo.metodo)

  if (familiaGeo) {
    if (!ligacao) throw new Error(`Passo ${passo.id}: dataset sem ligação geográfica`)

    const nivel = (passo.nivel_geo as NivelAdmin) || ligacao.nivel
    const agregacao = passo.coluna_metrica ? 'soma' : 'contagem'
    const porUnidade = await agregarPorUnidade(
      tabela,
      ligacao,
      passo.coluna_metrica || tabela.colunas[0],
      agregacao,
      nivel
    )
    if (porUnidade.length < 4) {
      throw new Error(`Passo ${passo.id}: apenas ${porUnidade.length} unidades, insuficiente`)
    }

    const unidades = await carregarUnidades(nivel)
    const porCodigo = mesclarPopulacao(unidades, ctx.enriquecimentoPopulacao.get(nivel))

    // R9: nunca contagem absoluta em análise espacial destinada a mapa.
    const normalizacao = passo.normalizacao && passo.normalizacao !== 'nenhuma'
      ? passo.normalizacao
      : 'densidade_km2'
    const valores = normalizarPorUnidade(porUnidade, porCodigo, normalizacao, passo.id)

    const centroides = porUnidade
      .map((u) => porCodigo.get(u.codigo)?.centroide)
      .filter((c): c is [number, number] => !!c)
    if (centroides.length !== porUnidade.length) {
      throw new Error(`Passo ${passo.id}: centróides em falta para algumas unidades`)
    }

    const W = pesosKnn(centroides, Math.min(5, porUnidade.length - 1))
    const resultado = invocarMetodo(passo.metodo, [valores, W])

    ctx.series.push({
      passo_id: passo.id,
      nivel,
      unidades: porUnidade.map((u, i) => ({ codigo: u.codigo, nome: u.nome, valor: valores[i] })),
      metrica: passo.coluna_metrica ? rotularColuna(passo.coluna_metrica) : 'contagem',
      normalizacao,
    })

    if (Array.isArray(resultado)) {
      // LISA e Gi* devolvem uma entrada por unidade: o que interessa em texto é a contagem de
      // unidades significativas, não a lista inteira.
      // LISA devolve o rótulo em "categoria" e Gi* em "classificacao": ler só um dos campos
      // fazia o LISA reportar sempre zero unidades significativas, o que parecia uma
      // discordância entre métodos quando era apenas um campo não lido.
      const significativas = resultado.filter((r: any) => {
        const rotulo = r?.classificacao ?? r?.categoria
        return typeof rotulo === 'string' && rotulo !== 'nao_significativo' && rotulo !== 'ns'
      })
      registarCalc(
        ctx,
        `${passo.id}_n_significativas`,
        significativas.length,
        'unidades',
        'inteiro',
        passo,
        [nomeDataset],
        porUnidade.length
      )
      const nomes = significativas
        .map((r: any) => porUnidade[r.indice]?.nome)
        .filter(Boolean)
        .slice(0, 6)
      if (nomes.length) {
        registarCalc(
          ctx,
          `${passo.id}_unidades`,
          nomes.join(', '),
          '',
          'texto',
          passo,
          [nomeDataset],
          porUnidade.length
        )
      }

      // Além dos escalares, a classificação por unidade (hotspot/coldspot/quadrante LISA) é ela
      // própria um mapa: é o que torna visível ONDE está a concentração, não só quantas unidades.
      ctx.series.push({
        passo_id: `${passo.id}_classificacao`,
        nivel,
        modo: 'categorico',
        unidades: porUnidade.map((u, i) => {
          const rotulo = resultado[i]?.classificacao ?? resultado[i]?.categoria ?? 'nao_significativo'
          return {
            codigo: u.codigo,
            nome: u.nome,
            valor: SEVERIDADE_CATEGORIA[rotulo] ?? 0,
            categoria: rotulo,
          }
        }),
        metrica: `${passo.descricao_humana} (classificação)`,
        normalizacao: 'nenhuma',
      })
    } else {
      achatarResultado(ctx, passo, resultado, [nomeDataset], porUnidade.length)
    }
    return
  }

  // Métodos não espaciais. Cada família tem uma aridade diferente: passar sempre um único
  // array produziria "undefined.filter" nos métodos de duas ou três variáveis, que foi
  // exactamente o que aconteceu antes desta distinção existir.
  const METODOS_BIVARIADOS = ['correlacao_pearson', 'correlacao_spearman', 'regressao_linear']

  // Nomes das unidades da última chamada geográfica a serieDe, na mesma ordem dos valores
  // devolvidos — sem isto, "qual província tem mais escolas" agrega correctamente por província
  // (é o que o mapa/gráfico mostram) mas a narrativa não tem como saber QUAL nome corresponde ao
  // máximo, só o número. Ver uso mais abaixo, espelhando o mesmo caminho que já existe para
  // "qual linha tem o valor máximo" quando o passo não é geográfico.
  const serieGeoRef: { nomes: string[] | null } = { nomes: null }

  /** Série de uma coluna: agregada por unidade quando o passo é geográfico, bruta caso contrário. */
  const serieDe = async (coluna: string | undefined, registarSerie = false): Promise<number[]> => {
    if (passo.nivel_geo && ligacao) {
      // Sem coluna métrica, "quantas escolas" é uma contagem de registos por unidade. Somar uma
      // coluna de texto daria zero em todas as unidades, que foi o defeito que tornou a primeira
      // análise inteira vazia.
      const usaContagem = !coluna || colunaNumerica(tabela, coluna).length === 0
      const nivel = passo.nivel_geo as NivelAdmin
      const porUnidade = await agregarPorUnidade(
        tabela,
        ligacao,
        coluna || tabela.colunas[0],
        usaContagem ? 'contagem' : 'soma',
        nivel
      )

      const normalizacao = passo.normalizacao && passo.normalizacao !== 'nenhuma' ? passo.normalizacao : 'nenhuma'
      const valoresNormalizados =
        normalizacao === 'nenhuma'
          ? porUnidade.map((u) => u.valor)
          : normalizarPorUnidade(
              porUnidade,
              mesclarPopulacao(await carregarUnidades(nivel), ctx.enriquecimentoPopulacao.get(nivel)),
              normalizacao,
              passo.id
            )

      serieGeoRef.nomes = porUnidade.map((u) => u.nome)

      if (registarSerie) {
        ctx.series.push({
          passo_id: passo.id,
          nivel,
          unidades: porUnidade.map((u, i) => ({ codigo: u.codigo, nome: u.nome, valor: valoresNormalizados[i] })),
          metrica: coluna ? rotularColuna(coluna) : 'contagem de registos',
          normalizacao,
        })
      }
      return valoresNormalizados
    }
    serieGeoRef.nomes = null
    return coluna ? colunaNumerica(tabela, coluna) : []
  }

  if (passo.metodo === 'perfil_coluna') {
    const coluna = passo.coluna_metrica || tabela.colunas[0]
    const r: any = invocarMetodo(passo.metodo, [coluna, colunaValores(tabela, coluna)])
    achatarResultado(ctx, passo, r, [nomeDataset], tabela.n_linhas)

    if (typeof r?.completude_pct === 'number' && !ctx.qualidade.some((q) => q.coluna === coluna)) {
      ctx.qualidade.push({
        coluna: rotularColuna(coluna),
        completude_pct: r.completude_pct,
        n_distintos: r.n_distintos ?? 0,
        tipo: r.tipo || 'desconhecido',
      })
    }

    // Coluna categórica: a repartição por categoria é a forma mais legível de "o que tem esta
    // coluna", não só a contagem de distintos escondida num escalar. Mas só quando os valores SE
    // REPETEM: uma coluna de nomes (quase tudo distinto, ex.: nome da própria unidade) não tem
    // "categorias", tem identificadores — um gráfico com uma fatia por nome de unidade não
    // responde a nada, só lista o ficheiro em forma de rosca.
    const ehRealmenteCategorica =
      typeof r?.n_distintos === 'number' && typeof r?.n_preenchidos === 'number' && r.n_preenchidos > 0
        ? r.n_distintos <= r.n_preenchidos * 0.5
        : true
    if (Array.isArray(r?.top_categorias) && r.top_categorias.length >= 2 && ehRealmenteCategorica) {
      // Pizza só até 6 fatias: acima disso a legenda deixa de caber e fica ilegível. Mais do que
      // isso, NENHUMA categoria real fica de fora escondida num "Outros" — passa a barra
      // ordenada, que escala bem a muitas categorias e mostra tudo com o próprio nome.
      const tipo = r.top_categorias.length <= 6 ? 'pizza' : 'barra'
      ctx.graficos.push({
        passo_id: passo.id,
        tipo,
        titulo: passo.descricao_humana,
        eixoX: r.top_categorias.map((c: any) => c.valor),
        series: [{ nome: coluna, valores: r.top_categorias.map((c: any) => c.n) }],
      })
    }
    return
  }

  if (passo.metodo === 'comparar_grupos') {
    if (!passo.coluna_grupo) throw new Error(`Passo ${passo.id}: comparar_grupos exige coluna_grupo`)
    const grupos = colunaValores(tabela, passo.coluna_grupo)
    const metrica = colunaValores(tabela, passo.coluna_metrica || '').map(paraNumero)
    const contagem = new Map<string, number>()
    for (const g of grupos) if (g) contagem.set(g, (contagem.get(g) || 0) + 1)
    const distintos = Array.from(contagem).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([g]) => g)
    if (distintos.length < 2) throw new Error(`Passo ${passo.id}: menos de dois grupos`)
    const a = metrica.filter((v, i) => v !== null && grupos[i] === distintos[0]) as number[]
    const b = metrica.filter((v, i) => v !== null && grupos[i] === distintos[1]) as number[]
    if (a.length < 2 || b.length < 2) {
      throw new Error(`Passo ${passo.id}: grupos sem valores numéricos suficientes`)
    }
    const r = invocarMetodo(passo.metodo, [a, b, distintos[0], distintos[1]])
    achatarResultado(ctx, passo, r, [nomeDataset], a.length + b.length)

    // Além dos escalares (média, p, cohen_d), a comparação é também um gráfico de barras dos
    // dois grupos: o número sozinho não mostra a forma da diferença.
    const mA = a.reduce((s, v) => s + v, 0) / a.length
    const mB = b.reduce((s, v) => s + v, 0) / b.length
    ctx.graficos.push({
      passo_id: passo.id,
      tipo: 'barra',
      titulo: passo.descricao_humana,
      eixoX: [distintos[0], distintos[1]],
      series: [{ nome: passo.coluna_metrica || 'valor', valores: [mA, mB] }],
      categoria: 'comparativo',
    })
    return
  }

  if (METODOS_BIVARIADOS.includes(passo.metodo) || passo.metodo === 'detectar_simpson') {
    const x = await serieDe(passo.coluna_metrica)
    const y = await serieDe(passo.coluna_metrica_2)
    if (x.length < 3 || y.length < 3 || x.length !== y.length) {
      throw new Error(
        `Passo ${passo.id}: ${passo.metodo} exige duas séries numéricas do mesmo tamanho ` +
          `(obteve ${x.length} e ${y.length}); verificar coluna_metrica e coluna_metrica_2`
      )
    }
    const args: unknown[] = [x, y]
    if (passo.metodo === 'detectar_simpson') {
      if (!passo.coluna_grupo) throw new Error(`Passo ${passo.id}: detectar_simpson exige coluna_grupo`)
      args.push(colunaValores(tabela, passo.coluna_grupo).slice(0, x.length))
    }
    const r = invocarMetodo(passo.metodo, args)
    achatarResultado(ctx, passo, r, [nomeDataset], x.length)

    // Pearson/Spearman devolvem só r e p: sem os pontos brutos não se vê a FORMA da relação
    // (linear, curva, agrupada), que é exactamente o que um coeficiente sozinho pode esconder.
    if (passo.metodo === 'correlacao_pearson' || passo.metodo === 'correlacao_spearman') {
      const LIMITE_PONTOS = 500
      const passoAmostragem = Math.max(1, Math.ceil(x.length / LIMITE_PONTOS))
      const xAmostrado = x.filter((_, i) => i % passoAmostragem === 0)
      const yAmostrado = y.filter((_, i) => i % passoAmostragem === 0)
      ctx.graficos.push({
        passo_id: passo.id,
        tipo: 'dispersao',
        titulo: passo.descricao_humana,
        eixoX: xAmostrado.map((v) => String(v)),
        series: [{ nome: passo.coluna_metrica_2 || 'valor', valores: yAmostrado }],
      })
    }
    return
  }

  const METODOS_TEMPORAIS = ['media_movel', 'indexar_base_100', 'tendencia_mann_kendall']
  if (METODOS_TEMPORAIS.includes(passo.metodo) && passo.coluna_tempo) {
    if (!passo.coluna_metrica) throw new Error(`Passo ${passo.id}: ${passo.metodo} exige coluna_metrica`)

    // Ordena por coluna_tempo antes de calcular: tendencia_mann_kendall e media_movel dependem
    // da ORDEM da série, não só dos valores. Sem isto, se a tabela não estivesse já em ordem
    // cronológica, a tendência calculada seria sobre uma sequência arbitrária de linhas e o
    // resultado ("tendência crescente/decrescente") podia simplesmente estar errado.
    const temposBrutos = colunaValores(tabela, passo.coluna_tempo)
    const valoresBrutos = colunaValores(tabela, passo.coluna_metrica).map(paraNumero)
    const paresValidos = temposBrutos
      .map((t, i) => ({ t, v: valoresBrutos[i] }))
      .filter((p): p is { t: string; v: number } => !!p.t?.trim() && p.v !== null)
    paresValidos.sort((a, b) => {
      const na = Number.parseFloat(a.t)
      const nb = Number.parseFloat(b.t)
      return Number.isFinite(na) && Number.isFinite(nb) ? na - nb : a.t.localeCompare(b.t)
    })

    if (paresValidos.length < 3) {
      throw new Error(
        `Passo ${passo.id}: ${passo.metodo} exige uma série temporal com pelo menos 3 pontos ` +
          `válidos em "${passo.coluna_tempo}", encontrou ${paresValidos.length}`
      )
    }

    const tempos = paresValidos.map((p) => p.t)
    const valoresOrdenados = paresValidos.map((p) => p.v)
    const resultado = invocarMetodo(passo.metodo, [valoresOrdenados])

    if (Array.isArray(resultado)) {
      // media_movel e indexar_base_100 devolvem uma série, não um número: sem este caminho
      // ficariam invisíveis do mesmo modo que a curva de Lorenz ficava antes de existir.
      ctx.graficos.push({
        passo_id: passo.id,
        tipo: 'linha',
        titulo: passo.descricao_humana,
        eixoX: tempos,
        series: [{ nome: rotularColuna(passo.coluna_metrica), valores: resultado as (number | null)[] }],
        categoria: 'temporal',
      })
      return
    }

    // tendencia_mann_kendall devolve só um escalar (z, p, tendência) — sem tendência
    // estatisticamente significativa, é honesto não desenhar uma recta de projecção (seria
    // inventar sinal onde há ruído), mas os valores REAIS observados ano a ano continuam a ser
    // um facto, não uma inferência: mostrá-los não é o mesmo que declarar uma tendência.
    // Antes disto existir, "sem tendência significativa" ficava sem gráfico nenhum.
    if (passo.metodo === 'tendencia_mann_kendall') {
      // Quando HÁ tendência significativa (PLANO-INTELIGENCIA-PRO-MAX.md, Fase 5, pilar 6): o
      // próprio método já calculou uma projecção honesta a partir do declive de Sen, com IC —
      // estende-se a série com mais um ponto (nulo em todos os períodos observados, real só no
      // novo) para o gráfico mostrar a continuidade sem misturar observado e projectado na
      // mesma linha sólida.
      const resultadoObj = resultado as Record<string, unknown>
      const temProjecao =
        typeof resultadoObj?.projecao_proximo_periodo === 'number' && Number.isFinite(resultadoObj.projecao_proximo_periodo)
      if (temProjecao) {
        const proximoRotulo = proximoRotuloPeriodo(tempos)
        const projecaoValor = resultadoObj.projecao_proximo_periodo as number
        ctx.graficos.push({
          passo_id: passo.id,
          tipo: 'linha',
          titulo: passo.descricao_humana,
          eixoX: [...tempos, proximoRotulo],
          series: [
            { nome: rotularColuna(passo.coluna_metrica), valores: [...valoresOrdenados, null] },
            {
              nome: 'Projecção (declive de Sen, não garantia)',
              valores: [
                ...valoresOrdenados.slice(0, -1).map(() => null),
                valoresOrdenados[valoresOrdenados.length - 1],
                projecaoValor,
              ],
            },
          ],
          categoria: 'temporal',
        })
      } else {
        ctx.graficos.push({
          passo_id: passo.id,
          tipo: 'linha',
          titulo: passo.descricao_humana,
          eixoX: tempos,
          series: [{ nome: rotularColuna(passo.coluna_metrica), valores: valoresOrdenados }],
          categoria: 'temporal',
        })
      }
    }

    achatarResultado(ctx, passo, resultado, [nomeDataset], valoresOrdenados.length)
    return
  }

  // Restantes métodos: uma série de valores.
  const valores = await serieDe(passo.coluna_metrica, true)
  if (valores.length === 0) {
    throw new Error(
      `Passo ${passo.id}: sem valores numéricos` +
        (passo.coluna_metrica ? ` na coluna "${passo.coluna_metrica}"` : ' e sem nível geográfico para contar por unidade')
    )
  }
  const resultado = invocarMetodo(passo.metodo, [valores])

  if (passo.metodo === 'curva_lorenz' && Array.isArray(resultado)) {
    // Um array de pontos não cabe numa célula (não é um número único): antes deste caminho
    // existir, a curva era calculada e o resultado desaparecia em silêncio, invisível na
    // análise. A diagonal de igualdade perfeita entra como referência (excelência R9/Parte 9):
    // sem ela a curva sozinha não diz se a desigualdade é muita ou pouca.
    const pontos = resultado as { pop_acum: number; valor_acum: number }[]
    if (pontos.length > 0) {
      ctx.graficos.push({
        passo_id: passo.id,
        tipo: 'linha',
        titulo: passo.descricao_humana,
        eixoX: pontos.map((p) => `${p.pop_acum}%`),
        series: [{ nome: 'Curva de Lorenz', valores: pontos.map((p) => p.valor_acum) }],
        referencia: { nome: 'Igualdade perfeita', valores: pontos.map((p) => p.pop_acum) },
      })
    }
    return
  }

  // "Qual é o maior X" não fica respondida por um número: resumo_estatistico dá o valor máximo,
  // não o nome de quem o tem. Sem nível geográfico (não é um agregado por província), o máximo
  // e o mínimo correspondem a UMA linha concreta do dataset — vale a pena descobrir qual.
  if (passo.metodo === 'resumo_estatistico' && !passo.nivel_geo && passo.coluna_metrica) {
    const colunaNome = detectarColunaRotulo(tabela, [passo.coluna_metrica])
    if (colunaNome) {
      const pares = colunaValores(tabela, passo.coluna_metrica)
        .map((v, i) => ({ v: paraNumero(v), i }))
        .filter((p): p is { v: number; i: number } => p.v !== null)
      if (pares.length === valores.length) {
        const nomes = colunaValores(tabela, colunaNome)
        let iMax = 0
        let iMin = 0
        pares.forEach((p, idx) => {
          if (p.v > pares[iMax].v) iMax = idx
          if (p.v < pares[iMin].v) iMin = idx
        })
        const linhaMax = pares[iMax].i
        const linhaMin = pares[iMin].i
        if (nomes[linhaMax]) {
          registarCalc(ctx, `${passo.id}_nome_max`, nomes[linhaMax], '', 'texto', passo, [nomeDataset], 1)
        }
        if (nomes[linhaMin] && linhaMin !== linhaMax) {
          registarCalc(ctx, `${passo.id}_nome_min`, nomes[linhaMin], '', 'texto', passo, [nomeDataset], 1)
        }
        // Destaque geográfico: só faz sentido quando o dataset tem geometria própria por linha
        // (não agregada a unidades administrativas) — é isso que permite desenhar SÓ a unidade
        // vencedora no mapa, isolada, em vez do coroplético do país inteiro.
        if (tabela.geometrias?.[linhaMax] && nomes[linhaMax]) {
          ctx.destaques.push({
            passo_id: passo.id,
            titulo: passo.descricao_humana,
            nome: nomes[linhaMax],
            valor: pares[iMax].v,
            metrica: passo.coluna_metrica ? rotularColuna(passo.coluna_metrica) : 'valor',
            geometry: tabela.geometrias[linhaMax],
          })
        }
      }
    }
  }

  // Mesmo problema que o bloco acima, mas para o caso geográfico: "quantas escolas por
  // província, qual tem mais" agrega correctamente (é o que já alimenta o mapa/gráfico em
  // ctx.series), mas sem isto a narrativa só recebia o número do máximo, nunca soube dizer QUAL
  // província — respondia "não é possível indicar" apesar do mapa já mostrar a resposta certa.
  if (passo.metodo === 'resumo_estatistico' && passo.nivel_geo) {
    const nomes: string[] | null = serieGeoRef.nomes
    if (nomes && nomes.length === valores.length && nomes.length > 0) {
      let iMax = 0
      let iMin = 0
      valores.forEach((v, idx) => {
        if (v > valores[iMax]) iMax = idx
        if (v < valores[iMin]) iMin = idx
      })
      if (nomes[iMax]) {
        registarCalc(ctx, `${passo.id}_nome_max`, nomes[iMax], '', 'texto', passo, [nomeDataset], nomes.length)
      }
      if (nomes[iMin] && iMin !== iMax) {
        registarCalc(ctx, `${passo.id}_nome_min`, nomes[iMin], '', 'texto', passo, [nomeDataset], nomes.length)
      }

      // "Quais províncias têm X" (presença, não só a que tem mais): sem isto a narrativa só podia
      // citar o máximo/mínimo, nunca a lista completa — mesmo esta já estando em ctx.series a
      // alimentar o mapa. Só regista quando faz sentido como lista (nem todas, nem nenhuma).
      const presentes = nomes.filter((_, idx) => valores[idx] > 0)
      if (presentes.length > 0 && presentes.length < nomes.length) {
        registarCalc(
          ctx,
          `${passo.id}_unidades_presentes`,
          presentes.join(', '),
          '',
          'texto',
          passo,
          [nomeDataset],
          nomes.length
        )
        registarCalc(
          ctx,
          `${passo.id}_n_unidades_presentes`,
          presentes.length,
          '',
          'inteiro',
          passo,
          [nomeDataset],
          nomes.length
        )
      }
    }
  }

  // A unidade real da normalização tem de acompanhar o cálculo: um resumo estatístico sobre uma
  // série "densidade_km2" (que internamente é escala por 1000, não por km² directo) sem esta
  // etiqueta deixa o estágio de narrativa sem forma de saber a escala, e ele escreve "densidade"
  // como se fosse por km². Foi exactamente isto que o revisor adversarial apanhou por análise
  // dimensional: uma mediana de 15,6 "por km²" quando a densidade nacional real ronda 0,01/km².
  achatarResultado(ctx, passo, resultado, [nomeDataset], valores.length, unidadeNormalizacao(passo.normalizacao))
}

const UNIDADE_POR_NORMALIZACAO: Record<string, string> = {
  densidade_km2: 'por 1 000 km²',
  per_capita: 'por habitante',
  por_1000: 'por 1 000 habitantes',
  percentagem_do_total: '% do total',
}

function unidadeNormalizacao(normalizacao: string | undefined): string {
  if (!normalizacao || normalizacao === 'nenhuma') return ''
  return UNIDADE_POR_NORMALIZACAO[normalizacao] || ''
}
