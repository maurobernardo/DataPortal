import { notFound } from 'next/navigation'
import Link from 'next/link'
import { obterAnalise } from '@/lib/analysis/persistencia'
import { carregarDatasetsInfo, carregarGeojsonPorNivel, carregarProvincias } from '@/lib/analysis/apresentacao'
import { AnaliseVisualizacoes } from '@/components/analise/AnaliseVisualizacoes'
import '@/app/geo-catalog.css'

export const dynamic = 'force-dynamic'

/**
 * Versão para incorporar (iframe) de uma análise pública (PLANO-INTELIGENCIA-PORTAL.md): sem
 * navegação do portal, sem exigir sessão iniciada (ao contrário de /analise/[id], pensada para
 * quem já está autenticado) — só verifica que a análise foi mesmo marcada como pública. A
 * atribuição no rodapé é sempre visível, nunca opcional, para quem vir isto embutido num artigo
 * saber de onde veio.
 */
export default async function EmbedAnalisePage({ params }: { params: { id: string } }) {
  const analise = await obterAnalise(params.id)
  if (!analise || !analise.publico || analise.estado !== 'pronto' || !analise.narrativa?.resolvida) {
    notFound()
  }

  const n = analise.narrativa!.resolvida
  const series = analise.resultados?.series || []
  const graficos = analise.resultados?.graficos || []
  const destaques = analise.resultados?.destaques || []
  const camadasBrutas = analise.resultados?.camadasBrutas || []
  const calcs = analise.resultados?.calcs || {}

  const [geojsonPorNivel, provincias] = await Promise.all([
    carregarGeojsonPorNivel(series),
    series.length > 0 ? carregarProvincias().catch(() => []) : Promise.resolve([]),
  ])

  const temMapaOuGraficos = destaques.length > 0 || series.length > 0 || camadasBrutas.length > 0 || graficos.length > 0

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full px-4 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#064E2C] mb-2">
          Data Portal · dataportal.co.mz
        </p>
        <h1 className="text-lg md:text-xl font-extrabold leading-tight text-gray-900 mb-3">{n.titulo}</h1>

        <p className={temMapaOuGraficos ? 'text-[14px] leading-relaxed text-gray-800 mb-4' : 'text-[16px] font-medium leading-snug text-gray-900 border-l-4 border-[#064E2C] pl-4 mb-4'}>
          {n.resposta_directa}
        </p>

        <AnaliseVisualizacoes
          numerosChave={n.numeros_chave || []}
          calcs={calcs}
          graficos={graficos}
          destaques={destaques}
          camadasBrutas={camadasBrutas}
          series={series}
          geojsonPorNivel={geojsonPorNivel}
          provincias={provincias}
          temMapaOuGraficos={temMapaOuGraficos}
        />

        <p className="text-center text-[11px] text-gray-400 mt-5 pt-3 border-t border-gray-100">
          Fonte:{' '}
          <Link
            href={`/analise/${analise.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#064E2C] font-semibold hover:underline"
          >
            Data Portal
          </Link>
          {' '}· pergunta original: "{analise.pergunta}"
        </p>
      </div>
    </div>
  )
}
