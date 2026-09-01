/**
 * Bateria sobre a remocao de notacao estatistica do texto visivel.
 *
 * Quem le o portal e jornalista, gestor ou planificador: "p = 0,49" nao lhe diz nada. O prompt ja
 * pede linguagem corrente; esta rede garante o resultado quando o pedido nao e seguido. O que NAO
 * pode acontecer e comer numeros que sao a resposta (habitantes, toneladas, hectares).
 *
 * Uso: npx tsx scripts/testar-linguagem-natural.ts
 */
import { limparNotacaoEstatistica } from '../lib/analysis/render'

type Caso = { nome: string; entrada: string; esperado: string }
const CASOS: Caso[] = [
  { nome: 'p-valor entre parentesis', entrada: 'Não há tendência clara (p = 0,49) na produção.', esperado: 'Não há tendência clara na produção.' },
  { nome: 'coeficiente e n juntos', entrada: 'A pobreza acompanha a falta de luz (r = -0,82, n = 11).', esperado: 'A pobreza acompanha a falta de luz.' },
  { nome: 'R quadrado', entrada: 'A relação é forte (R² = 0,68) entre as duas.', esperado: 'A relação é forte entre as duas.' },
  { nome: 'varios simbolos separados por ponto e virgula', entrada: 'Sem rumo (S = 2333; z = 0,69; p = 0,49) nos dez anos.', esperado: 'Sem rumo nos dez anos.' },
  { nome: 'p menor que', entrada: 'Diferença real (p < 0,05) entre províncias.', esperado: 'Diferença real entre províncias.' },
  // Os que NAO podem ser tocados: sao a resposta
  { nome: 'unidade real preservada', entrada: 'Nampula lidera com 7734 hectares (soma de 2015 a 2024).', esperado: 'Nampula lidera com 7734 hectares (soma de 2015 a 2024).' },
  { nome: 'numero da resposta em parentesis', entrada: 'Manica produziu mais milho (3 127 381 toneladas).', esperado: 'Manica produziu mais milho (3 127 381 toneladas).' },
  { nome: 'nome de cultura em parentesis', entrada: 'A mapira (sorgo) concentra-se em Nampula.', esperado: 'A mapira (sorgo) concentra-se em Nampula.' },
  { nome: 'percentagem com contexto', entrada: 'Cobertura baixa (48,5% das celulas preenchidas).', esperado: 'Cobertura baixa (48,5% das celulas preenchidas).' },
  { nome: 'texto sem parentesis nenhum', entrada: 'A Zambezia lidera os casos notificados.', esperado: 'A Zambezia lidera os casos notificados.' },
  { nome: 'ano entre parentesis mantem-se', entrada: 'O censo mais recente (2017) conta 28 milhoes.', esperado: 'O censo mais recente (2017) conta 28 milhoes.' },
  // Jargao em prosa: a frase tem de continuar de pe depois da troca
  { nome: 'rigor estatistico vira seguranca', entrada: 'Não é possível afirmar com rigor estatístico se andam juntas.', esperado: 'Não é possível afirmar com segurança se andam juntas.' },
  { nome: 'coeficiente de correlacao vira medida da relacao', entrada: 'Esta análise não produziu um coeficiente de correlação entre as duas variáveis.', esperado: 'Esta análise não produziu um valor que mede a relação entre as duas variáveis.' },
  { nome: 'estatisticamente significativo', entrada: 'O crescimento não é estatisticamente significativo.', esperado: 'O crescimento não é claro o suficiente para se afirmar.' },
  { nome: 'nome de teste', entrada: 'O teste de Mann-Kendall não encontra tendência.', esperado: 'O teste de tendência não encontra tendência.' },
  { nome: 'intervalo de confianca mantem o genero', entrada: 'O intervalo de confiança é largo.', esperado: 'O grau de incerteza é largo.' },
  { nome: 'texto sem jargao fica igual', entrada: 'A Gaza tem a maior prevalência do país.', esperado: 'A Gaza tem a maior prevalência do país.' },
]

let falhas = 0
for (const c of CASOS) {
  const obtido = limparNotacaoEstatistica(c.entrada)
  const ok = obtido === c.esperado
  if (!ok) falhas++
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${c.nome}\n      -> ${JSON.stringify(obtido)}`)
}
console.log(`\n${CASOS.length - falhas}/${CASOS.length} casos correctos`)
if (falhas > 0) process.exit(1)
