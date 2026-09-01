'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPinned, ChevronDown, ChevronUp } from 'lucide-react'

type CoberturaProvincia = { provincia: string; total: number }

/**
 * Mapa de calor de cobertura por província (PLANO-INTELIGENCIA-PORTAL.md): mostra de imediato onde
 * o catálogo geoespacial tem mais ou menos camadas, para o utilizador perceber os limites dos dados
 * antes de procurar, e para ligar directo à Fase 5 (sugestões de tipos de dataset por categoria)
 * quando quem está a ver tem acesso ao admin.
 */
export function MapaCoberturaProvincias({
  porProvincia,
  datasetsSemCoberturaIdentificada,
}: {
  porProvincia: CoberturaProvincia[]
  datasetsSemCoberturaIdentificada: number
}) {
  const [aberto, setAberto] = useState(false)
  const maximo = Math.max(1, ...porProvincia.map((p) => p.total))

  function corIntensidade(total: number): string {
    if (total === 0) return '#F3F5F4'
    const intensidade = total / maximo
    if (intensidade > 0.66) return '#064E2C'
    if (intensidade > 0.33) return '#3E8F63'
    return '#B7DCC4'
  }

  return (
    <div className="geo-coverage-heatmap">
      <button
        type="button"
        className="geo-coverage-heatmap-toggle"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
      >
        <MapPinned className="size-4" aria-hidden />
        Cobertura geográfica do catálogo por província
        {aberto ? <ChevronUp className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
      </button>

      {aberto && (
        <div className="geo-coverage-heatmap-body">
          <p className="geo-coverage-heatmap-hint">
            Número de camadas geoespaciais cuja cobertura inclui cada província. Ajuda a perceber onde o portal
            ainda tem poucos dados antes de procurar.
          </p>
          <ul className="geo-coverage-heatmap-list">
            {porProvincia.map((p) => (
              <li key={p.provincia} className="geo-coverage-heatmap-row">
                <span className="geo-coverage-heatmap-label">{p.provincia}</span>
                <span className="geo-coverage-heatmap-bar-track">
                  <span
                    className="geo-coverage-heatmap-bar-fill"
                    style={{
                      width: `${Math.max(4, (p.total / maximo) * 100)}%`,
                      backgroundColor: corIntensidade(p.total),
                    }}
                  />
                </span>
                <span className="geo-coverage-heatmap-count">{p.total}</span>
              </li>
            ))}
          </ul>
          {datasetsSemCoberturaIdentificada > 0 && (
            <p className="geo-coverage-heatmap-note">
              {datasetsSemCoberturaIdentificada} camada(s) sem província identificável no texto de cobertura.
            </p>
          )}
          <Link href="/admin/sugestoes-datasets" className="geo-coverage-heatmap-link">
            Ver sugestões para preencher lacunas de cobertura (acesso administrativo)
          </Link>
        </div>
      )}
    </div>
  )
}
