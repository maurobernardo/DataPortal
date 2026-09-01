/**
 * Guarda o corte da unidade repetida em resolverTokens.
 *
 * A narrativa escreve "{{calc:x}} do total" sem ver a unidade que vai ser injectada, e o valor
 * chegava ao ecra como "28,8 % do total do total" (visto num titulo real). O corte tem de ser
 * cirurgico: os formatos 'inteiro', 'percentagem' e 'pp' NAO mostram a unidade, e nesses casos a
 * palavra seguinte e a unica ocorrencia, nao uma repeticao. Cortar ai apagaria informacao.
 *
 * Uso: npx tsx scripts/testar-unidade-repetida.ts
 */

import { resolverTokens } from '../lib/analysis/render'
const calcs: any = {
  a: { id: 'a', valor: 28.8, unidade: '% do total', formato: 'decimal', passo_id: 'p', proveniencia: {} },
  b: { id: 'b', valor: 5483382, unidade: 'habitantes', formato: 'inteiro', passo_id: 'p', proveniencia: {} },
  c: { id: 'c', valor: 12, unidade: '', formato: 'inteiro', passo_id: 'p', proveniencia: {} },
  d: { id: 'd', valor: 3.2, unidade: 'pp', formato: 'pp', passo_id: 'p', proveniencia: {} },
  e: { id: 'e', valor: 45.1, unidade: '% da rede', formato: 'percentagem', passo_id: 'p', proveniencia: {} },
}
const casos: [string, string][] = [
  ['Nampula domina com {{calc:a}} do total', 'repeticao exacta da unidade'],
  ['Nampula domina com {{calc:a}} do total nacional', 'repeticao parcial, resto preservado'],
  ['Tem {{calc:b}} habitantes no total', 'formato inteiro NAO mostra unidade: nao pode cortar'],
  ['Subiu {{calc:d}} pp pontos', 'formato pp: nao corta'],
  ['Cobre {{calc:e}} da rede', 'percentagem sem unidade no valor'],
  ['Sao {{calc:c}} distritos', 'sem unidade, nao mexe'],
  ['Cresceu {{calc:a}} dos casos', 'palavra diferente, nao corta'],
  ['Tem {{calc:b}} habitantescoisa', 'nao corta a meio de palavra'],
]
for (const [t, nome] of casos) console.log(`${nome}\n   ${JSON.stringify(resolverTokens(t, calcs))}`)
