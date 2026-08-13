import { z } from 'zod'

/**
 * Manifesto semântico (Parte 4.1 da especificação): a descrição estruturada do que um dataset
 * significa, não apenas do que contém. É isto que permite ao motor decidir se um dataset
 * responde a uma pergunta, que agregações são válidas, e como normalizar antes de mapear.
 *
 * Validado por Zod porque é gerado por IA: uma saída malformada tem de falhar em erro claro no
 * momento da geração, não silenciosamente mais tarde durante uma análise.
 */

export const NivelGeograficoEnum = z.enum([
  'admin0',
  'admin1',
  'admin2',
  'admin3',
  'admin4',
  'ponto',
  'grelha',
])

export const DimensaoSchema = z.object({
  nome: z.string(),
  rotulo: z.string(),
  tipo: z.enum(['geografia', 'tempo', 'categorica', 'ordinal', 'identificador']),
  nivel_admin: z.string().optional(),
  /** Coluna que liga a geo_unidades.codigo. */
  chave_join: z.string().optional(),
  valores: z.array(z.string()).optional(),
  cardinalidade: z.number(),
  /** Para ordinais: ['Bom','Inclinado','Danificado','Partido'] */
  ordem: z.array(z.string()).optional(),
})

export const MetricaSchema = z.object({
  nome: z.string(),
  rotulo: z.string(),
  tipo: z.enum(['contagem', 'soma', 'media', 'taxa', 'percentagem', 'indice', 'moeda', 'duracao']),
  unidade: z.string(),
  agregacao_valida: z.array(z.enum(['soma', 'media', 'mediana', 'max', 'min', 'ponderada'])),
  /** Ex.: somar percentagens. Impede o motor de produzir um número sem sentido. */
  agregacao_invalida: z.array(z.string()),
  /** Coluna de peso para médias ponderadas (população, nº de clientes). */
  peso_para_media: z.string().optional(),
  normalizacoes: z.array(
    z.enum([
      'per_capita',
      'densidade_km2',
      'por_1000',
      'por_100000',
      'indice_100',
      'percentagem_do_total',
    ])
  ),
  /** Para semáforos e paletas divergentes. */
  direcao_boa: z.enum(['maior', 'menor', 'neutra']),
  intervalo_esperado: z.tuple([z.number(), z.number()]).optional(),
})

export const QualidadeSchema = z.object({
  completude: z.number(),
  colunas_problematicas: z.array(z.string()),
  celulas_suprimidas: z.string().optional(),
  /** Ex.: "não comparável com 2007: fronteiras mudaram". Alimenta R8. */
  avisos: z.array(z.string()),
  score: z.number(),
})

export const RelacaoSchema = z.object({
  dataset_slug: z.string(),
  via: z.string(),
  cardinalidade: z.enum(['1:1', '1:N', 'N:1', 'N:N']),
  nota: z.string().optional(),
})

export const ManifestoSchema = z.object({
  dataset_id: z.string(),
  titulo: z.string(),
  /** 1 frase: é o que o agente lê para decidir relevância antes de abrir o dataset. */
  descricao_curta: z.string(),
  descricao_longa: z.string(),
  fonte: z.object({
    instituicao: z.string(),
    url: z.string().optional(),
    /** Ex.: "IIM 2018, Quadro 4.10" */
    documento: z.string().optional(),
    licenca: z.string().optional(),
  }),
  periodicidade: z.enum(['pontual', 'anual', 'trimestral', 'mensal', 'decenal', 'continua']),
  cobertura_temporal: z.tuple([z.number(), z.number()]),
  data_extracao: z.string(),
  cobertura_geografica: z.string(),
  nivel_geografico_min: NivelGeograficoEnum,
  /** "pessoa", "poste", "unidade sanitária", "agregado familiar" */
  unidade_observacao: z.string(),
  dimensoes: z.array(DimensaoSchema),
  metricas: z.array(MetricaSchema),
  qualidade: QualidadeSchema,
  relacoes: z.array(RelacaoSchema),
  perguntas_exemplo: z.array(z.string()),
  palavras_chave: z.array(z.string()),
  /** Para descoberta semântica de datasets (Parte 4.3). */
  embedding: z.array(z.number()).optional(),
})

export type Manifesto = z.infer<typeof ManifestoSchema>
export type Dimensao = z.infer<typeof DimensaoSchema>
export type Metrica = z.infer<typeof MetricaSchema>

/**
 * Manifesto mínimo derivado apenas dos metadados que o portal já tem, para datasets que ainda
 * não passaram pelo gerador com IA. Permite que o motor funcione desde o primeiro dia, com
 * confiança reduzida, em vez de exigir que todos os 40 datasets sejam processados antes.
 */
export function manifestoProvisorio(dataset: {
  id: number
  title: string
  description: string
  source: string | null
  year: number
  dataType: string
  coverage: string | null
  minimumUnit: string | null
  keywords: string | null
  category?: { name: string } | null
}): Manifesto {
  const nivel = inferirNivelGeografico(dataset.minimumUnit, dataset.dataType)

  return {
    dataset_id: String(dataset.id),
    titulo: dataset.title,
    descricao_curta: (dataset.description || dataset.title).slice(0, 200),
    descricao_longa: dataset.description || dataset.title,
    fonte: {
      instituicao: dataset.source || 'Não especificada',
    },
    periodicidade: 'pontual',
    cobertura_temporal: [dataset.year, dataset.year],
    data_extracao: String(dataset.year),
    cobertura_geografica: dataset.coverage || 'Moçambique',
    nivel_geografico_min: nivel,
    unidade_observacao: 'registo',
    dimensoes: [],
    metricas: [],
    qualidade: {
      completude: 0,
      colunas_problematicas: [],
      avisos: ['Manifesto provisório: gerado a partir dos metadados do portal, sem perfil dos dados.'],
      score: 40,
    },
    relacoes: [],
    perguntas_exemplo: [],
    palavras_chave: (dataset.keywords || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
      .concat(dataset.category?.name ? [dataset.category.name] : []),
  }
}

function inferirNivelGeografico(
  minimumUnit: string | null,
  dataType: string
): z.infer<typeof NivelGeograficoEnum> {
  if (dataType !== 'geoespacial') return 'admin1'
  const u = (minimumUnit || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (/posto/.test(u)) return 'admin3'
  if (/distrit/.test(u)) return 'admin2'
  if (/provin/.test(u)) return 'admin1'
  if (/pais|nacional/.test(u)) return 'admin0'
  if (/localidade|bairro|aldeia/.test(u)) return 'admin4'
  return 'ponto'
}
