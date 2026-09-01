import { construirDestaques } from '../lib/relatorios/destaques'
import { construirTabelaDados } from '../lib/relatorios/tabela-dados'
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

function digestoBase(parcial: Partial<Digesto>): Pick<Digesto, 'resultado' | 'o_que_e' | 'fontes' | 'achados'> {
  return {
    resultado: { tipo: 'nao_aplicavel', texto: null, pagina: null },
    o_que_e: { assunto: '', geografia: '', periodo: '2018-2022', metodologia: '' },
    fontes: [],
    achados: [],
    ...parcial,
  }
}

// Caso 1: com afirmação principal, resultado obtido, fontes -> 4 destaques na ordem certa.
{
  const afirmacoes = [afirmacao({ tema: 'Taxa de pobreza', periodo_fim: 2020, valor: 72.3, unidade: '%' })]
  const tabela = construirTabelaDados(afirmacoes)
  const digesto = digestoBase({
    resultado: { tipo: 'obtido', texto: 'x', pagina: 1 },
    fontes: [{ instituicao: 'INE', documento: null, ano: null }],
  })
  const d = construirDestaques(digesto, tabela)
  verificar('4 destaques', d.length === 4)
  verificar('1º é a variável principal', d[0].rotulo === 'Taxa de pobreza' && d[0].valor === '72,3 %')
  verificar('2º é o resultado', d[1].rotulo === 'Resultado' && d[1].valor === 'Obtido')
  verificar('3º é o período', d[2].rotulo === 'Período')
  verificar('4º são as fontes', d[3].rotulo === 'Fontes citadas' && d[3].valor === '1')
}

// Caso 2: sem afirmações numéricas, sem resultado, sem fontes, com achados -> cai para achados.
{
  const tabela = construirTabelaDados([])
  const digesto = digestoBase({ achados: [{ texto: 'a', pagina: 1, ano: null }] })
  const d = construirDestaques(digesto, tabela)
  verificar('sem afirmações: usa achados no lugar de fontes', d.some((x) => x.rotulo === 'Achados' && x.valor === '1'))
  verificar('sem afirmações: sem tile de variável principal', !d.some((x) => x.rotulo === 'Taxa de pobreza'))
}

// Caso 3: nada de jeito nenhum -> lista vazia (nunca inventar um destaque).
{
  const tabela = construirTabelaDados([])
  const digesto = digestoBase({ o_que_e: { assunto: '', geografia: '', periodo: '', metodologia: '' } })
  const d = construirDestaques(digesto, tabela)
  verificar('sem nada: lista vazia', d.length === 0)
}

if (falhas > 0) {
  console.error(`\n${falhas} teste(s) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes passaram.')
