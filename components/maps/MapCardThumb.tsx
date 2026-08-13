import type { PreviewMapa } from '@/lib/maps-preview-data'

/**
 * Miniatura real do card do catálogo — pontos reais do próprio dataset projectados num SVG,
 * substituindo o ícone decorativo genérico (o mesmo em todos os cards, sem ligação ao conteúdo).
 * Sem prévia disponível para o tipo de mapa, mostra um fundo neutro consistente — nunca volta ao
 * ícone genérico nem inventa uma imagem.
 */
export function MapCardThumb({ preview }: { preview: PreviewMapa | null | undefined }) {
  if (!preview || preview.pontos.length === 0) {
    return <div className="mp-card-thumb-fallback" aria-hidden />
  }

  return (
    <svg
      className="mp-card-thumb-svg"
      viewBox="0 0 100 80"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Distribuição real de ${preview.pontos.length} unidades, coloridas por ${preview.rotuloCamada}`}
    >
      <rect width="100" height="80" fill="#04361f" />
      {preview.pontos.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.3} fill={preview.legenda[p.corIndice]?.cor ?? '#4FAE75'} opacity={0.92} />
      ))}
    </svg>
  )
}
