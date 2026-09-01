/**
 * Bateria sobre a limpeza da "unidade" devolvida pelo execucao_codigo.
 *
 * O campo e livre e o modelo usa-o as vezes para descrever o metodo inteiro. A unidade e colada ao
 * valor em todo o lado onde ele aparece, por isso uma frase aqui torna ilegivel o titulo, os
 * cartoes e o texto de uma vez so. Visto num titulo real: "r=0,52 coeficiente de correlacao de
 * Pearson (n=10 provincias, ano 2022; confundimento plausivel: dimensao territorial)".
 *
 * Uso: npx tsx scripts/testar-limpar-unidade.ts
 */
import { limparUnidade } from '../lib/analysis/execucao-codigo'

type Caso = { nome: string; entrada: unknown; esperado: string | undefined }
const CASOS: Caso[] = [
  { nome: 'unidade curta normal', entrada: 'toneladas', esperado: 'toneladas' },
  { nome: 'percentagem com contexto curto', entrada: '% do total', esperado: '% do total' },
  { nome: 'unidade composta ainda legivel', entrada: 'casos por tonelada', esperado: 'casos por tonelada' },
  { nome: 'unidade legitima comprida (28 chars) sobrevive', entrada: 'casos por 100 mil habitantes', esperado: 'casos por 100 mil habitantes' },
  { nome: 'nome de metodo sem parentesis: desiste', entrada: 'coeficiente de correlação de Pearson', esperado: undefined },
  { nome: 'corta no parentesis descritivo', entrada: 'hectares (soma de 2015 a 2024)', esperado: 'hectares' },
  { nome: 'corta no ponto e virgula', entrada: 'casos; excluindo Nacional', esperado: 'casos' },
  { nome: 'frase inteira do caso real: desiste da unidade', entrada: 'coeficiente de correlação de Pearson (n=10 províncias, ano 2022; confundimento plausível: dimensão territorial da província)', esperado: undefined },
  { nome: 'descricao longa sem parentesis: desiste', entrada: 'numero medio de habitantes por unidade sanitaria em cada distrito do pais', esperado: undefined },
  { nome: 'espacos a mais sao normalizados', entrada: '  toneladas   metricas  ', esperado: 'toneladas metricas' },
  { nome: 'so um parentesis: fica vazio e desiste', entrada: '(ver nota)', esperado: undefined },
  { nome: 'nao e string', entrada: 42, esperado: undefined },
  { nome: 'undefined', entrada: undefined, esperado: undefined },
  { nome: 'string vazia', entrada: '   ', esperado: undefined },
]
let falhas = 0
for (const c of CASOS) {
  const obtido = limparUnidade(c.entrada)
  const ok = obtido === c.esperado
  if (!ok) falhas++
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${c.nome}\n      -> ${obtido === undefined ? 'sem unidade' : JSON.stringify(obtido)}`)
}
console.log(`\n${CASOS.length - falhas}/${CASOS.length} casos correctos`)
if (falhas > 0) process.exit(1)
