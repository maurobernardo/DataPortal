export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin, getCurrentUser } from '@/lib/auth'
import { obterDigesto, obterPaginas, temAcesso } from '@/lib/relatorios/persistencia'
import { seleccionarPaginas } from '@/lib/relatorios/retrieval'
import { chamarEstagioRelatorio } from '@/lib/relatorios/router'
import { logger } from '@/lib/logger'
import type { Digesto } from '@/lib/relatorios/digesto'

/**
 * Perguntar a um relatório, com citação de página.
 *
 * A mesma disciplina do motor de análise, aplicada a um documento: quando o relatório não diz,
 * a resposta é que não diz, nunca uma suposição plausível. Duas portas de saída honesta antes de
 * gastar uma chamada ao modelo: sem páginas processadas, e sem nenhuma página com termos em comum
 * com a pergunta (nesse caso o modelo não tem de ser chamado para dizer "não encontrei" - já se
 * sabe).
 *
 * Além dos excertos brutos do PDF, quem já desbloqueou o resumo (mesma regra do `/digesto`: admin
 * ou `temAcesso`) tem o digesto estruturado inteiro disponível como contexto: resultado, achados,
 * credibilidade, glossário e as afirmações numéricas. Sem isto, uma pergunta como "qual foi o
 * resultado deste estudo?" dependia da pesquisa lexical calhar de encontrar a página certa outra
 * vez, quando essa resposta já foi extraída e verificada uma vez ao gerar o resumo — perguntar de
 * novo ao texto bruto era ignorar trabalho já feito. Quem NÃO desbloqueou o resumo continua só com
 * os excertos: o digesto estruturado é precisamente o que o resumo paga para ver.
 */

function montarContextoDigesto(digesto: Digesto): string {
  const partes: string[] = []

  partes.push(`Assunto: ${digesto.o_que_e.assunto}`)
  partes.push(`Geografia: ${digesto.o_que_e.geografia}`)
  partes.push(`Período: ${digesto.o_que_e.periodo}`)
  partes.push(`Metodologia: ${digesto.o_que_e.metodologia}`)

  if (digesto.resultado && digesto.resultado.tipo !== 'nao_aplicavel' && digesto.resultado.texto) {
    const rotulo = digesto.resultado.tipo === 'obtido' ? 'Resultado obtido' : 'O que se espera'
    partes.push(`${rotulo} (página ${digesto.resultado.pagina}): ${digesto.resultado.texto}`)
  }

  if (digesto.credibilidade) {
    const c = digesto.credibilidade
    const bits = [
      c.tipo_dado ? `tipo de dado: ${c.tipo_dado}` : '',
      c.tamanho_amostra ? `amostra: ${c.tamanho_amostra}` : '',
      c.observacoes ? `limitações: ${c.observacoes}` : '',
    ].filter(Boolean)
    if (bits.length > 0) partes.push(`Credibilidade metodológica: ${bits.join('; ')}`)
  }

  if (digesto.achados.length > 0) {
    partes.push(
      'Achados extraídos: ' +
        digesto.achados.map((a) => `[${a.ano ?? 's/ano'}, p.${a.pagina}] ${a.texto}`).join(' | ')
    )
  }

  if (digesto.glossario.length > 0) {
    partes.push(
      'Glossário: ' + digesto.glossario.map((g) => `${g.termo} = ${g.definicao} (p.${g.pagina})`).join(' | ')
    )
  }

  if (digesto.afirmacoes_numericas.length > 0) {
    partes.push(
      'Afirmações numéricas verificáveis: ' +
        digesto.afirmacoes_numericas
          .map(
            (a) =>
              `${a.tema} em ${a.geografia}${a.periodo_fim ? ` (${a.periodo_fim})` : ''}: ${a.valor}${a.unidade} (p.${a.pagina})`
          )
          .join(' | ')
    )
  }

  return partes.join('\n')
}

