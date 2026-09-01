import { identificarProvincias } from '../lib/relatorios/geografia-relatorio'

let falhas = 0
function verificar(nome: string, condicao: boolean) {
  if (condicao) console.log(`OK   ${nome}`)
  else {
    console.error(`FALHOU ${nome}`)
    falhas++
  }
}

const PROVINCIAS = [
  { codigo: 'MZ01', nome: 'Niassa' },
  { codigo: 'MZ02', nome: 'Cabo Delgado' },
  { codigo: 'MZ06', nome: 'Sofala' },
  { codigo: 'MZ07', nome: 'Manica' },
  { codigo: 'MZ08', nome: 'Tete' },
  { codigo: 'MZ05', nome: 'Zambézia' },
  { codigo: 'MZ10', nome: 'Maputo' },
]

// Caso 1: uma província mencionada directamente.
{
  const r = identificarProvincias(['O estudo cobre a província de Sofala'], PROVINCIAS)
  verificar('província directa: 1 resultado', r.length === 1)
  verificar('província directa: código certo', r[0]?.codigo === 'MZ06')
}

// Caso 2: várias províncias numa lista, acentos diferentes.
{
  const r = identificarProvincias(['Sofala, Manica, Tete e Zambezia (Moçambique)'], PROVINCIAS)
  verificar('lista de 4 províncias: 4 resultados', r.length === 4)
  verificar(
    'lista de 4 províncias: todos os códigos presentes',
    ['MZ06', 'MZ07', 'MZ08', 'MZ05'].every((c) => r.some((p) => p.codigo === c))
  )
}

// Caso 3: geografia só nacional/internacional -> nenhuma província batida.
{
  const r = identificarProvincias(['Moçambique (nacional)', 'comparação com 45 países africanos'], PROVINCIAS)
  verificar('geografia nacional: sem províncias', r.length === 0)
}

// Caso 4: menções repetidas contam para o total, e a lista sai ordenada pela mais mencionada.
{
  const r = identificarProvincias(['Sofala e Sofala de novo', 'Manica'], PROVINCIAS)
  verificar('menções repetidas: Sofala com 2 menções', r.find((p) => p.codigo === 'MZ06')?.mencoes === 2)
  verificar('ordenado pela mais mencionada primeiro', r[0]?.codigo === 'MZ06')
}

if (falhas > 0) {
  console.error(`\n${falhas} teste(s) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes passaram.')
