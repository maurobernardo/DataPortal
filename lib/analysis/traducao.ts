import { chamarEstagio } from './router'
import { limparTextoVisivel } from './viabilidade'

/**
 * A versão inglesa de um relatório.
 *
 * O portal já tinha Google Translate na barra, e isso é o problema: um relatório para um doador
 * traduzido por máquina desmente a seriedade de tudo o resto que o documento afirma. Quem lê em
 * inglês são agências, financiadores e consultoras, e é para essas pessoas que a qualidade do
 * português não conta nada.
 *
 * A tradução é feita a pedido e guardada, e não gerada em toda a análise. A esmagadora maioria
 * nunca vai precisar dela, e duplicar o custo de cada análise para servir uma minoria seria pagar
 * caro por nada.
 *
 * O que este módulo faz de diferente de "mandar traduzir": VERIFICA. Um modelo a traduzir um texto
 * cheio de números tem duas formas de o estragar em silêncio, e as duas são plausíveis. Pode mudar
 * a convenção decimal, que é uma tradução legítima em qualquer outro contexto e aqui transforma
 * 1.234 em mil duzentos e trinta e quatro. E pode arredondar de passagem. Por isso a tradução só é
 * aceite se todos os números do original aparecerem no resultado.
 */

/** Os campos de texto que valem a pena traduzir. Os restantes são identificadores e datas. */
const CAMPOS = [
  'titulo',
  'subtitulo',
  'resposta_directa',
  'o_que_mostram',
  'porque',
  'como_chegamos',
] as const

export type NarrativaTraduzida = {
  titulo: string
  subtitulo: string
  resposta_directa: string
  o_que_mostram: string
  porque: string
  como_chegamos: string
  o_que_nao_diz: string[]
  numeros_chave: { calc_id: string; rotulo: string; contexto: string }[]
}

const PROMPT = `You translate published data-analysis reports from Mozambican Portuguese into English.

This is a factual report about Mozambique that will be read by donors, government agencies and
consultancies. Translate it as a professional statistician would write it in English, not literally.

ABSOLUTE RULES

1. NEVER change a number. Not one digit, not the rounding, not the thousands or decimal separators.
   Copy every numeral exactly as it appears in the source, including "1.234,5" style values. This
   overrides normal English convention: a report whose numbers were silently reformatted is worse
   than one that was never translated.
2. NEVER change a place name. Nampula stays Nampula, Cabo Delgado stays Cabo Delgado.
3. NEVER add a fact, a caveat or an interpretation that is not in the source. If a sentence is
   hedged in Portuguese, it stays exactly as hedged in English.
4. NEVER drop the limitations. They are the most important part of the document.
5. Keep any {{calc:...}} token exactly as written, character for character.
6. Do not use em dashes or en dashes. Use a colon or a semicolon instead.

Return the same structure, with every field translated.`

const SCHEMA = {
  type: 'object',
  properties: {
    titulo: { type: 'string' },
    subtitulo: { type: 'string' },
    resposta_directa: { type: 'string' },
    o_que_mostram: { type: 'string' },
    porque: { type: 'string' },
    como_chegamos: { type: 'string' },
    o_que_nao_diz: { type: 'array', items: { type: 'string' } },
    numeros_chave: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          calc_id: { type: 'string' },
          rotulo: { type: 'string' },
          contexto: { type: 'string' },
        },
        required: ['calc_id', 'rotulo', 'contexto'],
        additionalProperties: false,
      },
    },
  },
  required: [
    'titulo',
    'subtitulo',
    'resposta_directa',
    'o_que_mostram',
    'porque',
    'como_chegamos',
    'o_que_nao_diz',
    'numeros_chave',
  ],
  additionalProperties: false,
}

/**
 * Todos os números de um texto, como cadeias, tal como aparecem escritos.
 *
 * Compara-se a FORMA e não o valor de propósito. Se o valor fosse convertido antes de comparar,
 * "1.234" e "1,234" passariam por iguais, e é precisamente essa troca que se quer apanhar: em
 * português é mil duzentos e trinta e quatro, em inglês é um vírgula dois três quatro.
 */
