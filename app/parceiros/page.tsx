import { Handshake } from 'lucide-react'

const PARCEIROS = [
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

export default function ParceirosPage() {
  return (
    <section className="px-4 pt-8 pb-12 sm:pt-10 md:pb-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 rounded-2xl bg-gradient-to-r from-[#064E2C] to-[#04361F] p-6 text-white shadow-xl sm:p-8">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/12 border border-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest mb-3">
            <Handshake className="size-3.5" aria-hidden />
            Parceiros e aliados
          </p>
          <h1 className="text-3xl md:text-4xl font-bold">Alianças para o desenvolvimento</h1>
          <p className="mt-3 text-white/85 max-w-xl">
            Organizações e instituições que tornam o ecossistema de dados abertos de Moçambique
            possível, através de dados, financiamento ou colaboração técnica.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {PARCEIROS.map((p) => (
            <div
              key={p.name}
              className="flex items-center justify-center rounded-2xl border border-[#E2E8E5] bg-white p-6 h-28 hover:border-[#CFE3D6] hover:shadow-sm transition-all"
              title={p.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.src}
                alt={p.name}
                className="max-h-12 max-w-[80%] w-auto object-contain grayscale hover:grayscale-0 transition-all"
              />
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-[13px] text-gray-500">
          Representa uma organização e quer colaborar com o Portal de Dados? Contacte-nos através
          da secção de contactos na página inicial.
        </p>
      </div>
    </section>
  )
}
