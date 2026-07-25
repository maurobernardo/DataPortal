'use client'

const partners = [
  { name: 'Angola', src: '/images/parceiros/angola.png' },
  { name: 'African', src: '/images/parceiros/african.png' },
  { name: 'Governo', src: '/images/parceiros/governo.png' },
  { name: 'Dorcas', src: '/images/parceiros/dorcas.png' },
  { name: 'CAE', src: '/images/parceiros/cae.png' },
  { name: 'Ripple', src: '/images/parceiros/ripple.png' },
  { name: 'Women', src: '/images/parceiros/women.png' },
  { name: 'Digital', src: '/images/parceiros/digital.png' },
  { name: 'D4D', src: '/images/parceiros/d4d.png' },
  { name: 'GHG', src: '/images/parceiros/ghg.png' },
  { name: 'Esri', src: '/images/parceiros/esri.png' },
  { name: 'Move', src: '/images/parceiros/move.png' },
  { name: 'We', src: '/images/parceiros/we.png' },
  { name: 'Remo', src: '/images/parceiros/remo.png' },
  { name: 'ITC', src: '/images/parceiros/itc.png' },
  { name: 'Fly', src: '/images/parceiros/fly.png' },
]

// Duplicated three times for seamless infinite loop
const track = [...partners, ...partners, ...partners]

export function PartnersCarouselSection() {
  return (
    <section className="font-body-stack py-14 md:py-20 bg-white relative overflow-hidden border-t border-[#E2E8E5]">
      {/* Subtle top/bottom divider lines */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#CFE3D6] to-transparent" />
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#CFE3D6] to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F1F8F4] border border-[#CFE3D6] px-4 py-1.5 mb-4">
              <span className="w-2 h-2 rounded-full bg-[#064E2C]" />
              <span className="text-[11px] font-bold tracking-widest uppercase text-[#064E2C]">
                Parceiros &amp; Aliados
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-[36px] font-extrabold text-gray-900 leading-tight tracking-tight">
              Alianças para o{' '}
              <span className="text-[#064E2C]">desenvolvimento</span>
            </h2>
          </div>
          <p className="text-[15px] text-gray-600 max-w-md sm:max-w-xs sm:text-right leading-relaxed">
            Organizações e instituições que tornam o ecossistema de dados possível.
          </p>
        </div>

        {/* Carousel track */}
        <div className="relative">
          {/* Left fade mask */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 md:w-32 z-10 bg-gradient-to-r from-white to-transparent" />
          {/* Right fade mask */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 md:w-32 z-10 bg-gradient-to-l from-white to-transparent" />

          {/* Outer container: border + bg */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-[#fafaf9] py-6">
            {/* Row 1 — scrolls left */}
            <div className="partners-track-row partners-scroll-left mb-4">
              {track.map((p, i) => (
                <PartnerLogo key={`a-${i}`} name={p.name} src={p.src} />
              ))}
            </div>
            {/* Row 2 — scrolls right (reverse), creates depth */}
            <div className="partners-track-row partners-scroll-right">
              {[...track].reverse().map((p, i) => (
                <PartnerLogo key={`b-${i}`} name={p.name} src={p.src} />
              ))}
            </div>
          </div>
        </div>

        {/* Footer count pill */}
        <div className="mt-6 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-xs text-gray-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#064E2C]" />
            {partners.length} parceiros e aliados activos
          </div>
        </div>

      </div>

      {/* Keyframe + track styles injected via a style tag (no Tailwind JIT needed) */}
      <style>{`
        @keyframes scrollLeft {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes scrollRight {
          0%   { transform: translateX(-33.333%); }
          100% { transform: translateX(0); }
        }
        .partners-track-row {
          display: flex;
          width: max-content;
          gap: 0;
        }
        .partners-scroll-left {
          animation: scrollLeft 38s linear infinite;
        }
        .partners-scroll-right {
          animation: scrollRight 44s linear infinite;
        }
        .partners-track-row:hover {
          animation-play-state: paused;
        }
        .partner-logo-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 148px;
          height: 68px;
          flex-shrink: 0;
          margin: 0 12px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
          cursor: default;
        }
        .partner-logo-wrap:hover {
          border-color: #CFE3D6;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(6, 78, 44, 0.1);
        }
        .partner-logo-wrap img {
          max-height: 44px;
          max-width: 110px;
          width: auto;
          object-fit: contain;
          filter: grayscale(30%);
          transition: filter 0.2s;
          user-select: none;
          pointer-events: none;
        }
        .partner-logo-wrap:hover img {
          filter: grayscale(0%);
        }
      `}</style>
    </section>
  )
}

function PartnerLogo({ name, src }: { name: string; src: string }) {
  return (
    <div className="partner-logo-wrap" title={name}>
      <img src={src} alt={name} loading="eager" draggable={false} />
    </div>
  )
}