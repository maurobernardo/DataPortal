import { findAllCategories, findDatasetsByIds, findDatasets } from '@/lib/db'
import { getDatasetPreview } from '@/lib/dataset-preview'

export type ChoroplethBoundary = {
  geojson: any
  nameProperty: string
  datasetId: number
  datasetTitle: string
}

const UNIT_MATCHERS: Record<string, RegExp> = {
  provincia: /provin/i,
  distrito: /distrit/i,
  'posto administrativo': /posto/i,
}

const DIACRITICS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g')

/** Remove acentos antes de testar contra os UNIT_MATCHERS (ex.: "Províncias" → "provincias"),
 * senão um regex ASCII como /provin/ nunca casa com o "í" acentuado do título real. */
function normalizeForMatch(s: string): string {
  return s.normalize('NFD').replace(DIACRITICS_REGEX, '')
}

/** Datasets de fronteiras multi-país (mundo, continente) nunca são a fronteira certa para um
 * coroplético dentro de Moçambique — mesmo estando na categoria "Limites Administrativos". */
function isMultiCountryBoundaryDataset(dataset: any): boolean {
  return /\bmundo\b|pa[ií]ses/i.test(normalizeForMatch(String(dataset?.title || '')))
}

function detectNameProperty(feature: any): string | null {
  const props = feature?.properties
  if (!props || typeof props !== 'object') return null

  const keys = Object.keys(props)
  const preferredKeys = keys.filter((k) => /nome|name|provin|distrit|posto|adm/i.test(k))
  const candidates = [...preferredKeys, ...keys]

  for (const key of candidates) {
    const v = props[key]
    if (typeof v === 'string' && v.trim().length > 0 && Number.isNaN(Number(v))) {
      return key
    }
  }
  return null
}

/** Só polígonos podem representar unidades administrativas — pontos/linhas nunca servem de fronteira. */
function isPolygonGeometry(feature: any): boolean {
  const type = feature?.geometry?.type
  return type === 'Polygon' || type === 'MultiPolygon'
}

/**
 * Um dataset só serve como fonte de fronteiras administrativas se for reconhecido como tal
 * (categoria "Limites Administrativos" ou "minimumUnit" indicando província/distrito/posto).
 * Sem esta verificação, qualquer dataset geoespacial com uma coluna de texto qualquer (ex.:
 * pontos de escolas, cada um com uma província associada) seria indevidamente tratado como se
 * as suas próprias geometrias (milhares de pontos) fossem os polígonos das províncias.
 */
function isRecognizedAdminBoundaryDataset(dataset: any): boolean {
  return (
    /limites administrativos|administrativ/i.test(String(dataset?.category?.name || '')) ||
    /provin|distrit|posto/i.test(normalizeForMatch(String(dataset?.minimumUnit || '')))
  )
}

/**
 * Encontra um dataset geoespacial de "Limites Administrativos" cujo nível
 * (província/distrito/posto) corresponda ao pedido pela IA, e devolve o seu
 * GeoJSON já pronto a cruzar com os valores da análise pelo nome da unidade.
 *
 * Se `preferredDatasetIds` for fornecido (os datasets que o utilizador seleccionou na
 * consulta), tenta primeiro usar um desses — assim, quando o utilizador combina um dataset
 * geoespacial com um alfanumérico, o mapa gerado usa a geometria que ele próprio escolheu em
 * vez de ir sempre buscar o dataset genérico de "Limites Administrativos".
 */
export async function resolveChoroplethBoundary(
  unitType: string,
  preferredDatasetIds: number[] = []
): Promise<ChoroplethBoundary | null> {
  const matcher = UNIT_MATCHERS[unitType.toLowerCase()] || UNIT_MATCHERS.provincia

  if (preferredDatasetIds.length > 0) {
    const preferred = await findDatasetsByIds(preferredDatasetIds)
    const preferredGeo = preferred.filter(
      (d: any) => d.dataType === 'geoespacial' && isRecognizedAdminBoundaryDataset(d)
    )
    for (const dataset of preferredGeo) {
      const preview = await getDatasetPreview(dataset, { maxFeatures: 400 })
      if (!('type' in preview) || preview.type !== 'geo') continue
      const features = Array.isArray(preview.geojson?.features) ? preview.geojson.features : []
      if (features.length === 0) continue
      if (!isPolygonGeometry(features[0])) continue
      const nameProperty = detectNameProperty(features[0])
      if (!nameProperty) continue
      return {
        geojson: preview.geojson,
        nameProperty,
        datasetId: dataset.id,
        datasetTitle: dataset.title,
      }
    }
  }

  const categories = (await findAllCategories()) as any[]
  const candidateCategories = categories.filter(
    (c) => c.dataType === 'geoespacial' && /limites administrativos|administrativ/i.test(c.name)
  )

  for (const category of candidateCategories) {
    const datasets = ((await findDatasets({
      categoryId: category.id,
      dataType: 'geoespacial',
      take: 20,
    })) as any[]).filter((d) => !isMultiCountryBoundaryDataset(d))

    const ranked = [...datasets].sort((a, b) => {
      const aMatch =
        matcher.test(normalizeForMatch(String(a.minimumUnit || ''))) ||
        matcher.test(normalizeForMatch(String(a.title || '')))
      const bMatch =
        matcher.test(normalizeForMatch(String(b.minimumUnit || ''))) ||
        matcher.test(normalizeForMatch(String(b.title || '')))
      return aMatch === bMatch ? 0 : aMatch ? -1 : 1
    })

    for (const dataset of ranked) {
      const preview = await getDatasetPreview(dataset, { maxFeatures: 400 })
      if (!('type' in preview) || preview.type !== 'geo') continue

      const features = Array.isArray(preview.geojson?.features) ? preview.geojson.features : []
      if (features.length === 0) continue
      if (!isPolygonGeometry(features[0])) continue

      const nameProperty = detectNameProperty(features[0])
      if (!nameProperty) continue

      return {
        geojson: preview.geojson,
        nameProperty,
        datasetId: dataset.id,
        datasetTitle: dataset.title,
      }
    }
  }

  return null
}
