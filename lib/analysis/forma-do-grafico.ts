/**
 * Que forma dar a um conjunto de números.
 *
 * Até aqui, o tipo de gráfico era escolhido à mão em cada sítio do executor que produzia um, com
 * regras soltas do género `top_categorias.length <= 6 ? 'pizza' : 'barra'`. O resultado é que
 * quase toda a análise saía com barras, independentemente de os dados serem uma repartição de um
 * total, uma matriz de duas dimensões, um percurso entre categorias ou uma decomposição com sinal.
 * A forma deixava de dizer o que os dados são.
 *
 * Este módulo separa as duas decisões que estavam misturadas: PERFILAR os dados (quantas
 * categorias, quantas séries, o eixo é tempo ou nomes, os valores somam para um total, há sinal
 * negativo, a matriz está preenchida) e, a partir desse perfil, ESCOLHER a representação. O
 * método que produziu os números entra como pista, nunca como decisão: o mesmo método pode
 * devolver formas diferentes conforme o dataset.
 *
 * Cliente-only (sem imports de servidor): o executor usa-o para decidir, e o componente do
 * gráfico usa-o para saber que alternativas oferecer no selector sem propor disparates.
 */

export type TipoGrafico =
  | 'barra'
  | 'linha'
  | 'area'
  | 'pizza'
  | 'dispersao'
  | 'treemap'
  | 'radar'
  | 'heatmap'
  | 'cascata'
  | 'sankey'
  | 'bolha'
  | 'funil'
  | 'caixa'
  | 'cordas'

export type SerieGrafico = { nome: string; valores: (number | null)[] }

/** Os cinco números que descrevem a forma de uma distribuição, mais o que ficou fora dela. */
export type Distribuicao = {
  nome: string
  min: number
  q1: number
  mediana: number
  q3: number
  max: number
  outliers?: { nome: string; valor: number }[]
  n: number
}

export type DadosParaForma = {
  eixoX: string[]
  series: SerieGrafico[]
  /** Unidade dos valores ("%", "hectares", "hab./km²"). Decide se somar faz sentido. */
  unidade?: string
  /** Ligações origem→destino. Só existem quando o passo mediu um percurso entre categorias. */
  fluxos?: { origem: string; destino: string; valor: number }[]
  /** Resumos de distribuição por cinco números. Uma caixa por entrada. */
  distribuicoes?: Distribuicao[]
  /**
   * Declarar que as três primeiras séries são, por esta ordem, o eixo horizontal, o vertical e o
   * tamanho de cada bolha. Não se adivinha: três séries podem ser três indicadores a comparar
   * lado a lado, e nesse caso a bolha inventaria uma relação entre elas.
   */
  bolhas?: boolean
  /**
   * Declarar que as categorias são etapas encaixadas, cada uma um subconjunto da anterior. É a
   * condição do funil: aplicá-lo a um ranking desenharia um estreitamento que não existe, porque
   * a segunda província não está "dentro" da primeira.
   */
  funil?: boolean
  /**
   * Se estes valores são partes de um mesmo todo.
   *
   * Não se adivinha, declara-se. Contagens por categoria de uma coluna são partes de um todo; duas
   * médias de grupos comparados não são, mesmo sendo números positivos e aditivos, e uma pizza
   * delas inventaria um total que ninguém calculou. Por omissão assume-se que NÃO são: mais vale
   * uma barra correcta do que uma fatia que mente.
   */
  composicao?: boolean
  /** Pista, não decisão: o método que produziu estes números. */
  metodo?: string
}

export type EscolhaDeForma = {
  tipo: TipoGrafico
  /** Porquê, em linguagem de quem lê o relatório. Fica registado para auditoria. */
  porque: string
  /** Formas alternativas que continuam honestas para estes dados, para o selector manual. */
  alternativas: TipoGrafico[]
}

/* ------------------------------------------------------------------ perfil */

export type PerfilDados = {
  nCategorias: number
  nSeries: number
  eixoTemporal: boolean
  eixoNumerico: boolean
  temNegativos: boolean
  temPositivos: boolean
  aditivo: boolean
  matrizDensa: boolean
  escalasComparaveis: boolean
  temFluxos: boolean
  /** Origens e destinos saem do mesmo conjunto: é um trânsito entre pares, não um percurso. */
  fluxoEntrePares: boolean
  temDistribuicoes: boolean
  decrescenteEncaixado: boolean
  rotulosLongos: boolean
}

/** Anos (1950-2099), anos-mês, datas ISO, trimestres. Um eixo assim tem ordem própria. */
const ROTULO_TEMPORAL = /^(19|20)\d{2}([-/](0?[1-9]|1[0-2])([-/]\d{1,2})?)?$|^(19|20)\d{2}\s*[-/]\s*(19|20)?\d{2}$|^T[1-4]\s*(19|20)\d{2}$/i

