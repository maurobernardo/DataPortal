import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getCliente, modeloPara } from './router'

/**
 * PLANO-ROTULOS-E-VELOCIDADE.md, Frente A Fase 2: nomes de coluna E valores de categoria fora do
 * dicionário fixo (`rotularColuna`/`traduzirValorCategoria` em lib/analysis/rotulos-cliente.ts)
 * nunca vão ficar todos cobertos — cada dataset novo pode trazer abreviaturas próprias (ex.:
 * coluna "REASON" com valores "PC to PC", "P to EP" numa tabela de manutenção rodoviária). Em vez
 * de crescer esses dicionários para sempre, aprende-se uma vez por string nunca vista, cacheado
 * para SEMPRE (não por dataset, por string) numa tabela partilhada entre toda a plataforma.
 *
 * Restrição dura: NUNCA pode atrasar uma análise. A tradução corre em segundo plano, nunca
 * aguardada (fire-and-forget) — a análise em curso usa o resultado determinístico da Fase 1, e só
 * pedidos FUTUROS sobre a mesma string beneficiam da tradução aprendida.
 *
 * A parte que faltava antes desta versão: os componentes que desenham o mapa de geometria própria
 * (AnaliseMapaPontos.tsx) correm no BROWSER, sem acesso nenhum a esta base de dados — por isso o
 * dicionário aprendido tem de ser exportado como DADOS dentro da própria camada (ver
 * `dicionarioAprendidoPara` abaixo), não como uma função que o cliente possa chamar directamente.
 */

