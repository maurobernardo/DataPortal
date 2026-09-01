/** Skeleton do preview de mapa: grelha + auréola a imitar a forma real do mapa (fundo escuro,
 *  linhas de grelha, um "traçado" a brilhar), em vez de um spinner solto sobre um rectângulo
 *  vazio — mantém a forma do que vai aparecer, sente-se mais rápido. */
export function GeoMapSkeleton() {
  return (
    <div className="geo-map-placeholder absolute inset-0 z-10 overflow-hidden" aria-label="A carregar mapa">
      <svg className="w-full h-full opacity-40" viewBox="0 0 200 140" preserveAspectRatio="none" aria-hidden>
        <g stroke="rgba(255,255,255,.14)" strokeWidth="1">
          {[...Array(8)].map((_, i) => (
            <line key={`v${i}`} x1={i * 25} y1={0} x2={i * 25} y2={140} />
          ))}
          {[...Array(6)].map((_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 25} x2={200} y2={i * 25} />
          ))}
        </g>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="pd-skeleton-dark w-2/3 h-2/3 rounded-xl" />
      </div>
    </div>
  )
}