/**
 * Unidades em que somar não significa nada. Somar as percentagens de cobertura vacinal de onze
 * províncias dá 900 e esse número não existe; somar hectares dá a área total, que existe. É esta
 * distinção que separa uma repartição de um todo (pizza, treemap, cascata) de uma simples
 * comparação lado a lado.
 */
const UNIDADE_NAO_ADITIVA =
  /(%|percent|p\.?p\.?|por\s*(cem|mil|100|1000|10\s*000|100\s*000)|\/\s*(1\s*000|100\s*000|km²|km2|hab)|taxa|r[aá]cio|raz[aã]o|[ií]ndice|m[ée]dia|mediana|densidade|prevalência|coeficiente)/i

export function somarFazSentido(unidade?: string): boolean {
  if (!unidade) return true // sem unidade declarada, assume-se contagem: é o caso mais comum
  return !UNIDADE_NAO_ADITIVA.test(unidade)
}

function numeros(series: SerieGrafico[]): number[] {
  return series.flatMap((s) => s.valores).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
}

/**
 * Numa teia de radar, todos os EIXOS partilham a mesma escala radial. O que tem de ser comparável
 * não é uma série contra a outra: é um eixo contra o outro. Pôr "população" (milhões) e
 * "hospitais" (dezenas) na mesma teia encosta um eixo ao bordo e esmaga todos os outros no centro,
 * e o desenho fica bonito sem dizer nada.
 *
 * Mede-se por isso a magnitude de cada eixo, agregando as séries, e compara-se a maior com a
 * menor. (A primeira versão comparava séries entre si, o que deixava passar exactamente o caso
 * que o radar não aguenta: duas províncias, ambas com milhões numa coluna e dezenas noutra.)
 */
const RACIO_MAXIMO_ENTRE_EIXOS = 12

function escalasSaoComparaveis(d: DadosParaForma): boolean {
  const magnitudePorEixo = d.eixoX
    .map((_, i) => {
      const vs = d.series
        .map((s) => s.valores[i])
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
        .map(Math.abs)
      return vs.length ? Math.max(...vs) : null
    })
    .filter((m): m is number => m !== null && m > 0)

  if (magnitudePorEixo.length < 2) return true
  return Math.max(...magnitudePorEixo) / Math.min(...magnitudePorEixo) <= RACIO_MAXIMO_ENTRE_EIXOS
}

/**
 * Um trânsito entre pares do MESMO conjunto (migração entre províncias, trocas entre sectores)
 * lê-se num diagrama de cordas, que fecha o círculo e mostra reciprocidade. Um percurso entre
 * conjuntos DIFERENTES (províncias para tipos de unidade) lê-se num Sankey, da esquerda para a
 * direita. A diferença não é de gosto: é se os nós são os mesmos dos dois lados.
 */
function fluxoEntreOsMesmosNos(fluxos?: { origem: string; destino: string }[]): boolean {
  if (!fluxos || fluxos.length < 2) return false
  const origens = new Set(fluxos.map((f) => f.origem))
  const destinos = new Set(fluxos.map((f) => f.destino))
  const comuns = Array.from(origens).filter((o) => destinos.has(o)).length
  const total = new Set([...Array.from(origens), ...Array.from(destinos)]).size
  return total > 0 && comuns / total >= 0.5
}

/** Um funil só é honesto se cada etapa couber dentro da anterior. */
function seriesDecrescem(series: SerieGrafico[]): boolean {
  const v = (series[0]?.valores || []).filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
  if (v.length < 3) return false
  for (let i = 1; i < v.length; i++) if (v[i] > v[i - 1]) return false
  return v[0] > 0
}

export function perfilarDados(d: DadosParaForma): PerfilDados {
  const vals = numeros(d.series)
  const celulas = d.series.length * d.eixoX.length
  const preenchidas = d.series.reduce(
    (n, s) => n + s.valores.filter((v) => typeof v === 'number' && Number.isFinite(v)).length,
    0
  )

  return {
    nCategorias: d.eixoX.length,
    nSeries: d.series.length,
    eixoTemporal: d.eixoX.length >= 2 && d.eixoX.every((x) => ROTULO_TEMPORAL.test(String(x).trim())),
    eixoNumerico:
      d.eixoX.length >= 3 &&
      d.eixoX.every((x) => Number.isFinite(Number.parseFloat(String(x).replace(',', '.').replace('%', '')))),
    temNegativos: vals.some((v) => v < 0),
    temPositivos: vals.some((v) => v > 0),
    aditivo: somarFazSentido(d.unidade),
    matrizDensa: d.series.length >= 2 && celulas > 0 && preenchidas / celulas >= 0.7,
    escalasComparaveis: escalasSaoComparaveis(d),
    temFluxos: Array.isArray(d.fluxos) && d.fluxos.length >= 2,
    fluxoEntrePares: fluxoEntreOsMesmosNos(d.fluxos),
    temDistribuicoes: Array.isArray(d.distribuicoes) && d.distribuicoes.length >= 1,
    decrescenteEncaixado: d.funil === true && seriesDecrescem(d.series),
    rotulosLongos: d.eixoX.some((x) => String(x).length > 22),
  }
}

