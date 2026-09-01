/**
 * Um ícone por achado (risco, oportunidade, ou neutro), para se distinguir visualmente numa lista
 * onde hoje todos os itens têm o mesmo aspecto.
 *
 * Deliberadamente NÃO é mais um campo pedido à IA: seria mais uma reprocessagem de todos os
 * relatórios já analisados só para uma etiqueta visual, quando uma palavra-chave já dá um sinal
 * forte na maioria dos casos ("caiu", "défice", "risco" vs "aumentou", "melhorou", "oportunidade").
 * Classificação por palavra-chave é uma leitura mais fraca do que a da IA, por isso o padrão é
 * "neutro" sempre que não houver um sinal claro: mostrar um ícone errado de vez em quando é pior
 * do que não mostrar destaque nenhum.
 */

export type TipoAchado = 'risco' | 'oportunidade' | 'neutro'

const PALAVRAS_RISCO = [
  'caiu', 'caiu para', 'queda', 'reduziu', 'redução', 'diminui', 'diminuiu', 'défice', 'deficit',
  'risco', 'ameaça', 'problema', 'limitação', 'insuficient', 'fraco', 'fraca', 'abaixo do',
  'atraso', 'falha', 'falta de', 'escassez', 'vulnerabilidade', 'agrava', 'piora', 'piorou',
  'perda', 'perdas', 'declínio', 'decresc', 'preocupa',
  // inglês, para relatórios bilingues
  'decline', 'decrease', 'shortfall', 'risk', 'threat', 'weak', 'lack of', 'gap', 'deficit',
]

const PALAVRAS_OPORTUNIDADE = [
  'aumentou', 'aumento', 'cresceu', 'crescimento', 'melhorou', 'melhoria', 'ganho', 'ganhos',
  'oportunidade', 'potencial', 'sucesso', 'progresso', 'avanço', 'fortalece', 'robusto',
  'acima do', 'excede', 'superou',
  'increase', 'growth', 'improve', 'opportunity', 'gain', 'progress', 'strong',
]

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function classificarAchado(texto: string): TipoAchado {
  const normalizado = normalizar(texto)
  const temRisco = PALAVRAS_RISCO.some((p) => normalizado.includes(normalizar(p)))
  const temOportunidade = PALAVRAS_OPORTUNIDADE.some((p) => normalizado.includes(normalizar(p)))

  // Sinal misto (a frase menciona os dois, ex.: "apesar do aumento, o défice agravou-se") também
  // fica "neutro": escolher um dos dois ao calhar seria pior do que admitir que é ambíguo.
  if (temRisco && !temOportunidade) return 'risco'
  if (temOportunidade && !temRisco) return 'oportunidade'
  return 'neutro'
}
