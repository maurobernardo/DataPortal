import { db } from '@/lib/db'
import {
  agregarPorUnidade,
  carregarTabela,
  colunaValores,
  ligarAUnidades,
  type NivelAdmin,
  type Tabela,
} from './dados'
import type { AlvoEnriquecimento } from './types'

/**
 * Enriquecimento por denominador populacional (R2, primeira prioridade da cascata: outros
 * datasets do portal antes de qualquer fonte externa).
 *
 * Implementado apenas para população porque é o único denominador com um caso real e verificado
 * no portal (dataset 56, Data4Moz L02). Um alvo de enriquecimento com outra lacuna (série
 * temporal, variável ausente) não tem aqui resolução automática: fica como limitação declarada
 * em vez de fingir uma cascata genérica que ainda não existe.
 */

export type FonteEnriquecimento = {
  datasetId: number
  titulo: string
  nivel: NivelAdmin
  porCodigo: Map<string, number>
}

const PALAVRAS_VAZIAS = new Set([
  'para', 'como', 'onde', 'pela', 'pelo', 'entre', 'desde', 'sobre', 'este', 'esta',
  'isso', 'esse', 'essa', 'mais', 'menos', 'dados', 'dataset', 'coluna', 'nivel',
])

function termosSignificativos(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !PALAVRAS_VAZIAS.has(w))
}

const PADRAO_POPULACIONAL = /popula|habitant|denominador|per[\s_]?capita|por\s+1\s*000/i

/** Alvos que este resolvedor sabe tentar: os que pedem explicitamente um denominador populacional. */
export function eLacunaPopulacional(alvo: AlvoEnriquecimento): boolean {
  return PADRAO_POPULACIONAL.test(alvo.lacuna) || PADRAO_POPULACIONAL.test(alvo.fonte_alvo)
}

async function procurarCandidatosPortal(
  termos: string[],
  excluir: number[]
): Promise<{ id: number; title: string }[]> {
  const excluirSql = (ids: number[]) => (ids.length ? `AND id NOT IN (${ids.map(() => '?').join(',')})` : '')

  // Fase 1, determinística: datasets inequivocamente populacionais entram sempre, ordenados por
  // id. Sem esta fase, uma pontuação por número de termos coincidentes empatava datasets de
  // população real com datasets genéricos que só batem certo com termos largos do alvo (ex.:
  // "distrito" bate em "Limite de Distritos"); com o empate, o MySQL não garante ordem sem
  // ORDER BY determinístico, e o LIMIT alternava que dataset ficava de fora entre execuções da
  // mesma pergunta (bug real, verificado: o dataset 56 aparecia numa corrida e desaparecia na
  // seguinte).
  // Limite generoso (12): esta fase já está restrita a datasets inequivocamente populacionais
  // pelo título/descrição, ao contrário da fase 2 que é genérica. Cortar cedo aqui reproduziria
  // o mesmo bug: dos 6 datasets de população reais no portal, 5 têm ficheiro em falta no disco
  // (verificado), e um LIMIT 4 deixava de fora justamente o único que carrega.
  const [populacionais] = (await db.execute(
    `SELECT id, title FROM Dataset
     WHERE (title LIKE '%população%' OR title LIKE '%populacao%' OR title LIKE '%demografia%'
            OR description LIKE '%população%' OR description LIKE '%populacao%' OR description LIKE '%demografia%')
       ${excluirSql(excluir)}
     ORDER BY id LIMIT 12`,
    [...excluir]
  )) as [any[], unknown]

  if (termos.length === 0) return populacionais

  // Fase 2: termos específicos do alvo, para lacunas fora de população pura (mantém o resolvedor
  // capaz de crescer para outros denominadores no futuro sem reescrever esta função).
  const jaEncontrados = populacionais.map((d: any) => d.id)
  const excluirTudo = [...excluir, ...jaEncontrados]
  const condicoes = termos.map(() => '(title LIKE ? OR description LIKE ?)').join(' OR ')
  const params = termos.flatMap((t) => [`%${t}%`, `%${t}%`])

  const [rows] = (await db.execute(
    `SELECT id, title FROM Dataset WHERE (${condicoes}) ${excluirSql(excluirTudo)} ORDER BY id LIMIT 4`,
    [...params, ...excluirTudo]
  )) as [any[], unknown]

  return [...populacionais, ...rows]
}

