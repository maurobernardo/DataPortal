/**
 * Que forma dar a um mapa.
 *
 * Até aqui o portal desenhava sempre o mesmo: coroplético quando havia uma série por unidade,
 * marcadores quando havia pontos, e um mapa de calor escondido atrás de um botão que ninguém
 * carregava. O resultado é que todas as análises se pareciam umas com as outras, mesmo quando os
 * dados por baixo não tinham nada em comum.
 *
 * Este módulo faz para os mapas o que `forma-do-grafico` faz para os gráficos: olha para a
 * GEOMETRIA (ponto, linha, polígono), para quantas feições existem, e para o que foi medido, e
 * escolhe a representação. E, como lá, o valor está nas regras que RECUSAM: a mais importante de
 * todas é a que impede um coroplético de contagens.
 *
 * Sobre o coroplético de contagens
 * --------------------------------
 * Pintar polígonos por uma CONTAGEM é o erro clássico da cartografia temática, e é silencioso.
 * Uma província grande fica escura porque é grande, não porque tem mais por habitante ou por km².
 * Niassa tem quase o dobro da área de Nampula; um mapa de "número de escolas" pintado por
 * província diz ao leitor que Niassa está bem servida quando a leitura correcta é o contrário.
 * Por isso: coroplético só para taxas, percentagens e densidades. Contagens vão para símbolos
 * proporcionais, em que a área do círculo é o valor e a área do polígono não conta nada.
 *
 * Cliente-only (sem imports de servidor): usado pelo executor para decidir e pelo componente do
 * mapa para saber que alternativas oferecer.
 */

export type TipoMapa =
  | 'coropletico'
  | 'simbolos'
  | 'pontos'
  | 'agrupamento'
  | 'calor'
  | 'rede'
  | 'destaque'
  /** Variação entre dois momentos, em escala divergente centrada no zero. */
  | 'mudanca'

export type GeometriaMapa = 'ponto' | 'linha' | 'poligono' | 'mista' | 'nenhuma'

export type DadosParaMapa = {
  geometria: GeometriaMapa
  /** Quantas feições tem a camada desenhada. */
  nFeicoes: number
  /** Há um valor medido por unidade para colorir ou dimensionar? */
  temValorPorUnidade?: boolean
  /**
   * Se somar os valores das unidades dá um total que existe. Contagens e áreas somam; taxas,
   * percentagens e densidades não. É isto que separa símbolos proporcionais de coroplético.
   */
  valorEAditivo?: boolean
  /** Quantas unidades trazem valor. Abaixo de um punhado, nenhuma escala de cor se lê. */
  nUnidadesComValor?: number
  /** A cor deve vir de uma categoria (hotspot, tipo de estrada) e não de uma magnitude. */
  categorico?: boolean
  /** Uma só unidade em foco: "qual é o maior X" não é um mapa de distribuição. */
  unidadeUnica?: boolean
  /**
   * Os valores JÁ SÃO a variação entre dois momentos, com sinal.
   *
   * Tem de ser declarado e nunca inferido do facto de haver negativos: um saldo migratório ou uma
   * balança comercial também têm negativos e não são variações de nada. Confundir os dois faria um
   * mapa de saldos anunciar que houve descida onde nada desceu.
   */
  eVariacao?: boolean
}

export type EscolhaDeMapa = {
  tipo: TipoMapa
  /** Porquê, em linguagem de quem lê o relatório. */
  porque: string
  /** Formas alternativas que continuam honestas para estes dados. */
  alternativas: TipoMapa[]
}

/* ------------------------------------------------------------------ limiares */

/**
 * Acima disto, marcadores individuais sobrepõem-se e o mapa deixa de mostrar onde as coisas
 * estão: mostra uma mancha de alfinetes. Medido contra as camadas reais do portal, em que as
 * escolas são 9 535 e as aldeias 11 349.
 */
const MAX_PONTOS_INDIVIDUAIS = 300
/** Acima disto, nem o agrupamento chega: os círculos de contagem cobrem o país. */
const MAX_PONTOS_AGRUPADOS = 3000
/** Abaixo disto, uma escala de cor por quartis não tem observações para formar classes. */
const MIN_UNIDADES_PARA_ESCALA = 5

/* ------------------------------------------------------------------ escolha */

