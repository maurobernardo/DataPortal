/**
 * Registo de métodos da biblioteca de análise.
 *
 * É este catálogo que o estágio de Planeamento recebe e do qual escolhe: `PassoPlano.metodo`
 * é sempre uma chave deste registo. A execução invoca a função por nome com os parâmetros do
 * plano, o que garante que o modelo nunca executa código arbitrário e que todo o número
 * produzido vem de uma função tipada, testada e reproduzível (R1, R11).
 */
import {
  perfilColuna,
  detectarOutliers,
  resumoEstatistico,
  concentracao,
  curvaLorenz,
  compararGrupos,
  compararPeriodos,
  tendenciaMannKendall,
  cagr,
  mediaMovel,
  indexarBase100,
  correlacaoPearson,
  regressaoLinear,
  detectarSimpson,
} from './estatistica'
import {
  pesosKnn,
  pesosDistancia,
  moranGlobal,
  moranLocalLisa,
  getisOrdGiEstrela,
  gearyC,
  spearman,
  testeMaup,
} from './geo'

export type FamiliaMetodo =
  | 'perfil'
  | 'descritiva'
  | 'comparativa'
  | 'temporal'
  | 'relacao'
  | 'geoestatistica'
  | 'estrutural'

export type DescricaoMetodo = {
  nome: string
  familia: FamiliaMetodo
  /** Lida pelo planeador para decidir se este método responde à sub-pergunta. */
  descricao: string
  /** Quando NÃO usar: evita que o planeador escolha um método inadequado. */
  nao_usar_quando?: string
  parametros: string[]
  fn: (...args: any[]) => unknown
}

