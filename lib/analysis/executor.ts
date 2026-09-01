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
import { rotularColuna, traduzirValorCategoria, ehColunaIdTecnico } from './rotulos-cliente'
import {
  prepararCacheRotulosAprendidos,
  obterRotuloAprendidoSincrono,
  aprenderEmSegundoPlano,
  dicionarioAprendidoPara,
  pareceRotuloTecnico,
  pareceValorTecnico,
} from './rotulos-aprendidos'
import { executarComCodigo } from './execucao-codigo'
import { modeloPara, custoUsd } from './router'
import type { CelulaCalculada, PassoPlano } from './types'
import { escolherForma, type Distribuicao, type TipoGrafico } from './forma-do-grafico'

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
  /**
   * Os valores são a VARIAÇÃO entre dois momentos, com sinal.
   *
   * Declarado e nunca inferido da presença de negativos: um saldo migratório também tem negativos
   * e não é variação de nada. É isto que faz o mapa trocar a rampa sequencial pela escala
   * divergente centrada no zero.
   */
  variacao?: boolean
  /** 'categorico' quando `categoria` é que deve ditar a cor no mapa (ex.: hotspot/coldspot LISA/Gi*), não `valor`. */
  modo?: 'continuo' | 'categorico'
  /** Qual dataset produziu esta série — usado para só esconder a camada bruta de um dataset
   *  quando EXISTE uma série calculada PARA ESSE MESMO dataset, não para qualquer série de
   *  qualquer dataset (ver uso em DashboardApresentacao/AnaliseVisualizacoes). */
  dataset_id?: number
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
  tipo: TipoGrafico
  titulo: string
  eixoX: string[]
  series: { nome: string; valores: (number | null)[] }[]
  /** Linha de referência opcional (ex.: diagonal de igualdade perfeita na curva de Lorenz). */
  referencia?: { nome: string; valores: (number | null)[] }
  /** Unidade dos valores. Decide se somar faz sentido, e com isso que formas são honestas. */
  unidade?: string
  /** Ligações origem→destino, quando o passo mediu um percurso e não uma distribuição. */
  fluxos?: { origem: string; destino: string; valor: number }[]
  /** Resumos de distribuição por cinco números, um por caixa. */
  distribuicoes?: Distribuicao[]
  /** As três primeiras séries são o eixo horizontal, o vertical e o tamanho de cada bolha. */
  bolhas?: boolean
  /** As categorias são etapas encaixadas, cada uma dentro da anterior. */
  funil?: boolean
  /**
   * Se os valores são partes de um mesmo total. Viaja até ao dashboard porque o selector de forma
   * recalcula as alternativas do lado do cliente: sem isto, um treemap correcto vinha acompanhado
   * de um selector que só oferecia barra e linha, e nem sequer marcava a forma desenhada.
   */
  composicao?: boolean
  /** Porque é esta a forma. Guardado para o dashboard poder explicá-lo a quem pergunta. */
  porqueEstaForma?: string
  /** Marca gráficos que merecem secção dedicada no dashboard ("Análise Comparativa" /
   *  "Tendências e Evolução") em vez de caírem na grelha genérica — só quando a pergunta
   *  realmente produziu esse tipo de cálculo, nunca por omissão. */
  categoria?: 'comparativo' | 'temporal'
}

/**
 * Guarda um gráfico deixando a FORMA ser decidida pelos dados.
 *
 * Antes, cada sítio que produzia um gráfico escolhia o tipo à mão, e o que saía era quase sempre
 * uma barra: a mesma forma para uma repartição de um total, para uma matriz de duas dimensões e
 * para um percurso entre categorias. A escolha passou para `escolherForma`, que olha para o
 * número de séries, a cardinalidade do eixo, o sinal dos valores, a unidade e a densidade da
 * matriz — e devolve também a justificação, que fica visível no relatório.
 *
 * `forma` só se usa quando o próprio método determina o desenho e os números sozinhos não o
 * revelariam: uma curva de Lorenz é sempre uma curva, mesmo que o eixo pareça categórico.
 */
