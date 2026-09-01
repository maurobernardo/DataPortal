import { construirTabelaDados } from '../lib/relatorios/tabela-dados'
import type { Digesto } from '../lib/relatorios/digesto'

type Afirmacao = Digesto['afirmacoes_numericas'][number]

let falhas = 0
function verificar(nome: string, condicao: boolean) {
  if (condicao) {
    console.log(`OK   ${nome}`)
  } else {
    console.error(`FALHOU ${nome}`)
    falhas++
  }
}

function afirmacao(parcial: Partial<Afirmacao>): Afirmacao {
  return {
    texto: '',
    tema: 'Taxa de pobreza',
    geografia: 'Moçambique',
    periodo_inicio: null,
    periodo_fim: null,
    valor: 0,
    unidade: '%',
    pagina: 1,
    tipo: 'nivel',
    ...parcial,
  }
}

// Caso 1: sem afirmações -> sem tabela nem gráficos.
{
  const r = construirTabelaDados([])
  verificar('sem afirmações: nenhuma variável', r.variaveis.length === 0)
  verificar('sem afirmações: nenhum gráfico', r.graficos.length === 0)
}

// Caso 2: um tema com 3 pontos em anos diferentes -> 1 gráfico de linha, ordenado por ano.
{
  const afirmacoes = [
    afirmacao({ periodo_fim: 2022, valor: 30, pagina: 10 }),
    afirmacao({ periodo_fim: 2018, valor: 46, pagina: 5 }),
    afirmacao({ periodo_fim: 2020, valor: 38, pagina: 7 }),
  ]
  const r = construirTabelaDados(afirmacoes)
  verificar('1 tema/3 pontos: 1 variável', r.variaveis.length === 1)
  verificar('1 tema/3 pontos: nPontos = 3', r.variaveis[0]?.nPontos === 3)
  verificar('1 tema/3 pontos: 1 gráfico', r.graficos.length === 1)
  verificar('1 tema/3 pontos: rótulos em ordem cronológica', JSON.stringify(r.graficos[0]?.labels) === JSON.stringify(['2018', '2020', '2022']))
  verificar('1 tema/3 pontos: valores seguem os rótulos', JSON.stringify(r.graficos[0]?.series[0]?.data) === JSON.stringify([46, 38, 30]))
  verificar('1 tema/3 pontos: período 2018-2022', r.variaveis[0]?.periodo === '2018-2022')
  verificar('1 tema/3 pontos: valor mais recente é o de 2022', r.variaveis[0]?.ultimoValor === 30)
}

// Caso 3: 2 temas em geografias diferentes, cada um com 1 ponto só (sem período) -> tabela com 2
// linhas, mas SEM gráfico nenhum (nenhum grupo tem 2 pontos distinguíveis).
{
  const afirmacoes = [
    afirmacao({ tema: 'Acesso a água', geografia: 'Vilankulos', periodo_fim: null, valor: 55, pagina: 12 }),
    afirmacao({ tema: 'Acesso a água', geografia: 'Inhassoro', periodo_fim: null, valor: 61, pagina: 14 }),
  ]
  const r = construirTabelaDados(afirmacoes)
  verificar('2 geografias/1 ponto cada: 2 variáveis', r.variaveis.length === 2)
  verificar('2 geografias/1 ponto cada: sem gráfico', r.graficos.length === 0)
  verificar('sem período: periodo é null', r.variaveis[0]?.periodo === null)
  verificar('sem período: valor mais recente é o único ponto', r.variaveis[0]?.ultimoValor === 55)
}

// Caso 4: 1 tema com só 2 anos -> gráfico de barras (dois pontos não são uma linha com sentido).
{
  const afirmacoes = [afirmacao({ periodo_fim: 2010, valor: 20 }), afirmacao({ periodo_fim: 2020, valor: 35 })]
  const r = construirTabelaDados(afirmacoes)
  verificar('1 tema/2 anos: 1 gráfico', r.graficos.length === 1)
  verificar('1 tema/2 anos: tipo barras', r.graficos[0]?.type === 'bar')
}

// Caso 5: um "nível" num ano e uma "variação" entre dois anos, no mesmo grupo -> só 2 pontos,
// mesmo sendo datados os dois, ainda são barras (uma linha exige mais do que 2 pontos para ligar).
{
  const afirmacoes = [
    afirmacao({ tipo: 'nivel', periodo_fim: 2015, valor: 42 }),
    afirmacao({ tipo: 'variacao', periodo_inicio: 2010, periodo_fim: 2020, valor: 8 }),
  ]
  const r = construirTabelaDados(afirmacoes)
  verificar('nível + variação/2 pontos: 1 gráfico', r.graficos.length === 1)
  verificar('nível + variação/2 pontos: tipo barras', r.graficos[0]?.type === 'bar')
}

// Caso 6: uma "variação" com periodo_inicio e periodo_fim -> o período do grupo usa os dois
// extremos, não só periodo_fim (uma variação sem isso perderia o ano de início na tabela).
{
  const afirmacoes = [afirmacao({ tipo: 'variacao', periodo_inicio: 2002, periodo_fim: 2020, valor: 23, unidade: 'pp' })]
  const r = construirTabelaDados(afirmacoes)
  verificar('variação: período usa início e fim', r.variaveis[0]?.periodo === '2002-2020')
  verificar('variação: valor mais recente é o valor da variação', r.variaveis[0]?.ultimoValor === 23)
}

if (falhas > 0) {
  console.error(`\n${falhas} teste(s) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes passaram.')
