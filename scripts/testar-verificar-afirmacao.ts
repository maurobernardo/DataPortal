/**
 * Bateria sobre a verificação de afirmações de relatório contra os dados do portal.
 *
 * Este é o módulo mais perigoso desta ronda: se disser "diverge" por engano, acusa um relatório de
 * um erro que não cometeu. A maioria dos casos aqui existe para provar que a recusa acontece
 * sempre que a comparação não seria honesta, e só nesses casos.
 *
 * Uso: npx tsx scripts/testar-verificar-afirmacao.ts
 */
import {
  mesmaGeografia,
  mesmaUnidade,
  verificarAfirmacao,
  type AfirmacaoRelatorio,
  type ValorPortal,
} from '../lib/relatorios/verificar-afirmacao'

let passou = 0
const falhas: string[] = []
function verificar(nome: string, condicao: boolean, detalhe = '') {
  if (condicao) passou++
  else falhas.push(`  ${nome}${detalhe ? ': ' + detalhe : ''}`)
}

const afirmacao = (extra: Partial<AfirmacaoRelatorio>): AfirmacaoRelatorio => ({
  texto: 'ensaio',
  tema: 'producao de milho',
  geografia: 'Nampula',
  periodo_inicio: null,
  periodo_fim: 2023,
  valor: 1000,
  unidade: 'toneladas',
  pagina: 12,
  tipo: 'nivel',
  ...extra,
})

const vp = (extra: Partial<ValorPortal>): ValorPortal => ({
  geografia: 'Nampula',
  periodo: 2023,
  valor: 1000,
  unidade: 'toneladas',
  ...extra,
})

// ------------------------------------------------------------------ geografia
verificar('mesma geografia, mesma grafia', mesmaGeografia('Nampula', 'Nampula'))
verificar('mesma geografia, caixa e acentos diferentes', mesmaGeografia('nampula', 'NAMPULA'))
verificar('palavras na mesma unidade em ordem diferente', mesmaGeografia('Cidade de Maputo', 'Maputo Cidade') === false, 'com preposicao a mais, os conjuntos de palavras nao sao iguais - e correcto recusar')
verificar('palavras exactamente na mesma unidade', mesmaGeografia('Maputo Cidade', 'Cidade Maputo'))
verificar('provincia e cidade homonimas NAO sao a mesma unidade', mesmaGeografia('Maputo', 'Maputo Cidade') === false)
verificar('geografia vazia nunca casa', mesmaGeografia('', 'Nampula') === false)

// ------------------------------------------------------------------ unidade
verificar('mesma unidade, mesmo texto', mesmaUnidade('toneladas', 'toneladas'))
verificar('percentagem e pct sao equivalentes', mesmaUnidade('%', 'pct'))
verificar(
  'percentagem e pontos percentuais NAO sao a mesma unidade',
  mesmaUnidade('%', 'pp') === false,
  'confundir as duas e o erro mais comum: 40% para 50% e +10pp e +25%, ao mesmo tempo'
)
verificar('toneladas e kg nao se convertem por adivinha', mesmaUnidade('toneladas', 'kg') === false)
verificar('dolares e meticais nao se convertem por adivinha', mesmaUnidade('usd', 'mzn') === false)

// ------------------------------------------------------------------ nivel: casos que TEM de confirmar ou divergir
const confirma = verificarAfirmacao(afirmacao({ valor: 1020 }), [vp({ valor: 1000 })])
verificar('dentro da tolerancia por omissao (5%): confirma', confirma.estado === 'confirma')

const divergeMuito = verificarAfirmacao(afirmacao({ valor: 5000 }), [vp({ valor: 1000 })])
verificar('muito acima da tolerancia: diverge', divergeMuito.estado === 'diverge')
verificar(
  'diverge devolve os dois valores, sem dizer que o relatorio esta errado',
  divergeMuito.estado === 'diverge' && divergeMuito.valorPortal === 1000
)

const exacto = verificarAfirmacao(afirmacao({ valor: 1000 }), [vp({ valor: 1000 })])
verificar('valores identicos: confirma com diferenca zero', exacto.estado === 'confirma' && (exacto as any).diferencaAbsoluta === 0)

