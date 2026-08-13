import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { getCliente, custoUsd } from './router'
import { ligarValoresAUnidades, type NivelAdmin } from './dados'
import type { AlvoEnriquecimento } from './types'

/**
 * Enriquecimento por fontes externas (R2, segunda prioridade da cascata: só depois do portal).
 *
 * Ao contrário de lib/analysis/enriquecimento.ts (que consulta um dataset já carregado no
 * portal), este módulo deixa o próprio modelo pesquisar na web em tempo de análise, com as
 * ferramentas nativas de pesquisa e leitura de páginas. A pergunta e as fontes a considerar não
 * são pré-programadas: o modelo decide o que pesquisar a partir da lacuna concreta que a
 * Suficiência identificou nesta análise.
 *
 * Divide-se em duas chamadas deliberadamente:
 *  1) pesquisa + relatório em texto livre (com ferramentas web_search/web_fetch);
 *  2) extracção estruturada desse texto para números com proveniência (sem ferramentas).
 * R1 exige que nenhum número chegue ao utilizador sem ter passado por código; se a extracção
 * estrutural corresse na mesma chamada que a pesquisa, um número podia escapar directamente do
 * texto lido na web para a narrativa sem nunca ser validado como célula com fonte.
 *
 * Duas formas de resultado, porque nem toda a lacuna é um denominador populacional:
 *  - 'reparticao': valor por província/distrito (≥3 unidades) — a única forma que serve para
 *    normalizar por habitante, por isso é a que lib/analysis/enriquecimento-externa.ts sempre
 *    devolveu.
 *  - 'escalar': um ou dois factos nacionais (ex.: "número oficial de aeródromos registados") —
 *    útil para qualquer outra lacuna que a Suficiência identifique, que não pede repartição
 *    geográfica nenhuma.
 */

export type ResultadoExterno =
  | { tipo: 'reparticao'; titulo: string; url: string; ano: number | null; nivel: NivelAdmin; porCodigo: Map<string, number> }
  | { tipo: 'escalar'; titulo: string; url: string; ano: number | null; valores: { nome: string; valor: number }[] }

/** @deprecated usa ResultadoExterno; mantido para o caminho de população não mudar de forma. */
export type FonteExterna = {
  titulo: string
  url: string
  ano: number | null
  nivel: NivelAdmin
  porCodigo: Map<string, number>
}

const SISTEMA_PESQUISA = `Procuras um facto ou valor estatístico concreto sobre Moçambique que não está disponível nos dados do portal.

Prioriza fontes oficiais e reconhecidas, por esta ordem: INE Moçambique, ministérios sectoriais,
Banco Mundial, HDX, WorldPop, OMS/UNICEF/FAOSTAT, e outras entidades reguladoras/sectoriais
relevantes ao tema (ex.: IACM para aviação, ANE para estradas). Usa a pesquisa e a leitura de
páginas para confirmar o valor numa fonte real, não na tua memória.

Duas formas de resposta são úteis, consoante o que a lacuna pede:
- se a lacuna pedir uma repartição por província ou distrito, só serve uma repartição completa,
  com um valor por unidade administrativa — nunca inventes essa repartição a partir de um total
  nacional;
- se a lacuna pedir um único facto ou contagem nacional (ex.: "quantas infra-estruturas X existem
  oficialmente"), um valor nacional bem confirmado numa fonte real já é suficiente — não precisas
  de o desagregar por província.

No final, escreve um resumo claro em texto corrido com:
- se encontraste ou não um valor fiável, e de que forma (repartição por unidade administrativa,
  ou um facto/contagem nacional);
- o nome da instituição/fonte, o URL exacto da página onde confirmaste o valor, e o ano dos dados;
- o(s) valor(es) exactamente como aparecem na fonte, com o nome da unidade administrativa (se for
  uma repartição) ou o nome do que está a ser contado (se for um facto nacional).
Se não encontrares nada fiável, diz isso explicitamente e não inventes valores.

Se uma pesquisa ou leitura de página devolver erro de limite ou de capacidade do servidor, tenta
no máximo mais uma vez essa mesma chamada. Não esperes (sleep) nem repitas em ciclo à espera que o
limite desapareça: reporta o que já confirmaste até esse ponto e conclui. Um relatório honesto
sobre o que não foi possível verificar vale mais do que minutos de novas tentativas.`