const SCHEMA = {
  type: 'object',
  properties: {
    encontrado: { type: 'boolean' },
    resposta: { type: 'string' },
    paginas_citadas: { type: 'array', items: { type: 'integer' } },
  },
  required: ['encontrado', 'resposta', 'paginas_citadas'],
  additionalProperties: false,
} as const

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await getCurrentUser()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ erro: 'Identificador inválido' }, { status: 400 })

  const corpo = await req.json().catch(() => ({}))
  const pergunta = String(corpo?.pergunta ?? '').trim()
  if (!pergunta) return NextResponse.json({ erro: 'Escreva uma pergunta' }, { status: 400 })
  if (pergunta.length > 500) return NextResponse.json({ erro: 'Pergunta demasiado longa' }, { status: 400 })

  const paginas = await obterPaginas(id)
  if (paginas.length === 0) {
    return NextResponse.json({ erro: 'Este relatório ainda não foi processado' }, { status: 409 })
  }

  const seleccionadas = seleccionarPaginas(pergunta, paginas, 8)
  if (seleccionadas.length === 0) {
    return NextResponse.json({
      resposta: 'O relatório não parece falar disto: nenhuma página tem termos em comum com a pergunta.',
      paginas_citadas: [],
      encontrado: false,
    })
  }

  // O digesto estruturado só entra no contexto para quem já desbloqueou o resumo (mesma regra do
  // `/digesto`): sem isso, perguntar seria uma forma de contornar o que o resumo cobra para ver.
  const admin = await getCurrentAdmin()
  const podeVerDigesto = !!admin || (await temAcesso(id, sessao.userId))
  const digesto = podeVerDigesto ? await obterDigesto(id, 'pt') : null
  const contextoDigesto = digesto ? montarContextoDigesto(digesto) : null

  const documento = seleccionadas.map((p) => `[PAGINA ${p.pagina}]\n${p.texto}`).join('\n\n')
  try {
    const resposta = await chamarEstagioRelatorio<{ encontrado: boolean; resposta: string; paginas_citadas: number[] }>({
      estagio: 'pergunta',
      utilizador:
        `Responde à pergunta usando APENAS os excertos e o contexto abaixo. Os excertos podem estar ` +
        `em português e em inglês (relatório bilingue) — uma afirmação explícita em inglês conta como ` +
        `explícita, não a ignores nem a trates como mera inferência só porque a pergunta está em ` +
        `português. Antes de dizeres que o relatório "não apresenta uma lista explícita", relê os ` +
        `excertos à procura de uma frase directa que já responda a isso (ex.: "Resumo Executivo"/ ` +
        `"Executive Summary"); se existir, usa-a como a resposta principal em vez de a mencionares só ` +
        `depois como nota à parte.` +
        (contextoDigesto
          ? ` Tens também, abaixo, um DIGESTO JÁ EXTRAÍDO deste relatório (resultado, achados, ` +
            `credibilidade metodológica, glossário, afirmações numéricas verificadas): usa-o como fonte ` +
            `de confiança para perguntas sobre resultado, siglas, variáveis usadas ou credibilidade do ` +
            `estudo, sempre citando a página que já vem indicada nele, em vez de voltares a procurar ` +
            `essa mesma informação nos excertos brutos.`
          : '') +
        ` Se a resposta não estiver nem nos excertos nem no digesto, define "encontrado" como false e ` +
        `di-lo em "resposta", sem inventar. Cita as páginas de onde tiraste a resposta em ` +
        `"paginas_citadas".\n\nPERGUNTA: ${pergunta}\n\n` +
        (contextoDigesto ? `[DIGESTO JÁ EXTRAÍDO]\n${contextoDigesto}\n\n` : '') +
        documento,
      schema: SCHEMA,
      // Uma pergunta directa cabe em pouco espaço, mas uma comparação entre duas comunidades (pontos
      // em comum, pontos de divergência, cada um com a sua página) pode facilmente passar de 2000
      // tokens antes de terminar a frase — foi exactamente o que aconteceu aqui, com o modelo a ser
      // cortado a meio e `chamarEstagioRelatorio` a rejeitar o JSON incompleto resultante.
      maxTokens: 4000,
    })
    return NextResponse.json(resposta.dados)
  } catch (erro: any) {
    logger.error('erro_perguntar_relatorio', { error: erro, reportId: id })
    return NextResponse.json({ erro: 'Não foi possível responder agora' }, { status: 500 })
  }
}
