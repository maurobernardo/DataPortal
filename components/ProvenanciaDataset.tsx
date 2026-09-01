'use client'

import { useEffect, useState } from 'react'
import { BadgeCheck, Clock, History, ShieldQuestion } from 'lucide-react'

type VersaoPublica = {
  versaoId: number
  criadoEm: string
  titulo: string
  ano: number | null
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Ficha de proveniência pública (PLANO-INTELIGENCIA-PORTAL.md): antes só o admin via quando um
 * dataset tinha sido criado/editado (DatasetVersao era só do painel admin); isto expõe a mesma
 * informação, sem o "quem editou", a qualquer visitante do detalhe do dataset, para dar confiança
 * sobre a idade e o historial real dos dados antes de os usar.
 */
export function ProvenanciaDataset({
  datasetId,
  criadoEm,
  actualizadoEm,
  certificacao,
}: {
  datasetId: number
  criadoEm: string | null
  actualizadoEm: string | null
  certificacao?: string | null
}) {
  const [versoes, setVersoes] = useState<VersaoPublica[] | null>(null)
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    let vivo = true
    fetch(`/api/datasets/${datasetId}/provenancia`)
      .then((r) => r.json())
      .then((data) => {
        if (vivo) setVersoes(Array.isArray(data?.versoes) ? data.versoes : [])
      })
      .catch(() => vivo && setVersoes([]))
    return () => {
      vivo = false
    }
  }, [datasetId])

  const temHistorico = (versoes?.length ?? 0) > 0

  return (
    <section className="geo-detail-provenance">
      <h2 className="geo-detail-section-title">
        <span className="geo-detail-section-icon">
          <History className="size-5" aria-hidden />
        </span>
        Proveniência
      </h2>

      <div className="geo-detail-provenance-summary">
        {criadoEm && (
          <div className="geo-detail-provenance-item">
            <Clock className="size-4" aria-hidden />
            <span>Publicado em <strong>{formatarData(criadoEm)}</strong></span>
          </div>
        )}
        {actualizadoEm && (
          <div className="geo-detail-provenance-item">
            <Clock className="size-4" aria-hidden />
            <span>Última actualização em <strong>{formatarData(actualizadoEm)}</strong></span>
          </div>
        )}
        <div className="geo-detail-provenance-item">
          {certificacao === 'fonte_oficial_confirmada' ? (
            <>
              <BadgeCheck className="size-4 text-[var(--pd-green-700)]" aria-hidden />
              <span>Fonte oficial confirmada pela equipa do portal</span>
            </>
          ) : (
            <>
              <ShieldQuestion className="size-4 text-[var(--pd-ink-400)]" aria-hidden />
              <span>Fonte ainda não verificada pela equipa do portal</span>
            </>
          )}
        </div>
      </div>

      {temHistorico && (
        <div className="geo-detail-provenance-history">
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="geo-detail-provenance-toggle"
            aria-expanded={aberto}
          >
            {aberto ? 'Ocultar' : 'Ver'} histórico de alterações ({versoes!.length})
          </button>
          {aberto && (
            <ul className="geo-detail-provenance-timeline">
              {versoes!.map((v) => (
                <li key={v.versaoId}>
                  <span className="geo-detail-provenance-timeline-date">{formatarData(v.criadoEm)}</span>
                  <span className="geo-detail-provenance-timeline-desc">
                    "{v.titulo}"{v.ano ? ` · ${v.ano}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
