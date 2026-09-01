/**
 * Bateria sobre as formas de resultado aceites do execucao_codigo.
 *
 * O calculo corre, o JSON e valido, e o passo perdia-se por causa do involucro: uma soma por
 * provincia devolvida como {"Tete": 37134} em vez de {"tipo":"lista","itens":[...]}. Sao os mesmos
 * numeros. Recusa-los pela forma e deitar fora trabalho ja feito, e um passo perdido custa a
 * analise inteira. O que NAO pode acontecer e aceitar algo que nao seja um resultado.
 *
 * Uso: npx tsx scripts/testar-formato-resultado.ts
 */
import { validarResultado } from '../lib/analysis/execucao-codigo'

type Caso = { nome: string; entrada: any; esperado: string }
const CASOS: Caso[] = [
  { nome: 'escalar canonico', entrada: { tipo: 'escalar', valor: 42, unidade: 'ha' }, esperado: 'escalar:42' },
  { nome: 'lista canonica', entrada: { tipo: 'lista', itens: [{ nome: 'Tete', valor: 5 }] }, esperado: 'lista:1' },
  { nome: 'impossivel canonico', entrada: { tipo: 'impossivel', motivo: 'faltam dados' }, esperado: 'impossivel' },
  { nome: 'mapa nome->numero directo (o caso que falhava)', entrada: { Tete: 37134, Manica: 21000 }, esperado: 'lista:2' },
  { nome: 'mapa dentro de "resultado"', entrada: { resultado: { Tete: 1, Manica: 2, Sofala: 3 } }, esperado: 'lista:3' },
  { nome: 'lista sob o nome "dados"', entrada: { dados: [{ nome: 'A', valor: 1 }, { nome: 'B', valor: 2 }] }, esperado: 'lista:2' },
  { nome: 'escalar sem campo tipo', entrada: { valor: 7 }, esperado: 'escalar:7' },
  { nome: 'escalar como "total"', entrada: { total: 99 }, esperado: 'escalar:99' },
  { nome: 'mapa com valores nao numericos ignora-os', entrada: { Tete: 10, Nota: 'sem dados' }, esperado: 'lista:1' },
  { nome: 'impossivel sem motivo continua valido', entrada: { tipo: 'impossivel' }, esperado: 'impossivel' },
  // Os que TEM de continuar a falhar
  { nome: 'objecto vazio: rejeita', entrada: {}, esperado: 'ERRO' },
  { nome: 'so texto: rejeita', entrada: { explicacao: 'nao consegui' }, esperado: 'ERRO' },
  { nome: 'null: rejeita', entrada: null, esperado: 'ERRO' },
  { nome: 'numero solto: rejeita', entrada: 5, esperado: 'ERRO' },
  { nome: 'lista vazia: rejeita', entrada: { tipo: 'lista', itens: [] }, esperado: 'ERRO' },
]
let falhas = 0
for (const c of CASOS) {
  let obtido: string
  try {
    const r: any = validarResultado(c.entrada)
    obtido = r.tipo === 'escalar' ? `escalar:${r.valor}` : r.tipo === 'lista' ? `lista:${r.itens.length}` : 'impossivel'
  } catch { obtido = 'ERRO' }
  const ok = obtido === c.esperado
  if (!ok) falhas++
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${c.nome}\n      -> ${obtido}`)
}
console.log(`\n${CASOS.length - falhas}/${CASOS.length} casos correctos`)
if (falhas > 0) process.exit(1)