/* ------------------------------------------------------------------ escolha */

/** Acima disto uma pizza deixa de ser legível: as fatias finas confundem-se e a legenda não cabe. */
const MAX_FATIAS_PIZZA = 6
/** Acima disto os rectângulos do treemap ficam menores do que o próprio rótulo. */
const MAX_BLOCOS_TREEMAP = 40
/** Um radar precisa de eixos suficientes para formar uma teia e poucos para não virar um ouriço. */
const MIN_EIXOS_RADAR = 3
const MAX_EIXOS_RADAR = 10
const MAX_TEIAS_RADAR = 4
/** Abaixo disto uma matriz lê-se melhor em barras agrupadas do que em manchas de cor. */
const MIN_CELULAS_HEATMAP = 12
/**
 * Um Sankey com fitas a mais deixa de mostrar um percurso e passa a mostrar um novelo. Onze
 * províncias por oito categorias dão 88 ligações, e nenhum olho as segue: nesse caso a mesma
 * informação lê-se muito melhor como matriz de cor, e o Sankey fica como alternativa no selector.
 */
const MAX_LIGACOES_SANKEY = 30
const MAX_NOS_SANKEY = 24

export function escolherForma(d: DadosParaForma): EscolhaDeForma {
  const p = perfilarDados(d)

  // 0. A forma de uma distribuição. Máximo, mínimo e mediana são três números; a caixa mostra
  //    onde está a maioria, quão espalhada está e quem ficou de fora, que os números não dizem.
  if (p.temDistribuicoes) {
    return {
      tipo: 'caixa',
      porque: 'Mostra onde se concentra a maioria dos valores e quem fica claramente fora.',
      alternativas: ['barra'],
    }
  }

  // 0-bis. Etapas encaixadas, cada uma dentro da anterior.
  if (p.decrescenteEncaixado) {
    return {
      tipo: 'funil',
      porque: 'São etapas encaixadas, e o funil mostra quanto se perde de uma para a seguinte.',
      alternativas: ['barra'],
    }
  }

  // 0-ter. Três medidas sobre as mesmas unidades: duas nos eixos e a terceira no tamanho.
  if (d.bolhas === true && p.nSeries >= 3 && p.nCategorias >= 4) {
    return {
      tipo: 'bolha',
      porque: 'Cruzam-se três medidas de cada unidade: duas nos eixos e a terceira no tamanho.',
      alternativas: ['barra', 'heatmap'],
    }
  }

  // 1. Percurso entre categorias. Nenhuma outra forma mostra para onde é que as coisas vão, mas
  //    só enquanto as fitas forem seguíveis a olho.
  if (p.temFluxos) {
    const ligacoes = d.fluxos!.length
    const nos = new Set(d.fluxos!.flatMap((f) => [f.origem, f.destino])).size
    if (ligacoes <= MAX_LIGACOES_SANKEY && nos <= MAX_NOS_SANKEY) {
      if (p.fluxoEntrePares) {
        return {
          tipo: 'cordas',
          porque: 'O trânsito é entre os mesmos lugares nos dois sentidos, e o círculo mostra a reciprocidade.',
          alternativas: p.matrizDensa ? ['heatmap', 'barra'] : ['barra'],
        }
      }
      return {
        tipo: 'sankey',
        porque: 'Os dados ligam origens a destinos, e o que interessa é para onde vai cada parte.',
        alternativas: p.matrizDensa ? ['heatmap', 'barra'] : ['barra'],
      }
    }
    // Fitas a mais: cai para as regras da matriz, com o fluxo disponível no selector.
  }

  // 2. Decomposição com sinal: contribuições que somam a um total, umas a somar e outras a
  //    subtrair. Em barras normais perde-se a acumulação, que é o ponto.
  if (p.nSeries === 1 && p.temNegativos && p.temPositivos && p.aditivo && p.nCategorias >= 3 && p.nCategorias <= 20) {
    return {
      tipo: 'cascata',
      porque: 'São contribuições que somam e subtraem até um total, e a cascata mostra o percurso.',
      alternativas: ['barra'],
    }
  }

  // 3. Perfil de poucas unidades em poucos indicadores. Decide-se ANTES do heatmap: três
  //    províncias em cinco indicadores cabem numa teia que se lê de relance, e em manchas de cor
  //    obrigariam a comparar tons célula a célula para chegar à mesma conclusão.
  if (
    p.nSeries >= 2 &&
    p.nSeries <= MAX_TEIAS_RADAR &&
    p.nCategorias >= MIN_EIXOS_RADAR &&
    p.nCategorias <= MAX_EIXOS_RADAR &&
    !p.eixoTemporal &&
    !p.temNegativos &&
    p.escalasComparaveis &&
    p.matrizDensa
  ) {
    return {
      tipo: 'radar',
      porque: 'Comparam-se poucas unidades em vários indicadores, e a teia mostra o perfil de cada uma.',
      alternativas: ['barra', 'heatmap'],
    }
  }

  // 4. Matriz de duas dimensões grande demais para uma teia. Barras agrupadas com muitas séries
  //    viram uma paliçada indecifrável; a mancha de cor deixa ver o padrão de uma vez.
  if (
    p.matrizDensa &&
    !p.eixoTemporal &&
    p.nSeries >= 3 &&
    p.nCategorias >= 3 &&
    p.nSeries * p.nCategorias >= MIN_CELULAS_HEATMAP
  ) {
    return {
      tipo: 'heatmap',
      porque: 'Cruzam-se duas dimensões, e a mancha de cor deixa ver o padrão sem contar barras.',
      alternativas: p.temFluxos ? [p.fluxoEntrePares ? 'cordas' : 'sankey', 'barra'] : ['barra', 'radar'],
    }
  }

  // 5. Tempo. A linha é a forma do tempo; a área só quando há um só total a encher.
  if (p.eixoTemporal) {
    if (p.nSeries === 1 && p.aditivo && !p.temNegativos) {
      return {
        tipo: 'linha',
        porque: 'É uma série ao longo do tempo.',
        alternativas: ['area', 'barra'],
      }
    }
    return {
      tipo: 'linha',
      porque: 'São séries ao longo do tempo, e a linha deixa comparar percursos.',
      alternativas: ['barra', 'area'],
    }
  }

  // 6. Relação entre duas medidas contínuas.
  if (p.eixoNumerico && p.nSeries === 1 && p.nCategorias >= 8) {
    return {
      tipo: 'dispersao',
      porque: 'Cruzam-se duas medidas contínuas, e a nuvem mostra a forma da relação.',
      alternativas: ['linha', 'barra'],
    }
  }

  // 7. Repartição de um todo. Duas condições, e ambas obrigatórias: quem calculou tem de declarar
  //    que são partes de um mesmo total, E somar tem de significar alguma coisa. Sem a primeira,
  //    duas médias de grupos virariam fatias de um bolo que ninguém assou; sem a segunda,
  //    percentagens de onze províncias dariam um todo de 900%.
  const parteDeUmTodo =
    d.composicao === true && p.nSeries === 1 && p.aditivo && !p.temNegativos && p.nCategorias >= 2
  if (parteDeUmTodo && p.nCategorias <= MAX_FATIAS_PIZZA) {
    return {
      tipo: 'pizza',
      porque: 'São partes de um total, e são poucas o suficiente para se lerem como fatias.',
      alternativas: ['treemap', 'barra'],
    }
  }
  if (parteDeUmTodo && p.nCategorias <= MAX_BLOCOS_TREEMAP) {
    return {
      tipo: 'treemap',
      porque: 'São partes de um total, e são demasiadas para uma pizza: a área compara melhor.',
      alternativas: ['barra', 'pizza'],
    }
  }

  // 8. Tudo o resto compara-se em barras, que é a forma que nunca engana e escala a muitas
  //    categorias.
  return {
    tipo: 'barra',
    porque:
      p.nCategorias > MAX_BLOCOS_TREEMAP
        ? 'São muitas categorias para comparar, e a barra ordenada mostra-as todas com o nome.'
        : 'Comparam-se valores entre categorias.',
    alternativas:
      d.composicao === true && p.nSeries === 1 && p.aditivo && !p.temNegativos ? ['treemap', 'linha'] : ['linha'],
  }
}

/**
 * As formas que o utilizador pode escolher à mão para estes dados, com a escolhida à cabeça.
 * O selector do dashboard só oferece isto: propor uma pizza para percentagens de províncias, ou
 * uma dispersão para quatro categorias nomeadas, seria oferecer uma leitura errada.
 */
export function formasPermitidas(d: DadosParaForma): TipoGrafico[] {
  const escolha = escolherForma(d)
  return [escolha.tipo, ...escolha.alternativas.filter((a) => a !== escolha.tipo)]
}
