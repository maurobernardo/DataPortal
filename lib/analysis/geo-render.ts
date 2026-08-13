import { db } from '@/lib/db'
import type { NivelAdmin } from './dados'

export type FeatureColecaoUnidades = {
  type: 'FeatureCollection'
  features: {
    type: 'Feature'
    properties: { codigo: string; nome: string }
    geometry: any
  }[]
}

/**
 * Geometrias das unidades administrativas para o mapa coroplético (Parte 10).
 *
 * Ao contrário do mapa antigo de AI Insights, que casava geometria com valor por NOME (com
 * normalização difusa), aqui a ligação já é por código exacto: as séries do motor vêm de
 * geo_unidades, por isso o casamento no cliente é uma comparação de string directa, sem margem
 * para o erro de nomes ambíguos que já apareceu nesta base (Maputo Cidade vs Maputo Província).
 */
export async function carregarGeoJSONUnidades(
  nivel: NivelAdmin,
  codigos: string[]
): Promise<FeatureColecaoUnidades> {
  if (codigos.length === 0) return { type: 'FeatureCollection', features: [] }

  const [rows] = (await db.execute(
    `SELECT codigo, nome, ST_AsGeoJSON(geometria) AS geo FROM geo_unidades
     WHERE nivel = ? AND codigo IN (${codigos.map(() => '?').join(',')})`,
    [nivel, ...codigos]
  )) as [any[], unknown]

  const features = []
  for (const r of rows) {
    try {
      features.push({
        type: 'Feature' as const,
        properties: { codigo: String(r.codigo), nome: String(r.nome) },
        geometry: JSON.parse(r.geo),
      })
    } catch {
      // Geometria ilegível: a unidade fica de fora do mapa mas continua na lista/ranking.
    }
  }

  return { type: 'FeatureCollection', features }
}