let tabelaGarantida = false
async function garantirTabela() {
  if (tabelaGarantida) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS rotulos_aprendidos (
      chave VARCHAR(191) NOT NULL,
      tipo ENUM('coluna', 'valor') NOT NULL DEFAULT 'coluna',
      rotulo VARCHAR(191) NOT NULL,
      criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (chave, tipo)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  // Instalações antigas já têm a tabela com o ENUM só de 'coluna' — MODIFY é idempotente (repetir
  // não faz mal) e best-effort: se falhar (ex.: permissões), o resto continua a funcionar só para
  // 'coluna', que é o que já existia.
  await db
    .execute(`ALTER TABLE rotulos_aprendidos MODIFY COLUMN tipo ENUM('coluna', 'valor') NOT NULL DEFAULT 'coluna'`)
    .catch(() => {})
  tabelaGarantida = true
}

type Tipo = 'coluna' | 'valor'

// Cache em memória do processo, uma por tipo: consulta síncrona, sem custo nenhum por chamada — a
// única vez que se toca a base de dados é para carregar tudo de uma vez (poucas centenas de linhas,
// no máximo) e para escrever uma linha nova quando se aprende algo.
const caches: Record<Tipo, Map<string, string> | null> = { coluna: null, valor: null }
const carregamentosEmCurso: Record<Tipo, Promise<void> | null> = { coluna: null, valor: null }

async function garantirCacheCarregada(tipo: Tipo): Promise<void> {
  if (caches[tipo]) return
  if (!carregamentosEmCurso[tipo]) {
    carregamentosEmCurso[tipo] = (async () => {
      await garantirTabela()
      const [linhas] = (await db.execute(`SELECT chave, rotulo FROM rotulos_aprendidos WHERE tipo = ?`, [tipo])) as [
        any[],
        unknown,
      ]
      const mapa = new Map<string, string>()
      for (const l of linhas) mapa.set(l.chave, l.rotulo)
      caches[tipo] = mapa
    })().catch((erro) => {
      logger.error('erro_carregar_cache_rotulos_aprendidos', { error: erro, tipo })
      caches[tipo] = new Map()
    })
  }
  await carregamentosEmCurso[tipo]
}

/** Consulta síncrona depois da cache estar carregada (ver `prepararCacheRotulosAprendidos`). */
export function obterRotuloAprendidoSincrono(chave: string, tipo: Tipo = 'coluna'): string | null {
  return caches[tipo]?.get(chave.trim().toLowerCase()) ?? null
}

/** Garante que as duas caches estão prontas — chamar uma vez no arranque do pedido, antes de usar a versão síncrona. */
export async function prepararCacheRotulosAprendidos(): Promise<void> {
  await Promise.all([garantirCacheCarregada('coluna'), garantirCacheCarregada('valor')])
}

/**
 * Devolve TODO o dicionário aprendido (coluna + valor) restrito às chaves que interessam a UMA
 * camada — para embutir nos dados enviados ao browser, já que o componente que os desenha
 * (AnaliseMapaPontos.tsx) não tem acesso nenhum a esta base de dados. Chamar só depois de
 * `prepararCacheRotulosAprendidos` (o motor já garante isso em `criarContexto`).
 */
export function dicionarioAprendidoPara(colunas: string[], valores: string[]): { colunas: Record<string, string>; valores: Record<string, string> } {
  const out = { colunas: {} as Record<string, string>, valores: {} as Record<string, string> }
  for (const c of colunas) {
    const r = obterRotuloAprendidoSincrono(c, 'coluna')
    if (r) out.colunas[c.trim().toLowerCase()] = r
  }
  for (const v of valores) {
    const r = obterRotuloAprendidoSincrono(v, 'valor')
    if (r) out.valores[v.trim().toLowerCase()] = r
  }
  return out
}

const filas: Record<Tipo, Set<string>> = { coluna: new Set(), valor: new Set() }
const aProcessarFila: Record<Tipo, boolean> = { coluna: false, valor: false }

/**
 * Sinal de que a Fase 1 (dicionário fixo) não reconheceu nada e só devolveu o texto tal como veio
 * (com capitalização) — não uma prova definitiva de que É técnico (um valor genuinamente chamado
 * "Bom" também passa neste teste), mas falsos positivos aqui só custam uma chamada de mais em
 * segundo plano, nunca atrasam nem estragam nada visível.
 */
/**
 * Heurística SEPARADA para valores (não reutiliza pareceRotuloTecnico): um nome próprio real
 * (ex.: "Mapinhane", um distrito) já vem naturalmente capitalizado e passaria no mesmo teste que
 * detecta "REASON" como técnico — aprender/traduzir nomes próprios genuínos seria desperdício (a
 * tradução ia só devolvê-los tal como estão) e continuaria a disparar uma chamada por cada
 * dataset novo. Só considera técnico um valor com sinais concretos de código/sigla: símbolos
 * ("+", "/", parênteses), dígitos, ou a palavra solta "to" entre segmentos curtos (padrão comum
 * em códigos de manutenção rodoviária, ex.: "PC to PC").
 */
export function pareceValorTecnico(valor: string): boolean {
  const limpo = valor.trim()
  if (!limpo || limpo.length > 40) return false
  if (/[+/()]/.test(limpo)) return true
  if (/\bto\b/i.test(limpo) && limpo.split(/\s+/).length <= 5) return true
  return false
}

export function pareceRotuloTecnico(original: string, resultado: string): boolean {
  const limpo = original.trim()
  if (!limpo) return false
  const capitalizacaoIngenua = limpo
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
  return resultado.trim().toLowerCase() === capitalizacaoIngenua.toLowerCase()
}

/**
 * Regista uma coluna ou valor que ainda não tem tradução conhecida — nunca é aguardado por quem
 * chama (fire-and-forget). Agrupa pedidos que cheguem em rajada (ex.: 5 datasets da mesma análise)
 * numa única chamada ao modelo por tipo, em vez de uma por string.
 */
export function aprenderEmSegundoPlano(texto: string, tipo: Tipo = 'coluna'): void {
  const chave = texto.trim().toLowerCase()
  if (!chave || caches[tipo]?.has(chave) || filas[tipo].has(chave)) return
  filas[tipo].add(chave)
  if (aProcessarFila[tipo]) return
  aProcessarFila[tipo] = true
  // setTimeout em vez de processar já: dá tempo a mais strings da mesma análise (ou de análises
  // concorrentes) se juntarem à mesma fila antes do lote seguir para o modelo.
  setTimeout(() => {
    processarFila(tipo).catch((erro) => logger.error('erro_aprender_rotulos', { error: erro, tipo }))
  }, 2000)
}

const SISTEMA_POR_TIPO: Record<Tipo, string> = {
  coluna:
    'Traduz nomes de coluna de datasets (muitas vezes abreviados por limite de shapefile, ' +
    'ex.: "ADM1_PT", "Manut1996") para um rótulo curto e claro em português de Moçambique, ' +
    'como apareceria como título de uma coluna numa tabela para o público geral. Nunca ' +
    'inventes significado que não seja razoavelmente óbvio a partir do nome — se o nome for ' +
    'ambíguo de mais para traduzir com confiança, devolve-o tal como está. Responde só com ' +
    'um objecto JSON {"nome_original": "rótulo traduzido", ...}, sem mais texto nenhum.',
  valor:
    'Traduz valores de categoria de datasets de infra-estrutura/conservação (muitas vezes ' +
    'siglas ou frases curtas em inglês, ex.: "PC to PC", "Ra+Rb/rev" em manutenção rodoviária) ' +
    'para um rótulo curto e claro em português de Moçambique, como apareceria numa legenda para ' +
    'o público geral. Nunca inventes significado que não seja razoavelmente óbvio — se o valor ' +
    'for ambíguo de mais ou for um código sem significado óbvio (ex.: uma sigla técnica sem ' +
    'contexto suficiente), devolve-o tal como está em vez de arriscar. Responde só com um ' +
    'objecto JSON {"valor_original": "rótulo traduzido", ...}, sem mais texto nenhum.',
}

async function processarFila(tipo: Tipo): Promise<void> {
  const lote = Array.from(filas[tipo])
  filas[tipo].clear()
  aProcessarFila[tipo] = false
  if (lote.length === 0) return

  try {
    await garantirCacheCarregada(tipo)
    const porTraduzir = lote.filter((c) => !caches[tipo]?.has(c))
    if (porTraduzir.length === 0) return

    const cliente = getCliente()
    const resposta = await cliente.messages.create({
      model: modeloPara('suficiencia'), // Haiku: tarefa fechada e barata, não precisa de Sonnet.
      max_tokens: 1024,
      system: SISTEMA_POR_TIPO[tipo],
      messages: [{ role: 'user', content: porTraduzir.join('\n') }],
    } as any)
    const texto = (resposta as any).content
      ?.filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('') || '{}'
    const bloco = texto.match(/\{[\s\S]*\}/)?.[0] || '{}'
    const traducoes: Record<string, string> = JSON.parse(bloco)

    await garantirTabela()
    for (const original of porTraduzir) {
      const rotulo = traducoes[original]
      if (!rotulo || typeof rotulo !== 'string') continue
      caches[tipo]!.set(original, rotulo)
      await db
        .execute(`INSERT IGNORE INTO rotulos_aprendidos (chave, tipo, rotulo) VALUES (?, ?, ?)`, [original, tipo, rotulo])
        .catch(() => {})
    }
  } catch (erro) {
    // Best-effort: uma falha aqui nunca deve aparecer a ninguém, é só uma optimização adiada.
    logger.error('erro_aprender_rotulos_lote', { error: erro, tipo })
  }
}