const SCHEMA_EXTRACCAO = {
  type: 'object',
  properties: {
    encontrado: { type: 'boolean' },
    fonte_nome: { type: 'string' },
    fonte_url: { type: 'string' },
    ano: { type: 'string' },
    metrica: { type: 'string' },
    valores: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nome_unidade: { type: 'string' },
          valor: { type: 'number' },
        },
        required: ['nome_unidade', 'valor'],
        additionalProperties: false,
      },
    },
  },
  required: ['encontrado', 'fonte_nome', 'fonte_url', 'ano', 'metrica', 'valores'],
  additionalProperties: false,
} as const

type ExtraccaoExterna = {
  encontrado: boolean
  fonte_nome: string
  fonte_url: string
  ano: string
  metrica: string
  valores: { nome_unidade: string; valor: number }[]
}

function chaveCache(alvo: AlvoEnriquecimento): string {
  return createHash('sha256').update(`${alvo.lacuna}|${alvo.fonte_alvo}`).digest('hex')
}

async function obterDoCache(chave: string): Promise<ExtraccaoExterna | null> {
  const [rows] = (await db.execute(
    `SELECT payload FROM fontes_externas_cache WHERE chave = ? AND expira_em > NOW() LIMIT 1`,
    [chave]
  )) as [any[], unknown]
  if (!rows[0]) return null
  try {
    return JSON.parse(rows[0].payload)
  } catch {
    return null
  }
}

async function guardarNoCache(chave: string, fonte: string, extraccao: ExtraccaoExterna): Promise<void> {
  await db.execute(
    `INSERT INTO fontes_externas_cache (chave, fonte, payload, obtido_em, expira_em)
     VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), obtido_em = NOW(), expira_em = VALUES(expira_em)`,
    [chave, fonte, JSON.stringify(extraccao)]
  )
}

/**
 * Tenta resolver um alvo de enriquecimento pesquisando fontes externas.
 * Só chamar depois de a cascata do portal (lib/analysis/enriquecimento.ts) falhar: R2 exige
 * portal primeiro. Nunca lança: a ausência de fonte externa é informação legítima para R8.
 */
