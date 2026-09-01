import Link from 'next/link'
import { Compass, Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <section className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center">
        <div className="mx-auto mb-6 inline-flex items-center justify-center size-16 rounded-2xl bg-[#F1F8F4] border border-[#CFE3D6] text-[#064E2C]">
          <Compass className="size-7" aria-hidden />
        </div>
        <p className="text-[13px] font-bold uppercase tracking-widest text-[#064E2C] mb-3">
          Erro 404
        </p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
          Esta página não existe
        </h1>
        <p className="text-[15px] text-gray-600 leading-relaxed mb-8">
          O endereço pode ter mudado ou o conteúdo já não está disponível. Comece de novo pela
          página inicial ou procure directamente o que precisa.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#064E2C] px-5 py-3 text-sm font-bold text-white hover:bg-[#04361F] transition-colors w-full sm:w-auto"
          >
            <Home className="size-4" aria-hidden />
            Voltar ao início
          </Link>
          <Link
            href="/catalogo"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#CFE3D6] bg-[#F1F8F4] px-5 py-3 text-sm font-bold text-[#064E2C] hover:bg-[#E2F0E6] transition-colors w-full sm:w-auto"
          >
            <Search className="size-4" aria-hidden />
            Procurar no catálogo
          </Link>
        </div>
      </div>
    </section>
  )
}
