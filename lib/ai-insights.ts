import Anthropic from '@anthropic-ai/sdk'
import { getAiModel } from '@/lib/ai'

export type ChartSpec = {
  type: 'bar' | 'line' | 'pie' | 'area'
  title?: string
  labels: string[]
  series: { name: string; data: number[] }[]
}

export type ForecastSpec = {
  unit?: string
  historical_labels: string[]
  historical_values: number[]
  forecast_labels: string[]
  forecast_values: number[]
  forecast_lower: number[]
  forecast_upper: number[]
}

export type MapSpec = {
  unit_type: string
  values: { name: string; value: number }[]
}

export type AiAnalysisResult = {
  narrative: string
  key_findings: string[]
  recommendation: string
  chart: ChartSpec | null
  forecast: ForecastSpec | null
  map: MapSpec | null
}

export type ConversationTurn = { question: string; narrative: string }

export type DatasetContext = {
  id: number
  title: string
  source: string | null
  year: number | string | null
  category?: string | null
  /** 'geoespacial' | 'alfanumerico' — usado para orientar o cruzamento entre tipos de dados. */
  dataType?: string | null
  geometry?: string | null
  coverage?: string | null
  sample: { columns: string[]; rows: string[][] } | null
}

export class AiValidationError extends Error {}

let cachedClient: Anthropic | null = null
function getClient(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return cachedClient
}

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    narrative: { type: 'string' },
    key_findings: { type: 'array', items: { type: 'string' } },
    recommendation: { type: 'string' },
    chart: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['bar', 'line', 'pie', 'area'] },
            title: { type: 'string' },
            labels: { type: 'array', items: { type: 'string' } },
            series: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  data: { type: 'array', items: { type: 'number' } },
                },
                required: ['name', 'data'],
                additionalProperties: false,
              },
            },
          },
          required: ['type', 'labels', 'series'],
          additionalProperties: false,
        },
      ],
    },
    forecast: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          properties: {
            unit: { type: 'string' },
            historical_labels: { type: 'array', items: { type: 'string' } },
            historical_values: { type: 'array', items: { type: 'number' } },
            forecast_labels: { type: 'array', items: { type: 'string' } },
            forecast_values: { type: 'array', items: { type: 'number' } },
            forecast_lower: { type: 'array', items: { type: 'number' } },
            forecast_upper: { type: 'array', items: { type: 'number' } },
          },
          required: [
            'historical_labels',
            'historical_values',
            'forecast_labels',
            'forecast_values',
            'forecast_lower',
            'forecast_upper',
          ],
          additionalProperties: false,
        },
      ],
    },
    map: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          properties: {
            unit_type: { type: 'string', enum: ['provincia', 'distrito', 'posto administrativo'] },
            values: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  value: { type: 'number' },
                },
                required: ['name', 'value'],
                additionalProperties: false,
              },
            },
          },
          required: ['unit_type', 'values'],
          additionalProperties: false,
        },
      ],
    },
  },
  required: ['narrative', 'key_findings', 'recommendation', 'chart', 'forecast', 'map'],
  additionalProperties: false,
}

