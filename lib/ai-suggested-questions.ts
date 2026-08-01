export type SuggestQuestionDataset = {
  title: string
  category?: { name: string } | null
  dataType?: string | null
  year?: number | string | null
}

const YEAR_REGEX = /\b(19|20)\d{2}\b/g

function stripYear(title: string): string {
  return title.replace(YEAR_REGEX, '').replace(/\s+/g, ' ').trim()
}

/**
 * Procura no catálogo completo outra edição do mesmo dataset (mesmo título sem o ano,
 * ano diferente) — ex.: "População por Aldeias 2007" vs "População por Aldeias 1997".
 */
function findTemporalSibling(
  ds: SuggestQuestionDataset,
  catalog: SuggestQuestionDataset[]
): SuggestQuestionDataset | null {
  if (!ds.year) return null
  const base = stripYear(ds.title)
  if (!base || base === ds.title.trim()) return null
  for (const other of catalog) {
    if (other.title === ds.title || !other.year || String(other.year) === String(ds.year)) continue
    if (stripYear(other.title) === base) return other
  }
  return null
}

function truncate(title: string, max = 42): string {
  return title.length > max ? `${title.slice(0, max - 1)}…` : title
}

type CategoryBank = { match: RegExp; single: (t: string) => string[] }

const CATEGORY_BANKS: CategoryBank[] = [
  {
    match: /ambiente|clima|floresta|hidrografia|água|conservação/i,
    single: (t) => [
      `Quais as principais tendências ambientais em "${t}"?`,
      `Existem áreas de "${t}" que exigem atenção prioritária?`,
      `Como "${t}" pode apoiar decisões de conservação ou gestão de recursos?`,
    ],
  },
  {
    match: /demografia|população|censo|social/i,
    single: (t) => [
      `Como está distribuída a população segundo "${t}"?`,
      `Que regiões têm maior crescimento ou concentração em "${t}"?`,
      `Existem disparidades relevantes entre regiões em "${t}"?`,
    ],
  },
  {
    match: /infraestrutura|energia|estrada|transporte|electr/i,
    single: (t) => [
      `Qual é o estado geral da cobertura em "${t}"?`,
      `Que regiões têm maior défice de infraestrutura segundo "${t}"?`,
      `Que prioridades de investimento sugere "${t}"?`,
    ],
  },
  {
    match: /saúde|hospital|doença|vacin/i,
    single: (t) => [
      `Que padrões de saúde pública se destacam em "${t}"?`,
      `Existem regiões com indicadores de saúde preocupantes em "${t}"?`,
      `Que recomendações de saúde pública sugere "${t}"?`,
    ],
  },
  {
    match: /educaç|escola|aluno/i,
    single: (t) => [
      `Como está distribuída a cobertura educativa em "${t}"?`,
      `Existem disparidades entre regiões ou níveis de ensino em "${t}"?`,
      `Que acções poderiam melhorar os resultados observados em "${t}"?`,
    ],
  },
  {
    match: /limites administrativos|fronteira|distrito|província|administra/i,
    single: (t) => [
      `Como está organizada a divisão administrativa em "${t}"?`,
      `Que unidades administrativas se destacam pelos seus atributos em "${t}"?`,
      `Existem inconsistências ou lacunas nos dados de "${t}"?`,
    ],
  },
  {
    match: /agricultura|agrári|gado|pecuária/i,
    single: (t) => [
      `Que padrões agrícolas se destacam em "${t}"?`,
      `Que regiões têm maior produção ou produtividade segundo "${t}"?`,
      `Que recomendações práticas sugere "${t}" para o sector agrícola?`,
    ],
  },
  {
    match: /economia|comércio|indústr|emprego/i,
    single: (t) => [
      `Que tendências económicas se destacam em "${t}"?`,
      `Que sectores ou regiões lideram segundo "${t}"?`,
      `Que oportunidades sugere "${t}" para investimento?`,
    ],
  },
  {
    match: /turismo|hotel|hotéis/i,
    single: (t) => [
      `Como está distribuída a oferta turística em "${t}"?`,
      `Que regiões têm maior potencial turístico segundo "${t}"?`,
      `Que recomendações sugere "${t}" para o sector do turismo?`,
    ],
  },
]

const FALLBACK_NO_SELECTION = [
  'Resuma as principais conclusões destes dados.',
  'Que padrões ou tendências se destacam?',
  'Que recomendações práticas sugerem estes dados?',
]

function genericSingle(t: string): string[] {
  return [
    `Quais as principais tendências em "${t}"?`,
    `Que padrões se destacam nos dados de "${t}"?`,
    `Que recomendações práticas sugere "${t}"?`,
    `Resuma as principais conclusões de "${t}".`,
  ]
}

function singleDatasetQuestions(ds: SuggestQuestionDataset): string[] {
  const t = truncate(ds.title)
  const categoryName = ds.category?.name
  if (categoryName) {
    for (const bank of CATEGORY_BANKS) {
      if (bank.match.test(categoryName)) return bank.single(t)
    }
  }
  return genericSingle(t)
}

function comboQuestions(geoTitle: string, alfaTitle: string): string[] {
  const g = truncate(geoTitle)
  const a = truncate(alfaTitle)
  return [
    `Cruza "${a}" com "${g}" pela divisão administrativa e mostra a relação num mapa.`,
    `Como se relacionam os valores de "${a}" com a distribuição geográfica de "${g}"?`,
    `Gera um gráfico comparando "${a}" e "${g}" pela mesma unidade administrativa.`,
  ]
}

function multiDatasetQuestions(titles: string[]): string[] {
  const [t1, t2, t3] = titles.map((t) => truncate(t))
  const names = t3 ? `"${t1}", "${t2}" e "${t3}"` : `"${t1}" e "${t2}"`
  return [`Como se relacionam ${names}?`, `Que padrões em comum existem entre ${names}?`]
}

/**
 * Perguntas sugeridas relevantes ao(s) dataset(s) efectivamente seleccionado(s) — nomeiam o
 * título de cada dataset e variam consoante a categoria/tipo, em vez de serem estáticas.
 * Quando `catalog` é fornecido (todo o catálogo disponível), procura também edições do
 * mesmo dataset em anos diferentes para sugerir uma comparação temporal. Módulo puro,
 * seguro para uso no cliente.
 */
export function getSuggestedQuestions(
  selected: SuggestQuestionDataset[],
  catalog: SuggestQuestionDataset[] = []
): string[] {
  if (selected.length === 0) return FALLBACK_NO_SELECTION

  if (selected.length === 1) {
    const base = singleDatasetQuestions(selected[0]).slice(0, 3)
    const sibling = findTemporalSibling(selected[0], catalog)
    if (sibling) {
      const t = truncate(selected[0].title)
      base.unshift(`Como "${t}" mudou entre ${sibling.year} e ${selected[0].year}?`)
    }
    return base.slice(0, 4)
  }

  const geo = selected.find((d) => d.dataType === 'geoespacial')
  const alfa = selected.find((d) => d.dataType === 'alfanumerico')
  const combo = geo && alfa ? comboQuestions(geo.title, alfa.title) : []
  const multi = multiDatasetQuestions(selected.map((d) => d.title))
  const perDataset = singleDatasetQuestions(selected[0]).slice(0, 2)

  const merged = [...combo, ...multi, ...perDataset]
  return Array.from(new Set(merged)).slice(0, 6)
}
