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

/**
 * Corta do texto seguinte a repetição da unidade que o próprio valor já traz.
 *
 * `formatarCelula` devolve "28,8 % do total", e a narrativa escreve muitas vezes "{{calc:x}} do
 * total" porque, ao escrever, não vê a unidade que vai ser injectada. O resultado chegava ao ecrã
 * como "28,8 % do total do total" (visto ao vivo, num título de análise). O prompt já pede para
 * não acrescentar unidades; isto garante-o quando o pedido não é seguido.
 *
 * Corta a maior sequência de palavras finais da unidade que se repita a seguir, e só em fronteira
 * de palavra, para nunca comer texto que apenas comece pelas mesmas letras.
 */
function cortarUnidadeRepetida(unidade: string, seguinte: string): string {
  const palavras = unidade.trim().split(/\s+/).filter(Boolean)
  for (let inicio = 0; inicio < palavras.length; inicio++) {
    const sufixo = palavras.slice(inicio).join(' ')
    if (!sufixo) continue
    const escapado = sufixo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const padrao = new RegExp(`^\\s+${escapado}(?![\\w-])`, 'i')
    const encontrado = seguinte.match(padrao)
    if (encontrado) return seguinte.slice(encontrado[0].length)
  }
  return seguinte
}

/**
 * Tira do texto visível a notação estatística que sobreviveu à instrução do prompt.
 *
 * Quem lê o portal é jornalista, gestor ou planificador: "p = 0,49" não lhe diz nada e faz a
 * página parecer escrita para outra pessoa. O prompt já pede linguagem corrente; isto garante o
 * resultado quando o pedido não é seguido, tal como se faz com os travessões.
 *
 * Só remove o que é seguro remover: parêntesis (ou parcelas depois de vírgula) cujo conteúdo é
 * SÓ notação, do género "(p = 0,00)" ou "(r = -0,82, n = 11)". Uma frase inteira em jargão não é
 * tocada aqui, porque reescrevê-la à força deixaria texto sem sentido; essa continua a ser
 * responsabilidade do prompt.
 */
// Um item de notação: "p = 0,49", "r = -0,82", "R² = 0,68", "n = 11".
//
// O número usa `\d+(?:[.,]\d+)?` e não `[\d.,]+` de propósito: em português a vírgula é o separador
// decimal, e a primeira versão partia o conteúdo por vírgulas para o testar item a item, o que
// transformava "p = 0,49" em "p = 0" mais "49" e fazia a limpeza nunca acontecer. O padrão
// reconhece agora a lista inteira de uma vez, com a vírgula a servir os dois papéis.
const ITEM_NOTACAO = String.raw`[a-zA-Z]{1,3}²?\s*[=<>≈]\s*-?\d+(?:[.,]\d+)?`
const SO_NOTACAO = new RegExp(String.raw`^\s*${ITEM_NOTACAO}(?:\s*[;,]\s*${ITEM_NOTACAO})*\s*$`)

/**
 * Expressões de jargão com tradução directa e segura para linguagem corrente.
 *
 * Deliberadamente curta. Reescrever prosa por regra é arriscado, e a responsabilidade principal
 * continua a ser do prompt; aqui ficam só as fórmulas que o modelo repete com mais teimosia e cuja
 * substituição não muda o sentido nem parte a frase. Cada uma encaixa no mesmo lugar sintáctico
 * que ocupava, por isso a frase à volta continua de pé.
 *
 * O género tem de coincidir com o do termo substituído, e não é detalhe: "coeficiente" trocado por
 * "medida" produzia "um medida da relação", e "intervalo" por "margem" dava "o margem de
 * incerteza". Por isso "coeficiente" (masculino) vira "valor que mede a relação" e não "medida".
 */
const JARGAO: [RegExp, string][] = [
  [/\bcom rigor estat[ií]stico\b/gi, 'com segurança'],
  [/\bestatisticamente significativ(o|a)\b/gi, 'claro o suficiente para se afirmar'],
  [/\bsignific[âa]ncia estat[ií]stica\b/gi, 'segurança nas conclusões'],
  // "coeficiente" e "intervalo" são masculinos: as traduções abaixo mantêm esse género para o
  // artigo que vem antes continuar certo. "correlação" é feminino, e por isso troca por "medida".
  [/\bcoeficiente de correla[çc][ãa]o\b/gi, 'valor que mede a relação'],
  [/\bcorrela[çc][ãa]o de Pearson\b/gi, 'medida da relação'],
  [/\bcorrela[çc][ãa]o de Spearman\b/gi, 'medida da relação'],
  [/\bteste de Mann-?Kendall\b/gi, 'teste de tendência'],
  [/\bintervalo de confian[çc]a\b/gi, 'grau de incerteza'],
]

export function limparNotacaoEstatistica(texto: string): string {
  let saida = texto.replace(/\s*\(([^()]{1,80})\)/g, (todo, dentro: string) =>
    SO_NOTACAO.test(String(dentro)) ? '' : todo
  )
  for (const [padrao, substituto] of JARGAO) saida = saida.replace(padrao, substituto)
  return saida
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .trim()
}

/** Resolve os tokens de um texto. Lança se algum token não tiver cálculo correspondente. */
export function resolverTokens(texto: string, calcs: Record<string, CelulaCalculada>): string {
  const emFalta = extrairCalcIds(texto).filter((id) => !calcs[id])
  if (emFalta.length > 0) throw new TokenPorResolverError(emFalta)

  const re = new RegExp(CALC_TOKEN_REGEX.source, 'g')
  let resultado = ''
  let cursor = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(texto)) !== null) {
    const celula = calcs[m[1]]
    resultado += texto.slice(cursor, m.index) + formatarCelula(celula)
    cursor = m.index + m[0].length
    // Só corta quando o valor mostrado termina mesmo na unidade. Nem todos os formatos a incluem:
    // 'inteiro', 'percentagem' e 'pp' devolvem só o número, e nesses casos a palavra que vem a
    // seguir no texto não é repetição nenhuma — é a única vez que aparece. Cortá-la apagaria
    // informação, que seria pior do que a repetição que isto veio corrigir.
    const renderizado = formatarCelula(celula)
    if (celula.unidade && renderizado.toLowerCase().endsWith(celula.unidade.trim().toLowerCase())) {
      const seguinte = texto.slice(cursor)
      const cortado = cortarUnidadeRepetida(celula.unidade, seguinte)
      cursor += seguinte.length - cortado.length
    }
  }
  return resultado + texto.slice(cursor)
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

  // Resolve o token e, no mesmo passo, tira a notacao estatistica que tenha sobrevivido ao prompt.
  // A ordem importa: primeiro o valor entra no texto, so depois se limpa, senao "(p = {{calc:x}})"
  // escaparia por ainda nao parecer notacao no momento da limpeza.
  const texto = (t: string) => limparNotacaoEstatistica(resolverTokens(t, calcs))

  return {
    ...narrativa,
    titulo: texto(narrativa.titulo),
    subtitulo: texto(narrativa.subtitulo),
    resposta_directa: texto(narrativa.resposta_directa),
    o_que_mostram: texto(narrativa.o_que_mostram),
    porque: texto(narrativa.porque),
    como_chegamos: texto(narrativa.como_chegamos),
    o_que_nao_diz: narrativa.o_que_nao_diz.map(texto),
    numeros_chave: narrativa.numeros_chave.map((n) => ({
      calc_id: n.calc_id,
      rotulo: texto(n.rotulo),
      contexto: texto(n.contexto),
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
