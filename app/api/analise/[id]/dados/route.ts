export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { obterAnalise } from '@/lib/analysis/persistencia'
import { metodoEmPortugues } from '@/lib/analysis/metodos-em-portugues'

/**
 * Os números da análise, em folha de cálculo.
 *
 * O portal exportava o dashboard (PDF, HTML) e o catálogo de datasets, e não exportava a única
 * coisa que a análise produziu de novo: os valores calculados. Quem trabalha com isto acabava a
 * copiar números do ecrã à mão, que é onde nascem os erros que depois aparecem num relatório com o
 * nosso nome no rodapé.
 *
 * Duas saídas, com a mesma matéria.
 *
 * `csv` devolve UMA tabela em formato longo, com uma coluna `bloco` a dizer de onde veio cada
 * linha. Um CSV só sabe ser uma tabela; fingir que sabe ser seis, metendo cabeçalhos a meio do
 * ficheiro, produz algo que nenhum programa lê bem. Formato longo é feio de ler e é o único que
 * abre em qualquer lado sem instruções.
 *
 * `xlsx` devolve uma folha por bloco, que é o que se manda a um parceiro.
 *
 * Em ambos vai a PROVENIÊNCIA: que método produziu o número, sobre que datasets, com quantas
 * linhas. Um número sem origem, fora do ecrã que o explicava, é exactamente o que o portal existe
 * para não produzir.
 */

type Linha = (string | number)[]

type Bloco = {
  nome: string
  colunas: string[]
  linhas: Linha[]
}

