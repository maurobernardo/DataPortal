import type { ChartSpec } from '@/lib/ai-insights'

/**
 * Exemplo estático usado no banner de onboarding do AI Insights. Os números são REAIS,
 * extraídos do dataset "Mozambique Turismo" (id 37, folha "Receipts") já catalogado no
 * portal — fonte: World Bank WDI, indicador ST.INT.RCPT.CD. Mantido como constante (em vez
 * de gerado por IA a cada visita) para carregar instantaneamente e sem custo de API.
 */
export const ONBOARDING_EXAMPLE_DATASET_ID = 37
export const ONBOARDING_EXAMPLE_DATASET_TITLE = 'Mozambique Turismo'
export const ONBOARDING_EXAMPLE_QUESTION =
  'Qual foi a evolução das receitas do turismo internacional em Moçambique?'

export const ONBOARDING_EXAMPLE_NARRATIVE =
  'As receitas do turismo internacional em Moçambique cresceram de 65 milhões USD em 2002 para um pico de 331 milhões USD em 2018, mas caíram para 113 milhões USD em 2020, o valor mais baixo desde 2003. Fonte: World Bank WDI (indicador ST.INT.RCPT.CD), catalogado no dataset "Mozambique Turismo".'

export const ONBOARDING_EXAMPLE_FINDINGS = [
  'Crescimento de cerca de 5× entre 2002 (65M USD) e o pico em 2018 (331M USD).',
  'Quebra acentuada em 2020 (113M USD), coincidente com o início da pandemia global.',
  'Anos de maior volatilidade: 2009-2010 e 2015-2016, com quedas superiores a 30% num só ano.',
]

export const ONBOARDING_EXAMPLE_YEARS = [
  '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010',
  '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020',
]

export const ONBOARDING_EXAMPLE_VALUES_MILLIONS = [
  65, 106, 96, 138, 145, 182, 213, 217, 135, 171, 224, 228, 225, 202, 114, 164, 331, 324, 113,
]

export const ONBOARDING_EXAMPLE_CHART: ChartSpec = {
  type: 'line',
  title: 'Receitas do turismo internacional em Moçambique (milhões USD)',
  labels: ONBOARDING_EXAMPLE_YEARS,
  series: [{ name: 'Receitas (milhões USD)', data: ONBOARDING_EXAMPLE_VALUES_MILLIONS }],
}