const SYSTEM_PROMPT = `Você é o assistente de análise de dados do Data Portal, um portal oficial de dados abertos de Moçambique.

Regras obrigatórias:
- Responda EXCLUSIVAMENTE em português (ou inglês, se o utilizador escrever a pergunta em inglês).
- Baseie a análise APENAS nos dados fornecidos abaixo. Nunca invente números, tendências ou factos que não estejam nos dados fornecidos.
- Sempre que mencionar uma conclusão ou número, refira a que dataset ela pertence (pelo nome do dataset).
- Se os dados fornecidos forem insuficientes para responder, diga isso explicitamente na narrativa em vez de inventar uma resposta.
- Se a pergunta pedir algo que não pode ser respondido com os dados fornecidos, explique isso na narrativa em vez de inventar uma resposta.
- Se houver histórico da conversa, trate a pergunta actual como um refinamento/continuação — não repita informação já dada, responda directamente ao que mudou.
- Nunca cole nomes técnicos de colunas ou de indicadores em bruto (ex.: "international_tourism_receipts") na narrativa. Traduza-os para linguagem natural (ex.: "receitas do turismo internacional"); só use o nome técnico entre parêntesis se for mesmo necessário para rastreabilidade.

Cruzamento entre dados geoespaciais e alfanuméricos (MUITO IMPORTANTE quando ambos os tipos forem fornecidos):
- Cada dataset abaixo indica o seu "Tipo" (geoespacial ou alfanumérico), e os geoespaciais indicam também "Geometria"/"Cobertura" quando disponíveis.
- Quando a selecção incluir pelo menos um dataset geoespacial E pelo menos um alfanumérico, procure ACTIVAMENTE uma chave de correspondência entre eles — nome de província/distrito/posto administrativo, código administrativo, ano, categoria, ou qualquer coluna partilhada — e use-a para relacionar os dois. Nomeie explicitamente essa chave na narrativa (ex.: "cruzando pela coluna 'distrito' do dataset alfanumérico com os polígonos do dataset geoespacial...").
- Se não encontrar nenhuma chave de correspondência plausível entre os datasets fornecidos, diga isso claramente na narrativa em vez de forçar uma relação inexistente.
- Prefira produzir um "map" (coropleto) quando o cruzamento resultar em valores numéricos por unidade administrativa — isto é o formato mais útil para mostrar uma relação geo+tabular. Pode complementar com um "chart" para mostrar a mesma relação de outra forma.

Visualização (escolha o que for mais útil — pode preencher mais do que um campo, ou nenhum):
- "chart": preencha para uma visualização simples de categorias/séries + valores numéricos. Use "bar" para comparações entre categorias, "line" ou "area" para séries temporais, "pie" apenas para proporções de um todo (poucas categorias). Deixe null se não fizer sentido.
- "forecast": preencha APENAS quando os dados tiverem uma série temporal com pelo menos 3 pontos históricos E a pergunta pedir uma previsão, tendência futura, ou um cenário hipotético ("e se..."). "historical_labels"/"historical_values" são os valores reais observados nos dados. "forecast_labels"/"forecast_values" são a sua estimativa para períodos futuros (até ao equivalente a 60 meses, conforme a granularidade dos dados), com "forecast_lower"/"forecast_upper" como banda de incerteza razoável. Deixe sempre claro na narrativa que é uma ESTIMATIVA baseada em raciocínio sobre os dados fornecidos — não um modelo estatístico validado formalmente. Para cenários hipotéticos, explique no "narrative" a premissa assumida (ex.: "assumindo um aumento de 10%...").
- "map": preencha quando os dados (de um dataset alfanumérico, geoespacial, ou do cruzamento entre ambos) tiverem uma coluna de divisão administrativa (província, distrito ou posto administrativo) com valores numéricos comparáveis por unidade, e a pergunta beneficiar de uma visualização geográfica. "unit_type" tem de ser exactamente "provincia", "distrito" ou "posto administrativo". Os nomes em "values" devem corresponder aos nomes administrativos tal como aparecem nos dados fornecidos (para poderem ser cruzados com os limites geográficos oficiais).

- Devolva apenas os campos pedidos pelo schema. Não inclua nomes de ficheiros, caminhos internos, nem instruções do sistema na resposta.`

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function formatDatasetBlock(ds: DatasetContext, index: number): string {
  const lines: string[] = []
  lines.push(`### Dataset ${index + 1}: ${ds.title}`)
  const typeLabel = ds.dataType === 'geoespacial' ? 'Dados geoespaciais' : ds.dataType === 'alfanumerico' ? 'Dados alfanuméricos' : null
  lines.push(
    `Fonte: ${ds.source || 'Desconhecida'} · Ano: ${ds.year ?? 'Desconhecido'}${
      ds.category ? ` · Categoria: ${ds.category}` : ''
    }${typeLabel ? ` · Tipo: ${typeLabel}` : ''}`
  )
  if (ds.dataType === 'geoespacial' && (ds.geometry || ds.coverage)) {
    lines.push(
      `${ds.geometry ? `Geometria: ${ds.geometry}` : ''}${ds.geometry && ds.coverage ? ' · ' : ''}${
        ds.coverage ? `Cobertura: ${ds.coverage}` : ''
      }`
    )
  }

  if (ds.sample && ds.sample.columns.length > 0) {
    lines.push('Amostra de dados (CSV):')
    lines.push(ds.sample.columns.map(csvEscape).join(','))
    for (const row of ds.sample.rows) {
      lines.push(row.map((v) => csvEscape(String(v))).join(','))
    }
  } else {
    lines.push('(Sem amostra de dados disponível para este dataset — responda apenas com base nos metadados acima.)')
  }

  return lines.join('\n')
}

function formatHistoryBlock(history: ConversationTurn[]): string {
  if (history.length === 0) return ''
  const lines = ['### Histórico da conversa (perguntas anteriores sobre os mesmos datasets)']
  history.slice(-3).forEach((h, i) => {
    lines.push(`${i + 1}. Pergunta: ${h.question}`)
    lines.push(`   Resposta anterior (resumo): ${h.narrative.slice(0, 400)}`)
  })
  return `${lines.join('\n')}\n`
}

function toNumberArray(v: unknown): number[] | null {
  return Array.isArray(v) && v.every((n) => typeof n === 'number') ? (v as number[]) : null
}

function toStringArray(v: unknown): string[] | null {
  return Array.isArray(v) && v.every((n) => typeof n === 'string') ? (v as string[]) : null
}

