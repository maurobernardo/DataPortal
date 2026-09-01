import { db } from '@/lib/db'

/**
 * Mapa de calor de cobertura geográfica do catálogo geoespacial (PLANO-INTELIGENCIA-PORTAL.md):
 * quantas camadas existem por província, para o utilizador ver de imediato onde o portal tem mais
 * ou menos dados antes de procurar. Não há uma coluna estruturada "província" no Dataset — o texto
 * livre de `coverage` (e, como reforço, título/descrição) é que diz a área coberta — por isso a
 * contagem é por correspondência de nome de província nesse texto, não uma junção exacta.
 */

export const PROVINCIAS_MZ = [
  'Cabo Delgado', 'Niassa', 'Nampula', 'Zambézia', 'Tete',
  'Manica', 'Sofala', 'Inhambane', 'Gaza', 'Maputo',
] as const

export type CoberturaProvincia = { provincia: string; total: number }

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(new RegExp('[\u0300-\u036f]', 'g'), '')
    .toLowerCase()
}

const PALAVRAS_NACIONAL = ['nacional', 'todo o pais', 'todas as provincias', 'mocambique inteiro', 'pais inteiro']

export async function obterCoberturaGeograficaPorProvincia(): Promise<{
  porProvincia: CoberturaProvincia[]
  totalDatasetsConsiderados: number
  datasetsSemCoberturaIdentificada: number
}> {
  const [rows] = await db.execute(
    `SELECT coverage, title, description FROM Dataset WHERE dataType = 'geoespacial'`
  ) as any

  const contagem = new Map<string, number>(PROVINCIAS_MZ.map((p) => [p, 0]))
  let semCoberturaIdentificada = 0

  for (const row of rows as any[]) {
    const textoBase = normalizar(`${row.coverage || ''} ${row.title || ''} ${row.description || ''}`)
    const eNacional = PALAVRAS_NACIONAL.some((chave) => textoBase.includes(chave))

    if (eNacional) {
      for (const provincia of PROVINCIAS_MZ) {
        contagem.set(provincia, (contagem.get(provincia) || 0) + 1)
      }
      continue
    }

    let encontrou = false
    for (const provincia of PROVINCIAS_MZ) {
      if (textoBase.includes(normalizar(provincia))) {
        contagem.set(provincia, (contagem.get(provincia) || 0) + 1)
        encontrou = true
      }
    }
    if (!encontrou) semCoberturaIdentificada++
  }

  return {
    porProvincia: PROVINCIAS_MZ.map((provincia) => ({ provincia, total: contagem.get(provincia) || 0 })),
    totalDatasetsConsiderados: (rows as any[]).length,
    datasetsSemCoberturaIdentificada: semCoberturaIdentificada,
  }
}
