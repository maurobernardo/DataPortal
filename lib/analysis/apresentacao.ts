import { findDatasetById } from '@/lib/db'
import { carregarGeoJSONUnidades } from './geo-render'
import { carregarUnidades, type NivelAdmin } from './dados'

/**
 * Carregamento de dados de apresentação partilhado entre a página de detalhe (/analise/[id]) e o
 * dashboard (/analise/[id]/dashboard): as duas mostram a mesma análise, só que com densidade e
 * layout diferentes — não faz sentido duplicar a lógica de ir buscar metadados de dataset e
 * geometria uma segunda vez por cada página nova.
 */

export type DatasetInfoApresentacao = {
  id: number
  titulo: string
  descricao: string | null
  fonte: string | null
  categoria: string | null
  ano: number | null
  formato: string | null
  tamanhoFicheiro: string | null
  cobertura: string | null
  unidadeMinima: string | null
  numRegistos: number | null
  criadoEm: string | null
  actualizadoEm: string | null
  dataType: string | null
}

export async function carregarDatasetsInfo(
  datasetIds: number[],
  camadasBrutas: any[]
): Promise<DatasetInfoApresentacao[]> {
  const info = await Promise.all(
    (datasetIds || []).map(async (id) => {
      const d = await findDatasetById(id)
      if (!d) return null
      const camada = camadasBrutas.find((c: any) => c.dataset_id === id)
      return {
        id: d.id,
        titulo: d.title,
        descricao: d.description,
        fonte: d.source,
        categoria: d.category?.name || null,
        ano: d.year,
        formato: d.format,
        tamanhoFicheiro: d.fileSize,
        cobertura: d.coverage,
        unidadeMinima: d.minimumUnit,
        numRegistos: camada ? camada.features.length : null,
        criadoEm: d.createdAt,
        actualizadoEm: d.updatedAt,
        dataType: d.dataType,
      }
    })
  )
  return info.filter((d): d is NonNullable<typeof d> => d !== null)
}

/** Nomes de província por código — permite filtrar o mapa por província mesmo quando a série está
 *  a um nível mais fino (distrito/posto), truncando o pcode para os primeiros 2 dígitos. */
export async function carregarProvincias(): Promise<{ codigo: string; nome: string }[]> {
  const unidades = await carregarUnidades('admin1')
  return unidades.map((u) => ({ codigo: u.codigo, nome: u.nome }))
}

export async function carregarGeojsonPorNivel(series: any[]): Promise<Record<string, any>> {
  const niveisDistintos = Array.from(new Set(series.map((s: any) => s.nivel))) as NivelAdmin[]
  return Object.fromEntries(
    await Promise.all(
      niveisDistintos.map(async (nivel) => {
        const codigos = series
          .filter((s: any) => s.nivel === nivel)
          .flatMap((s: any) => s.unidades.map((u: any) => u.codigo))
        return [nivel, await carregarGeoJSONUnidades(nivel, Array.from(new Set(codigos)))]
      })
    )
  )
}
