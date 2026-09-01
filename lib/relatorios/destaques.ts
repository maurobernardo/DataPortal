import type { Digesto } from './digesto'
import type { TabelaDados } from './tabela-dados'

/**
 * O "cartão de números" no topo do resumo: 3-4 estatísticas grandes, antes de qualquer parágrafo.
 *
 * Quem não gosta de ler quer ver o essencial num relance, não descobrir aos poucos ao longo do
 * texto. Tudo aqui já foi extraído para outra coisa (a tabela de dados, o resultado, as fontes);
 * isto só escolhe e formata os quatro valores mais dignos de destaque, sem pedir mais nada à IA.
 *
 * A ordem de `afirmacoes_numericas` já vem do modelo como "as mais verificáveis primeiro", por
 * isso o primeiro grupo de `tabelaDados.variaveis` (que preserva a ordem de chegada) é, por
 * construção, o número mais importante do relatório: não há aqui nenhuma heurística nova de
 * "importância" a inventar, só reaproveitar a que o digesto já aplicou.
 */

export type Destaque = { rotulo: string; valor: string }

const MAXIMO_DESTAQUES = 4

function formatarNumero(v: number): string {
  return v.toLocaleString('pt-PT', { maximumFractionDigits: 2 })
}

export function construirDestaques(
  digesto: Pick<Digesto, 'resultado' | 'o_que_e' | 'fontes' | 'achados'>,
  tabelaDados: Pick<TabelaDados, 'variaveis'>
): Destaque[] {
  const destaques: Destaque[] = []

  const principal = tabelaDados.variaveis[0]
  if (principal) {
    destaques.push({
      rotulo: principal.tema,
      valor: `${formatarNumero(principal.ultimoValor)}${principal.unidade ? ` ${principal.unidade}` : ''}`,
    })
  }

  if (digesto.resultado && digesto.resultado.tipo !== 'nao_aplicavel') {
    destaques.push({ rotulo: 'Resultado', valor: digesto.resultado.tipo === 'obtido' ? 'Obtido' : 'Esperado' })
  }

  const periodo = principal?.periodo ?? (digesto.o_que_e.periodo.length <= 24 ? digesto.o_que_e.periodo : null)
  if (periodo) destaques.push({ rotulo: 'Período', valor: periodo })

  if (digesto.fontes.length > 0) {
    destaques.push({ rotulo: 'Fontes citadas', valor: String(digesto.fontes.length) })
  } else if (digesto.achados.length > 0) {
    destaques.push({ rotulo: 'Achados', valor: String(digesto.achados.length) })
  }

  return destaques.slice(0, MAXIMO_DESTAQUES)
}
