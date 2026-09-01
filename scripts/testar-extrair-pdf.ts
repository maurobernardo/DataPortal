/**
 * Bateria sobre a extracção de texto por página de um PDF.
 *
 * Usa um PDF real já existente no repositório como amostra, e não um gerado por jsPDF: tentei
 * gerar os PDFs de ensaio com jsPDF, que já é dependência do projecto, e o pacote de leitura
 * (`pdf-parse`, que embrulha uma versão antiga do pdf.js) recusa-os com "bad XRef entry" mesmo
 * sendo PDFs válidos. Um PDF real, produzido por uma ferramenta normal, é o teste mais honesto
 * disponível sem trazer outra dependência só para gerar amostras.
 *
 * A detecção de "digitalizado" é testada à parte, directamente sobre `ehDigitalizado`, porque essa
 * função é pura e não depende de nenhum PDF real existir: o que importa é a heurística, não o
 * ficheiro.
 *
 * Uso: npx tsx scripts/testar-extrair-pdf.ts
 */
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { ehDigitalizado, extrairPaginas } from '../lib/relatorios/extrair-pdf'

let passou = 0
const falhas: string[] = []
function verificar(nome: string, condicao: boolean, detalhe = '') {
  if (condicao) passou++
  else falhas.push(`  ${nome}${detalhe ? ': ' + detalhe : ''}`)
}

async function main() {
  const caminho = join(
    process.cwd(),
    'public/images/Data4Moz_Ethical_Data_Collection_Guidelines_Bilingual_v1.0.pdf'
  )
  if (!existsSync(caminho)) {
    console.log('PDF de amostra não encontrado, a saltar a parte de extracção real:', caminho)
  } else {
    const resultado = await extrairPaginas(readFileSync(caminho))
    verificar('extrai mais do que uma página', resultado.totalPaginas > 1)
    verificar(
      'o número de páginas extraídas bate com o total reportado',
      resultado.paginas.length === resultado.totalPaginas
    )
    verificar(
      'as páginas vêm numeradas a partir de 1, sequenciais',
      resultado.paginas.every((p, i) => p.pagina === i + 1)
    )
    verificar('a primeira página tem texto', resultado.paginas[0]?.texto.trim().length > 0)
    verificar(
      'um documento real com texto não é classificado como digitalizado',
      resultado.digitalizado === false
    )
  }

  // ------------------------------------------------------------------ ehDigitalizado (pura)
  verificar('lista vazia de páginas conta como digitalizado', ehDigitalizado([]) === true)
  verificar(
    'páginas todas sem texto: digitalizado',
    ehDigitalizado([
      { pagina: 1, texto: '' },
      { pagina: 2, texto: '  ' },
      { pagina: 3, texto: '' },
    ]) === true
  )
  verificar(
    'páginas todas com prosa a sério: não digitalizado',
    ehDigitalizado([
      { pagina: 1, texto: 'Um parágrafo inteiro com bastante texto e conteúdo substancial sobre o tema estudado.' },
      { pagina: 2, texto: 'Outro parágrafo inteiro com bastante texto e conteúdo substancial sobre os resultados.' },
    ]) === false
  )
  verificar(
    'capa e índice quase vazios não classificam um relatório normal como digitalizado',
    ehDigitalizado([
      { pagina: 1, texto: 'Capa' },
      { pagina: 2, texto: 'Índice' },
      { pagina: 3, texto: 'Um parágrafo inteiro com bastante texto e conteúdo substancial sobre o tema estudado.' },
      { pagina: 4, texto: 'Outro parágrafo inteiro com bastante texto e conteúdo substancial sobre os resultados.' },
    ]) === false
  )
  verificar(
    'maioria das páginas vazias, com uma ou outra excepção: ainda é digitalizado',
    ehDigitalizado([
      { pagina: 1, texto: '' },
      { pagina: 2, texto: '' },
      { pagina: 3, texto: '' },
      { pagina: 4, texto: 'Um parágrafo inteiro com bastante texto e conteúdo substancial sobre o tema estudado.' },
    ]) === true,
    'uma pagina de texto legivel no meio de um digitalizado nao pode classificar o documento como normal'
  )

  const total = passou + falhas.length
  console.log(`\nExtracção de PDF: ${passou}/${total}`)
  if (falhas.length) {
    console.log('\nFalhas:')
    falhas.forEach((f) => console.log(f))
    process.exit(1)
  }
  console.log('Tudo certo.\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