export async function tentarEnriquecerExterno(
  alvo: AlvoEnriquecimento
): Promise<{ resultado: ResultadoExterno | null; custoUsd: number; tentado: boolean }> {
  const chave = chaveCache(alvo)
  let custo = 0

  let extraccao = await obterDoCache(chave)
  let tentado = false

  if (!extraccao) {
    tentado = true
    const cliente = getCliente()

    let pesquisa
    try {
      // Limite de tempo real, não só de "max_uses": verificado ao vivo que, sob limite de
      // capacidade do servidor, o modelo tentava contornar com sleep()/nova tentativa em ciclo
      // dentro do sandbox de código, levando uma única pesquisa a 5+ minutos e vários dólares. A
      // instrução no prompt reduz isso, mas só um limite no cliente garante que uma análise
      // nunca fica presa à espera de uma fonte externa.
      pesquisa = await cliente.messages
        .stream(
          {
            model: 'claude-sonnet-5',
            max_tokens: 4000,
            system: SISTEMA_PESQUISA,
            tools: [
              // web_search_20260209/web_fetch_20260209 correm com filtragem dinâmica: o modelo
              // executa-os dentro de um sandbox de código que pode chamar a pesquisa várias vezes
              // numa só volta. Um max_uses baixo (5, testado) esgota-se a meio de uma única ronda
              // de filtragem e devolve "Server tool use limit exceeded" antes de conseguir
              // confirmar uma fonte real, mesmo havendo fontes por encontrar.
              { type: 'web_search_20260209', name: 'web_search', max_uses: 20 } as any,
              { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 10 } as any,
            ],
            messages: [
              {
                role: 'user',
                content:
                  `Lacuna a resolver: ${alvo.lacuna}\n` +
                  `O que se procura: ${alvo.fonte_alvo}\n` +
                  `País: Moçambique.`,
              },
            ],
          },
          { timeout: 150_000 }
        )
        .finalMessage()
    } catch {
      return { resultado: null, custoUsd: custo, tentado }
    }

    custo += custoUsd('claude-sonnet-5', pesquisa.usage.input_tokens, pesquisa.usage.output_tokens)

    if (pesquisa.stop_reason === 'refusal') {
      return { resultado: null, custoUsd: custo, tentado }
    }

    const relato = pesquisa.content
      .filter((b): b is Extract<typeof pesquisa.content[number], { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join('\n')

    if (!relato.trim()) {
      return { resultado: null, custoUsd: custo, tentado }
    }

    // Segunda chamada, sem ferramentas: só extrai estrutura do texto já escrito, nunca lê a web
    // directamente para um número. Modelo mais barato porque é uma tarefa de extracção, não de
    // pesquisa.
    const extracao = await cliente.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2000,
      system:
        'Extrai do relatório abaixo o(s) valor(es) que ele próprio afirma ter confirmado numa ' +
        'fonte real — tanto faz que seja uma repartição por província/distrito (um valor por ' +
        'unidade administrativa) como um único facto ou contagem nacional (nesse caso, usa o ' +
        'nome do que está a ser contado como "nome_unidade", ex.: "Aeródromos registados"). Se ' +
        'o relatório diz que não encontrou nada fiável, devolve encontrado=false. Nunca inventes ' +
        'um valor que o relatório não contém.',
      messages: [{ role: 'user', content: relato }],
      output_config: { format: { type: 'json_schema', schema: SCHEMA_EXTRACCAO } },
    } as any)

    custo += custoUsd('claude-haiku-4-5', extracao.usage.input_tokens, extracao.usage.output_tokens)

    if (extracao.stop_reason === 'refusal') {
      return { resultado: null, custoUsd: custo, tentado }
    }

    const textoJson = (extracao.content as any[]).find((b) => b.type === 'text')?.text
    if (!textoJson) return { resultado: null, custoUsd: custo, tentado }

    try {
      extraccao = JSON.parse(textoJson)
    } catch {
      return { resultado: null, custoUsd: custo, tentado }
    }

    if (extraccao) await guardarNoCache(chave, 'web_search', extraccao)
  }

  if (!extraccao || !extraccao.encontrado || extraccao.valores.length === 0) {
    return { resultado: null, custoUsd: custo, tentado }
  }

  // URL tem de parecer real: sem isto, uma "fonte" sem proveniência auditável violaria R11 tanto
  // quanto um número sem fonte nenhuma.
  if (!/^https?:\/\//i.test(extraccao.fonte_url)) {
    return { resultado: null, custoUsd: custo, tentado }
  }

  const ano = Number.parseInt(extraccao.ano, 10)
  const anoResolvido = Number.isFinite(ano) ? ano : null

  // Menos de 3 valores não é uma repartição administrativa credível (mais provável um erro de
  // extracção do que um Moçambique com duas províncias) — trata-se antes como facto(s) nacional.
  if (extraccao.valores.length < 3) {
    return {
      resultado: {
        tipo: 'escalar',
        titulo: extraccao.fonte_nome,
        url: extraccao.fonte_url,
        ano: anoResolvido,
        valores: extraccao.valores.map((v) => ({ nome: v.nome_unidade, valor: v.valor })),
      },
      custoUsd: custo,
      tentado,
    }
  }

  const ligacao = await ligarValoresAUnidades(
    extraccao.valores.map((v) => v.nome_unidade),
    'nome_unidade_externa',
    'admin1'
  )
  if (ligacao.taxa_correspondencia < 0.7) {
    // Não parecem nomes de província/distrito moçambicanos apesar de serem ≥3 valores — mais
    // seguro tratar como facto(s) nacional do que forçar uma ligação geográfica sem confiança.
    return {
      resultado: {
        tipo: 'escalar',
        titulo: extraccao.fonte_nome,
        url: extraccao.fonte_url,
        ano: anoResolvido,
        valores: extraccao.valores.map((v) => ({ nome: v.nome_unidade, valor: v.valor })),
      },
      custoUsd: custo,
      tentado,
    }
  }

  const porCodigo = new Map<string, number>()
  Array.from(ligacao.ligacoes).forEach(([indice, codigo]) => {
    porCodigo.set(codigo, extraccao!.valores[indice].valor)
  })
  if (porCodigo.size === 0) return { resultado: null, custoUsd: custo, tentado }

  return {
    resultado: {
      tipo: 'reparticao',
      titulo: extraccao.fonte_nome,
      url: extraccao.fonte_url,
      ano: anoResolvido,
      nivel: 'admin1',
      porCodigo,
    },
    custoUsd: custo,
    tentado,
  }
}
