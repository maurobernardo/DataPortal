import { readFile } from 'fs/promises'
import { join } from 'path'
import { findReportById } from '@/lib/db'
import { extrairPaginas } from './extrair-pdf'
import { gerarDigesto } from './digesto'
import { definirEstado, guardarDigesto, guardarPaginas, obterEstado, registarUsoIaRelatorio } from './persistencia'
import { logger } from '@/lib/logger'

/**
 * A extracção e o digesto, partilhados entre os dois sítios que os disparam.
 *
 * São dois: a equipa do portal, no admin, que pode preparar um relatório com antecedência; e a
 * própria pessoa que o lê, pagando para o ver analisado na hora. É o MESMO trabalho e o MESMO
 * custo em qualquer dos dois casos, por isso vive numa função só, chamada por duas rotas com
 * regras de acesso diferentes.
 */
export type ResultadoProcessamento =
  | { estado: 'pronto'; totalPaginas: number; truncado: boolean }
  | { estado: 'digitalizado'; totalPaginas: number }

export class RelatorioNaoProcessavelError extends Error {}

export async function processarRelatorio(
  reportId: number,
  // null = disparado pela equipa no admin, sem uma pessoa concreta a "pagar" pela leitura; a
  // auditoria de custos (/admin/custos-ia) continua a contar o gasto de qualquer forma, só não o
  // atribui a ninguém.
  utilizadorId: number | null = null
): Promise<ResultadoProcessamento> {
  const relatorio = await findReportById(reportId)
  if (!relatorio) throw new RelatorioNaoProcessavelError('Relatório não encontrado')
  const caminho = String(relatorio.filePath || '').trim()
  if (!caminho) throw new RelatorioNaoProcessavelError('Este relatório ainda não tem ficheiro carregado')
  if (!caminho.toLowerCase().endsWith('.pdf')) {
    throw new RelatorioNaoProcessavelError('Só ficheiros PDF podem ser processados')
  }

  try {
    // `filePath` é sempre relativo a `public/` (ver app/api/upload/route.ts), nunca um URL
    // completo nem algo vindo de fora, por isso não há travessia de directório a validar aqui.
    const relativo = caminho.replace(/^\/+/, '')
    const buffer = await readFile(join(process.cwd(), 'public', relativo))

    const extraccao = await extrairPaginas(buffer)
    if (extraccao.digitalizado) {
      await definirEstado(reportId, 'digitalizado', {
        mensagem: 'O PDF não tem uma camada de texto legível (provável digitalização sem OCR).',
        totalPaginas: extraccao.totalPaginas,
      })
      return { estado: 'digitalizado', totalPaginas: extraccao.totalPaginas }
    }

    await guardarPaginas(reportId, extraccao.paginas)
    const { digesto, truncado, custoUsd, modelo, tokensEntrada, tokensSaida } = await gerarDigesto(
      extraccao.paginas
    )
    await guardarDigesto(reportId, 'pt', digesto)
    await registarUsoIaRelatorio({
      reportId,
      utilizadorId,
      tipo: 'digesto',
      modelo,
      tokensEntrada,
      tokensSaida,
      custoUsd,
    }).catch((erro) => logger.error('erro_registar_uso_ia_relatorio', { error: erro, reportId, tipo: 'digesto' }))
    await definirEstado(reportId, 'pronto', {
      totalPaginas: extraccao.totalPaginas,
      mensagem: truncado ? 'O documento é muito extenso; o digesto não cobre as últimas páginas.' : undefined,
    })

    return { estado: 'pronto', totalPaginas: extraccao.totalPaginas, truncado }
  } catch (erro: any) {
    logger.error('erro_processar_relatorio', { error: erro, reportId })
    await definirEstado(reportId, 'erro', { mensagem: 'Falha ao processar o PDF. Tente novamente.' })
    throw erro
  }
}

// Um processamento normal (mesmo um relatório longo) termina em poucos minutos. Passado este
// tempo, "a_processar" já não significa "alguém está a trabalhar nisto": significa que o processo
// que o fazia morreu a meio (visto ao vivo: um relatório preso em "a_processar" há mais de uma
// hora, depois de o processamento passar a correr sem a pedida HTTP à espera dele — em hosting
// partilhado, o processo Node pode ser reciclado ou morto por falta de memória sem chegar a pôr o
// estado em "erro"). Sem isto, um relatório assim ficava preso para sempre, sem ninguém conseguir
// voltar a pedir a análise.
const MINUTOS_ABANDONO = 8

/**
 * Reserva uma corrida de processamento para um relatório.
 *
 * Duas pessoas a abrir "Analisar" ao mesmo tempo sobre o mesmo relatório não podem disparar duas
 * chamadas ao modelo: a segunda pagaria por um trabalho que a primeira já está a fazer. `a_processar`
 * funciona como o bilhete: só quem o consegue pôr é que arranca de facto.
 */
export async function reservarProcessamento(reportId: number): Promise<boolean> {
  const actual = await obterEstado(reportId)
  if (actual?.estado === 'a_processar') {
    const minutosParado = (Date.now() - actual.actualizadoEm.getTime()) / 60_000
    if (minutosParado < MINUTOS_ABANDONO) return false
    // Abandonado: cai para baixo e reserva de novo, tal como se nada estivesse a processar.
  }
  await definirEstado(reportId, 'a_processar')
  return true
}
