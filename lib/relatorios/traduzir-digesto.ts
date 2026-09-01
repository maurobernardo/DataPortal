import { chamarEstagioRelatorio } from './router'
import { numerosDoTexto, numerosPerdidos, TraducaoInfielError } from '@/lib/analysis/traducao'
import type { Digesto } from './digesto'

/**
 * A versão inglesa de um digesto de relatório.
 *
 * Reaproveita o guardião de fidelidade numérica de `lib/analysis/traducao.ts` (`numerosPerdidos`):
 * a mesma armadilha existe aqui, e é a mesma em qualquer texto com números a atravessar uma
 * tradução — trocar a vírgula decimal pelo ponto, ou arredondar de passagem, produz um documento
 * com aspecto impecável e um número errado. Duplicar essa lógica só para relatórios seria manter
 * duas cópias da mesma regra a divergirem com o tempo, que já foi o próprio motivo pelo qual o
 * motor de análise chegou a sugerir uma pergunta que ele próprio recusava.
 */

const PROMPT = `You translate a structured Mozambican report digest from Portuguese into English, for
donors, government agencies and consultancies.

ABSOLUTE RULES
1. NEVER change a number. Not one digit, not the rounding, not the thousands or decimal separators.
2. NEVER change a place name.
3. NEVER add a fact, a caveat or a recommendation that is not in the source.
4. NEVER drop "o_que_nao_diz" items: they are the most important part of the digest.
5. Keep every "pagina" number exactly as given.
6. Do not use em dashes or en dashes. Use a colon or a semicolon instead.

Return the exact same JSON structure, every text field translated, every number and page
reference untouched.`

const SCHEMA = {
  type: 'object',
  properties: {
    o_que_e: {
      type: 'object',
      properties: {
        assunto: { type: 'string' },
        geografia: { type: 'string' },
        periodo: { type: 'string' },
        metodologia: { type: 'string' },
      },
      required: ['assunto', 'geografia', 'periodo', 'metodologia'],
      additionalProperties: false,
    },
    resumo_curto: { type: 'string' },
    resumo_medio: { type: 'string' },
    achados: {
      type: 'array',
      items: {
        type: 'object',
        properties: { texto: { type: 'string' }, pagina: { type: 'integer' }, ano: { type: ['integer', 'null'] } },
        required: ['texto', 'pagina', 'ano'],
        additionalProperties: false,
      },
    },
    recomendacoes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          texto: { type: 'string' },
          responsavel: { type: ['string', 'null'] },
          prazo: { type: ['string', 'null'] },
          pagina: { type: 'integer' },
        },
        required: ['texto', 'responsavel', 'prazo', 'pagina'],
        additionalProperties: false,
      },
    },
    o_que_nao_diz: { type: 'array', items: { type: 'string' } },
    fontes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          instituicao: { type: 'string' },
          documento: { type: ['string', 'null'] },
          ano: { type: ['integer', 'null'] },
        },
        required: ['instituicao', 'documento', 'ano'],
        additionalProperties: false,
      },
    },
    resultado: {
      type: 'object',
      properties: {
        tipo: { type: 'string', enum: ['obtido', 'esperado', 'nao_aplicavel'] },
        texto: { type: ['string', 'null'] },
        pagina: { type: ['integer', 'null'] },
      },
      required: ['tipo', 'texto', 'pagina'],
      additionalProperties: false,
    },
    glossario: {
      type: 'array',
      items: {
        type: 'object',
        properties: { termo: { type: 'string' }, definicao: { type: 'string' }, pagina: { type: 'integer' } },
        required: ['termo', 'definicao', 'pagina'],
        additionalProperties: false,
      },
    },
    credibilidade: {
      type: 'object',
      properties: {
        tipo_dado: { anyOf: [{ type: 'string', enum: ['primario', 'secundario', 'misto'] }, { type: 'null' }] },
        tamanho_amostra: { type: ['string', 'null'] },
        observacoes: { type: ['string', 'null'] },
      },
      required: ['tipo_dado', 'tamanho_amostra', 'observacoes'],
      additionalProperties: false,
    },
  },
  required: [
    'o_que_e', 'resumo_curto', 'resumo_medio', 'achados', 'recomendacoes', 'o_que_nao_diz', 'fontes',
    'resultado', 'glossario', 'credibilidade',
  ],
  additionalProperties: false,
} as const

