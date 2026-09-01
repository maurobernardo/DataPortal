import { construirLinhaTempo } from '../lib/relatorios/linha-tempo'
import type { Digesto } from '../lib/relatorios/digesto'

let falhas = 0
function verificar(nome: string, condicao: boolean) {
  if (condicao) console.log(`OK   ${nome}`)
  else {
    console.error(`FALHOU ${nome}`)
    falhas++
  }
}

function afirmacao(parcial: Partial<Digesto['afirmacoes_numericas'][number]>): Digesto['afirmacoes_numericas'][number] {
  return {
    texto: '',
    tema: 'x',
    geografia: 'Moçambique',
    periodo_inicio: null,
    periodo_fim: null,
    valor: 0,
    unidade: '',
    pagina: 1,
    tipo: 'nivel',
    ...parcial,
  }
}

// Caso 1: nenhum achado com ano, nenhuma afirmação datada -> sem linha do tempo.
{
  const digesto = {
    achados: [{ texto: 'a', pagina: 1, ano: null }],
    afirmacoes_numericas: [afirmacao({})],
  }
  verificar('sem datas: linha do tempo vazia', construirLinhaTempo(digesto).length === 0)
}

// Caso 2: só 1 evento datado -> ainda vazia (uma data solta não é uma linha do tempo).
{
  const digesto = {
    achados: [{ texto: 'a', pagina: 1, ano: 2020 }],
    afirmacoes_numericas: [afirmacao({})],
  }
  verificar('1 evento só: linha do tempo vazia', construirLinhaTempo(digesto).length === 0)
}

// Caso 3: achados datados + afirmações datadas, fora de ordem -> uma lista só, ordenada por ano.
{
  const digesto = {
    achados: [
      { texto: 'achado 2020', pagina: 5, ano: 2020 },
      { texto: 'achado sem ano', pagina: 6, ano: null },
    ],
    afirmacoes_numericas: [
      afirmacao({ texto: 'dado 2015', periodo_fim: 2015, pagina: 3 }),
      afirmacao({ texto: 'dado 2022', periodo_fim: 2022, pagina: 8 }),
    ],
  }
  const r = construirLinhaTempo(digesto)
  verificar('mistura: 3 eventos (o sem ano fica de fora)', r.length === 3)
  verificar('mistura: ordenado por ano', JSON.stringify(r.map((e) => e.ano)) === JSON.stringify([2015, 2020, 2022]))
  verificar('mistura: tipos correctos', r[0].tipo === 'dado' && r[1].tipo === 'achado' && r[2].tipo === 'dado')
}

if (falhas > 0) {
  console.error(`\n${falhas} teste(s) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes passaram.')
