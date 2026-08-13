import { CALC_TOKEN_REGEX, extrairCalcIds } from './constitution'
import type { CelulaCalculada, Narrativa } from './types'
import { formatarPT } from './library/numeric'

/**
 * Substituição de tokens {{calc:id}} pela célula calculada correspondente.
 *
 * Esta função é o ponto onde R1 deixa de ser uma instrução ao modelo e passa a ser garantia do
 * sistema: um token sem cálculo correspondente NÃO é silenciosamente removido nem substituído
 * por um valor plausível. É reportado como erro, e o pipeline recusa publicar a análise. Sem
 * este comportamento, o prompt "nunca inventes números" seria apenas um pedido.
 */

export class TokenPorResolverError extends Error {
  constructor(public readonly tokensEmFalta: string[]) {
    super(`Narrativa refere cálculos inexistentes: ${tokensEmFalta.join(', ')}`)
    this.name = 'TokenPorResolverError'
  }
}

export function formatarCelula(celula: CelulaCalculada): string {
  const { valor, formato, unidade } = celula

  if (typeof valor === 'string') return valor

  switch (formato) {
    case 'inteiro':
      return formatarPT(valor, 0)
    case 'pp':
      return `${formatarPT(valor, 1)} pp`
    case 'percentagem':
      return `${formatarPT(valor, 1)}%`
    case 'moeda':
      return `${formatarPT(valor, 2)} ${unidade || 'MZN'}`
    default: {
      // Contagens são inteiras: mostrá-las como "10,0 províncias" faz o painel parecer
      // impreciso mesmo quando o número está certo.
      const casas = Number.isInteger(valor)
        ? 0
        : Math.abs(valor) >= 100
          ? 0
          : Math.abs(valor) >= 10
            ? 1
            : 2
      const numero = formatarPT(valor, casas)
      return unidade ? `${numero} ${unidade}` : numero
    }
  }
}

/** Resolve os tokens de um texto. Lança se algum token não tiver cálculo correspondente. */
export function resolverTokens(texto: string, calcs: Record<string, CelulaCalculada>): string {
  const emFalta = extrairCalcIds(texto).filter((id) => !calcs[id])
  if (emFalta.length > 0) throw new TokenPorResolverError(emFalta)

  return texto.replace(new RegExp(CALC_TOKEN_REGEX.source, 'g'), (_, id: string) =>
    formatarCelula(calcs[id])
  )
}

export type NarrativaResolvida = Omit<Narrativa, 'numeros_chave'> & {
  numeros_chave: { rotulo: string; valor: string; contexto: string; calc_id: string }[]
}

/**
 * Resolve a narrativa inteira. Recolhe TODOS os tokens em falta antes de falhar, para que o erro
 * mostre a lista completa em vez de obrigar a descobrir um de cada vez.
 */
export function resolverNarrativa(
  narrativa: Narrativa,
  calcs: Record<string, CelulaCalculada>
): NarrativaResolvida {
  const camposTexto = [
    narrativa.titulo,
    narrativa.subtitulo,
    narrativa.resposta_directa,
    narrativa.o_que_mostram,
    narrativa.porque,
    narrativa.como_chegamos,
    ...narrativa.o_que_nao_diz,
  ]

  const emFalta = new Set<string>()
  for (const campo of camposTexto) {
    for (const id of extrairCalcIds(campo || '')) {
      if (!calcs[id]) emFalta.add(id)
    }
  }
  for (const n of narrativa.numeros_chave) {
    if (!calcs[n.calc_id]) emFalta.add(n.calc_id)
    // O rótulo também pode conter tokens. Sem o verificar e resolver, um "{{calc:x}}" cru
    // chegava ao cartão de KPI: uma fuga directa a R1, que existe justamente para impedir que
    // qualquer coisa por resolver apareça ao utilizador.
    for (const campo of [n.rotulo, n.contexto]) {
      for (const id of extrairCalcIds(campo || '')) {
        if (!calcs[id]) emFalta.add(id)
      }
    }
  }
  if (emFalta.size > 0) throw new TokenPorResolverError(Array.from(emFalta))

  return {
    ...narrativa,
    titulo: resolverTokens(narrativa.titulo, calcs),
    subtitulo: resolverTokens(narrativa.subtitulo, calcs),
    resposta_directa: resolverTokens(narrativa.resposta_directa, calcs),
    o_que_mostram: resolverTokens(narrativa.o_que_mostram, calcs),
    porque: resolverTokens(narrativa.porque, calcs),
    como_chegamos: resolverTokens(narrativa.como_chegamos, calcs),
    o_que_nao_diz: narrativa.o_que_nao_diz.map((t) => resolverTokens(t, calcs)),
    numeros_chave: narrativa.numeros_chave.map((n) => ({
      calc_id: n.calc_id,
      rotulo: resolverTokens(n.rotulo, calcs),
      contexto: resolverTokens(n.contexto, calcs),
      valor: formatarCelula(calcs[n.calc_id]),
    })),
  }
}

/**
 * Verificação anti-alucinação: garante que nenhum número aparece na narrativa fora de um token.
 * Usada nos testes de CI (Parte 16.3) e como aviso em runtime.
 *
 * Alguns números são legítimos em texto corrido (anos, ordinais, "um em cada cinco"), por isso a
 * função devolve os candidatos em vez de bloquear: quem chama decide.
 */
export function numerosForaDeTokens(texto: string): string[] {
  const semTokens = texto.replace(new RegExp(CALC_TOKEN_REGEX.source, 'g'), '')
  const encontrados: string[] = []
  const re = /\b\d[\d\s.,]*\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(semTokens)) !== null) {
    const bruto = m[0].trim()
    // Anos entre 1900 e 2100 são referências temporais, não resultados de cálculo.
    if (/^(19|20|21)\d{2}$/.test(bruto)) continue
    // Números de um dígito aparecem em expressões como "um em cada 5".
    if (/^\d$/.test(bruto)) continue
    encontrados.push(bruto)
  }
  return encontrados
}