/** Tudo o texto do digesto que a tradução pode tocar, para o guardião de números comparar
 *  original com traduzido. As afirmações numéricas ficam de fora de propósito: viajam sem
 *  tradução (ver `traduzirDigesto`), por isso comparar os seus números seria testar o que não
 *  mudou por definição, não o que a tradução fez. */
function textoTraduzivel(d: Pick<Digesto, 'o_que_e' | 'resumo_curto' | 'resumo_medio' | 'achados' | 'recomendacoes' | 'o_que_nao_diz' | 'fontes' | 'resultado' | 'glossario' | 'credibilidade'>): string {
  const partes: string[] = [d.o_que_e.assunto, d.o_que_e.geografia, d.o_que_e.periodo, d.o_que_e.metodologia, d.resumo_curto, d.resumo_medio]
  for (const a of d.achados) partes.push(a.texto)
  for (const r of d.recomendacoes) partes.push(r.texto, r.responsavel || '', r.prazo || '')
  for (const l of d.o_que_nao_diz) partes.push(l)
  for (const f of d.fontes) partes.push(f.instituicao, f.documento || '')
  if (d.resultado.texto) partes.push(d.resultado.texto)
  for (const g of d.glossario) partes.push(g.termo, g.definicao)
  if (d.credibilidade.tamanho_amostra) partes.push(d.credibilidade.tamanho_amostra)
  if (d.credibilidade.observacoes) partes.push(d.credibilidade.observacoes)
  return partes.join(' \n ')
}

export async function traduzirDigesto(digesto: Digesto): Promise<Digesto> {
  const entrada = {
    o_que_e: digesto.o_que_e,
    resumo_curto: digesto.resumo_curto,
    resumo_medio: digesto.resumo_medio,
    achados: digesto.achados,
    recomendacoes: digesto.recomendacoes,
    o_que_nao_diz: digesto.o_que_nao_diz,
    fontes: digesto.fontes,
    resultado: digesto.resultado,
    glossario: digesto.glossario,
    credibilidade: digesto.credibilidade,
  }

  const resposta = await chamarEstagioRelatorio<typeof entrada>({
    estagio: 'traducao',
    utilizador: `${PROMPT}\n\n${JSON.stringify(entrada, null, 2)}`,
    schema: SCHEMA,
    maxTokens: 16000,
  })
  const traduzido = resposta.dados

  const perdidos = numerosPerdidos(textoTraduzivel(entrada), textoTraduzivel(traduzido))
  if (perdidos.length > 0) throw new TraducaoInfielError(perdidos)

  // As páginas de cada achado/recomendação vêm do CÓDIGO original, nunca do que a tradução
  // devolveu: um número de página trocado pela tradução apontaria para a página errada do PDF, e
  // ninguém teria como desconfiar disso ao ler o digesto em inglês.
  return {
    ...traduzido,
    achados: traduzido.achados.map((a, i) => ({
      ...a,
      pagina: digesto.achados[i]?.pagina ?? a.pagina,
      ano: digesto.achados[i]?.ano ?? null,
    })),
    recomendacoes: traduzido.recomendacoes.map((r, i) => ({ ...r, pagina: digesto.recomendacoes[i]?.pagina ?? r.pagina })),
    resultado: { ...traduzido.resultado, pagina: digesto.resultado.pagina },
    glossario: traduzido.glossario.map((g, i) => ({ ...g, pagina: digesto.glossario[i]?.pagina ?? g.pagina })),
    // As afirmações numéricas não são traduzidas: são a matéria-prima da verificação contra os
    // dados do portal, e têm de continuar exactamente como o digesto original as leu.
    afirmacoes_numericas: digesto.afirmacoes_numericas,
  }
}

export { numerosDoTexto, numerosPerdidos, TraducaoInfielError }
