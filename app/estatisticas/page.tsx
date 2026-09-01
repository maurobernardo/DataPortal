import { BarChart3, Database, Download, Eye, FileText, MapPinned } from 'lucide-react'
import { db, countDatasets } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function getEstatisticas() {
  const [
    total,
    [totaisRows],
    [porCategoria],
    [porFonte],
    [maisVistos],
    [contadores],
  ] = await Promise.all([
    countDatasets(),
    db.execute(
      'SELECT COALESCE(SUM(views),0) as views, COALESCE(SUM(downloads),0) as downloads FROM Dataset'
    ) as any,
    db.execute(
      `SELECT c.name as categoria, COUNT(d.id) as total
       FROM Dataset d JOIN Category c ON d.categoryId = c.id
       GROUP BY c.name ORDER BY total DESC LIMIT 8`
    ) as any,
    db.execute(
      `SELECT source as fonte, COUNT(*) as total
       FROM Dataset WHERE source IS NOT NULL AND source != ''
       GROUP BY source ORDER BY total DESC LIMIT 8`
    ) as any,
    db.execute(
      `SELECT id, title, dataType, views, downloads
       FROM Dataset ORDER BY views DESC LIMIT 8`
    ) as any,
    db.execute(
      `SELECT
         (SELECT COUNT(*) FROM Report) as relatorios,
         (SELECT COUNT(DISTINCT source) FROM Dataset WHERE source IS NOT NULL AND source != '') as organizacoes`
    ) as any,
  ])

  return {
    total,
    views: Number(totaisRows[0]?.views || 0),
    downloads: Number(totaisRows[0]?.downloads || 0),
    porCategoria: porCategoria as { categoria: string; total: number }[],
    porFonte: porFonte as { fonte: string; total: number }[],
    maisVistos: maisVistos as { id: number; title: string; dataType: string; views: number; downloads: number }[],
    relatorios: Number(contadores[0]?.relatorios || 0),
    organizacoes: Number(contadores[0]?.organizacoes || 0),
  }
}

function Barra({ label, valor, max }: { label: string; valor: number; max: number }) {
  const pct = max > 0 ? Math.max(4, Math.round((valor / max) * 100)) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 text-[13px] text-gray-700 truncate" title={label}>
        {label}
      </span>
      <div className="flex-1 h-2.5 rounded-full bg-[#F0F2F1] overflow-hidden">
        <div className="h-full rounded-full bg-[#064E2C]" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 shrink-0 text-right text-[13px] font-bold tabular-nums text-gray-900">
        {valor.toLocaleString('pt-PT')}
      </span>
    </div>
  )
}

export default async function EstatisticasPage() {
  const stats = await getEstatisticas()
  const maxCategoria = Math.max(1, ...stats.porCategoria.map((c) => c.total))
  const maxFonte = Math.max(1, ...stats.porFonte.map((f) => f.total))

  const kpis = [
    { icon: Database, label: 'Datasets publicados', valor: stats.total },
    { icon: Eye, label: 'Visualizações acumuladas', valor: stats.views },
    { icon: Download, label: 'Downloads acumulados', valor: stats.downloads },
    { icon: FileText, label: 'Relatórios publicados', valor: stats.relatorios },
    { icon: MapPinned, label: 'Organizações-fonte', valor: stats.organizacoes },
  ]

  return (
    <section className="px-4 pt-8 pb-12 sm:pt-10 md:pb-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-[#064E2C] to-[#04361F] p-6 text-white shadow-xl sm:p-8">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/12 border border-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest mb-3">
            <BarChart3 className="size-3.5" aria-hidden />
            Estatísticas do portal
          </p>
          <h1 className="text-3xl md:text-4xl font-bold">O portal em números</h1>
          <p className="mt-3 text-white/85 max-w-xl">
            Números reais, calculados directamente da base de dados do portal, actualizados a cada
            visita a esta página.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {kpis.map(({ icon: Icon, label, valor }) => (
            <div key={label} className="rounded-2xl border border-[#E2E8E5] bg-white p-4">
              <Icon className="size-4 text-[#064E2C] mb-2" aria-hidden />
              <p className="text-2xl font-extrabold text-gray-900 tabular-nums">{valor.toLocaleString('pt-PT')}</p>
              <p className="text-[11.5px] text-gray-500 leading-snug mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-[#E2E8E5] bg-white p-5">
            <h2 className="text-base font-bold text-gray-900 mb-4">Datasets por categoria</h2>
            <div className="space-y-3">
              {stats.porCategoria.map((c) => (
                <Barra key={c.categoria} label={c.categoria} valor={c.total} max={maxCategoria} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8E5] bg-white p-5">
            <h2 className="text-base font-bold text-gray-900 mb-4">Principais fontes de dados</h2>
            <div className="space-y-3">
              {stats.porFonte.map((f) => (
                <Barra key={f.fonte} label={f.fonte} valor={f.total} max={maxFonte} />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E2E8E5] bg-white p-5 mt-5">
          <h2 className="text-base font-bold text-gray-900 mb-4">Datasets mais consultados</h2>
          <div className="divide-y divide-[#F0F2F1]">
            {stats.maisVistos.map((d, i) => (
              <a
                key={d.id}
                href={`/dataset/${d.id}`}
                className="flex items-center gap-3 py-2.5 hover:bg-[#FAFBFA] -mx-2 px-2 rounded-lg transition-colors"
              >
                <span className="w-6 shrink-0 text-[13px] font-extrabold text-gray-400 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 min-w-0 text-[13.5px] font-semibold text-gray-800 truncate">{d.title}</span>
                <span className="shrink-0 text-[12px] text-gray-500 tabular-nums">
                  {d.views.toLocaleString('pt-PT')} vistas · {d.downloads.toLocaleString('pt-PT')} downloads
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