export const REGISTO_METODOS: Record<string, DescricaoMetodo> = {
  perfil_coluna: {
    nome: 'perfil_coluna',
    familia: 'perfil',
    descricao:
      'Perfila uma coluna: tipo inferido, completude, distintos, estatísticas ou top categorias.',
    parametros: ['coluna: string', 'valores: unknown[]'],
    fn: perfilColuna,
  },
  detectar_outliers: {
    nome: 'detectar_outliers',
    familia: 'perfil',
    descricao: 'Identifica valores fora do intervalo de Tukey (Q1-1,5·IQR a Q3+1,5·IQR).',
    nao_usar_quando: 'A série tem menos de 4 observações.',
    parametros: ['valores: number[]', 'factor?: number'],
    fn: detectarOutliers,
  },
  resumo_estatistico: {
    nome: 'resumo_estatistico',
    familia: 'descritiva',
    descricao: 'n, soma, média, mediana, desvio, mínimo, máximo, quartis e coeficiente de variação.',
    parametros: ['valores: number[]'],
    fn: resumoEstatistico,
  },
  concentracao: {
    nome: 'concentracao',
    familia: 'descritiva',
    descricao:
      'Mede concentração com Gini, HHI e quota do topo N. Responde a "está concentrado?" de forma defensável.',
    nao_usar_quando: 'Existem valores negativos: o Gini não está definido.',
    parametros: ['valores: number[]', 'topN?: number'],
    fn: concentracao,
  },
  curva_lorenz: {
    nome: 'curva_lorenz',
    familia: 'descritiva',
    descricao: 'Pontos da curva de Lorenz, para acompanhar visualmente o Gini.',
    parametros: ['valores: number[]'],
    fn: curvaLorenz,
  },
  comparar_grupos: {
    nome: 'comparar_grupos',
    familia: 'comparativa',
    descricao:
      'Compara dois grupos com teste t de Welch e Cohen d. Devolve sempre significância e magnitude juntas.',
    nao_usar_quando: 'Algum dos grupos tem menos de 2 observações.',
    parametros: ['grupoA: number[]', 'grupoB: number[]', 'rotuloA?: string', 'rotuloB?: string'],
    fn: compararGrupos,
  },
  comparar_periodos: {
    nome: 'comparar_periodos',
    familia: 'comparativa',
    descricao: 'Variação absoluta, relativa e em pontos percentuais entre dois momentos.',
    parametros: ['valorInicial: number', 'valorFinal: number', 'ehPercentagem?: boolean'],
    fn: compararPeriodos,
  },
  tendencia_mann_kendall: {
    nome: 'tendencia_mann_kendall',
    familia: 'temporal',
    descricao:
      'Testa tendência monótona sem assumir normalidade nem linearidade, com declive de Sen. Método por defeito para séries oficiais curtas.',
    nao_usar_quando: 'A série tem menos de 4 pontos.',
    parametros: ['serie: number[]'],
    fn: tendenciaMannKendall,
  },
  cagr: {
    nome: 'cagr',
    familia: 'temporal',
    descricao: 'Taxa de crescimento anual composta entre dois momentos.',
    nao_usar_quando: 'O valor inicial é zero ou negativo.',
    parametros: ['valorInicial: number', 'valorFinal: number', 'periodos: number'],
    fn: cagr,
  },
  media_movel: {
    nome: 'media_movel',
    familia: 'temporal',
    descricao: 'Média móvel centrada para suavizar séries ruidosas em gráficos.',
    parametros: ['serie: number[]', 'janela?: number'],
    fn: mediaMovel,
  },
  indexar_base_100: {
    nome: 'indexar_base_100',
    familia: 'temporal',
    descricao: 'Reindexa a série a 100 no primeiro período, tornando escalas diferentes comparáveis.',
    parametros: ['serie: number[]'],
    fn: indexarBase100,
  },
  correlacao_pearson: {
    nome: 'correlacao_pearson',
    familia: 'relacao',
    descricao:
      'Correlação linear com p-valor. A interpretação devolvida nomeia sempre a possibilidade de confundimento (R7).',
    nao_usar_quando: 'A relação é claramente não linear: usar spearman.',
    parametros: ['x: number[]', 'y: number[]'],
    fn: correlacaoPearson,
  },
  correlacao_spearman: {
    nome: 'correlacao_spearman',
    familia: 'relacao',
    descricao: 'Correlação de ordem, robusta a não linearidade e a outliers.',
    parametros: ['x: number[]', 'y: number[]'],
    fn: spearman,
  },
  regressao_linear: {
    nome: 'regressao_linear',
    familia: 'relacao',
    descricao: 'Regressão simples com declive, intercepção, R² e p-valor do declive.',
    parametros: ['x: number[]', 'y: number[]'],
    fn: regressaoLinear,
  },
  detectar_simpson: {
    nome: 'detectar_simpson',
    familia: 'relacao',
    descricao:
      'Verifica se a direcção da associação global se inverte dentro dos grupos (paradoxo de Simpson).',
    parametros: ['x: number[]', 'y: number[]', 'grupos: string[]'],
    fn: detectarSimpson,
  },
  pesos_knn: {
    nome: 'pesos_knn',
    familia: 'geoestatistica',
    descricao:
      'Matriz de pesos espaciais por k vizinhos mais próximos a partir de centróides. Pré-requisito de Moran, LISA e Gi*.',
    parametros: ['centroides: [number,number][]', 'k?: number'],
    fn: pesosKnn,
  },
  pesos_distancia: {
    nome: 'pesos_distancia',
    familia: 'geoestatistica',
    descricao: 'Matriz de pesos por banda de distância em quilómetros.',
    nao_usar_quando: 'O raio deixaria unidades sem vizinhos: usar pesos_knn.',
    parametros: ['centroides: [number,number][]', 'raioKm: number'],
    fn: pesosDistancia,
  },
  moran_global: {
    nome: 'moran_global',
    familia: 'geoestatistica',
    descricao:
      'Moran I global: testa se existe padrão espacial (agrupado, disperso ou aleatório) com inferência por aleatorização.',
    nao_usar_quando: 'Menos de 4 unidades espaciais.',
    parametros: ['valores: number[]', 'W: PesosEspaciais'],
    fn: moranGlobal,
  },
  moran_local_lisa: {
    nome: 'moran_local_lisa',
    familia: 'geoestatistica',
    descricao:
      'LISA: classifica cada unidade em alto-alto, baixo-baixo, alto-baixo, baixo-alto ou não significativo, por permutação.',
    parametros: ['valores: number[]', 'W: PesosEspaciais', 'permutacoes?: number'],
    fn: moranLocalLisa,
  },
  getis_ord_gi_estrela: {
    nome: 'getis_ord_gi_estrela',
    familia: 'geoestatistica',
    descricao:
      'Gi*: identifica hotspots e coldspots estatisticamente significativos. É o método para responder "onde intervir primeiro".',
    parametros: ['valores: number[]', 'W: PesosEspaciais'],
    fn: getisOrdGiEstrela,
  },
  geary_c: {
    nome: 'geary_c',
    familia: 'geoestatistica',
    descricao: 'Geary C, complementar ao Moran e mais sensível a diferenças locais.',
    parametros: ['valores: number[]', 'W: PesosEspaciais'],
    fn: gearyC,
  },
  juntar_datasets: {
    nome: 'juntar_datasets',
    familia: 'estrutural',
    descricao:
      'Junta DOIS datasets seleccionados (ex.: um geoespacial e um alfanumérico) pela unidade ' +
      'administrativa comum a que cada um já está ligado. Requer dataset_id (primeiro), ' +
      'dataset_id_2 (segundo), coluna_metrica (do primeiro) e coluna_metrica_2 (do segundo); ' +
      'nivel_geo é opcional. Produz mapas comparáveis e um gráfico de dispersão entre as duas ' +
      'métricas, e uma tabela combinada que passos seguintes podem referenciar por dataset_id. ' +
      'É o único método que lê de dois datasets ao mesmo tempo: todos os outros lêem sempre de UM ' +
      'só (o indicado em dataset_id, ou o primeiro seleccionado se omitido).',
    nao_usar_quando: 'Só um dataset foi seleccionado, ou nenhum dos dois tem coluna geográfica detectável.',
    parametros: ['dataset_id: number', 'dataset_id_2: number', 'coluna_metrica: string', 'coluna_metrica_2: string', 'nivel_geo?: string'],
    fn: () => {
      throw new Error('juntar_datasets é tratado directamente pelo executor, nunca invocado por invocarMetodo')
    },
  },
  distribuicao_categoria_geo: {
    nome: 'distribuicao_categoria_geo',
    familia: 'estrutural',
    descricao:
      'Cruza uma coluna categórica (ex.: tipo de unidade, classificação, estado) com o nível ' +
      'geográfico ao mesmo tempo: para cada valor da categoria, quantos registos existem em cada ' +
      'província/distrito/posto. É o método certo para "quais províncias têm X" ou "quantos Y por ' +
      'tipo, por província" quando X/Y é um VALOR de uma coluna categórica — resumo_estatistico ' +
      'com nivel_geo sozinho só sabe contar/somar TODAS as linhas por unidade, sem separar por ' +
      'categoria; comparar_grupos sozinho só sabe comparar categorias a nível nacional, sem as ' +
      'separar por unidade geográfica. Requer coluna_grupo (a coluna categórica) e nivel_geo.',
    nao_usar_quando:
      'A pergunta não menciona nenhum valor específico de uma coluna categórica (nesse caso usa ' +
      'resumo_estatistico com nivel_geo), ou a coluna categórica tem mais de 30 valores distintos ' +
      '(fica ilegível — usa perfil_coluna para ver as categorias mais comuns primeiro).',
    parametros: ['coluna_grupo: string', 'nivel_geo: string'],
    fn: () => {
      throw new Error('distribuicao_categoria_geo é tratado directamente pelo executor, nunca invocado por invocarMetodo')
    },
  },
  execucao_codigo: {
    nome: 'execucao_codigo',
    familia: 'estrutural',
    descricao:
      'ÚLTIMO RECURSO: escreve e corre código Python de verdade sobre os dados reais deste ' +
      'dataset, num sandbox isolado sem acesso à rede, para responder a uma sub-pergunta que ' +
      'nenhum outro método do catálogo cobre. O número nunca vem de memória do modelo — vem da ' +
      'execução, fica registado e é auditável, tal como qualquer outro cálculo (R1). O schema não ' +
      'tem campo dedicado para a instrução (evita crescer o schema): escreve a instrução completa ' +
      'em "coluna_metrica" (aqui não é o nome de uma coluna, é a instrução inteira, sem o limite ' +
      'de 20 palavras de descricao_humana). Se os dados não permitirem calcular o pedido, o ' +
      'resultado declara-se "impossivel" em vez de inventado.',
    nao_usar_quando:
      'Existe um método normal do catálogo que responde à mesma sub-pergunta — este método é ' +
      'mais lento e só deve ser escolhido quando os métodos acima genuinamente não chegam.',
    parametros: ['dataset_id?: number', 'coluna_metrica: string (usada aqui como instrução, não nome de coluna)'],
    fn: () => {
      throw new Error('execucao_codigo é tratado directamente pelo executor, nunca invocado por invocarMetodo')
    },
  },
  distancia_minima: {
    nome: 'distancia_minima',
    familia: 'geoestatistica',
    descricao:
      'Para cada feição do PRIMEIRO dataset, calcula a distância real (Haversine, em km) até à ' +
      'feição mais próxima do SEGUNDO dataset — "hospital mais próximo de cada posto ' +
      'administrativo", "escolas a mais de 10km de uma estrada". Requer dataset_id (primeiro) e ' +
      'dataset_id_2 (segundo); ambos precisam de geometria própria (pontos, linhas ou polígonos — ' +
      'usa-se um ponto representativo de cada feição). O schema não tem campo numérico dedicado: ' +
      'o limiar (km) opcional vai em "coluna_grupo" ESCRITO COMO TEXTO (ex.: "10"), não o nome de ' +
      'uma coluna — quando dado, conta e nomeia quantas feições do primeiro dataset ficam além ' +
      'desse limiar.',
    nao_usar_quando:
      'Só um dos dois datasets seleccionados tem geometria própria, ou a pergunta é sobre unidade ' +
      'administrativa comum (nesse caso usa juntar_datasets, não distância real entre geometrias).',
    parametros: ['dataset_id: number', 'dataset_id_2: number', 'coluna_grupo?: string (limiar em km, como texto)'],
    fn: () => {
      throw new Error('distancia_minima é tratado directamente pelo executor, nunca invocado por invocarMetodo')
    },
  },
  contagem_buffer: {
    nome: 'contagem_buffer',
    familia: 'geoestatistica',
    descricao:
      'Para cada feição do PRIMEIRO dataset, conta quantas feições do SEGUNDO dataset caem dentro ' +
      'do raio — ou, se "coluna_metrica_2" for dada (uma coluna numérica do segundo dataset), ' +
      'soma essa coluna em vez de contar. Responde "quantas escolas há num raio de 5km de cada ' +
      'unidade sanitária", "quantos X ficam a menos de Nkm de cada Y". O schema não tem campo ' +
      'numérico dedicado: o raio (km) vai em "coluna_grupo" ESCRITO COMO TEXTO (ex.: "5"), não o ' +
      'nome de uma coluna. Requer dataset_id, dataset_id_2 e coluna_grupo; ambos os datasets ' +
      'precisam de geometria própria.',
    nao_usar_quando:
      'O raio (coluna_grupo) não foi especificado, ou nenhum dos dois datasets tem geometria própria.',
    parametros: ['dataset_id: number', 'dataset_id_2: number', 'coluna_grupo: string (raio em km, como texto)', 'coluna_metrica_2?: string'],
    fn: () => {
      throw new Error('contagem_buffer é tratado directamente pelo executor, nunca invocado por invocarMetodo')
    },
  },
  teste_maup: {
    nome: 'teste_maup',
    familia: 'geoestatistica',
    descricao:
      'Testa se a conclusão sobrevive à mudança de nível de agregação, comparando ordenamentos entre níveis.',
    parametros: ['rankingNivelA', 'rankingNivelB'],
    fn: testeMaup,
  },
}

/** Catálogo em texto, para injectar no prompt do planeador. */
export function catalogoParaPrompt(): string {
  const porFamilia = new Map<FamiliaMetodo, DescricaoMetodo[]>()
  for (const m of Object.values(REGISTO_METODOS)) {
    if (!porFamilia.has(m.familia)) porFamilia.set(m.familia, [])
    porFamilia.get(m.familia)!.push(m)
  }

  const linhas: string[] = []
  for (const [familia, metodos] of Array.from(porFamilia)) {
    linhas.push(`\n## ${familia.toUpperCase()}`)
    for (const m of metodos) {
      linhas.push(`- ${m.nome}(${m.parametros.join(', ')})`)
      linhas.push(`  ${m.descricao}`)
      if (m.nao_usar_quando) linhas.push(`  Não usar quando: ${m.nao_usar_quando}`)
    }
  }
  return linhas.join('\n')
}

export function existeMetodo(nome: string): boolean {
  return nome in REGISTO_METODOS
}

export function invocarMetodo(nome: string, args: unknown[]): unknown {
  const metodo = REGISTO_METODOS[nome]
  if (!metodo) throw new Error(`Método desconhecido: ${nome}`)
  return metodo.fn(...args)
}