export function escolherMapa(d: DadosParaMapa): EscolhaDeMapa {
  const nComValor = d.nUnidadesComValor ?? 0

  // 1. Uma unidade em foco. Um coroplético do país inteiro responde a outra pergunta.
  if (d.unidadeUnica) {
    return {
      tipo: 'destaque',
      porque: 'A pergunta é sobre uma unidade, e o mapa mostra-a isolada em vez de a diluir no país.',
      alternativas: [],
    }
  }

  // 2. Linhas. Estradas e caminhos-de-ferro nunca foram coloridos por atributo nenhum neste
  //    portal: apareciam todos da mesma cor, o que desperdiça a única coisa que os distingue.
  if (d.geometria === 'linha') {
    return {
      tipo: 'rede',
      porque: d.temValorPorUnidade
        ? 'É uma rede, e a cor de cada troço mostra o que foi medido nele.'
        : 'É uma rede: o que interessa é o traçado e por onde passa.',
      alternativas: [],
    }
  }

  // 3. Variação entre dois momentos. Vem antes de tudo o que decide por aditividade, porque uma
  //    variação não é aditiva nem é uma taxa: é uma quantidade com sinal, e o que a torna legível
  //    é o zero ficar no meio da escala. Uma rampa sequencial punha "desceu muito" e "não mudou"
  //    a partilhar o extremo claro.
  if (d.eVariacao && (d.geometria === 'poligono' || d.geometria === 'mista') && d.temValorPorUnidade) {
    return {
      tipo: 'mudanca',
      porque:
        'Os valores são variações entre dois momentos: a escala é centrada no zero, para separar quem subiu de quem desceu.',
      alternativas: [],
    }
  }

  // 4. Polígonos com valor medido. Aqui está a regra que mais muda o que se vê.
  if ((d.geometria === 'poligono' || d.geometria === 'mista') && d.temValorPorUnidade) {
    if (nComValor < MIN_UNIDADES_PARA_ESCALA) {
      return {
        tipo: 'simbolos',
        porque: 'São poucas unidades para uma escala de cor, e o tamanho do círculo compara-as directamente.',
        alternativas: ['coropletico'],
      }
    }
    if (d.categorico) {
      return {
        tipo: 'coropletico',
        porque: 'Cada unidade pertence a uma categoria, e a cor da área é o que a identifica.',
        alternativas: [],
      }
    }
    if (d.valorEAditivo) {
      return {
        tipo: 'simbolos',
        porque:
          'São contagens: pintar a área faria uma província grande parecer mais servida só por ser grande. A área do círculo é o valor.',
        alternativas: ['coropletico'],
      }
    }
    return {
      tipo: 'coropletico',
      porque: 'É uma taxa comparável entre unidades, que é o que a cor de uma área sabe mostrar.',
      alternativas: ['simbolos'],
    }
  }

  // 5. Pontos. A densidade decide, porque é ela que determina o que ainda se consegue ver.
  if (d.geometria === 'ponto' || (d.geometria === 'mista' && !d.temValorPorUnidade)) {
    if (d.nFeicoes > MAX_PONTOS_AGRUPADOS) {
      return {
        tipo: 'calor',
        porque: 'São demasiados pontos para os distinguir: a mancha mostra onde se concentram.',
        alternativas: ['agrupamento', 'pontos'],
      }
    }
    if (d.nFeicoes > MAX_PONTOS_INDIVIDUAIS) {
      return {
        tipo: 'agrupamento',
        porque: 'São pontos a mais para verem-se um a um, e o agrupamento conta-os por zona sem os esconder.',
        alternativas: ['calor', 'pontos'],
      }
    }
    return {
      tipo: 'pontos',
      porque: 'São poucos o suficiente para se ver cada um no seu lugar.',
      alternativas: d.nFeicoes > 30 ? ['agrupamento'] : [],
    }
  }

  // 6. Polígonos sem nada medido: o mapa é a própria forma do território.
  return {
    tipo: 'coropletico',
    porque: 'Mostra a forma e a posição real de cada unidade.',
    alternativas: [],
  }
}

/** As formas que o utilizador pode escolher à mão, com a escolhida à cabeça. */
export function formasDeMapaPermitidas(d: DadosParaMapa): TipoMapa[] {
  const escolha = escolherMapa(d)
  return [escolha.tipo, ...escolha.alternativas.filter((a) => a !== escolha.tipo)]
}

/**
 * Normaliza um valor de geometria, venha ele do catálogo ou do próprio GeoJSON.
 *
 * São duas famílias de valores, e ambas passam por aqui.
 *
 * Do CATÁLOGO, escritos à mão: "Polígono", "Polígono " com espaço no fim, "Poligino" com gralha,
 * "Ponto" e "Pontos". Um `switch` por igualdade exacta falharia em três dos vinte e nove
 * conjuntos geoespaciais, em silêncio.
 *
 * Do GEOJSON, gerados pela leitura do ficheiro: "Point", "MultiPoint", "LineString",
 * "MultiLineString", "Polygon", "MultiPolygon". O prefixo `Multi` é o caso normal num shapefile,
 * não a excepção: uma província é quase sempre um MultiPolygon, porque tem ilhas.
 *
 * O prefixo é por isso retirado ANTES de comparar, e não tratado como mais um caso a acrescentar
 * à alternância: foi assim que "MultiPolygon" e "MultiPoint" passaram despercebidos na primeira
 * versão, com os testes verdes porque só cobriam os nomes portugueses.
 */
export function normalizarGeometria(valor?: string | null): GeometriaMapa {
  if (!valor) return 'nenhuma'
  const v = valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/^multi[\s_-]*/, '')

  if (/^pol[iy]g/.test(v)) return 'poligono'
  if (/^(ponto|point)/.test(v)) return 'ponto'
  if (/^(linha|line)/.test(v)) return 'linha'
  if (/mist|mixed|geometrycollection/.test(v)) return 'mista'
  return 'nenhuma'
}
