/**
 * Bateria sobre a selecção de páginas para responder a uma pergunta sobre um relatório.
 *
 * Uso: npx tsx scripts/testar-retrieval-relatorio.ts
 */
import { pontuarPaginas, seleccionarPaginas } from '../lib/relatorios/retrieval'

let passou = 0
const falhas: string[] = []
function verificar(nome: string, condicao: boolean, detalhe = '') {
  if (condicao) passou++
  else falhas.push(`  ${nome}${detalhe ? ': ' + detalhe : ''}`)
}

const PAGINAS = [
  { pagina: 1, texto: 'Relatório de avaliação das pescas em Moçambique. Introdução e metodologia.' },
  { pagina: 2, texto: 'A metodologia usou inquéritos a pescadores em Cabo Delgado durante 2023.' },
  { pagina: 3, texto: 'Os resultados mostram uma redução de 18% na captura de camarão em Cabo Delgado.' },
  { pagina: 4, texto: 'Recomendações: reforçar a fiscalização e criar zonas de exclusão temporária.' },
  { pagina: 5, texto: 'Anexo: tabela de dados brutos por distrito e por mês do ano de 2023.' },
]

verificar(
  'a pagina mais relevante para "captura de camarao" e a 3',
  pontuarPaginas('qual foi a reducao na captura de camarao', PAGINAS)[0]?.pagina === 3
)
verificar(
  'a pagina mais relevante para "recomendacoes" e a 4',
  pontuarPaginas('que recomendacoes sao feitas', PAGINAS)[0]?.pagina === 4
)
verificar(
  'uma pergunta sem termos em comum com o documento nao devolve nada',
  pontuarPaginas('qual e a capital da franca', PAGINAS).length === 0,
  'e o sinal que a resposta certa e "nao encontrei", nunca as primeiras paginas ao acaso'
)
verificar('pergunta vazia nao devolve nada', pontuarPaginas('', PAGINAS).length === 0)
verificar('sem paginas nao rebenta', pontuarPaginas('qualquer coisa', []).length === 0)

const seleccionadas = seleccionarPaginas('metodologia de cabo delgado', PAGINAS, 2)
verificar('seleccionarPaginas devolve no maximo o limite pedido', seleccionadas.length <= 2)
verificar(
  'as paginas seleccionadas saem ordenadas por numero, nao por pontuacao',
  seleccionadas.length < 2 || seleccionadas[0].pagina < seleccionadas[1].pagina,
  'ordem de leitura ajuda o modelo a nao misturar o antes e o depois'
)
verificar(
  'o texto devolvido corresponde a pagina certa',
  seleccionadas.every((p) => PAGINAS.find((o) => o.pagina === p.pagina)?.texto === p.texto)
)

// Um termo raro (aparece numa so pagina) pesa mais do que um termo comum a todo o documento.
const comTermoComum = [
  { pagina: 10, texto: 'relatorio relatorio relatorio mocambique mocambique' },
  { pagina: 11, texto: 'relatorio mocambique captura excepcional de atum em 2023' },
]
verificar(
  'um termo raro decide a favor da pagina que o tem, mesmo com menos repeticoes de termos comuns',
  pontuarPaginas('captura de atum', comTermoComum)[0]?.pagina === 11
)

const total = passou + falhas.length
console.log(`\nSeleccao de paginas: ${passou}/${total}`)
if (falhas.length) {
  console.log('\nFalhas:')
  falhas.forEach((f) => console.log(f))
  process.exit(1)
}
console.log('Tudo certo.\n')