/** Filtra à variável e ao ano mais recente antes de agregar, para não somar anos diferentes. */
function filtrarLongoParaPopulacaoTotal(t: Tabela): Tabela | null {
  const colVar = t.colunas.find((c) => /variable_id/i.test(c))
  // Prefere explicitamente o nome em português: "variable_name" sozinho apanharia
  // "variable_name_en" por sub-string ("Population" também contém "popula", por coincidência,
  // o que escondia este bug nos testes iniciais em vez de o denunciar).
  const colNomeVar =
    t.colunas.find((c) => /variable_name_pt/i.test(c)) || t.colunas.find((c) => /variable_name/i.test(c))
  const colAno = t.colunas.find((c) => /^year$/i.test(c))
  if (!colVar || !colNomeVar) return t

  const idsVar = colunaValores(t, colVar)
  const nomesVar = colunaValores(t, colNomeVar)

  let idAlvo: string | null = null
  for (let i = 0; i < nomesVar.length; i++) {
    if (/total/i.test(nomesVar[i]) && /popula/i.test(nomesVar[i])) {
      idAlvo = idsVar[i]
      break
    }
  }
  if (!idAlvo) return null

  const anos = colAno ? colunaValores(t, colAno) : []
  const anoMax = colAno
    ? Math.max(...anos.map((a) => Number.parseInt(a, 10)).filter(Number.isFinite))
    : null

  const linhas = t.linhas.filter((_, i) => {
    if (idsVar[i] !== idAlvo) return false
    if (colAno && anoMax !== null) return Number.parseInt(anos[i], 10) === anoMax
    return true
  })
  if (linhas.length === 0) return null

  return { ...t, linhas, n_linhas: linhas.length }
}

/**
 * Tenta resolver um alvo de enriquecimento populacional procurando primeiro no próprio portal.
 * Devolve null (nunca lança) quando não encontra nada utilizável: a ausência de fonte é, em si,
 * uma informação legítima para R8, não um erro de execução.
 */
export async function tentarEnriquecerPopulacao(
  alvo: AlvoEnriquecimento,
  jaSelecionados: number[],
  nivelNecessario: NivelAdmin
): Promise<FonteEnriquecimento | null> {
  const termos = [...termosSignificativos(alvo.lacuna), ...termosSignificativos(alvo.fonte_alvo)]
  const candidatos = await procurarCandidatosPortal(termos, jaSelecionados)

  for (const cand of candidatos) {
    const bruto = await carregarTabela(cand.id)
    if ('erro' in bruto) continue

    const colValor = bruto.colunas.find((c) => /^value$/i.test(c)) || bruto.colunas.find((c) => /^popula/i.test(c))
    const colGeo = bruto.colunas.find((c) => /geography_name|^nome$|distrito|provincia/i.test(c))
    if (!colValor || !colGeo) continue

    const tabela = /variable_id/i.test(bruto.colunas.join(',')) ? filtrarLongoParaPopulacaoTotal(bruto) : bruto
    if (!tabela) continue

    // Tenta ao nível pedido primeiro; se a fonte só cobrir um nível mais grosso (caso real:
    // dataset 56 só tem província), fica-se por aí. Não se desagrega população de província
    // para distrito por inventar uma distribuição uniforme: seria um número sem base real.
    let ligacao = await ligarAUnidades(tabela, colGeo, nivelNecessario).catch(() => null)
    if (!ligacao || ligacao.taxa_correspondencia < 0.5) {
      ligacao = await ligarAUnidades(tabela, colGeo, 'admin1').catch(() => null)
    }
    if (!ligacao || ligacao.taxa_correspondencia < 0.5) continue

    const porUnidade = await agregarPorUnidade(tabela, ligacao, colValor, 'soma', ligacao.nivel)
    if (porUnidade.length === 0) continue

    return {
      datasetId: cand.id,
      titulo: bruto.titulo,
      nivel: ligacao.nivel,
      porCodigo: new Map(porUnidade.map((u) => [u.codigo, u.valor])),
    }
  }

  return null
}