function empurrarGrafico(
  ctx: ContextoExecucao,
  g: {
    passo_id: string
    titulo: string
    eixoX: string[]
    series: { nome: string; valores: (number | null)[] }[]
    referencia?: { nome: string; valores: (number | null)[] }
    unidade?: string
    fluxos?: { origem: string; destino: string; valor: number }[]
    /** Declarar que os valores são partes de um mesmo total. Sem isto nunca sai pizza nem treemap. */
    composicao?: boolean
    distribuicoes?: Distribuicao[]
    bolhas?: boolean
    funil?: boolean
    categoria?: 'comparativo' | 'temporal'
    forma?: TipoGrafico
  }
) {
  const escolha = g.forma
    ? { tipo: g.forma, porque: '', alternativas: [] as TipoGrafico[] }
    : escolherForma({
        eixoX: g.eixoX,
        series: g.series,
        unidade: g.unidade,
        fluxos: g.fluxos,
        composicao: g.composicao,
        distribuicoes: g.distribuicoes,
        bolhas: g.bolhas,
        funil: g.funil,
      })

  ctx.graficos.push({
    passo_id: g.passo_id,
    tipo: escolha.tipo,
    titulo: g.titulo,
    eixoX: g.eixoX,
    series: g.series,
    ...(g.referencia ? { referencia: g.referencia } : {}),
    ...(g.unidade ? { unidade: g.unidade } : {}),
    ...(g.fluxos ? { fluxos: g.fluxos } : {}),
    ...(g.composicao ? { composicao: true } : {}),
    ...(g.distribuicoes ? { distribuicoes: g.distribuicoes } : {}),
    ...(g.bolhas ? { bolhas: true } : {}),
    ...(g.funil ? { funil: true } : {}),
    ...(g.categoria ? { categoria: g.categoria } : {}),
    ...(escolha.porque ? { porqueEstaForma: escolha.porque } : {}),
  })
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
  /**
   * Os registos em si, quando a pergunta pediu QUAIS e não só QUANTOS.
   *
   * Faltava um canal para isto e o defeito era visível: a "quantas escolas temos na cidade da Beira
   * e quais são?" o motor respondeu 105 e nunca disse uma única escola. O plano tinha decomposto o
   * "quais são" em "que TIPOS de escola existem", que é outra pergunta: os tipos são seis, as
   * escolas são cento e cinco, e quem perguntou queria a lista.
   *
   * Nenhum canal existente servia. `calcs` guarda números, `series` guarda um valor por unidade
   * geográfica e `graficos` guarda eixos: nomes de registos não são nenhuma dessas coisas.
   */
  listas: ListaRegistos[]
  /** Séries do mesmo indicador em vários momentos, para desenhar lado a lado. */
  multiplos: MultiploGeografico[]
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

/**
 * O mesmo indicador, em vários momentos, para ser desenhado lado a lado.
 *
 * Guardado como UM objecto com vários períodos, e não como várias séries soltas, por uma razão que
 * decide se a coisa funciona: os mapas de uma série de múltiplos pequenos têm de partilhar a MESMA
 * classificação. Se cada mapa calcular os seus próprios quartis, o vermelho de 2018 e o vermelho de
 * 2023 significam números diferentes, e a comparação que a figura promete é exactamente a que ela
 * impede. Mantê-los juntos torna a escala partilhada a coisa natural a fazer.
 */
export type MultiploGeografico = {
  passo_id: string
  metrica: string
  nivel: NivelAdmin
  unidade: string
  periodos: { rotulo: string; unidades: { codigo: string; nome: string; valor: number }[] }[]
}

/**
 * Uma lista de registos nomeados, tal como saiu dos dados.
 *
 * Guarda os valores tal e qual, sem os agregar: agregar é precisamente o que já se fazia e o que
 * deixava a segunda metade da pergunta por responder.
 */
export type ListaRegistos = {
  passo_id: string
  titulo: string
  /** A coluna de onde vieram os nomes, para quem quiser confirmar a origem. */
  coluna: string
  /** Unidade administrativa a que a lista foi restringida, quando houve filtro. */
  ambito: string | null
  itens: string[]
  /** Quantos existem ao todo. Difere de `itens.length` quando a lista foi cortada. */
  total: number
  /** Verdadeiro quando `itens` mostra só uma parte: obriga a dizê-lo no ecrã (R8). */
  truncada: boolean
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
  /** Traduções aprendidas em segundo plano (chave em minúsculas) para nomes de coluna e valores
   *  que o dicionário fixo não cobria — ver rotulos-aprendidos.ts. O componente cliente (que não
   *  tem acesso à base de dados) consulta isto antes de cair no dicionário fixo. */
  rotulosAprendidos?: { colunas: Record<string, string>; valores: Record<string, string> }
}

/**
 * max_allowed_packet do MySQL local foi subido de 1M para 16M (my.ini) especificamente para
 * guardar geometria bruta sem cortar feições — o mapa deve desenhar o dataset completo, nunca
 * uma amostra. 1513 estradas com 30 819 pontos (~1,4 MB de JSON) já cabem várias vezes dentro
 * dos 16 MB actuais.
 */
/**
 * Os períodos que têm mesmo valores, em ordem.
 *
 * Escrito depois de um defeito que custou uma análise inteira. A primeira versão tomava o primeiro
 * e o último valor DISTINTOS da coluna de tempo, e num ficheiro do portal isso deu 2015 e 2025: dois
 * anos que existem na coluna e não têm um único valor preenchido. O passo morreu com "0 unidades
 * com valor nos dois períodos" e a análise foi recusada, quando 2018 a 2024 estava lá inteiro.
 *
 * Uma coluna de anos costuma cobrir a ambição do ficheiro, não a sua realidade: os anos do plano
 * de recolha ficam lá, vazios, à espera. Escolher pelos extremos da coluna é escolher precisamente
 * as linhas que ninguém preencheu.
 *
 * Conta só as linhas dentro de `ligacoes`, que a esta altura já vêm filtradas pelo indicador e pela
 * unidade geográfica do passo: um ano cheio de dados de arroz não torna um passo sobre milho viável.
 */
function periodosComDados(
  tabela: Tabela,
  ligacoes: Map<number, string>,
  colunaTempo: string,
  colunaMetrica: string | null
): string[] {
  const tempos = colunaValores(tabela, colunaTempo)
  const valores = colunaMetrica ? colunaValores(tabela, colunaMetrica) : null
  const contagem = new Map<string, number>()
  Array.from(ligacoes.keys()).forEach((i) => {
    const periodo = (tempos[i] || '').trim()
    if (!periodo) return
    // Sem coluna de métrica o passo conta registos, e a própria existência da linha é o valor.
    if (valores && paraNumero(valores[i]) === null) return
    contagem.set(periodo, (contagem.get(periodo) || 0) + 1)
  })
  const comDados = Array.from(contagem.keys())
  const todosNumericos = comDados.every((d) => Number.isFinite(Number(d)))
  return todosNumericos
    ? comDados.sort((a, b) => Number(a) - Number(b))
    : comDados.sort((a, b) => a.localeCompare(b, 'pt'))
}

/** Acima disto cada mapa fica pequeno demais para se distinguir uma unidade de outra. */
const MAX_PERIODOS_MULTIPLOS = 6

/** Acima disto uma lista deixa de ser resposta e passa a ser um despejo do ficheiro. */
const LIMITE_ITENS_LISTA = 500

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
    listas: [],
    multiplos: [],
    qualidade: [],
    codigoExecutado: [],
    custoExecucaoCodigo: 0,
  }

  // PLANO-ROTULOS-E-VELOCIDADE.md, Frente A Fase 2: carrega a cache de nomes de coluna já
  // aprendidos (partilhada entre TODAS as análises, não por dataset) — depois desta chamada,
  // consultá-la é uma leitura de memória síncrona, sem custo, para o resto desta análise. Só
  // toca a base de dados na primeira vez que este processo do servidor arranca; análises
  // seguintes reaproveitam a mesma cache já carregada, custo zero.
  await prepararCacheRotulosAprendidos()

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

    if (t.geometrias && t.geometrias.length > 0) {
      const colunaNome = detectarColunaRotulo(t, [])
      const iColunaNome = colunaNome ? t.colunas.indexOf(colunaNome) : -1
      const colunasCategoricas = detectarColunasCategoricas(t, colunaNome ? [colunaNome] : [])
      const indicesCategoricas = colunasCategoricas.map((c) => t.colunas.indexOf(c))
      const tipoGeometria = t.geometrias.find((g) => g?.type)?.type || 'desconhecido'

      // "Filtro por província/distrito" não pode depender de o dataset ter, por acaso, uma
      // coluna de atributo chamada "Provincia" — a maioria dos shapefiles reais (estradas, rios,
      // linhas eléctricas) não tem nenhuma coluna administrativa, só geometria; é exactamente por
      // isso que `lig` acima teve de a derivar da própria geometria (ligarPorGeometria). Sem
      // reaproveitar aqui essa ligação já calculada, o mapa de pontos/linhas/polígonos ficava sem
      // filtro nenhum de âmbito geográfico, mesmo quando o motor já sabe a que unidade cada
      // feição pertence (é essa mesma ligação que já alimenta "Distância por província" nos
      // gráficos ao lado). Trunca sempre a admin1 (província): é o nível que faz sentido como
      // filtro de topo, independentemente do nível a que `lig` ficou resolvida.
      let provinciaPorLinha: Map<number, string> | null = null
      let distritoPorLinha: Map<number, string> | null = null
      if (lig) {
        const provincias = await carregarUnidades('admin1')
        const nomePorCodigo1 = new Map(provincias.map((u) => [u.codigo, u.nome]))
        provinciaPorLinha = new Map()
        for (const [indice, codigo] of Array.from(lig.ligacoes)) {
          const nome = nomePorCodigo1.get(codigo.slice(0, 2))
          if (nome) provinciaPorLinha.set(indice, nome)
        }
        // Distrito só faz sentido quando `lig` já resolveu a esse nível ou mais fino (admin2/3) —
        // truncar um código de 2 dígitos (só província) a 4 dígitos dava um "distrito" falso.
        if (lig.nivel === 'admin2' || lig.nivel === 'admin3') {
          const distritos = await carregarUnidades('admin2')
          const nomePorCodigo2 = new Map(distritos.map((u) => [u.codigo, u.nome]))
          distritoPorLinha = new Map()
          for (const [indice, codigo] of Array.from(lig.ligacoes)) {
            const nome = nomePorCodigo2.get(codigo.slice(0, 4))
            if (nome) distritoPorLinha.set(indice, nome)
          }
        }
      }
      // Nomes escolhidos para bater com os aliases que rotularColuna já reconhece (/^provinc/i,
      // /^distrit/i) — assim "Colorir por", a legenda e o detector de filtro em
      // AnaliseMapaPontos.tsx (que procuram uma coluna cujo rótulo traduzido seja "Província"/
      // "Distrito") tratam isto exactamente como tratariam uma coluna administrativa real do
      // próprio dataset, sem precisar de um caso especial.
      const NOME_COLUNA_PROVINCIA_DERIVADA = 'Provincia'
      const NOME_COLUNA_DISTRITO_DERIVADA = 'Distrito'
      const jaTemColunaProvincia = colunasCategoricas.some((c) => rotularColuna(c) === 'Província')
      const jaTemColunaDistrito = colunasCategoricas.some((c) => rotularColuna(c) === 'Distrito')
      const usarProvinciaDerivada = !!provinciaPorLinha && !jaTemColunaProvincia
      const usarDistritoDerivado = !!distritoPorLinha && !jaTemColunaDistrito

      // AnaliseMapaPontos.tsx (mapa de geometria própria) corre no browser, sem acesso nenhum à
      // base de dados aprendida — "REASON"/"PC to PC" ficavam em inglês ali mesmo depois de outros
      // sítios da análise (séries/destaques) já terem a correcção, porque esses são calculados
      // aqui no servidor e este mapa lê directamente o nome/valor bruto. A solução é embutir o
      // dicionário aprendido nos DADOS enviados ao cliente (dicionarioAprendidoPara), não tentar
      // dar acesso à base de dados ao componente. Também é aqui que se aprende o que ainda falta.
      const valoresDistintos = Array.from(
        new Set(colunasCategoricas.flatMap((c) => colunaValores(t, c).filter(Boolean)))
      )
      for (const c of colunasCategoricas) {
        if (pareceRotuloTecnico(c, rotularColuna(c))) aprenderEmSegundoPlano(c, 'coluna')
      }
      for (const v of valoresDistintos.slice(0, 60)) {
        if (pareceValorTecnico(v) && traduzirValorCategoria(v) === v) aprenderEmSegundoPlano(v, 'valor')
      }
      const rotulosAprendidos = dicionarioAprendidoPara(colunasCategoricas, valoresDistintos)

      ctx.camadasBrutas.push({
        dataset_id: id,
        titulo: t.titulo,
        tipoGeometria,
        colunasCategoricas: [
          ...colunasCategoricas,
          ...(usarProvinciaDerivada ? [NOME_COLUNA_PROVINCIA_DERIVADA] : []),
          ...(usarDistritoDerivado ? [NOME_COLUNA_DISTRITO_DERIVADA] : []),
        ],
        rotulosAprendidos,
        features: t.geometrias.map((g, i) => ({
          // Sem coluna de nome detectada no dataset (comum em shapefiles com só colunas técnicas,
          // ex.: cod_dist/cana_acuc), TODAS as feições caíam para o mesmo "nome" (o título do
          // dataset) — quebrava "Comparar" (que identifica a feição clicada pelo nome: com todas
          // iguais, comparava sempre a primeira feição consigo mesma) e os tooltips do mapa
          // (mostravam sempre o mesmo texto). Cai antes para o distrito/província já derivado da
          // geometria (`distritoPorLinha`/`provinciaPorLinha`, calculado acima), que já é único por
          // feição; só na ausência total de qualquer identificador usa um índice, nunca o título.
          nome:
            (iColunaNome >= 0 && t.linhas[i]?.[iColunaNome]) ||
            distritoPorLinha?.get(i) ||
            provinciaPorLinha?.get(i) ||
            `${t.titulo} #${i + 1}`,
          categorias: Object.fromEntries(
            [
              ...colunasCategoricas.map((c, j) => [c, indicesCategoricas[j] >= 0 ? t.linhas[i]?.[indicesCategoricas[j]] : undefined]),
              ...(usarProvinciaDerivada ? [[NOME_COLUNA_PROVINCIA_DERIVADA, provinciaPorLinha!.get(i)]] : []),
              ...(usarDistritoDerivado ? [[NOME_COLUNA_DISTRITO_DERIVADA, distritoPorLinha!.get(i)]] : []),
            ].filter(([, v]) => !!v)
          ),
          geometry: g,
        })),
        truncado: false,
      })
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
// "Path"/"Layer" são metadados de como o shapefile foi PREPARADO (o caminho no computador de
// quem exportou o ficheiro, ex.: "D:\PROJECTOS QGIS\...\Parque_Nacional_Gorongosa.shp"), nunca um
// dado sobre a feição em si — confirmado ao vivo: apareceu literalmente na UI como "Colorir por"
// e no painel de comparação, expondo o disco e a estrutura de pastas de quem tratou os dados.
// Nenhuma pessoa que usa o portal tem uso nenhum para isto.
const NOMES_COLUNA_META_FICHEIRO = /^(path|layer|filepath|file[_ ]?path|filename|arquivo|shapefile)$/i
function pareceCaminhoDeFicheiro(valores: string[]): boolean {
  const amostra = valores.slice(0, 20)
  if (amostra.length === 0) return false
  const comAspectoDeCaminho = amostra.filter((v) => /[\\/]/.test(v) && /\.(shp|zip|csv|geojson|json|kml|gpkg|dbf)$/i.test(v))
  return comAspectoDeCaminho.length / amostra.length > 0.5
}

function detectarColunasCategoricas(tabela: Tabela, excluir: string[]): string[] {
  const candidatos = tabela.colunas.filter((c) => !excluir.includes(c) && !NOMES_COLUNA_META_FICHEIRO.test(c.trim()))
  const avaliar = (c: string) => {
    const valores = colunaValores(tabela, c).filter(Boolean)
    if (valores.length < tabela.n_linhas * 0.5) return null
    if (pareceCaminhoDeFicheiro(valores)) return null
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
    registarCalc(
      ctx,
      passo.id,
      resultado,
      unidadeBase,
      unidadeBase === '%' ? 'percentagem' : 'numero',
      passo,
      datasets,
      linhas
    )
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
      // O formato vinha só do NOME da chave do resultado, e a percentagem é propriedade dos dados,
      // não do nome que o plano deu ao cálculo. Verificado ao vivo: a mesma análise mostrou "74,8%"
      // numa corrida e "74,8" noutra, conforme o plano baptizou o cálculo. Uma percentagem sem o
      // símbolo lê-se como número absoluto e muda o sentido da frase, por isso a unidade declarada
      // pelo próprio ficheiro (coluna "unit") manda mais do que a chave.
      const formato = /p$|^p_|pvalor|p_valor/i.test(chave)
        ? 'numero'
        : unidadeBase === '%'
          ? 'percentagem'
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
/**
 * Diz se uma coluna guarda um atributo DA UNIDADE, repetido em todas as linhas dessa unidade.
 *
 * "Province electricity access (%)" é um valor por província escrito em cada um dos 1094 postos
 * dessa província. Correlacionar duas colunas assim linha a linha não usa 411 observações
 * independentes: usa 11, repetidas. O coeficiente até pode sair certo, mas o p-valor vem de uma
 * amostra que não existe, e sai "p = 0" onde a amostra real daria algo como 0,02.
 *
 * Devolve um valor por unidade quando a coluna é constante dentro de cada uma, e null quando
 * varia (nesse caso as linhas são observações genuínas e não há nada a colapsar).
 */
export function atributoPorUnidade(
  tabela: Tabela,
  ligacao: ResultadoLigacao,
  coluna: string
): Map<string, number> | null {
  const indice = tabela.colunas.indexOf(coluna)
  if (indice === -1) return null

  const porUnidade = new Map<string, number>()
  for (const [linha, codigo] of Array.from(ligacao.ligacoes)) {
    const valor = paraNumero(tabela.linhas[linha]?.[indice])
    if (valor === null) continue
    const jaVisto = porUnidade.get(codigo)
    if (jaVisto === undefined) {
      porUnidade.set(codigo, valor)
    } else if (jaVisto !== valor) {
      return null // varia dentro da unidade: são observações a sério
    }
  }
  return porUnidade.size > 0 ? porUnidade : null
}

/**
 * Nomes de coluna que identificam QUAL indicador cada linha representa, em ficheiros de formato
 * longo. São a marca dos datasets alfanuméricos do portal (Data4Moz L02, L08, L20, ...).
 */
const PADRAO_COLUNA_INDICADOR = /^(variable_name(_\w+)?|variable_id|indicador|indicator|nome_variavel|variavel)$/i

/**
 * Diz se a tabela guarda vários indicadores na mesma coluna de valores, e qual coluna os separa.
 *
 * Agregar uma tabela destas sem restringir a um indicador soma coisas que não se somam: produção
 * em toneladas com área em hectares. Verificado ao vivo, e é por isso que esta função existe: uma
 * análise publicou "Manica é o maior produtor de milho, com 3 127 381 toneladas" quando o valor
 * real mais alto é 1 717 000. O número publicado não correspondia a indicador nenhum, nada falhou
 * e nenhum aviso apareceu.
 */
function colunaIndicadorDe(tabela: Tabela): string | null {
  const candidatas = tabela.colunas.filter((c) => PADRAO_COLUNA_INDICADOR.test(c.trim()))
  // O mesmo ficheiro traz "variable_id", "variable_name_en" e "variable_name_pt". Todas servem
  // para filtrar, mas a que vai no nome sugerido tem de ser a legível: dizer "filtra variable_id"
  // obriga a conhecer códigos como "L20_V001", enquanto "Produção de milho (toneladas)" é o que a
  // pergunta já usa. A ordem aqui decide o que aparece na mensagem de erro e no que o utilizador
  // acaba por ler em "o que isto não diz".
  const preferidas = [
    ...candidatas.filter((c) => /_pt$/i.test(c)),
    ...candidatas.filter((c) => /name/i.test(c) && !/_pt$/i.test(c)),
    ...candidatas.filter((c) => !/name/i.test(c)),
  ]
  for (const coluna of preferidas) {
    const i = tabela.colunas.indexOf(coluna)
    const distintos = new Set<string>()
    for (const linha of tabela.linhas) {
      const v = linha[i]
      if (v != null && String(v).trim() !== '') distintos.add(String(v).trim())
      if (distintos.size > 1) return coluna
    }
  }
  return null
}

/**
 * Recusa agregar um ficheiro de formato longo sem dizer QUAL indicador se quer.
 *
 * Falha em vez de avisar de propósito. Um passo falhado é declarado e a narrativa contorna-o; um
 * número que mistura toneladas com hectares entra na análise com ar de facto e ninguém o apanha.
 * É a mesma regra que já vale para os tokens {{calc:}} por resolver: mais vale não responder do
 * que responder com um número que não significa o que diz significar.
 */
/**
 * Escolhe o indicador a partir do que o passo diz que quer fazer.
 *
 * Bloquear quando o filtro falta é correcto mas insuficiente: verificado ao vivo, o planeador
 * omite-o com frequência, e a análise perdia quatro passos de uma vez, deixando a pergunta sem
 * resposta nenhuma. A descrição do passo ("Soma casos de TB notificados por província") nomeia o
 * indicador em linguagem corrente, e os valores da coluna também ("Casos de TB Notificados —
 * Todas as Formas"): comparar as duas coisas resolve a maioria dos casos sem adivinhação.
 *
 * Só decide quando há um vencedor CLARO e único. Empate ou ausência de palavras em comum devolve
 * null, e aí o passo falha como antes: escolher ao acaso entre "produção" e "área cultivada" seria
 * exactamente o erro silencioso que esta verificação existe para impedir.
 */
export function inferirIndicador(tabela: Tabela, coluna: string, passo: PassoExecutavel): FiltroCategoria | null {
  const indice = tabela.colunas.indexOf(coluna)
  if (indice === -1) return null

  const pedido = `${passo.descricao_humana || ''} ${passo.coluna_metrica || ''}`
  const termosPedido = new Set(
    normalizarCategoria(pedido)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 4)
  )
  if (termosPedido.size === 0) return null

  const distintos = new Set<string>()
  for (const linha of tabela.linhas) {
    const v = linha[indice]
    if (v != null && String(v).trim() !== '') distintos.add(String(v).trim())
  }

  let melhor: { valor: string; pontos: number } | null = null
  let segundo = 0
  for (const valor of Array.from(distintos)) {
    let pontos = 0
    for (const t of Array.from(normalizarCategoria(valor).split(/[^a-z0-9]+/))) {
      if (t.length >= 4 && termosPedido.has(t)) pontos++
    }
    if (!melhor || pontos > melhor.pontos) {
      segundo = melhor?.pontos ?? 0
      melhor = { valor, pontos }
    } else if (pontos > segundo) {
      segundo = pontos
    }
  }

  if (!melhor || melhor.pontos === 0 || melhor.pontos === segundo) return null
  return { coluna, valor: melhor.valor }
}

/**
 * Devolve o filtro de indicador a usar: o que o passo trouxe, ou um inferido da sua descrição.
 *
 * Regista sempre no contexto qual indicador foi escolhido por inferência, para que a análise possa
 * declarar sobre o que respondeu. Um indicador escolhido pelo motor e não pelo plano é informação
 * que o leitor precisa de ter.
 */
function resolverFiltroIndicador(
  tabela: Tabela,
  filtro: FiltroCategoria | null,
  passo: PassoExecutavel,
  ctx: ContextoExecucao
): FiltroCategoria | null {
  const colunaIndicador = colunaIndicadorDe(tabela)
  if (!colunaIndicador) return filtro
  if (filtro && PADRAO_COLUNA_INDICADOR.test(filtro.coluna.trim()) && tabela.colunas.includes(filtro.coluna)) {
    return filtro
  }

  const inferido = inferirIndicador(tabela, colunaIndicador, passo)
  if (inferido) {
    ctx.avisos.push(
      `Passo "${passo.descricao_humana}": "${tabela.titulo}" guarda vários indicadores na mesma ` +
        `coluna e o plano não escolheu nenhum; foi usado "${inferido.valor}", por ser o que ` +
        `corresponde ao que o passo pedia.`
    )
    return inferido
  }
  return filtro
}

function exigirIndicadorEscolhido(
  tabela: Tabela,
  filtro: FiltroCategoria | null,
  passoId: string
): void {
  const colunaIndicador = colunaIndicadorDe(tabela)
  if (!colunaIndicador) return
  // Aceita o filtro sobre QUALQUER das colunas que identificam o indicador, não só sobre a
  // primeira que foi detectada. O mesmo ficheiro traz "variable_id", "variable_name_en" e
  // "variable_name_pt", que são três formas de dizer a mesma coisa: exigir uma delas em concreto
  // rejeitava filtros correctos e fazia falhar análises que antes funcionavam.
  if (filtro && PADRAO_COLUNA_INDICADOR.test(filtro.coluna.trim()) && tabela.colunas.includes(filtro.coluna)) {
    return
  }
  throw new Error(
    `Passo ${passoId}: "${tabela.titulo}" guarda vários indicadores na mesma coluna de valores; ` +
      `sem restringir "${colunaIndicador}" a um indicador, o resultado somaria grandezas diferentes ` +
      `(ex.: toneladas com hectares). Usa filtro_unidade "cat:${colunaIndicador}=<indicador>" ` +
      `(ou "cat2:" para o segundo dataset de um cruzamento).`
  )
}

/**
 * Unidade que o próprio ficheiro declara para o indicador em causa.
 *
 * Os datasets em formato longo trazem uma coluna "unit" a dizer o que é cada valor ("%", "count",
 * "tonne"). Sem a ler, o motor decidia o formato pelo nome que o plano dava ao cálculo, e a mesma
 * análise mostrava "74,8%" numa corrida e "74,8" noutra.
 *
 * Devolve só "%", de propósito. É o caso em que a ausência da unidade torna o número ERRADO: uma
 * percentagem sem símbolo lê-se como valor absoluto. Uma contagem sem sufixo lê-se bem, e traduzir
 * "tonne" ou "ha" para texto visível é outra discussão, com risco próprio.
 */
function unidadePercentagemDoIndicador(
  tabela: Tabela,
  ligacao: ResultadoLigacao | null,
  filtro: FiltroCategoria | null
): string {
  const iUnidade = tabela.colunas.findIndex((c) => /^(unit|unidade|units)$/i.test(c.trim()))
  if (iUnidade === -1) return ''

  const linhasRelevantes = ligacao?.ligacoes
    ? Array.from(ligacao.ligacoes.keys()).map((i) => tabela.linhas[i])
    : tabela.linhas

  const unidades = new Set<string>()
  for (const linha of linhasRelevantes) {
    if (!linha) continue
    if (filtro) {
      const iFiltro = tabela.colunas.indexOf(filtro.coluna)
      if (iFiltro !== -1) {
        const v = linha[iFiltro]
        if (v == null || normalizarCategoria(String(v)) !== normalizarCategoria(filtro.valor)) continue
      }
    }
    const u = String(linha[iUnidade] ?? '').trim()
    if (u) unidades.add(u.toLowerCase())
  }

  // Só quando NÃO há ambiguidade: um passo que misture percentagens com contagens não tem uma
  // unidade única, e inventar uma seria pior do que não ter nenhuma.
  if (unidades.size !== 1) return ''
  const unica = Array.from(unidades)[0]
  return unica === '%' || unica === 'percent' || unica === 'percentagem' ? '%' : ''
}

type FiltroCategoria = { coluna: string; valor: string }

/**
 * Lê os filtros de categoria de um passo, um por cada lado de um cruzamento.
 *
 * Os datasets alfanuméricos do portal estão em formato longo: uma coluna "value" guarda dezenas de
 * indicadores distintos, e o que identifica cada um é outra coluna ("variable_name_pt"). Juntar
 * dois destes ficheiros somando "value" misturaria toneladas de milho com casos de tuberculose e
 * daria um número com aspecto de resultado e sem significado nenhum. Cruzá-los exige, portanto,
 * um filtro DE CADA LADO, e até aqui só existia um.
 *
 * A segunda condição entra no mesmo campo com o prefixo "cat2:" em vez de num campo novo, pela
 * razão já documentada no filtro original: o schema de passo está perto do limite de propriedades
 * que a API de saída estruturada aceita antes de falhar a compilar a gramática.
 *
 * Formato: "cat:coluna=valor" ou "cat:coluna=valor;cat2:coluna=valor".
 */
function lerFiltrosCategoria(filtro?: string): { a: FiltroCategoria | null; b: FiltroCategoria | null } {
  const vazio = { a: null, b: null }
  if (!filtro) return vazio

  const lados: { a: FiltroCategoria | null; b: FiltroCategoria | null } = { a: null, b: null }
  for (const parte of filtro.split(';')) {
    const texto = parte.trim()
    const prefixo = texto.startsWith('cat2:') ? 'b' : texto.startsWith('cat:') ? 'a' : null
    if (!prefixo) continue
    const corpo = texto.slice(texto.indexOf(':') + 1)
    const igual = corpo.indexOf('=')
    if (igual === -1) continue
    const coluna = corpo.slice(0, igual).trim()
    const valor = corpo.slice(igual + 1).trim()
    if (coluna && valor) lados[prefixo as 'a' | 'b'] = { coluna, valor }
  }
  return lados
}

function normalizarCategoria(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '').trim()
}

/**
 * Restringe uma ligação às linhas onde uma coluna categórica tem o valor pedido.
 *
 * Devolve a ligação intacta quando não há filtro. Lança quando o filtro não corresponde a nada:
 * um cruzamento sobre zero linhas produziria um resultado vazio com ar de resposta.
 */
function ligacaoFiltradaPorCategoria(
  tabela: Tabela,
  ligacao: ResultadoLigacao,
  filtro: FiltroCategoria | null,
  passoId: string
): ResultadoLigacao {
  if (!filtro) return ligacao
  const indice = tabela.colunas.indexOf(filtro.coluna)
  if (indice === -1) {
    throw new Error(`Passo ${passoId}: coluna "${filtro.coluna}" não existe em "${tabela.titulo}"`)
  }
  const alvo = normalizarCategoria(filtro.valor)
  const filtradas = new Map(
    Array.from(ligacao.ligacoes).filter(([linha]) => {
      const v = tabela.linhas[linha]?.[indice]
      return v != null && normalizarCategoria(String(v)) === alvo
    })
  )
  if (filtradas.size === 0) {
    // Distinguir os dois casos importa para quem lê o aviso na análise ou depura o plano. Visto ao
    // vivo: "Incidência de TB" existe no ficheiro, mas só na linha "Nacional", que não corresponde
    // a nenhuma unidade administrativa e por isso não entra na ligação geográfica. Dizer que o
    // valor não existe mandava procurar uma gralha que não havia.
    const existeNaTabela = tabela.linhas.some((l) => {
      const v = l[indice]
      return v != null && normalizarCategoria(String(v)) === alvo
    })
    throw new Error(
      existeNaTabela
        ? `Passo ${passoId}: "${filtro.valor}" existe em "${tabela.titulo}", mas só em linhas sem ` +
          `correspondência a uma unidade administrativa (tipicamente totais nacionais), por isso ` +
          `não pode ser usado num passo geográfico`
        : `Passo ${passoId}: nenhuma linha de "${tabela.titulo}" tem "${filtro.coluna}" = "${filtro.valor}"`
    )
  }
  return { ...ligacao, ligacoes: filtradas }
}

/**
 * Alinha duas métricas que vivem em datasets DIFERENTES, juntando-as pela unidade administrativa
 * comum.
 *
 * Existe porque o planeador não tem como escrever este passo correctamente. `juntar_datasets` cria
 * uma tabela sintética com um id atribuído só em execução (`proximoIdSintetico--`), e um plano é
 * escrito antes de qualquer id existir: não há nada que o modelo possa pôr em `dataset_id` para
 * apontar ao resultado da junção. Sem saída, ele escreve a correlação sobre um dos datasets com
 * uma coluna do outro, e o passo morre com "exige duas séries do mesmo tamanho" (verificado ao
 * vivo em "as províncias com maior área de cana têm maior acesso a electricidade?").
 *
 * Em vez de exigir do modelo uma referência que ele não pode conhecer, o executor reconhece a
 * situação e faz a junção sozinho. Perguntas de cruzamento são as mais valiosas do portal, e não
 * podem depender de o plano acertar num identificador que ainda não foi criado.
 */
async function alinharMetricasDeDatasetsDiferentes(
  passo: PassoExecutavel,
  ctx: ContextoExecucao
): Promise<{ x: number[]; y: number[]; nomes: string[]; nivel: NivelAdmin } | null> {
  const colA = passo.coluna_metrica
  const colB = passo.coluna_metrica_2

  // Só entram tabelas reais com ligação geográfica: as sintéticas (id negativo) já são o produto
  // de uma junção e não têm unidades para voltar a agregar.
  const candidatas = Array.from(ctx.tabelas.entries()).filter(
    ([id]) => id >= 0 && !!ctx.ligacoes.get(id)
  )
  const filtros = lerFiltrosCategoria(passo.filtro_unidade)

  // Em formato longo as duas métricas chamam-se ambas "value", por isso procurar a tabela pelo
  // nome da coluna devolveria a mesma dos dois lados. Nesse caso é o filtro de cada lado que diz
  // qual é qual: só uma das tabelas tem a coluna categórica com aquele valor.
  const temFiltro = (t: Tabela, f: FiltroCategoria | null) => {
    if (!f) return false
    const i = t.colunas.indexOf(f.coluna)
    if (i === -1) return false
    const alvo = normalizarCategoria(f.valor)
    return t.linhas.some((l) => l[i] != null && normalizarCategoria(String(l[i])) === alvo)
  }

  const donaDe = (coluna: string | undefined, f: FiltroCategoria | null, excluir?: number) => {
    // Sem coluna métrica a pergunta é sobre CONTAR registos ("distritos com mais escolas do que
    // unidades sanitárias"): nesse caso o dataset vem do próprio passo, não do nome da coluna.
    // É a forma mais natural de cruzar duas camadas de pontos, e sem isto o passo era abandonado.
    if (!coluna) {
      const preferido = excluir === undefined ? passo.dataset_id : passo.dataset_id_2
      return (
        candidatas.find(([id]) => id !== excluir && id === preferido) ||
        candidatas.find(([id]) => id !== excluir)
      )
    }
    return (
      candidatas.find(
        ([id, t]) => id !== excluir && t.colunas.includes(coluna) && (!f || temFiltro(t, f))
      ) || candidatas.find(([id, t]) => id !== excluir && t.colunas.includes(coluna))
    )
  }

  const a = donaDe(colA, filtros.a)
  const b = donaDe(colB, filtros.b, a?.[0])
  if (!a || !b || a[0] === b[0]) return null

  const indCruzA = resolverFiltroIndicador(a[1], filtros.a, passo, ctx)
  const indCruzB = resolverFiltroIndicador(b[1], filtros.b, passo, ctx)
  exigirIndicadorEscolhido(a[1], indCruzA, passo.id)
  exigirIndicadorEscolhido(b[1], indCruzB, passo.id)
  const ligA = ligacaoFiltradaPorCategoria(a[1], ctx.ligacoes.get(a[0])!, indCruzA, passo.id)
  const ligB = ligacaoFiltradaPorCategoria(b[1], ctx.ligacoes.get(b[0])!, indCruzB, passo.id)

  // Nível comum é o mais GROSSO dos dois: descer o dataset mais grosso ao nível fino do outro
  // inventaria detalhe que ele não tem. Mesma regra de executarJuncaoDatasets.
  const ordem: Record<NivelAdmin, number> = { admin1: 1, admin2: 2, admin3: 3 }
  const nivel = ordem[ligA.nivel] <= ordem[ligB.nivel] ? ligA.nivel : ligB.nivel

  // Sem coluna, ou com uma coluna que não é numérica, o que se quer é contar registos por unidade
  // (quantas escolas, quantas unidades sanitárias), não somar texto.
  const modoDe = (t: Tabela, coluna?: string) =>
    coluna && colunaNumerica(t, coluna).length ? 'soma' : 'contagem'
  const porA = await agregarPorUnidade(a[1], ligA, colA || a[1].colunas[0], modoDe(a[1], colA), nivel)
  const porB = await agregarPorUnidade(b[1], ligB, colB || b[1].colunas[0], modoDe(b[1], colB), nivel)

  const mapaB = new Map(porB.map((u) => [u.codigo, u.valor]))
  const comuns = porA.filter((u) => mapaB.has(u.codigo))
  if (comuns.length < 3) return null

  if (comuns.length < porA.length) {
    ctx.avisos.push(
      `Passo "${passo.descricao_humana}": as duas métricas vinham de ficheiros diferentes e foram ` +
        `cruzadas ao nível ${nivel}; ${porA.length - comuns.length} unidade(s) sem correspondência ` +
        `nos dois ficaram de fora.`
    )
  } else {
    ctx.avisos.push(
      `Passo "${passo.descricao_humana}": as duas métricas vinham de ficheiros diferentes e foram ` +
        `cruzadas ao nível ${nivel}, sobre ${comuns.length} unidades em comum.`
    )
  }

  return {
    x: comuns.map((u) => u.valor),
    y: comuns.map((u) => mapaB.get(u.codigo)!),
    nomes: comuns.map((u) => u.nome),
    nivel,
  }
}

async function executarJuncaoDatasets(passo: PassoExecutavel, ctx: ContextoExecucao): Promise<void> {
  const idA = passo.dataset_id ?? Array.from(ctx.tabelas.keys())[0]
  const idB = passo.dataset_id_2
  if (idA === undefined || idB === undefined) {
    throw new Error(`Passo ${passo.id}: juntar_datasets exige dataset_id e dataset_id_2`)
  }
  const tabelaA = ctx.tabelas.get(idA)
  const tabelaB = ctx.tabelas.get(idB)
  if (!tabelaA || !tabelaB) throw new Error(`Passo ${passo.id}: dataset(s) não carregado(s)`)
  const ligBrutaA = ctx.ligacoes.get(idA)
  const ligBrutaB = ctx.ligacoes.get(idB)
  if (!ligBrutaA || !ligBrutaB) {
    throw new Error(
      `Passo ${passo.id}: os dois datasets têm de estar ligados a unidades administrativas para se poderem juntar`
    )
  }
  // Sem isto, juntar dois ficheiros em formato longo somava indicadores diferentes da mesma coluna
  // "value" (produção de milho com casos de tuberculose) e devolvia um total sem significado.
  const filtrosJuncao = lerFiltrosCategoria(passo.filtro_unidade)
  const indJuncaoA = resolverFiltroIndicador(tabelaA, filtrosJuncao.a, passo, ctx)
  const indJuncaoB = resolverFiltroIndicador(tabelaB, filtrosJuncao.b, passo, ctx)
  exigirIndicadorEscolhido(tabelaA, indJuncaoA, passo.id)
  exigirIndicadorEscolhido(tabelaB, indJuncaoB, passo.id)
  const ligA = ligacaoFiltradaPorCategoria(tabelaA, ligBrutaA, indJuncaoA, passo.id)
  const ligB = ligacaoFiltradaPorCategoria(tabelaB, ligBrutaB, indJuncaoB, passo.id)
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
    dataset_id: idA,
  })
  ctx.series.push({
    passo_id: `${passo.id}_b`,
    nivel,
    unidades: combinadas.map((c) => ({ codigo: c.codigo, nome: c.nome, valor: c.valorB })),
    metrica: `${rotularColuna(passo.coluna_metrica_2 || '')} (${tabelaB.titulo})`,
    normalizacao: 'nenhuma',
    dataset_id: idB,
  })

  // Forma fixa: são pares (x, y) de duas medidas, e é a nuvem que mostra a forma da relação.
  empurrarGrafico(ctx, {
    passo_id: `${passo.id}_dispersao`,
    forma: 'dispersao',
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
      empurrarGrafico(ctx, {
        passo_id: `${passo.id}_distancias`,
        titulo: passo.descricao_humana,
        eixoX: maisLonge.map((x) => x.nome),
        series: [{ nome: `Distância a "${tabelaB.titulo}" (km)`, valores: maisLonge.map((x) => Math.round(x.d * 100) / 100) }],
        unidade: 'km',
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
      empurrarGrafico(ctx, {
        passo_id: `${passo.id}_buffer`,
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

/**
 * Rótulo de uma coluna-métrica para aparecer a um utilizador — mas nunca o nome bruto de um
 * identificador técnico do ficheiro (OBJECTID, FID, GID...), que não significa nada fora do
 * ficheiro-fonte (ex.: "OBJECTID 1 por província"). Nesse caso cai para a descrição do próprio
 * passo, a mesma rede de segurança já usada quando não há coluna nenhuma.
 */
function rotularMetricaSemIdTecnico(coluna: string, descricaoHumana: string, semColunaOuFallback: string): string {
  if (ehColunaIdTecnico(coluna)) return descricaoHumana || semColunaOuFallback
  const aprendido = obterRotuloAprendidoSincrono(coluna, 'coluna')
  if (aprendido) return aprendido
  const resultado = rotularColuna(coluna)
  // Nunca aguardado: a análise em curso usa `resultado` já (o dicionário fixo, correcto na
  // maioria dos casos); só aprende para a PRÓXIMA vez que este nome de coluna aparecer, nesta ou
  // noutra análise — ver rotulos-aprendidos.ts para a restrição de nunca atrasar nada.
  if (pareceRotuloTecnico(coluna, resultado)) aprenderEmSegundoPlano(coluna, 'coluna')
  return resultado
}

/**
 * Quando filtro_unidade é "cat:coluna=valor", o rótulo da série tem de vir do VALOR filtrado
 * (ex.: "Milho"), não do nome genérico da coluna métrica (ex.: "Valor" ou "Área cultivada") —
 * sem isto, dois passos que filtram categorias diferentes da mesma coluna produzem séries com o
 * mesmo rótulo, indistinguíveis no selector do mapa/gráfico mesmo contendo dados diferentes.
 */
function rotuloFiltroCategoria(passo: PassoExecutavel): string | null {
  if (!passo.filtro_unidade?.startsWith('cat:')) return null
  const corpo = passo.filtro_unidade.slice(4)
  const igual = corpo.indexOf('=')
  if (igual === -1) return null
  const valor = corpo.slice(igual + 1).trim()
  return valor || null
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
  //
  // Prefixo "cat:coluna=valor" reaproveita o mesmo campo para um filtro diferente: restringe às
  // linhas onde outra coluna (categórica, ex.: "Nome da cultura") tem um valor exacto (ex.:
  // "Milho"), antes de agregar por geografia. Não é um novo campo no schema porque o schema de
  // passo já está perto do limite de propriedades que a API de saída estruturada aceita antes de
  // "Grammar compilation timed out" (ver comentário em instrucaoCodigo acima) — reaproveitar
  // filtro_unidade com um prefixo evita repetir esse incidente. É o mecanismo que permite ao
  // Planeamento gerar um passo por cultura/categoria nomeada (ex.: milho, arroz, mapira) num
  // dataset em formato longo, para que cada uma produza a sua própria série real em vez de só a
  // última/primeira lida ficar visível no mapa e no gráfico.
  if (passo.filtro_unidade?.startsWith('cat:') && ligacao) {
    // Usa o mesmo leitor do caminho de cruzamento: um passo de dataset único que traga por engano
    // a segunda condição ("cat:...;cat2:...") fica com a primeira em vez de a interpretar mal e
    // ir procurar um valor que inclui o resto da cadeia.
    const { a } = lerFiltrosCategoria(passo.filtro_unidade)
    if (!a) {
      throw new Error(`Passo ${passo.id}: filtro_unidade "cat:..." mal formado, esperado "cat:coluna=valor"`)
    }
    const indicadorA = resolverFiltroIndicador(tabela, a, passo, ctx)
    exigirIndicadorEscolhido(tabela, indicadorA, passo.id)
    ligacao = ligacaoFiltradaPorCategoria(tabela, ligacao, indicadorA, passo.id)
  } else if (passo.filtro_unidade && ligacao) {
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

  // O caso que produziu o número errado não foi um filtro mal escrito: foi passo NENHUM filtro
  // sobre um ficheiro de formato longo. As verificações acima só correm quando já existe um
  // filtro, por isso a exigência tem de ficar aqui, depois de todos os ramos, onde apanha também
  // quem não filtrou de todo. Só se aplica a passos que agregam uma métrica: um passo que apenas
  // descreve a composição de uma coluna categórica não soma nada e não corre este risco.
  if (passo.coluna_metrica && passo.metodo !== 'execucao_codigo' && passo.metodo !== 'perfil_coluna') {
    const bruto = lerFiltrosCategoria(passo.filtro_unidade).a
    const resolvido = resolverFiltroIndicador(tabela, bruto, passo, ctx)
    exigirIndicadorEscolhido(tabela, resolvido, passo.id)
    // Aplica o indicador inferido: sem isto a verificacao passava mas a agregacao continuava a
    // somar todos os indicadores, que e precisamente o numero errado que se quer evitar.
    if (resolvido && resolvido !== bruto && ligacao) {
      ligacao = ligacaoFiltradaPorCategoria(tabela, ligacao, resolvido, passo.id)
    }
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
    // Numa pergunta de cruzamento o código precisa dos dois ficheiros. Usa o segundo indicado pelo
    // passo e, quando o plano não o indica, o outro dataset carregado: pedir para cruzar e mandar
    // um ficheiro só é o que fazia estes passos morrerem com "só contém dados da camada X".
    const idSegundo =
      passo.dataset_id_2 ??
      Array.from(ctx.tabelas.keys()).find((id) => id >= 0 && id !== (passo.dataset_id ?? idEscolhido))
    const tabelaSegunda = idSegundo !== undefined ? ctx.tabelas.get(idSegundo) : undefined
    const saida = await executarComCodigo(
      { titulo: tabela.titulo, colunas: tabela.colunas, linhas: tabela.linhas, n_linhas: tabela.n_linhas },
      instrucao,
      LIMITE_LINHAS_CODIGO,
      tabelaSegunda && tabelaSegunda !== tabela
        ? {
            titulo: tabelaSegunda.titulo,
            colunas: tabelaSegunda.colunas,
            linhas: tabelaSegunda.linhas,
            n_linhas: tabelaSegunda.n_linhas,
          }
        : undefined
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
  /*
   * "Quantas escolas há na Beira E QUAIS SÃO": a segunda metade da pergunta.
   *
   * Todos os outros métodos deste catálogo agregam. Contam, somam, comparam, classificam. Nenhum
   * devolve os registos, e por isso uma pergunta que pedia os nomes recebia um número e uma
   * distribuição por tipo: correcta, verificável, e a responder a metade.
   *
   * O limite existe porque uma lista de dez mil nomes não é uma resposta, é um despejo do ficheiro.
   * Quando corta, diz que cortou: uma lista truncada em silêncio faria alguém concluir que são
   * aqueles e mais nenhum.
   */
  /*
   * "Como mudou entre 2018 e 2023, por província."
   *
   * Nenhum método do catálogo respondia a isto ao nível da unidade. `comparar_periodos` compara
   * dois NÚMEROS e devolve um número; os métodos temporais correm sobre a série nacional. Faltava
   * o que qualquer relatório pede primeiro: o mapa de quem subiu e quem desceu.
   *
   * Sobre a unidade em que a variação é expressa, que é a decisão que mais muda o resultado:
   *
   * Se a métrica JÁ É uma percentagem, a variação vai em PONTOS PERCENTUAIS. De 40% para 50% é uma
   * subida de 10 pontos, e não de 25%, e as duas leituras estão certas mas só uma se soma e se
   * compara entre províncias.
   *
   * Se a métrica é uma contagem ou um total, a variação vai em PERCENTAGEM. A variação absoluta
   * daria sempre o mapa das províncias grandes: Nampula sobe mil escolas e Maputo Cidade sobe
   * cinquenta, e o mapa diria que Maputo estagnou quando pode ter crescido mais depressa.
   */
  if (passo.metodo === 'variacao_geografica') {
    if (!ligacao) throw new Error(`Passo ${passo.id}: dataset sem ligação geográfica`)
    if (!passo.coluna_tempo) {
      throw new Error(`Passo ${passo.id}: variacao_geografica exige coluna_tempo`)
    }
    if (!tabela.colunas.includes(passo.coluna_tempo)) {
      throw new Error(`Passo ${passo.id}: a coluna de tempo "${passo.coluna_tempo}" não existe em "${nomeDataset}"`)
    }
    const nivel = (passo.nivel_geo as NivelAdmin) || ligacao.nivel

    const temposBrutos = colunaValores(tabela, passo.coluna_tempo)
    // Só períodos com valores, e já ordenados: os anos vazios do fim do plano de recolha não podem
    // ser escolhidos como extremos da variação.
    const ordenados = periodosComDados(tabela, ligacao.ligacoes, passo.coluna_tempo, passo.coluna_metrica || null)
    if (ordenados.length < 2) {
      throw new Error(
        `Passo ${passo.id}: "${passo.coluna_tempo}" só tem ${ordenados.length} período(s) com dados, e uma variação precisa de dois`
      )
    }
    const inicio = ordenados[0]
    const fim = ordenados[ordenados.length - 1]

    const ligacaoDoPeriodo = (periodo: string) => {
      const filtradas = new Map<number, string>()
      Array.from(ligacao!.ligacoes).forEach(([indice, codigo]) => {
        if ((temposBrutos[indice] || '').trim() === periodo) filtradas.set(indice, codigo)
      })
      return { ...ligacao!, ligacoes: filtradas }
    }

    const agregacao = passo.coluna_metrica ? 'soma' : 'contagem'
    const coluna = passo.coluna_metrica || tabela.colunas[0]
    const noInicio = await agregarPorUnidade(tabela, ligacaoDoPeriodo(inicio), coluna, agregacao, nivel)
    const noFim = await agregarPorUnidade(tabela, ligacaoDoPeriodo(fim), coluna, agregacao, nivel)

    const porCodigoInicio = new Map(noInicio.map((u) => [u.codigo, u.valor]))
    const emPontos =
      unidadePercentagemDoIndicador(tabela, ligacao, lerFiltrosCategoria(passo.filtro_unidade).a) === '%'

    const unidades: { codigo: string; nome: string; valor: number }[] = []
    const semBase: string[] = []
    for (const u of noFim) {
      const antes = porCodigoInicio.get(u.codigo)
      if (antes === undefined) {
        semBase.push(u.nome)
        continue
      }
      if (emPontos) {
        unidades.push({ codigo: u.codigo, nome: u.nome, valor: u.valor - antes })
      } else {
        // Uma variação percentual a partir de zero não existe. Excluir a unidade e dizê-lo é a
        // única saída honesta: pintá-la como "sem mudança" esconderia um arranque do nada, e
        // pintá-la como subida infinita dominaria a escala e apagaria todas as outras.
        if (antes === 0) {
          semBase.push(u.nome)
          continue
        }
        unidades.push({ codigo: u.codigo, nome: u.nome, valor: ((u.valor - antes) / Math.abs(antes)) * 100 })
      }
    }
    if (unidades.length < 2) {
      throw new Error(`Passo ${passo.id}: apenas ${unidades.length} unidade(s) com valor nos dois períodos`)
    }
    if (semBase.length > 0) {
      ctx.avisos.push(
        `${passo.descricao_humana}: ${semBase.length} unidade(s) ficaram fora do mapa de variação por não terem valor em ${inicio} (${semBase.slice(0, 5).join(', ')}${semBase.length > 5 ? ', ...' : ''}).`
      )
    }

    ctx.series.push({
      passo_id: passo.id,
      nivel,
      unidades,
      metrica: `${passo.descricao_humana || 'Variação'} (${inicio} a ${fim})`,
      normalizacao: 'nenhuma',
      variacao: true,
      dataset_id: idEscolhido,
    })

    const subiram = unidades.filter((u) => u.valor > 0).length
    const desceram = unidades.filter((u) => u.valor < 0).length
    const sufixo = emPontos ? 'pp' : '%'
    registarCalc(ctx, `${passo.id}_subiram`, subiram, '', 'inteiro', passo, [nomeDataset], unidades.length)
    registarCalc(ctx, `${passo.id}_desceram`, desceram, '', 'inteiro', passo, [nomeDataset], unidades.length)
    const maior = unidades.reduce((a, b) => (b.valor > a.valor ? b : a))
    const menor = unidades.reduce((a, b) => (b.valor < a.valor ? b : a))
    registarCalc(ctx, `${passo.id}_maior_subida`, maior.valor, sufixo, 'decimal', passo, [nomeDataset], unidades.length)
    registarCalc(ctx, `${passo.id}_maior_subida_nome`, maior.nome, '', 'texto', passo, [nomeDataset], unidades.length)
    registarCalc(ctx, `${passo.id}_maior_descida`, menor.valor, sufixo, 'decimal', passo, [nomeDataset], unidades.length)
    registarCalc(ctx, `${passo.id}_maior_descida_nome`, menor.nome, '', 'texto', passo, [nomeDataset], unidades.length)
    return
  }

  /*
   * O mesmo indicador em vários momentos, para desenhar lado a lado.
   *
   * Responde a uma pergunta que o mapa de mudança não responde. A mudança diz QUANTO variou entre
   * o princípio e o fim, e apaga tudo o que aconteceu pelo meio: uma província que subiu, caiu e
   * voltou ao mesmo lugar aparece como "sem mudança", que é verdade e não é a história. Os
   * múltiplos mostram cada momento por si.
   *
   * O limite de períodos não é cosmético. Acima de meia dúzia, cada mapa fica pequeno demais para
   * se distinguir uma província de outra, e a figura passa a ser uma textura. Quando há mais anos
   * do que isso, escolhem-se momentos ESPAÇADOS ao longo da série em vez dos primeiros: os
   * primeiros seis anos de uma série de vinte contam o princípio e calam o resto.
   */
  if (passo.metodo === 'mapas_por_periodo') {
    if (!ligacao) throw new Error(`Passo ${passo.id}: dataset sem ligação geográfica`)
    if (!passo.coluna_tempo) throw new Error(`Passo ${passo.id}: mapas_por_periodo exige coluna_tempo`)
    if (!tabela.colunas.includes(passo.coluna_tempo)) {
      throw new Error(`Passo ${passo.id}: a coluna de tempo "${passo.coluna_tempo}" não existe em "${nomeDataset}"`)
    }
    const nivel = (passo.nivel_geo as NivelAdmin) || ligacao.nivel

    const temposBrutos = colunaValores(tabela, passo.coluna_tempo)
    // Mesma razão da variação: um ano sem um único valor preenchido desenharia um mapa em branco,
    // e um mapa em branco no meio da série lê-se como "aqui não havia nada", que é outra coisa.
    const ordenados = periodosComDados(tabela, ligacao.ligacoes, passo.coluna_tempo, passo.coluna_metrica || null)
    if (ordenados.length < 2) {
      throw new Error(`Passo ${passo.id}: "${passo.coluna_tempo}" só tem ${ordenados.length} período(s) com dados`)
    }

    let escolhidos = ordenados
    if (ordenados.length > MAX_PERIODOS_MULTIPLOS) {
      // Amostragem espaçada, com o primeiro e o último SEMPRE incluídos: são os dois momentos que
      // qualquer leitor procura primeiro, e perdê-los para uma divisão certinha seria absurdo.
      const passoAmostra = (ordenados.length - 1) / (MAX_PERIODOS_MULTIPLOS - 1)
      escolhidos = Array.from({ length: MAX_PERIODOS_MULTIPLOS }, (_, i) => ordenados[Math.round(i * passoAmostra)])
      escolhidos = Array.from(new Set(escolhidos))
      ctx.avisos.push(
        `${passo.descricao_humana}: a série tem ${ordenados.length} períodos e a figura mostra ${escolhidos.length} espaçados (${escolhidos.join(', ')}).`
      )
    }

    const agregacao = passo.coluna_metrica ? 'soma' : 'contagem'
    const coluna = passo.coluna_metrica || tabela.colunas[0]
    const periodos: { rotulo: string; unidades: { codigo: string; nome: string; valor: number }[] }[] = []
    for (const periodo of escolhidos) {
      const filtradas = new Map<number, string>()
      Array.from(ligacao.ligacoes).forEach(([indice, codigo]) => {
        if ((temposBrutos[indice] || '').trim() === periodo) filtradas.set(indice, codigo)
      })
      const porUnidade = await agregarPorUnidade(tabela, { ...ligacao, ligacoes: filtradas }, coluna, agregacao, nivel)
      if (porUnidade.length === 0) continue
      periodos.push({
        rotulo: periodo,
        unidades: porUnidade.map((u) => ({ codigo: u.codigo, nome: u.nome, valor: u.valor })),
      })
    }
    if (periodos.length < 2) {
      throw new Error(`Passo ${passo.id}: só ${periodos.length} período(s) com dados, insuficiente para comparar`)
    }

    ctx.multiplos.push({
      passo_id: passo.id,
      metrica: passo.descricao_humana || 'Indicador',
      nivel,
      unidade: unidadePercentagemDoIndicador(tabela, ligacao, lerFiltrosCategoria(passo.filtro_unidade).a) || '',
      periodos,
    })

    registarCalc(ctx, `${passo.id}_n_periodos`, periodos.length, '', 'inteiro', passo, [nomeDataset], tabela.n_linhas)
    return
  }

  if (passo.metodo === 'listar_registos') {
    const coluna = passo.coluna_grupo
    if (!coluna) throw new Error(`Passo ${passo.id}: listar_registos exige coluna_grupo (a coluna dos nomes)`)
    if (!tabela.colunas.includes(coluna)) {
      throw new Error(`Passo ${passo.id}: a coluna "${coluna}" não existe em "${nomeDataset}"`)
    }

    // Quando houve filtro por unidade, `ligacao.ligacoes` já vem restringido às linhas que caem lá
    // dentro (ver o bloco de filtro_unidade acima). Sem ligação, a lista é do dataset inteiro.
    const indice = tabela.colunas.indexOf(coluna)
    const linhasNoAmbito = ligacao
      ? Array.from(ligacao.ligacoes.keys()).sort((x, y) => x - y)
      : tabela.linhas.map((_, i) => i)

    const vistos = new Set<string>()
    const nomes: string[] = []
    for (const i of linhasNoAmbito) {
      const valor = (tabela.linhas[i]?.[indice] ?? '').trim()
      if (!valor) continue
      const chave = valor.toLowerCase()
      if (vistos.has(chave)) continue
      vistos.add(chave)
      nomes.push(valor)
    }
    if (nomes.length === 0) {
      throw new Error(`Passo ${passo.id}: a coluna "${coluna}" não tem nomes preenchidos no âmbito pedido`)
    }

    nomes.sort((x, y) => x.localeCompare(y, 'pt'))
    const truncada = nomes.length > LIMITE_ITENS_LISTA
    const ambito = passo.filtro_unidade && !passo.filtro_unidade.startsWith('cat:')
      ? passo.filtro_unidade
      : null

    ctx.listas.push({
      passo_id: passo.id,
      titulo: passo.descricao_humana || `Registos em "${coluna}"`,
      coluna,
      ambito,
      itens: nomes.slice(0, LIMITE_ITENS_LISTA),
      total: nomes.length,
      truncada,
    })

    // O total entra em `calcs` para a narrativa o poder citar com {{calc:}} como qualquer outro
    // número, em vez de o repetir de cabeça a partir da lista.
    registarCalc(ctx, passo.id, nomes.length, '', 'inteiro', passo, [nomeDataset], linhasNoAmbito.length)
    if (truncada) {
      ctx.avisos.push(
        `${passo.descricao_humana}: a lista mostra ${LIMITE_ITENS_LISTA} dos ${nomes.length} nomes encontrados.`
      )
    }
    return
  }

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

    // Contagem por (categoria, unidade): é a tabela cruzada que os escalares abaixo resumem, e
    // é o que permite finalmente desenhá-la.
    const contagemPorCategoriaEUnidade = new Map<string, Map<string, number>>()
    const unidadesComAlgum = new Set<string>()

    for (const categoria of distintas) {
      const codigosComCategoria = new Set<string>()
      const porUnidade = new Map<string, number>()
      let total = 0
      Array.from(ligacao.ligacoes).forEach(([indiceLinha, codigoOrigem]) => {
        if (categorias[indiceLinha] !== categoria) return
        const codigo = cortar(codigoOrigem)
        if (!nomePorCodigo.has(codigo)) return
        codigosComCategoria.add(codigo)
        porUnidade.set(codigo, (porUnidade.get(codigo) || 0) + 1)
        unidadesComAlgum.add(codigo)
        total++
      })
      contagemPorCategoriaEUnidade.set(categoria, porUnidade)
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

    // A matriz. As unidades ficam ordenadas pelo total, para o padrão aparecer da esquerda para a
    // direita em vez de ficar espalhado pela ordem alfabética dos códigos.
    const totalPorUnidade = new Map<string, number>()
    for (const porUnidade of Array.from(contagemPorCategoriaEUnidade.values())) {
      Array.from(porUnidade).forEach(([codigo, n]) => {
        totalPorUnidade.set(codigo, (totalPorUnidade.get(codigo) || 0) + n)
      })
    }
    const codigosOrdenados = Array.from(unidadesComAlgum).sort(
      (a, b) => (totalPorUnidade.get(b) || 0) - (totalPorUnidade.get(a) || 0)
    )
    const categoriasComDados = distintas.filter((c) => (contagemPorCategoriaEUnidade.get(c)?.size || 0) > 0)

    if (codigosOrdenados.length >= 2 && categoriasComDados.length >= 2) {
      const eixoX = codigosOrdenados.map((c) => nomePorCodigo.get(c)!)
      const series = categoriasComDados.map((categoria) => ({
        nome: traduzirValorCategoria(categoria),
        valores: codigosOrdenados.map((codigo) => contagemPorCategoriaEUnidade.get(categoria)?.get(codigo) ?? null),
      }))
      // O mesmo cruzamento também é um percurso (de onde para quê), e o selector decide qual das
      // duas leituras mostra primeiro consoante o número de fitas.
      const fluxos = categoriasComDados.flatMap((categoria) =>
        codigosOrdenados
          .map((codigo) => ({
            origem: nomePorCodigo.get(codigo)!,
            destino: traduzirValorCategoria(categoria),
            valor: contagemPorCategoriaEUnidade.get(categoria)?.get(codigo) ?? 0,
          }))
          .filter((f) => f.valor > 0)
      )

      empurrarGrafico(ctx, {
        passo_id: `${passo.id}_matriz`,
        titulo: passo.descricao_humana,
        eixoX,
        series,
        unidade: 'registos',
        fluxos,
        composicao: true,
      })
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
      // "contagem" sozinho é igual em qualquer passo de contagem, mesmo quando cada um conta uma
      // coisa diferente (ex.: "escolas por província" e "hospitais por província" são dois passos
      // sem coluna_metrica, ambos ficavam com o MESMO rótulo "contagem", indistinguíveis num
      // selector com várias séries) — cai para a descrição do próprio passo, que o Planeamento já
      // escreve a dizer o quê está a contar.
      metrica: rotuloFiltroCategoria(passo) || (passo.coluna_metrica ? rotularMetricaSemIdTecnico(passo.coluna_metrica, passo.descricao_humana, 'contagem') : passo.descricao_humana || 'contagem'),
      normalizacao,
      dataset_id: idEscolhido,
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
        dataset_id: idEscolhido,
      })
    } else {
      achatarResultado(
        ctx, passo, resultado, [nomeDataset], porUnidade.length,
        unidadePercentagemDoIndicador(tabela, ligacao, lerFiltrosCategoria(passo.filtro_unidade).a)
      )
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

      // Percentagens não se somam. Verificado ao vivo: uma análise de imunização apresentou uma
      // "pontuação vacinal combinada" de 305,8%, que era a cobertura de BCG mais a de DPT3 mais a
      // do sarampo. Cada parcela é real (e passar de 100% é normal aqui, quando a população-alvo
      // estimada fica abaixo da real), mas a soma não significa nada e lê-se como percentagem.
      // A média mantém a grandeza interpretável; a soma inventava uma escala que não existe.
      const ePercentagem =
        !usaContagem &&
        unidadePercentagemDoIndicador(tabela, ligacao, lerFiltrosCategoria(passo.filtro_unidade).a) === '%'
      if (ePercentagem) {
        ctx.avisos.push(
          `Passo "${passo.descricao_humana}": a coluna está em percentagem, por isso os valores ` +
            `foram resumidos pela média por unidade e não somados (somar percentagens de ` +
            `indicadores diferentes não produz uma percentagem).`
        )
      }

      const porUnidade = await agregarPorUnidade(
        tabela,
        ligacao,
        coluna || tabela.colunas[0],
        usaContagem ? 'contagem' : ePercentagem ? 'media' : 'soma',
        nivel
      )

      const normalizacao = passo.normalizacao && passo.normalizacao !== 'nenhuma' ? passo.normalizacao : 'nenhuma'
      // 'razao_coluna' (PLANO-DATAPROPROMAX.md, Fase 1): taxa/produtividade/cobertura entre duas
      // colunas QUAISQUER do mesmo dataset (não só população/área de geo_unidades). Soma o
      // numerador e o denominador RAW por unidade antes de dividir — nunca a média das razões já
      // calculadas linha a linha, que é a distorção que a regra 11 do Planeamento já avisava
      // (a média de 10 taxas distritais não é a taxa provincial). Tira o caso comum de
      // "taxa de X" / "produtividade de Y" do caminho lento de execucao_codigo.
      const valoresNormalizados =
        normalizacao === 'nenhuma'
          ? porUnidade.map((u) => u.valor)
          : normalizacao === 'razao_coluna'
            ? await (async () => {
                if (!passo.coluna_metrica_2) {
                  throw new Error(
                    `Passo ${passo.id}: normalização "razao_coluna" exige coluna_metrica_2 (o denominador).`
                  )
                }
                const porUnidadeDenom = await agregarPorUnidade(tabela, ligacao, passo.coluna_metrica_2, 'soma', nivel)
                const denomPorCodigo = new Map(porUnidadeDenom.map((u) => [u.codigo, u.valor]))
                return porUnidade.map((u) => {
                  const denom = denomPorCodigo.get(u.codigo)
                  return denom ? u.valor / denom : 0
                })
              })()
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
          // Mesma razão que acima: "contagem de registos" sozinho não distingue entre passos
          // diferentes que também contam sem coluna_metrica — usa a descrição do passo nesse caso.
          metrica: rotuloFiltroCategoria(passo) || (coluna ? rotularMetricaSemIdTecnico(coluna, passo.descricao_humana, 'contagem de registos') : passo.descricao_humana || 'contagem de registos'),
          normalizacao,
          dataset_id: idEscolhido,
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
    achatarResultado(ctx, passo, r, [nomeDataset], tabela.n_linhas, unidadePercentagemDoIndicador(tabela, ligacao, lerFiltrosCategoria(passo.filtro_unidade).a))

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
      // Contagens por categoria de uma mesma coluna: aqui o total existe mesmo, e por isso
      // `composicao` é declarada. A forma sai daí: fatias quando são poucas, blocos por área
      // quando são muitas de mais para uma pizza, barra ordenada quando são muitas demais para
      // qualquer das duas. Nenhuma categoria real fica escondida num "Outros".
      empurrarGrafico(ctx, {
        passo_id: passo.id,
        titulo: passo.descricao_humana,
        eixoX: r.top_categorias.map((c: any) => c.valor),
        series: [{ nome: coluna, valores: r.top_categorias.map((c: any) => c.n) }],
        unidade: 'registos',
        composicao: true,
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
    // Sem `composicao`: são duas médias independentes, não duas partes de um total. Uma pizza
    // aqui inventaria um bolo que ninguém calculou.
    empurrarGrafico(ctx, {
      passo_id: passo.id,
      titulo: passo.descricao_humana,
      eixoX: [distintos[0], distintos[1]],
      series: [{ nome: passo.coluna_metrica || 'valor', valores: [mA, mB] }],
      categoria: 'comparativo',
    })
    return
  }

  if (METODOS_BIVARIADOS.includes(passo.metodo) || passo.metodo === 'detectar_simpson') {
    let x = await serieDe(passo.coluna_metrica)
    let y = await serieDe(passo.coluna_metrica_2)

    // Séries que não alinham é o sintoma típico de o passo estar a pedir duas métricas que vivem
    // em datasets diferentes. Antes de desistir, tenta cruzá-las pela unidade administrativa
    // comum: é quase sempre o que a pergunta queria dizer, e a alternativa era perder o passo
    // central de uma análise de cruzamento.
    if (x.length < 3 || y.length < 3 || x.length !== y.length) {
      const cruzado = await alinharMetricasDeDatasetsDiferentes(passo, ctx)
      if (cruzado) {
        x = cruzado.x
        y = cruzado.y
        // Sem isto a narrativa consegue dizer o valor extremo mas não a que província pertence.
        serieGeoRef.nomes = cruzado.nomes
      }
    }

    // Pseudo-replicação: sem nivel_geo, as séries vêm linha a linha. Quando as duas colunas são
    // atributos da unidade repetidos em cada linha, isso multiplica artificialmente a amostra e
    // produz uma significância que a amostra real não sustenta. Colapsar para um valor por unidade
    // não perde informação nenhuma (os valores repetidos são idênticos por definição) e devolve o
    // n verdadeiro.
    if (!passo.nivel_geo && ligacao && passo.coluna_metrica && passo.coluna_metrica_2) {
      const porUnidadeX = atributoPorUnidade(tabela, ligacao, passo.coluna_metrica)
      const porUnidadeY = atributoPorUnidade(tabela, ligacao, passo.coluna_metrica_2)
      if (porUnidadeX && porUnidadeY) {
        const codigos = Array.from(porUnidadeX.keys()).filter((c) => porUnidadeY.has(c))
        if (codigos.length >= 3 && codigos.length < x.length) {
          ctx.avisos.push(
            `Passo "${passo.descricao_humana}": "${passo.coluna_metrica}" e "${passo.coluna_metrica_2}" ` +
              `são valores por unidade administrativa repetidos em cada linha. O teste foi feito sobre ` +
              `as ${codigos.length} unidades reais, e não sobre as ${x.length} linhas, que dariam uma ` +
              `significância inflacionada pela repetição.`
          )
          x = codigos.map((c) => porUnidadeX.get(c)!)
          y = codigos.map((c) => porUnidadeY.get(c)!)
          serieGeoRef.nomes = null
        }
      } else if (porUnidadeX || porUnidadeY) {
        // Só uma das colunas é atributo da unidade. Colapsar obrigaria a resumir a outra (média,
        // soma) e mudaria a pergunta, por isso o cálculo fica como está: o que não pode ficar é o
        // leitor sem saber que o p-valor conta cada unidade tantas vezes quantas as suas linhas.
        const repetida = porUnidadeX ? passo.coluna_metrica : passo.coluna_metrica_2
        ctx.avisos.push(
          `Passo "${passo.descricao_humana}": "${repetida}" é um valor por unidade administrativa ` +
            `repetido em cada linha, por isso a significância deste teste está inflacionada: conta ` +
            `${x.length} observações quando as independentes são apenas ` +
            `${(porUnidadeX || porUnidadeY)!.size}.`
        )
      }
    }

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
    achatarResultado(ctx, passo, r, [nomeDataset], x.length, unidadePercentagemDoIndicador(tabela, ligacao, lerFiltrosCategoria(passo.filtro_unidade).a))

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
        series: [{ nome: rotularMetricaSemIdTecnico(passo.coluna_metrica, passo.descricao_humana, 'valor'), valores: resultado as (number | null)[] }],
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
            { nome: rotularMetricaSemIdTecnico(passo.coluna_metrica, passo.descricao_humana, 'valor'), valores: [...valoresOrdenados, null] },
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
          series: [{ nome: rotularMetricaSemIdTecnico(passo.coluna_metrica, passo.descricao_humana, 'valor'), valores: valoresOrdenados }],
          categoria: 'temporal',
        })
      }
    }

    achatarResultado(ctx, passo, resultado, [nomeDataset], valoresOrdenados.length, unidadePercentagemDoIndicador(tabela, ligacao, lerFiltrosCategoria(passo.filtro_unidade).a))
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
      // Forma fixa: uma curva de Lorenz é sempre uma curva, e o eixo de percentagens acumuladas
      // não se lê como categorias.
      empurrarGrafico(ctx, {
        passo_id: passo.id,
        forma: 'linha',
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
        //
        // Registava-se sempre o MÁXIMO, nunca o mínimo — uma pergunta que pede explicitamente "o
        // maior e o mais pequeno" (ex.: "qual o parque maior e qual o mais pequeno") ficava com um
        // só mapa de destaque, mesmo o texto já respondendo aos dois pelo nome. Agora regista os
        // dois quando são linhas diferentes, com título distinto para não se confundirem no ecrã.
        const metricaDestaque =
          rotuloFiltroCategoria(passo) || (passo.coluna_metrica ? rotularMetricaSemIdTecnico(passo.coluna_metrica, passo.descricao_humana, 'valor') : 'valor')
        if (tabela.geometrias?.[linhaMax] && nomes[linhaMax]) {
          ctx.destaques.push({
            passo_id: `${passo.id}_max`,
            titulo: `${passo.descricao_humana} (maior)`,
            nome: nomes[linhaMax],
            valor: pares[iMax].v,
            metrica: metricaDestaque,
            geometry: tabela.geometrias[linhaMax],
          })
        }
        if (linhaMin !== linhaMax && tabela.geometrias?.[linhaMin] && nomes[linhaMin]) {
          ctx.destaques.push({
            passo_id: `${passo.id}_min`,
            titulo: `${passo.descricao_humana} (menor)`,
            nome: nomes[linhaMin],
            valor: pares[iMin].v,
            metrica: metricaDestaque,
            geometry: tabela.geometrias[linhaMin],
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
  // Quando não há normalização, `unidadeNormalizacao` devolve vazio e o número ficava sem unidade
  // nenhuma. É este o caminho que produz os máximos e mínimos por província que a narrativa cita,
  // e era por aqui que "74,8%" chegava ao ecrã como "74,8". A unidade declarada pelo ficheiro entra
  // só quando a normalização não impõe a sua: uma densidade por km² não é uma percentagem.
  achatarResultado(
    ctx,
    passo,
    resultado,
    [nomeDataset],
    valores.length,
    unidadeNormalizacao(passo.normalizacao) ||
      unidadePercentagemDoIndicador(tabela, ligacao, lerFiltrosCategoria(passo.filtro_unidade).a)
  )
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

const ROTULO_NIVEL_DESAMBIGUACAO: Record<string, string> = {
  admin1: 'província',
  admin2: 'distrito',
  admin3: 'posto administrativo',
}

/**
 * Duas séries com o MESMO rótulo (ex.: "AREA" e "AREA", duas colunas de nome igual em datasets
 * diferentes, ou o mesmo coluna_metrica reaproveitado por dois passos com filtros diferentes que
 * não deixam marca no rótulo) ficam indistinguíveis no selector do mapa/gráfico — o utilizador
 * não tem como saber qual é qual. Chamado uma vez, depois de todos os passos terem corrido: para
 * cada grupo de séries com o mesmo texto, acrescenta o que as distingue (o nível geográfico,
 * quando difere; senão a descrição do passo que a produziu; em último caso, uma numeração).
 */
export function desambiguarRotulosSeries(ctx: ContextoExecucao, passos: { id: string; descricao_humana: string }[]): void {
  if (ctx.series.length < 2) return
  const descricaoPorPasso = new Map(passos.map((p) => [p.id, p.descricao_humana]))

  const grupos = new Map<string, SerieGeografica[]>()
  for (const s of ctx.series) {
    const chave = s.metrica.trim().toLowerCase()
    const grupo = grupos.get(chave) || []
    grupo.push(s)
    grupos.set(chave, grupo)
  }

  for (const grupo of Array.from(grupos.values())) {
    if (grupo.length < 2) continue
    const niveisDistintos = new Set(grupo.map((s) => s.nivel)).size > 1
    grupo.forEach((s, i) => {
      if (niveisDistintos) {
        s.metrica = `${s.metrica} (${ROTULO_NIVEL_DESAMBIGUACAO[s.nivel] || s.nivel})`
        return
      }
      // A descrição do passo é usada como pai da UI compõe frases com serie.metrica (ex.: título
      // "{metrica} por {nível}"), colar a frase inteira aqui produzia lixo tipo "OBJECTID 1 —
      // Conta o número absoluto de reservas florestais por província. por província" (frase
      // duplicada, prefixo técnico). Fica só um trecho curto, sem a repetição do nível geográfico
      // que a composição de fora já vai acrescentar.
      const descricao = descricaoPorPasso.get(s.passo_id)
      const descricaoCurta = descricao
        ? descricao
            .replace(/\bpor\s+(prov[íi]ncia|distrito|posto administrativo)s?\.?\s*$/i, '')
            .trim()
            .replace(/[.:;]+$/, '')
            .slice(0, 42)
        : ''
      s.metrica = descricaoCurta ? `${s.metrica} (${descricaoCurta}${descricaoCurta.length >= 42 ? '…' : ''})` : `${s.metrica} (${i + 1})`
    })
  }
}

/**
 * Gráfico de garantia (PLANO-DATAPROPROMAX.md): a instrução no prompt de planeamento para incluir
 * pelo menos 3 gráficos já existia há duas sessões e continuou a falhar em testes reais — o
 * modelo nem sempre a segue. Isto é a rede de segurança a nível de código: se a execução terminou
 * sem NENHUM gráfico mas produziu pelo menos uma série geográfica real, constrói um gráfico de
 * barras a partir dela (as maiores unidades por valor) em vez de deixar o dashboard sem nenhum
 * gráfico. Não é um cálculo novo — é a mesma série que já alimenta o mapa, só re-apresentada como
 * barras; por isso continua a respeitar R1 (todo o número já vem de um cálculo real).
 */
/**
 * Perfil comparado de poucas unidades nos vários indicadores que a análise calculou.
 *
 * Quando uma análise cruza datasets, o motor acaba com várias séries geográficas sobre as MESMAS
 * unidades: cobertura vacinal por província, prevalência de atraso no crescimento por província,
 * acesso a água por província. Até aqui cada uma virava o seu gráfico de barras, e a pergunta que
 * o leitor tem — "então esta província está bem ou mal, no conjunto?" — ficava para ele responder
 * saltando de painel em painel.
 *
 * A teia responde a isso de uma vez. Só que uma teia mente quando os eixos vivem em ordens de
 * grandeza diferentes: população em milhões ao lado de hospitais em dezenas encosta um eixo ao
 * bordo e esmaga o resto. Por isso a matriz é construída e depois submetida a `escolherForma`: se
 * a resposta não for `radar`, não se publica nada. É o próprio critério de comparabilidade a
 * decidir, medido nos números reais, e não uma suposição sobre as unidades.
 *
 * As unidades desenhadas são três, e a escolha é dita no título: a do topo, a da mediana e a da
 * base no indicador principal (o primeiro que o plano calculou, que é o da própria pergunta).
 * Desenhar as onze tornaria a teia num novelo; escolher três "interessantes" seria editorializar.
 */
function gerarRadarDePerfil(ctx: ContextoExecucao): void {
  const porNivel = new Map<string, SerieGeografica[]>()
  for (const serie of ctx.series) {
    if (!serie.unidades.length || serie.modo === 'categorico') continue
    const grupo = porNivel.get(serie.nivel) || []
    grupo.push(serie)
    porNivel.set(serie.nivel, grupo)
  }

  for (const [nivel, series] of Array.from(porNivel)) {
    if (series.length < 3) continue

    // Só unidades presentes em TODAS as séries: uma teia com um eixo em falta desenha um vértice
    // colapsado no centro, que se lê como "zero" quando na verdade é "não medido".
    const codigosComuns = series
      .map((s) => new Set(s.unidades.map((u) => u.codigo)))
      .reduce((a, b) => new Set(Array.from(a).filter((c) => b.has(c))))
    if (codigosComuns.size < 3) continue

    const principal = series[0]
    const ordenadas = principal.unidades
      .filter((u) => codigosComuns.has(u.codigo))
      .sort((a, b) => b.valor - a.valor)
    if (ordenadas.length < 3) continue

    const escolhidas = [ordenadas[0], ordenadas[Math.floor(ordenadas.length / 2)], ordenadas[ordenadas.length - 1]]
    const codigosEscolhidos = new Set(escolhidas.map((u) => u.codigo))
    if (codigosEscolhidos.size < 3) continue

    const eixoX = series.map((s) => s.metrica)
    const teias = escolhidas.map((u) => ({
      nome: u.nome,
      valores: series.map((s) => s.unidades.find((x) => x.codigo === u.codigo)?.valor ?? null),
    }))

    // O veredicto é do módulo da forma: se estes números não formam uma teia legível, não há
    // gráfico nenhum. As barras por indicador já cobrem o caso.
    if (escolherForma({ eixoX, series: teias }).tipo !== 'radar') continue

    const rotuloNivel = nivel === 'admin1' ? 'províncias' : nivel === 'admin2' ? 'distritos' : 'postos'
    empurrarGrafico(ctx, {
      passo_id: `perfil_comparado_${nivel}`,
      forma: 'radar',
      titulo: `Perfil comparado: ${rotuloNivel} no topo, no meio e na base de ${principal.metrica}`,
      eixoX,
      series: teias,
      categoria: 'comparativo',
    })
  }
}

/**
 * A variação de um período para o seguinte, quando ela muda de sinal ao longo da série.
 *
 * Uma linha temporal mostra o nível em cada ano; não mostra quanto cada ano deu ou tirou. Quando
 * uns anos sobem e outros descem, é isso que explica onde é que a mudança total se fez, e a
 * cascata é a forma que o mostra sem obrigar a fazer subtracções de cabeça olhando para a linha.
 *
 * Aritmética exacta sobre a mesma série já desenhada: cada barra é a diferença entre dois pontos
 * consecutivos, e a última é a soma dessas diferenças, que é por construção a variação total do
 * primeiro para o último ano. Nada aqui é estimado.
 */
function gerarCascataDeVariacao(ctx: ContextoExecucao): void {
  // Copia: o ciclo acrescenta a ctx.graficos enquanto percorre.
  for (const g of [...ctx.graficos]) {
    if (g.categoria !== 'temporal' || g.tipo !== 'linha') continue
    // Uma segunda série é a projecção de Sen: a variação observada não se mistura com o que ainda
    // não aconteceu.
    if (g.series.length !== 1) continue

    const pontos = g.eixoX
      .map((rotulo, i) => ({ rotulo, valor: g.series[0].valores[i] }))
      .filter((p): p is { rotulo: string; valor: number } => typeof p.valor === 'number' && Number.isFinite(p.valor))
    if (pontos.length < 4) continue

    const eixoX: string[] = []
    const deltas: number[] = []
    for (let i = 1; i < pontos.length; i++) {
      eixoX.push(`${pontos[i - 1].rotulo}→${pontos[i].rotulo}`)
      deltas.push(pontos[i].valor - pontos[i - 1].valor)
    }

    // Sem mudança de sinal, a cascata mostraria a mesma escada que a linha já mostrava.
    if (!(deltas.some((d) => d > 0) && deltas.some((d) => d < 0))) continue

    const series = [{ nome: 'Variação no período', valores: deltas as (number | null)[] }]
    if (escolherForma({ eixoX, series, unidade: g.unidade, composicao: true }).tipo !== 'cascata') continue

    empurrarGrafico(ctx, {
      passo_id: `${g.passo_id}_variacao`,
      forma: 'cascata',
      titulo: `De onde veio a variação: ${g.titulo}`,
      eixoX,
      series,
      unidade: g.unidade,
      categoria: 'temporal',
    })
  }
}

/**
 * A forma da distribuição de cada indicador entre as unidades.
 *
 * Máximo, mínimo e mediana já vão para os KPIs como três números soltos. O que eles não dizem é
 * onde vive a maioria, quão espalhada está, e quem ficou claramente de fora. Um país com metade
 * dos distritos entre 38 e 120 escolas e um a 360 conta uma história diferente de um em que a
 * mesma mediana vem de valores todos encostados — e os três números são iguais nos dois casos.
 *
 * Os valores extremos são calculados pela mesma regra de Tukey que o resto da análise usa (fora de
 * Q1 - 1,5·IQR a Q3 + 1,5·IQR), e cada ponto guarda o nome da unidade: um extremo sem nome é uma
 * curiosidade, com nome é uma pista.
 */
function gerarCaixasDeDistribuicao(ctx: ContextoExecucao): void {
  const MIN_UNIDADES = 5

  const porNivel = new Map<string, SerieGeografica[]>()
  for (const serie of ctx.series) {
    if (serie.unidades.length < MIN_UNIDADES || serie.modo === 'categorico') continue
    const grupo = porNivel.get(serie.nivel) || []
    grupo.push(serie)
    porNivel.set(serie.nivel, grupo)
  }

  for (const [nivel, series] of Array.from(porNivel)) {
    const distribuicoes = series.map((serie) => {
      const ordenados = serie.unidades.map((u) => u.valor).filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
      const quantil = (q: number) => ordenados[Math.min(ordenados.length - 1, Math.floor(ordenados.length * q))]
      const q1 = quantil(0.25)
      const q3 = quantil(0.75)
      const iqr = q3 - q1
      const abaixo = q1 - 1.5 * iqr
      const acima = q3 + 1.5 * iqr
      const foraDoPadrao = serie.unidades
        .filter((u) => u.valor < abaixo || u.valor > acima)
        .sort((a, b) => Math.abs(b.valor - quantil(0.5)) - Math.abs(a.valor - quantil(0.5)))
        .slice(0, 8)
        .map((u) => ({ nome: u.nome, valor: u.valor }))
      // Os bigodes param no último valor DENTRO do intervalo aceite: esticá-los até ao extremo
      // faria o ponto fora do padrão parecer o fim normal da distribuição.
      const dentro = ordenados.filter((v) => v >= abaixo && v <= acima)
      return {
        nome: serie.metrica,
        min: dentro.length ? dentro[0] : ordenados[0],
        q1,
        mediana: quantil(0.5),
        q3,
        max: dentro.length ? dentro[dentro.length - 1] : ordenados[ordenados.length - 1],
        outliers: foraDoPadrao,
        n: ordenados.length,
      }
    })

    // Várias caixas partilham um eixo horizontal: se as escalas não forem comparáveis, uma caixa
    // fica achatada contra a margem e as outras num traço. Nesse caso desenha-se só a primeira.
    const magnitudes = distribuicoes.map((d) => Math.abs(d.max)).filter((m) => m > 0)
    const comparaveis =
      magnitudes.length < 2 || Math.max(...magnitudes) / Math.min(...magnitudes) <= 12
    const aDesenhar = comparaveis ? distribuicoes : distribuicoes.slice(0, 1)

    empurrarGrafico(ctx, {
      passo_id: `distribuicao_${nivel}`,
      forma: 'caixa',
      titulo:
        aDesenhar.length === 1
          ? `Como se distribui: ${aDesenhar[0].nome}`
          : 'Como se distribuem os indicadores entre as unidades',
      eixoX: [],
      series: [],
      distribuicoes: aDesenhar,
      categoria: 'comparativo',
    })
  }
}

/**
 * Três medidas de cada unidade num só desenho.
 *
 * É o par do radar, para o caso que o radar recusa. Quando os indicadores vivem em ordens de
 * grandeza diferentes (população em milhões, escolas em centenas, hospitais em dezenas), uma teia
 * mente; mas duas dessas medidas nos eixos e a terceira no tamanho da bolha lêem-se sem problema
 * nenhum, porque cada uma tem a sua própria escala.
 */
function gerarBolhasDeTresMedidas(ctx: ContextoExecucao): void {
  const porNivel = new Map<string, SerieGeografica[]>()
  for (const serie of ctx.series) {
    if (!serie.unidades.length || serie.modo === 'categorico') continue
    const grupo = porNivel.get(serie.nivel) || []
    grupo.push(serie)
    porNivel.set(serie.nivel, grupo)
  }

  for (const [nivel, series] of Array.from(porNivel)) {
    if (series.length < 3) continue

    const codigosComuns = series
      .slice(0, 3)
      .map((s) => new Set(s.unidades.map((u) => u.codigo)))
      .reduce((a, b) => new Set(Array.from(a).filter((c) => b.has(c))))
    if (codigosComuns.size < 4) continue

    const tres = series.slice(0, 3)
    const eixoX = Array.from(codigosComuns).map(
      (codigo) => tres[0].unidades.find((u) => u.codigo === codigo)!.nome
    )
    const valores = tres.map((s) => ({
      nome: s.metrica,
      valores: Array.from(codigosComuns).map((codigo) => s.unidades.find((u) => u.codigo === codigo)?.valor ?? null),
    }))

    // A bolha entra onde o radar sai. E a pergunta certa é se o radar JÁ FOI DESENHADO para este
    // nível, não se estes números formam um radar: as duas formas orientam a matriz ao contrário
    // uma da outra (o radar põe os indicadores nos eixos, a bolha põe as unidades nos pontos), e
    // medir a comparabilidade na orientação errada respondia sempre que sim.
    if (ctx.graficos.some((g) => g.passo_id === `perfil_comparado_${nivel}`)) continue
    // A terceira medida vira raio, e um raio negativo não existe.
    if (valores[2].valores.some((v) => typeof v === 'number' && v < 0)) continue

    empurrarGrafico(ctx, {
      passo_id: `tres_medidas_${nivel}`,
      forma: 'bolha',
      titulo: `${valores[0].nome} e ${valores[1].nome}, com ${valores[2].nome} no tamanho`,
      eixoX,
      series: valores,
      bolhas: true,
      categoria: 'comparativo',
    })
  }
}

/**
 * De quantos registos é que a análise realmente partiu.
 *
 * Três etapas encaixadas, cada uma um subconjunto da anterior: o que o ficheiro tem, o que foi
 * possível situar numa unidade administrativa, e o que chegou a entrar num cálculo. É a pergunta
 * "isto foi calculado sobre quê?", que hoje só se responde lendo a auditoria número a número.
 *
 * Só se desenha quando há perda real entre as etapas: sem perda, o funil seria três faixas do
 * mesmo tamanho a dizer o que um número já dizia.
 */
function gerarFunilDeCobertura(ctx: ContextoExecucao): void {
  const PERDA_MINIMA = 0.02

  for (const [datasetId, tabela] of Array.from(ctx.tabelas)) {
    const ligacao = ctx.ligacoes.get(datasetId)
    if (!ligacao || !tabela?.n_linhas) continue

    const noFicheiro = tabela.n_linhas
    const comUnidade = ligacao.ligacoes.size
    const usadas = Math.max(
      0,
      ...Object.values(ctx.calcs)
        .filter((c) => (c.proveniencia?.datasets || []).includes(tabela.titulo))
        .map((c) => c.proveniencia?.linhas_usadas || 0)
    )
    if (!usadas) continue

    const etapas = [noFicheiro, comUnidade, Math.min(usadas, comUnidade)]
    if (etapas.some((v) => !Number.isFinite(v) || v <= 0)) continue
    // Encaixe obrigatório: uma etapa maior do que a anterior não é um subconjunto dela.
    if (etapas[1] > etapas[0] || etapas[2] > etapas[1]) continue
    if ((etapas[0] - etapas[2]) / etapas[0] < PERDA_MINIMA) continue

    empurrarGrafico(ctx, {
      passo_id: `cobertura_${datasetId}`,
      forma: 'funil',
      titulo: `De que dados partiu esta análise: ${tabela.titulo}`,
      eixoX: ['Registos no ficheiro', 'Situados numa unidade administrativa', 'Usados no cálculo'],
      series: [{ nome: 'Registos', valores: etapas }],
      unidade: 'registos',
      funil: true,
      composicao: true,
    })
  }
}

export function gerarGraficosDeGarantia(ctx: ContextoExecucao): void {
  gerarRadarDePerfil(ctx)
  gerarBolhasDeTresMedidas(ctx)
  gerarCaixasDeDistribuicao(ctx)
  gerarCascataDeVariacao(ctx)
  gerarFunilDeCobertura(ctx)

  if (ctx.series.length === 0) return

  // Antes, isto parava ao encontrar QUALQUER gráfico já existente e só cobria ctx.series[0] — com
  // várias séries (ex.: uma por cultura filtrada via "cat:coluna=valor"), só a primeira alguma vez
  // ganhava gráfico de garantia, mesmo quando nenhuma das outras tinha gráfico próprio nenhum.
  // Agora cobre cada série que ainda não tem um gráfico correspondente, não só a primeira.
  //
  // Tentei aqui detectar automaticamente quando duas séries são "a mesma coisa a granularidades
  // diferentes" (para mostrar só a mais fina) por semelhança do texto de "metrica" — mas não há
  // forma fiável de distinguir isso de duas grandezas genuinamente diferentes sobre a mesma
  // categoria (ex.: "Produção de milho" em toneladas vs "Milho" — uma coluna larga sem tipo de
  // grandeza no nome — em hectares): um texto ambíguo pode ser a mesma coisa ou pode não ser, e
  // esconder dados reais por engano é pior do que um gráfico a mais. Por isso cada série continua
  // a gerar o seu próprio gráfico; reduzir duplicados genuínos é uma decisão do Planeamento (não
  // pedir aos dois datasets a mesma grandeza), não algo para adivinhar aqui a partir de texto.
  const idsComGrafico = new Set(
    ctx.graficos.map((g) => g.passo_id.replace(/_grafico_garantia$/, ''))
  )

  for (const serie of ctx.series) {
    if (idsComGrafico.has(serie.passo_id) || !serie.unidades.length) continue

    const ordenadas = [...serie.unidades].sort((a, b) => b.valor - a.valor).slice(0, 15)
    const unidadeTexto = UNIDADE_POR_NORMALIZACAO[serie.normalizacao] || ''

    // `composicao` exige três coisas ao mesmo tempo, e faltando uma não há fatias.
    //   1. Sem normalização: por habitante ou por km², somar as unidades não dá total nenhum.
    //   2. Sem valores negativos.
    //   3. A lista COMPLETA. Este gráfico corta nas 15 maiores, e uma pizza das 15 maiores de 128
    //      distritos afirma que aquelas são o todo, quando são uma amostra do topo.
    const listaCompleta = ordenadas.length === serie.unidades.length
    empurrarGrafico(ctx, {
      passo_id: `${serie.passo_id}_grafico_garantia`,
      titulo: `${serie.metrica}${unidadeTexto ? ` (${unidadeTexto})` : ''}${listaCompleta ? '' : ': maiores unidades'}`,
      eixoX: ordenadas.map((u) => u.nome),
      series: [{ nome: serie.metrica, valores: ordenadas.map((u) => u.valor) }],
      unidade: unidadeTexto,
      composicao: listaCompleta && serie.normalizacao === 'nenhuma' && ordenadas.every((u) => u.valor >= 0),
      categoria: 'comparativo',
    })
  }
}
