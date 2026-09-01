export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin, getCurrentUser } from '@/lib/auth'
import { obterDigesto, temAcesso } from '@/lib/relatorios/persistencia'
import { identificarProvincias } from '@/lib/relatorios/geografia-relatorio'
import { carregarUnidades } from '@/lib/analysis/dados'
import { carregarGeoJSONUnidades } from '@/lib/analysis/geo-render'

/**
 * As províncias que um relatório menciona, com a geometria para desenhar o mapa.
 *
 * Separado do `/digesto` de propósito: a geometria é pesada (um FeatureCollection por província),
 * e só faz sentido ir buscá-la quando a pessoa abre a secção do mapa, não em cada carregamento da
 * página do relatório. A mesma regra de acesso do digesto aplica-se aqui, porque isto é derivado
 * directamente do digesto.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ erro: 'Identificador inválido' }, { status: 400 })

  const sessao = await getCurrentUser()
  const admin = sessao ? await getCurrentAdmin() : null
  const podeVer = !!admin || (sessao ? await temAcesso(id, sessao.userId) : false)
  if (!podeVer) return NextResponse.json({ erro: 'Sem acesso a este relatório' }, { status: 403 })

  const digesto = await obterDigesto(id, 'pt')
  if (!digesto) return NextResponse.json({ unidades: [], geojson: { type: 'FeatureCollection', features: [] } })

  // Os nomes de província aparecem mais em prosa (um achado, uma recomendação) do que nos campos
  // estruturados de geografia: "Zambézia tem o menor acesso..." é um achado, não uma afirmação
  // numérica com "geografia": "Zambézia". Procurar só nos campos estruturados perdia a maioria das
  // províncias que um relatório realmente discute.
  const textos = [
    digesto.o_que_e?.geografia,
    ...(digesto.afirmacoes_numericas || []).map((a: any) => a.geografia),
    ...(digesto.achados || []).map((a: any) => a.texto),
    ...(digesto.recomendacoes || []).map((r: any) => r.texto),
  ]
  const provincias = await carregarUnidades('admin1')
  const mencionadas = identificarProvincias(textos, provincias)

  const geojson = await carregarGeoJSONUnidades(
    'admin1',
    mencionadas.map((p) => p.codigo)
  )

  return NextResponse.json({ unidades: mencionadas, geojson })
}