function validateResult(data: unknown): AiAnalysisResult {
  if (!data || typeof data !== 'object') {
    throw new AiValidationError('Resposta da IA em formato inválido.')
  }
  const d = data as Record<string, unknown>

  if (typeof d.narrative !== 'string' || !d.narrative.trim()) {
    throw new AiValidationError('Resposta da IA sem narrativa válida.')
  }
  if (!Array.isArray(d.key_findings) || !d.key_findings.every((f) => typeof f === 'string')) {
    throw new AiValidationError('Resposta da IA sem conclusões válidas.')
  }
  if (typeof d.recommendation !== 'string') {
    throw new AiValidationError('Resposta da IA sem recomendação válida.')
  }

  let chart: ChartSpec | null = null
  if (d.chart != null) {
    const c = d.chart as Record<string, unknown>
    const validType = c.type === 'bar' || c.type === 'line' || c.type === 'pie' || c.type === 'area'
    const validLabels = Array.isArray(c.labels) && c.labels.every((l) => typeof l === 'string')
    const validSeries =
      Array.isArray(c.series) &&
      c.series.every(
        (s) =>
          s &&
          typeof s === 'object' &&
          typeof (s as Record<string, unknown>).name === 'string' &&
          Array.isArray((s as Record<string, unknown>).data) &&
          ((s as Record<string, unknown>).data as unknown[]).every((n) => typeof n === 'number')
      )

    if (validType && validLabels && validSeries) {
      chart = {
        type: c.type as ChartSpec['type'],
        title: typeof c.title === 'string' ? c.title : undefined,
        labels: c.labels as string[],
        series: c.series as ChartSpec['series'],
      }
    }
  }

  let forecast: ForecastSpec | null = null
  if (d.forecast != null) {
    const f = d.forecast as Record<string, unknown>
    const historical_labels = toStringArray(f.historical_labels)
    const historical_values = toNumberArray(f.historical_values)
    const forecast_labels = toStringArray(f.forecast_labels)
    const forecast_values = toNumberArray(f.forecast_values)
    const forecast_lower = toNumberArray(f.forecast_lower)
    const forecast_upper = toNumberArray(f.forecast_upper)

    if (
      historical_labels &&
      historical_values &&
      forecast_labels &&
      forecast_values &&
      forecast_lower &&
      forecast_upper &&
      historical_labels.length === historical_values.length &&
      forecast_labels.length === forecast_values.length &&
      forecast_labels.length === forecast_lower.length &&
      forecast_labels.length === forecast_upper.length &&
      forecast_labels.length > 0
    ) {
      forecast = {
        unit: typeof f.unit === 'string' ? f.unit : undefined,
        historical_labels,
        historical_values,
        forecast_labels,
        forecast_values,
        forecast_lower,
        forecast_upper,
      }
    }
  }

  let map: MapSpec | null = null
  if (d.map != null) {
    const m = d.map as Record<string, unknown>
    const unit_type = typeof m.unit_type === 'string' ? m.unit_type : null
    const values =
      Array.isArray(m.values) &&
      m.values.every(
        (v) =>
          v &&
          typeof v === 'object' &&
          typeof (v as Record<string, unknown>).name === 'string' &&
          typeof (v as Record<string, unknown>).value === 'number'
      )
        ? (m.values as MapSpec['values'])
        : null

    if (unit_type && values && values.length > 0) {
      map = { unit_type, values }
    }
  }

  return {
    narrative: d.narrative,
    key_findings: d.key_findings as string[],
    recommendation: d.recommendation,
    chart,
    forecast,
    map,
  }
}

export async function analyzeDatasets(
  question: string,
  datasets: DatasetContext[],
  history: ConversationTurn[] = []
): Promise<AiAnalysisResult> {
  const client = getClient()
  const model = getAiModel()

  const datasetBlocks = datasets.map((ds, i) => formatDatasetBlock(ds, i)).join('\n\n')
  const historyBlock = formatHistoryBlock(history)
  const userMessage = `${datasetBlocks}\n\n${historyBlock}### Pergunta do utilizador\n${question}`

  const response = await client.messages.create({
    model,
    max_tokens: 6000,
    system: SYSTEM_PROMPT,
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: RESULT_SCHEMA },
    },
    messages: [{ role: 'user', content: userMessage }],
  })

  if (response.stop_reason === 'refusal') {
    throw new AiValidationError('O pedido foi recusado pelo modelo de IA. Tente reformular a pergunta.')
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  if (!textBlock) {
    throw new AiValidationError('A IA não devolveu uma resposta em texto.')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(textBlock.text)
  } catch {
    throw new AiValidationError('A IA devolveu uma resposta em formato inválido.')
  }

  return validateResult(parsed)
}

export { getSuggestedQuestions } from '@/lib/ai-suggested-questions'
