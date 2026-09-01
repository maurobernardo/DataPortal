import { db, findDatasetById } from '@/lib/db'
import { carregarTabela, colunaNumerica, colunaValores } from './dados'
import { perfilColuna, correlacaoPearson, type PerfilColuna } from './library/estatistica'
import { logger } from '@/lib/logger'

/**
 * Perfil de dataset em cache (PLANO-ARQUITETURA-DUAS-FASES.md).
 *
 * Calculado uma vez por dataset (não uma vez por análise) e reaproveitado por todas as análises
 * futuras sobre esse dataset, até o dataset ser actualizado. O Planeamento passa a receber isto
 * em vez de descobrir a forma dos dados a partir de 3 linhas de amostra a cada nova pergunta —
 * mais rápido e mais informado, sem mudar o que é decidido, só o que já se sabe de antemão.
 *
 * Reaproveita inteiramente as funções de `library/estatistica.ts` (perfilColuna,
 * correlacaoPearson): não há estatística nova aqui, só a decisão de quando calcular e onde guardar.
 */

export type CorrelacaoForte = { coluna_a: string; coluna_b: string; r: number }

export type PerfilDataset = {
  dataset_id: number
  n_linhas: number
  colunas: PerfilColuna[]
  correlacoes_fortes: CorrelacaoForte[]
}

let tabelaGarantida = false

async function garantirTabela() {
  if (tabelaGarantida) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS dataset_perfis (
      dataset_id INT NOT NULL,
      dataset_actualizado_em VARCHAR(40) NOT NULL,
      perfil LONGTEXT NOT NULL,
      criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (dataset_id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  tabelaGarantida = true
}

// Acima disto o cálculo de todos os pares de correlação (O(n²) colunas) deixa de valer o tempo
// que poupa ao Planeamento — datasets deste portal raramente têm mais do que uma dezena de
// colunas numéricas de qualquer forma útil para correlacionar.
const MAX_COLUNAS_CORRELACAO = 15
const LIMIAR_CORRELACAO_FORTE = 0.5

async function calcularPerfil(datasetId: number): Promise<PerfilDataset | null> {
  const tabela = await carregarTabela(datasetId)
  if ('erro' in tabela) return null

  const colunas = tabela.colunas.map((c) => perfilColuna(c, colunaValores(tabela, c)))

  const colunasNumericas = colunas.filter((c) => c.tipo === 'numerica').map((c) => c.coluna).slice(0, MAX_COLUNAS_CORRELACAO)
  const correlacoes_fortes: CorrelacaoForte[] = []
  for (let i = 0; i < colunasNumericas.length; i++) {
    for (let j = i + 1; j < colunasNumericas.length; j++) {
      const a = colunaNumerica(tabela, colunasNumericas[i])
      const b = colunaNumerica(tabela, colunasNumericas[j])
      if (a.length < 4 || b.length < 4 || a.length !== b.length) continue
      const resultado = correlacaoPearson(a, b)
      if (resultado && Number.isFinite(resultado.r) && Math.abs(resultado.r) >= LIMIAR_CORRELACAO_FORTE) {
        correlacoes_fortes.push({
          coluna_a: colunasNumericas[i],
          coluna_b: colunasNumericas[j],
          r: Math.round(resultado.r * 100) / 100,
        })
      }
    }
  }

  return { dataset_id: datasetId, n_linhas: tabela.n_linhas, colunas, correlacoes_fortes }
}

/**
 * Obtém o perfil do cache se ainda for válido (dataset não mudou desde o cálculo), senão
 * calcula e guarda. Nunca lança: uma falha aqui não pode impedir a análise de continuar — o
 * Planeamento funciona perfeitamente bem sem perfil, só com menos contexto (como sempre foi).
 */
export async function obterPerfilDataset(datasetId: number): Promise<PerfilDataset | null> {
  try {
    await garantirTabela()
    const dataset = await findDatasetById(datasetId)
    if (!dataset) return null
    const actualizadoEm = String((dataset as any).updatedAt || '')

    const [rows] = (await db.execute(
      'SELECT perfil FROM dataset_perfis WHERE dataset_id = ? AND dataset_actualizado_em = ? LIMIT 1',
      [datasetId, actualizadoEm]
    )) as [any[], unknown]
    if (rows[0]) {
      try {
        return JSON.parse(rows[0].perfil)
      } catch {
        // cache corrompido: recalcula abaixo
      }
    }

    const perfil = await calcularPerfil(datasetId)
    if (!perfil) return null

    await db.execute(
      `INSERT INTO dataset_perfis (dataset_id, dataset_actualizado_em, perfil)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE dataset_actualizado_em = VALUES(dataset_actualizado_em), perfil = VALUES(perfil), criado_em = NOW()`,
      [datasetId, actualizadoEm, JSON.stringify(perfil)]
    )
    return perfil
  } catch (erro) {
    logger.error('erro_obter_perfil_dataset', { error: erro, datasetId })
    return null
  }
}

/** Resumo compacto para o prompt do Planeamento — estatísticas, não dados linha a linha. */
export function formatarPerfilParaPrompt(perfil: PerfilDataset): string {
  const linhas: string[] = []
  for (const c of perfil.colunas) {
    if (c.tipo === 'numerica' && c.estatisticas) {
      linhas.push(
        `  - ${c.coluna} (numérica, ${c.completude_pct}% preenchida): min=${c.estatisticas.min}, ` +
          `máx=${c.estatisticas.max}, média=${c.estatisticas.media}, mediana=${c.estatisticas.mediana}`
      )
    } else if (c.tipo === 'categorica' && c.top_categorias) {
      // Com só 3 valores mostrados, uma coluna "qual indicador/categoria esta linha representa"
      // (ex.: nome da cultura, tipo de doença, sector) escondia do Planeamento os valores fora do
      // top 3 — sem saber que "Arroz" existe, não há como escrever filtro_unidade="cat:coluna=
      // Arroz". Até 30 categorias distintas (o caso normal deste tipo de coluna), mostra até 8; só
      // para colunas de cardinalidade muito maior (nomes de escola, códigos) é que continua a
      // resumir a 3, porque aí listar mais não ajuda a escrever um filtro válido.
      const limite = c.n_distintos <= 30 ? 8 : 3
      const top = c.top_categorias.slice(0, limite).map((t) => `${t.valor} (${t.pct}%)`).join(', ')
      linhas.push(`  - ${c.coluna} (categórica, ${c.n_distintos} valores distintos): top: ${top}`)
    } else if (c.tipo === 'vazia') {
      linhas.push(`  - ${c.coluna}: sem dados preenchidos`)
    }
  }
  const correlacoes = perfil.correlacoes_fortes.length
    ? `Correlações fortes já detectadas: ${perfil.correlacoes_fortes
        .map((c) => `${c.coluna_a}×${c.coluna_b} (r=${c.r})`)
        .join('; ')}.`
    : 'Sem correlações fortes (|r|≥0.5) entre colunas numéricas.'
  return `Perfil pré-calculado (${perfil.n_linhas} linhas):\n${linhas.join('\n')}\n${correlacoes}`
}
