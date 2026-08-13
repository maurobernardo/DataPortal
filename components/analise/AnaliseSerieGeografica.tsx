'use client'

import { useState } from 'react'
import { Map as MapIcon, List } from 'lucide-react'
import { AnaliseMapaCoropletico } from './AnaliseMapaCoropletico'

type Serie = {
  passo_id: string
  nivel: 'admin1' | 'admin2' | 'admin3'
  unidades: { codigo: string; nome: string; valor: number; categoria?: string }[]
  metrica: string
  normalizacao: string
  modo?: 'continuo' | 'categorico'
}

type FeatureColecao = {
  type: 'FeatureCollection'
  features: { type: 'Feature'; properties: { codigo: string; nome: string }; geometry: any }[]
}

const ROTULO_NIVEL: Record<string, string> = {
  admin1: 'Província',
  admin2: 'Distrito',
  admin3: 'Posto administrativo',
}

const ROTULO_NORMALIZACAO: Record<string, string> = {
  nenhuma: 'valores absolutos',
  densidade_km2: 'por 1 000 km²',
  per_capita: 'por habitante',
  por_1000: 'por 1 000 habitantes',
  percentagem_do_total: '% do total',
}

function formatar(v: number): string {
  const casas = Number.isInteger(v) ? 0 : Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2
  return v.toLocaleString('pt-PT', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

/**
 * Ranking com barra de fundo por unidade administrativa.
 *
 * Escolhe-se ranking em vez de coroplético porque as séries chegam já normalizadas mas sem
 * geometria anexada: mostrar uma barra ordenada com o valor é honesto, enquanto um mapa exigiria
 * carregar polígonos que esta vista ainda não tem.
 */
export function AnaliseSerieGeografica({
  series,
  geojsonPorNivel,
  unidadeDestacada,
}: {
  series: Serie[]
  geojsonPorNivel?: Partial<Record<string, FeatureColecao>>
  unidadeDestacada?: string | null
}) {
  // Uma análise que desce três níveis produz várias séries: mostrar todas de uma vez seria
  // ruído, por isso o utilizador escolhe o nível, que é também o drill-down do R4.
  const comDados = series.filter((s) => s.unidades && s.unidades.length > 0)

  // R4 diz para descer ao nível mais fino disponível — mas escolher sempre o separador 0 (a
  // primeira série gerada, normalmente província) ignorava isso: uma pergunta sobre um distrito
  // específico abria sempre no nível nacional/provincial, o menos relevante para o que foi
  // perguntado. Por omissão, abre no nível mais fino que a análise conseguiu calcular.
  const ORDEM_FINURA: Record<string, number> = { admin3: 3, admin2: 2, admin1: 1 }
  const indiceMaisFino = comDados.reduce(
    (melhor, s, i) => ((ORDEM_FINURA[s.nivel] || 0) > (ORDEM_FINURA[comDados[melhor]?.nivel] || 0) ? i : melhor),
    0
  )

  // Todos os hooks antes de qualquer return condicional: um useState depois de um early return
  // muda a ordem dos hooks entre renders e parte o componente.
  const [activa, setActiva] = useState(indiceMaisFino)
  const [expandido, setExpandido] = useState(false)
  const [vista, setVista] = useState<'mapa' | 'lista'>('mapa')

  if (comDados.length === 0) return null

  const serie = comDados[Math.min(activa, comDados.length - 1)]
  const ordenadas = [...serie.unidades].sort((a, b) => b.valor - a.valor)
  const maximo = ordenadas[0]?.valor || 1
  const visiveis = expandido ? ordenadas : ordenadas.slice(0, 12)
  const geojsonDaSerie = geojsonPorNivel?.[serie.nivel]
  const temMapa = !!geojsonDaSerie && geojsonDaSerie.features.length > 0
  const mostrarMapa = temMapa && vista === 'mapa'

  return (
    <section className="rounded-[14px] border border-[#E2E8E5] bg-white p-6">
      <h2 className="text-base font-bold text-[var(--pd-ink-900)] mb-1">
        {ROTULO_NIVEL[serie.nivel] || serie.nivel}: {serie.metrica}
      </h2>
      <p className="text-[12px] text-gray-500 mb-4">
        {ordenadas.length} unidades · {ROTULO_NORMALIZACAO[serie.normalizacao] || serie.normalizacao}
      </p>

      {comDados.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {comDados.map((s, i) => (
            <button
              key={s.passo_id}
              type="button"
              onClick={() => {
                setActiva(i)
                setExpandido(false)
              }}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C] ${
                i === activa
                  ? 'bg-[#064E2C] text-white border-[#064E2C]'
                  : 'bg-white text-[var(--pd-ink-700)] border-[#E2E8E5] hover:border-[#CFE3D6]'
              }`}
            >
              {ROTULO_NIVEL[s.nivel] || s.nivel} · {s.unidades.length}
            </button>
          ))}
        </div>
      )}

      {temMapa && (
        <div className="inline-flex rounded-lg border border-[#E2E8E5] p-0.5 mb-4">
          <button
            type="button"
            onClick={() => setVista('mapa')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C] ${
              vista === 'mapa' ? 'bg-[#064E2C] text-white' : 'text-[var(--pd-ink-700)] hover:bg-gray-50'
            }`}
          >
            <MapIcon className="size-3.5" aria-hidden />
            Mapa
          </button>
          <button
            type="button"
            onClick={() => setVista('lista')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C] ${
              vista === 'lista' ? 'bg-[#064E2C] text-white' : 'text-[var(--pd-ink-700)] hover:bg-gray-50'
            }`}
          >
            <List className="size-3.5" aria-hidden />
            Lista
          </button>
        </div>
      )}

      {mostrarMapa ? (
        <AnaliseMapaCoropletico
          geojson={geojsonDaSerie!}
          unidades={serie.unidades}
          metrica={serie.metrica}
          modo={serie.modo}
          unidadeDestacada={unidadeDestacada}
        />
      ) : (
        <ol className="space-y-1.5">
          {visiveis.map((u, i) => (
            <li key={u.codigo} className="relative">
              <div
                className="absolute inset-y-0 left-0 rounded bg-[#E7F3EB]"
                style={{ width: `${Math.max(2, (u.valor / maximo) * 100)}%` }}
                aria-hidden
              />
              <div className="relative flex items-center justify-between gap-3 px-2.5 py-1.5">
                <span className="text-[13px] text-[var(--pd-ink-800)] truncate">
                  <span className="text-gray-400 tabular-nums mr-2">{i + 1}</span>
                  {u.nome}
                </span>
                <span className="text-[13px] font-bold text-[#064E2C] tabular-nums shrink-0">
                  {formatar(u.valor)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}

      {!mostrarMapa && ordenadas.length > 12 && (
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="mt-3 text-[12px] font-semibold text-[#064E2C] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C] rounded"
        >
          {expandido ? 'Mostrar menos' : `Ver as ${ordenadas.length} unidades`}
        </button>
      )}
    </section>
  )
}