function escaparCsv(valor: string | number): string {
  const s = String(valor ?? '')
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

/** Nome de folha aceite pelo Excel: 31 caracteres, e sem barras, interrogações ou parênteses rectos. */
function nomeDeFolha(bruto: string): string {
  return bruto.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Folha'
}

function construirBlocos(analise: any): Bloco[] {
  const r = analise.resultados || {}
  const calcs: Record<string, any> = r.calcs || {}
  const blocos: Bloco[] = []

  // ---------------------------------------------------------------- números
  const linhasCalcs: Linha[] = Object.entries(calcs).map(([id, c]: [string, any]) => [
    id,
    c?.valor ?? '',
    c?.unidade ?? '',
    metodoEmPortugues(c?.proveniencia?.metodo || ''),
    (c?.proveniencia?.datasets || []).join(' | '),
    c?.proveniencia?.linhas_usadas ?? '',
  ])
  if (linhasCalcs.length > 0) {
    blocos.push({
      nome: 'Numeros',
      colunas: ['id_do_calculo', 'valor', 'unidade', 'metodo', 'datasets', 'linhas_usadas'],
      linhas: linhasCalcs,
    })
  }

  // ---------------------------------------------------------------- séries por unidade
  // É a tabela que as pessoas querem de facto: uma linha por província ou por distrito.
  let nSeries = 0
  for (const serie of r.series || []) {
    const linhas: Linha[] = (serie.unidades || []).map((u: any) => [
      serie.metrica ?? '',
      serie.nivel ?? '',
      u.nome ?? '',
      u.codigo ?? '',
      Number.isFinite(u.valor) ? u.valor : '',
      serie.unidade ?? '',
      u.categoria ?? '',
    ])
    if (linhas.length === 0) continue
    nSeries++
    blocos.push({
      nome: 'Serie ' + nSeries,
      colunas: ['metrica', 'nivel', 'unidade', 'codigo', 'valor', 'unidade_de_medida', 'categoria'],
      linhas,
    })
  }

  // ---------------------------------------------------------------- gráficos
  let nGraficos = 0
  for (const g of r.graficos || []) {
    const linhas: Linha[] = []
    for (const s of g.series || []) {
      const eixo: string[] = g.eixoX || []
      eixo.forEach((x, i) => {
        const v = s.valores?.[i]
        linhas.push([g.titulo ?? '', s.nome ?? '', x ?? '', Number.isFinite(v) ? v : '', g.unidade ?? ''])
      })
    }
    if (linhas.length === 0) continue
    nGraficos++
    blocos.push({
      nome: 'Grafico ' + nGraficos,
      colunas: ['grafico', 'serie', 'categoria', 'valor', 'unidade_de_medida'],
      linhas,
    })
  }

  // ---------------------------------------------------------------- listas de registos
  let nListas = 0
  for (const lista of r.listas || []) {
    if (!lista.itens?.length) continue
    nListas++
    blocos.push({
      nome: 'Lista ' + nListas,
      colunas: ['lista', 'ambito', 'registo'],
      linhas: lista.itens.map((i: string): Linha => [lista.titulo ?? '', lista.ambito ?? '', i]),
    })
  }

  // ---------------------------------------------------------------- ressalvas
  // Viajam com os números de propósito. Separadas do ficheiro, as ressalvas desaparecem, e o que
  // sobra é uma tabela limpa que ninguém sabe que tem buracos.
  const naoDiz: string[] = analise.narrativa?.resolvida?.o_que_nao_diz || []
  const avisos: string[] = r.avisos || []
  if (naoDiz.length || avisos.length) {
    blocos.push({
      nome: 'O que isto nao diz',
      colunas: ['tipo', 'ressalva'],
      linhas: [
        ...naoDiz.map((t): Linha => ['limitacao declarada', t]),
        ...avisos.map((t): Linha => ['aviso da execucao', t]),
      ],
    })
  }

  return blocos
}

function cabecalho(analise: any): Bloco {
  const n = analise.narrativa?.resolvida || {}
  return {
    nome: 'Analise',
    colunas: ['campo', 'valor'],
    linhas: [
      ['pergunta', analise.pergunta ?? ''],
      ['titulo', n.titulo ?? ''],
      ['resposta', n.resposta_directa ?? ''],
      ['confianca_pct', analise.confianca != null ? Math.round(Number(analise.confianca) * 100) : ''],
      ['criado_em', String(analise.criado_em ?? '')],
      ['id_da_analise', analise.id ?? ''],
      ['fonte', 'Data Portal · dataportal.co.mz'],
    ],
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await getCurrentUser()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const analise = await obterAnalise(params.id)
  if (!analise) return NextResponse.json({ erro: 'Análise não encontrada' }, { status: 404 })
  if (!analise.publico && analise.utilizador_id !== sessao.userId) {
    return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })
  }

  const blocos = [cabecalho(analise), ...construirBlocos(analise)]
  const data = new Date().toISOString().slice(0, 10)
  const base = 'analise-' + params.id + '-' + data
  const formato = (req.nextUrl.searchParams.get('formato') || 'csv').toLowerCase()

  if (formato === 'xlsx') {
    const ExcelJS = (await import('exceljs')).default
    const livro = new ExcelJS.Workbook()
    livro.creator = 'Data Portal'
    livro.created = new Date()
    for (const bloco of blocos) {
      const folha = livro.addWorksheet(nomeDeFolha(bloco.nome))
      folha.addRow(bloco.colunas)
      folha.getRow(1).font = { bold: true }
      for (const linha of bloco.linhas) folha.addRow(linha)
      // Uma largura por coluna, medida pelo conteúdo: sem isto os nomes de distrito saem cortados
      // e quem abre o ficheiro vê cardinais em vez de números.
      folha.columns.forEach((coluna, i) => {
        let maior = String(bloco.colunas[i] ?? '').length
        for (const linha of bloco.linhas) maior = Math.max(maior, String(linha[i] ?? '').length)
        coluna.width = Math.min(60, Math.max(12, maior + 2))
      })
      folha.views = [{ state: 'frozen', ySplit: 1 }]
    }
    const buffer = await livro.xlsx.writeBuffer()
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="' + base + '.xlsx"',
      },
    })
  }

  // BOM e CRLF: sem os dois, o Excel em Windows abre os acentos trocados e mete tudo numa coluna.
  const largura = Math.max(...blocos.map((b) => b.colunas.length))
  const topo = ['bloco']
  for (let i = 1; i <= largura; i++) topo.push('coluna_' + i)
  const linhas: string[] = [topo.join(',')]
  for (const bloco of blocos) {
    linhas.push([bloco.nome, ...bloco.colunas].map(escaparCsv).join(','))
    for (const linha of bloco.linhas) linhas.push([bloco.nome, ...linha].map(escaparCsv).join(','))
  }
  const csv = '﻿' + linhas.join('\r\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="' + base + '.csv"',
    },
  })
}