// ------------------------------------------------------------------ nivel: recusas obrigatorias
verificar(
  'geografia sem dados no portal: nao comparavel',
  verificarAfirmacao(afirmacao({ geografia: 'Niassa' }), [vp({ geografia: 'Nampula' })]).estado === 'nao_comparavel'
)
verificar(
  'unidade incompativel: nao comparavel',
  verificarAfirmacao(afirmacao({ unidade: 'toneladas' }), [vp({ unidade: 'kg' })]).estado === 'nao_comparavel'
)
verificar(
  'ano sem correspondencia no portal: nao comparavel',
  verificarAfirmacao(afirmacao({ periodo_fim: 2023 }), [vp({ periodo: 2022 })]).estado === 'nao_comparavel'
)
verificar(
  'valor nao numerico: nao comparavel',
  verificarAfirmacao(afirmacao({ valor: NaN }), [vp({})]).estado === 'nao_comparavel'
)
verificar(
  'duas leituras do portal no mesmo ano, sem forma de escolher: nao comparavel',
  verificarAfirmacao(afirmacao({ periodo_fim: 2023 }), [vp({ valor: 1000 }), vp({ valor: 1200 })]).estado === 'nao_comparavel',
  'escolher uma das duas ao acaso seria pior do que recusar'
)
verificar(
  'sem ano na afirmacao e varios anos diferentes no portal: nao comparavel',
  verificarAfirmacao(afirmacao({ periodo_fim: null }), [vp({ periodo: 2022 }), vp({ periodo: 2023, valor: 1100 })]).estado ===
    'nao_comparavel'
)
verificar(
  'sem ano na afirmacao mas o portal repete o MESMO valor em anos diferentes: resolve-se',
  verificarAfirmacao(afirmacao({ periodo_fim: null, valor: 1000 }), [
    vp({ periodo: 2022, valor: 1000 }),
    vp({ periodo: 2023, valor: 1000 }),
  ]).estado === 'confirma'
)

// ------------------------------------------------------------------ variacao
const afirmacaoVariacaoPct: AfirmacaoRelatorio = afirmacao({
  tipo: 'variacao',
  periodo_inicio: 2018,
  periodo_fim: 2023,
  valor: 25,
  unidade: '%',
})
const variacaoConfirma = verificarAfirmacao(afirmacaoVariacaoPct, [
  vp({ periodo: 2018, valor: 800 }),
  vp({ periodo: 2023, valor: 1000 }),
])
verificar(
  'variacao percentual calculada correctamente (800 para 1000 = +25%)',
  variacaoConfirma.estado === 'confirma'
)

const afirmacaoVariacaoPp: AfirmacaoRelatorio = afirmacao({
  tipo: 'variacao',
  tema: 'cobertura vacinal',
  periodo_inicio: 2018,
  periodo_fim: 2023,
  valor: 10,
  unidade: 'pp',
})
const variacaoPpConfirma = verificarAfirmacao(afirmacaoVariacaoPp, [
  vp({ periodo: 2018, valor: 40, unidade: '%' }),
  vp({ periodo: 2023, valor: 50, unidade: '%' }),
])
verificar(
  'variacao em pontos percentuais usa a diferenca directa, nao a percentual',
  variacaoPpConfirma.estado === 'confirma',
  'de 40% para 50% sao +10pp; se o modulo calculasse +25% por engano, isto divergiria'
)

verificar(
  'variacao com um so periodo na afirmacao: nao comparavel',
  verificarAfirmacao(afirmacao({ tipo: 'variacao', periodo_inicio: null, periodo_fim: 2023 }), [vp({})]).estado ===
    'nao_comparavel'
)
verificar(
  'variacao percentual a partir de uma base zero: nao comparavel',
  verificarAfirmacao(afirmacaoVariacaoPct, [vp({ periodo: 2018, valor: 0 }), vp({ periodo: 2023, valor: 500 })]).estado ===
    'nao_comparavel',
  'crescer a partir de zero nao tem percentagem que exista'
)
verificar(
  'falta um dos dois extremos no portal: nao comparavel',
  verificarAfirmacao(afirmacaoVariacaoPct, [vp({ periodo: 2018, valor: 800 })]).estado === 'nao_comparavel'
)

const total = passou + falhas.length
console.log(`\nVerificacao de afirmacoes: ${passou}/${total}`)
if (falhas.length) {
  console.log('\nFalhas:')
  falhas.forEach((f) => console.log(f))
  process.exit(1)
}
console.log('Tudo certo.\n')