export function numerosDoTexto(texto: string): string[] {
  return (texto.match(/\d[\d.,]*/g) || []).map((n) => n.replace(/[.,]$/, ''))
}

function textoTodo(n: any): string {
  const partes: string[] = CAMPOS.map((c) => String(n?.[c] ?? ''))
  for (const l of n?.o_que_nao_diz || []) partes.push(String(l))
  for (const k of n?.numeros_chave || []) partes.push(String(k?.rotulo ?? ''), String(k?.contexto ?? ''))
  return partes.join(' \n ')
}

/**
 * Os números do original que desapareceram, ou mudaram de forma, na tradução.
 *
 * Compara por multiconjunto e não por conjunto: um número que aparecia três vezes e passou a
 * aparecer uma foi perdido duas, e um `Set` diria que está tudo bem.
 */
export function numerosPerdidos(original: string, traduzido: string): string[] {
  const restantes = new Map<string, number>()
  for (const n of numerosDoTexto(traduzido)) restantes.set(n, (restantes.get(n) || 0) + 1)
  const perdidos: string[] = []
  for (const n of numerosDoTexto(original)) {
    const quantos = restantes.get(n) || 0
    if (quantos === 0) perdidos.push(n)
    else restantes.set(n, quantos - 1)
  }
  return perdidos
}

export class TraducaoInfielError extends Error {
  readonly perdidos: string[]
  constructor(perdidos: string[]) {
    super(`Tradução recusada: ${perdidos.length} número(s) não sobreviveram (${perdidos.slice(0, 6).join(', ')})`)
    this.name = 'TraducaoInfielError'
    this.perdidos = perdidos
  }
}

export async function traduzirNarrativa(narrativa: any, pergunta: string): Promise<NarrativaTraduzida> {
  const entrada = {
    pergunta,
    titulo: narrativa?.titulo ?? '',
    subtitulo: narrativa?.subtitulo ?? '',
    resposta_directa: narrativa?.resposta_directa ?? '',
    o_que_mostram: narrativa?.o_que_mostram ?? '',
    porque: narrativa?.porque ?? '',
    como_chegamos: narrativa?.como_chegamos ?? '',
    o_que_nao_diz: narrativa?.o_que_nao_diz ?? [],
    numeros_chave: (narrativa?.numeros_chave ?? []).map((k: any) => ({
      calc_id: k.calc_id,
      rotulo: k.rotulo,
      contexto: k.contexto,
    })),
  }

  const r = await chamarEstagio<NarrativaTraduzida>({
    estagio: 'traducao',
    sistema: PROMPT,
    utilizador: `Translate this report:\n\n${JSON.stringify(entrada, null, 2)}`,
    schema: SCHEMA,
    maxTokens: 12000,
  })
  const traduzida = r.dados
  if (!traduzida) throw new Error('A tradução não devolveu conteúdo')

  const perdidos = numerosPerdidos(textoTodo(entrada), textoTodo(traduzida))
  if (perdidos.length > 0) throw new TraducaoInfielError(perdidos)

  // Os identificadores de cálculo são do código, não do texto: se o modelo lhes tocou, valem os
  // originais. Um calc_id traduzido faria o KPI perder o número e ficar em branco.
  const porOrdem = entrada.numeros_chave
  return {
    ...traduzida,
    titulo: limparTextoVisivel(traduzida.titulo),
    subtitulo: limparTextoVisivel(traduzida.subtitulo),
    resposta_directa: limparTextoVisivel(traduzida.resposta_directa),
    o_que_mostram: limparTextoVisivel(traduzida.o_que_mostram),
    porque: limparTextoVisivel(traduzida.porque),
    como_chegamos: limparTextoVisivel(traduzida.como_chegamos),
    o_que_nao_diz: (traduzida.o_que_nao_diz || []).map(limparTextoVisivel),
    numeros_chave: (traduzida.numeros_chave || []).map((k, i) => ({
      calc_id: porOrdem[i]?.calc_id ?? k.calc_id,
      rotulo: limparTextoVisivel(k.rotulo),
      contexto: limparTextoVisivel(k.contexto),
    })),
  }
}
