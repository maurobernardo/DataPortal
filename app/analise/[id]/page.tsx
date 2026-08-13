import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, History, Info, LayoutDashboard, ShieldAlert, Users } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { obterAnalise, listarAnalisesRelacionadas } from '@/lib/analysis/persistencia'
import { procurarAnaliseAnteriorSemelhante } from '@/lib/analysis/memoria'
import { carregarDatasetsInfo, carregarGeojsonPorNivel } from '@/lib/analysis/apresentacao'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { AnaliseSerieGeografica } from '@/components/analise/AnaliseSerieGeografica'
import { AnaliseMapaDestaque } from '@/components/analise/AnaliseMapaDestaque'
import { AnaliseMapaPontos } from '@/components/analise/AnaliseMapaPontos'
import { AnaliseGrafico } from '@/components/analise/AnaliseGrafico'
import { FaixaKPIs } from '@/components/analise/FaixaKPIs'
import { MetadadosDataset } from '@/components/analise/MetadadosDataset'
import { QualidadeDados } from '@/components/analise/QualidadeDados'
import { PerguntasSugeridas } from '@/components/analise/PerguntasSugeridas'
import { CodigoExecutado } from '@/components/analise/CodigoExecutado'
import { PartilharBotao } from '@/components/analise/PartilharBotao'
import { TabelaExploratoria } from '@/components/analise/TabelaExploratoria'
import { getSuggestedQuestions } from '@/lib/ai-suggested-questions'
import '@/app/geo-catalog.css'

export const dynamic = 'force-dynamic'

const CORES_SEVERIDADE: Record<string, string> = {
  critico: '#B91C1C',
  alto: '#C2410C',
  medio: '#A16207',
  informativo: '#064E2C',
}

export default async function PaginaAnalise({ params }: { params: { id: string } }) {
  const sessao = await getCurrentUser()
  if (!sessao) redirect(`/login?next=/analise/${params.id}`)

  const analise = await obterAnalise(params.id)
  if (!analise) notFound()

  // Uma análise é privada de quem a pediu enquanto não for marcada como pública.
  if (!analise.publico && analise.utilizador_id !== sessao.userId) {
    redirect('/analise/nova')
  }

  if (analise.estado === 'erro' || !analise.narrativa?.resolvida) {
    const mensagem = analise.narrativa?.erro
    const critica = analise.narrativa?.critica
    const fatais = (critica?.objeccoes || []).filter((o: any) => o.gravidade === 'FATAL')

    return (
      <div className="geo-detail-page">
        <div className="geo-detail-inner max-w-3xl">
          <Breadcrumbs items={[{ label: 'AI Insights', href: '/analise/nova' }, { label: 'Análise' }]} />
          <div className="geo-detail-card p-8">
            <div className="flex items-center gap-2 mb-4 text-[#B91C1C]">
              <ShieldAlert className="size-5" aria-hidden />
              <h1 className="text-xl font-bold">Esta análise não foi publicada</h1>
            </div>
            <p className="text-sm text-[var(--pd-ink-700)] leading-relaxed mb-4">
              Pergunta: <strong>{analise.pergunta}</strong>
            </p>
            {fatais.length > 0 ? (
              <>
                <p className="text-sm text-[var(--pd-ink-700)] mb-3">
                  A revisão automática encontrou problemas que impedem a publicação. É deliberado:
                  o portal prefere não responder a responder com um número que não se sustenta.
                </p>
                <ul className="space-y-2">
                  {fatais.map((o: any, i: number) => (
                    <li key={i} className="text-[13px] leading-relaxed border-l-4 border-[#B91C1C] pl-3 py-1">
                      {o.descricao}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-[var(--pd-ink-500)]">{mensagem || 'A análise falhou.'}</p>
            )}
            <Link href="/analise/nova" className="geo-detail-btn-primary mt-6 inline-flex">
              Voltar e reformular
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const n = analise.narrativa.resolvida
  const critica = analise.narrativa.critica
  const series = analise.resultados?.series || []
  const graficos = analise.resultados?.graficos || []
  const destaques = analise.resultados?.destaques || []
  const camadasBrutas = analise.resultados?.camadasBrutas || []
  const qualidade = analise.resultados?.qualidade || []
  const avisos: string[] = analise.resultados?.avisos || []
  const achados = analise.achados || []
  const calcs = analise.resultados?.calcs || {}
  const codigoExecutado = analise.resultados?.codigoExecutado || []
  const nCalcs = Object.keys(calcs).length

  const [datasetsInfo, geojsonPorNivel, analiseAnterior, relacionadas] = await Promise.all([
    carregarDatasetsInfo(analise.datasets_ids || [], camadasBrutas),
    carregarGeojsonPorNivel(series),
    // Best-effort: "desde a última vez" e "outros também perguntaram" são enriquecimento, não
    // requisitos para a página funcionar — uma falha aqui não pode impedir a análise de aparecer.
    analise.utilizador_id
      ? procurarAnaliseAnteriorSemelhante(analise.utilizador_id, analise.datasets_ids || [], analise.pergunta, analise.id).catch(() => null)
      : Promise.resolve(null),
    listarAnalisesRelacionadas(analise.datasets_ids || [], analise.id).catch(() => []),
  ])

  const perguntasSugeridas = getSuggestedQuestions(
    datasetsInfo.map((d) => ({ title: d.titulo, category: d.categoria ? { name: d.categoria } : null, dataType: d.dataType, year: d.ano }))
  )
  const datasetIdsParaNovaAnalise = datasetsInfo.map((d) => d.id).join(',')

  const temMapaOuGraficos = destaques.length > 0 || series.length > 0 || camadasBrutas.length > 0 || graficos.length > 0

  return (
    <div className="min-h-screen bg-[#FAFBFA]">
      <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 py-6">
        <Breadcrumbs items={[{ label: 'AI Insights', href: '/analise/nova' }, { label: 'Análise' }]} />

        <div className="flex items-center justify-between gap-3 mb-2">
          <Link
            href="/analise/nova"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8E5] bg-white px-3 py-1.5 text-[13px] font-semibold text-[var(--pd-ink-700)] hover:border-[#CFE3D6] hover:text-[#064E2C] transition-colors"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Nova análise
          </Link>
        </div>

        {/* Hero: R6 (título é a conclusão) + a pergunta feita em destaque, não uma linha cinzenta
            no rodapé — é a primeira coisa que o próprio utilizador reconhece como "sim, foi isto
            que eu perguntei". O CTA para o dashboard fica aqui, com peso visual, porque é a
            segunda acção mais provável logo a seguir a ler a resposta. */}
        <header className="rounded-2xl bg-gradient-to-br from-[#064E2C] to-[#0a6339] text-white px-6 py-8 md:px-10 md:py-10 mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9FD4B4] mb-3">
            Data Portal · dataportal.co.mz
          </p>
          <h1 className="text-2xl md:text-[34px] font-extrabold leading-[1.14] tracking-tight mb-3 max-w-4xl">
            {n.titulo}
          </h1>
          <p className="text-[15px] md:text-[17px] text-white/85 leading-relaxed max-w-3xl mb-5">{n.subtitulo}</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="inline-block max-w-3xl rounded-xl bg-white/10 border border-white/20 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9FD4B4] mb-1">Pergunta feita</p>
              <p className="text-[15px] md:text-[16px] font-semibold leading-snug">{analise.pergunta}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <PartilharBotao analiseId={analise.id} publicoInicial={analise.publico} variante="clara" />
              <Link
                href={`/analise/${analise.id}/dashboard`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-[13px] font-bold text-[#064E2C] hover:bg-[#F1F8F4] transition-colors"
              >
                <LayoutDashboard className="size-4" aria-hidden />
                Abrir dashboard e descarregar
              </Link>
            </div>
          </div>
        </header>

        <FaixaKPIs numerosChave={n.numeros_chave || []} calcs={calcs} graficos={graficos} />

        {/* Fase 4 (memória): mostra os dois lados sem calcular a diferença — os valores já vêm
            formatados com unidade própria, e subtrair strings formatadas seria inventar um número
            sem cálculo real por trás (R1). */}
        {analiseAnterior && (
          <section className="rounded-2xl border border-[#CFE3D6] bg-[#F1F8F4] p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <History className="size-4 text-[#064E2C]" aria-hidden />
              <h2 className="text-base font-bold text-[var(--pd-ink-900)]">Desde a última vez que perguntaste algo parecido</h2>
            </div>
            <p className="text-[12px] text-gray-500 mb-3">
              "{analiseAnterior.pergunta}" —{' '}
              {new Date(analiseAnterior.criadoEm).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {analiseAnterior.numerosChave.slice(0, 4).map((antes) => {
                const agora = (n.numeros_chave || []).find((k: any) => k.rotulo === antes.rotulo)
                if (!agora) return null
                return (
                  <div key={antes.rotulo} className="rounded-xl border border-[#E2E8E5] bg-white p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">{antes.rotulo}</p>
                    <div className="flex items-center gap-2 text-[15px] font-bold">
                      <span className="text-gray-400 tabular-nums">{antes.valor}</span>
                      <span className="text-gray-300">→</span>
                      <span className="text-[#064E2C] tabular-nums">{agora.valor}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-[#E2E8E5] bg-white p-6 mb-5">
          {temMapaOuGraficos ? (
            <p className="text-[16px] leading-relaxed text-[var(--pd-ink-800)]">{n.resposta_directa}</p>
          ) : (
            <p className="text-[19px] md:text-[21px] font-medium leading-snug text-[var(--pd-ink-900)] border-l-4 border-[#064E2C] pl-4">
              {n.resposta_directa}
            </p>
          )}
          {n.o_que_mostram && (
            <div className="pt-4 mt-4 border-t border-[#E2E8E5]">
              <h2 className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2">O que os dados mostram</h2>
              <p className="text-[14px] leading-relaxed text-[var(--pd-ink-700)] whitespace-pre-line">{n.o_que_mostram}</p>
            </div>
          )}
          {n.porque && (
            <div className="pt-4 mt-4 border-t border-[#E2E8E5]">
              <h2 className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2">Porquê</h2>
              <p className="text-[14px] leading-relaxed text-[var(--pd-ink-700)] whitespace-pre-line">{n.porque}</p>
            </div>
          )}
        </section>

        {/* Mapa e gráficos lado a lado quando existem os dois — a mesma densidade do dashboard,
            em vez de uma coluna estreita de 1/3 que sobrava vazia quando a análise não tinha mapa
            nem gráfico nenhum. */}
        {temMapaOuGraficos && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-5 items-start">
            {(destaques.length > 0 || series.length > 0 || camadasBrutas.length > 0) && (
              <div className={`space-y-4 ${graficos.length > 0 ? 'xl:col-span-7' : 'xl:col-span-12'}`}>
                {camadasBrutas.map((c: any) => (
                  <AnaliseMapaPontos key={c.dataset_id} camada={c} />
                ))}
                {destaques.map((d: any) => (
                  <AnaliseMapaDestaque key={d.passo_id} destaque={d} />
                ))}
                {series.length > 0 && camadasBrutas.length === 0 && (
                  <AnaliseSerieGeografica series={series} geojsonPorNivel={geojsonPorNivel} />
                )}
              </div>
            )}
            {graficos.length > 0 && (
              <div
                className={`grid grid-cols-1 ${
                  destaques.length > 0 || series.length > 0 || camadasBrutas.length > 0
                    ? 'xl:col-span-5'
                    : 'sm:grid-cols-2 xl:grid-cols-3 xl:col-span-12'
                } gap-4`}
              >
                {graficos.map((g: any) => (
                  <AnaliseGrafico key={g.passo_id} grafico={g} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Achados como secção própria de largura total (não espremidos numa barra lateral
            estreita): cresce e encolhe com o número real de achados em vez de forçar a coluna do
            lado a igualar a altura do conteúdo principal. */}
        {achados.length > 0 && (
          <section className="mb-5">
            <h2 className="text-base font-bold text-[var(--pd-ink-900)] mb-3">O que não perguntou mas devia saber</h2>
            <div
              className={`grid grid-cols-1 gap-3 ${
                Math.min(achados.length, 6) >= 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : Math.min(achados.length, 6) === 2 ? 'sm:grid-cols-2' : ''
              }`}
            >
              {achados.slice(0, 6).map((a: any, i: number) => (
                <div
                  key={i}
                  className="rounded-xl border border-[#E2E8E5] bg-white p-4"
                  style={{ borderLeft: `4px solid ${CORES_SEVERIDADE[a.severidade] || '#064E2C'}` }}
                >
                  <p className="text-[13px] font-bold text-[var(--pd-ink-900)] leading-snug">{a.titulo}</p>
                  {a.texto && <p className="text-[12px] text-gray-600 leading-relaxed mt-1.5">{a.texto}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* R8: bloco obrigatório, nunca vazio — a par de "Como chegámos aqui", separado da
            auditoria técnica (avisos, revisão adversarial), que fica em <details> por baixo. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="size-4 text-amber-700" aria-hidden />
              <h2 className="text-base font-bold text-amber-900">O que isto não diz</h2>
            </div>
            <ul className="space-y-2.5">
              {n.o_que_nao_diz.map((l: string, i: number) => (
                <li key={i} className="text-[13px] leading-relaxed text-amber-900">
                  {l}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-[#E2E8E5] bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="size-4 text-[var(--pd-green-700)]" aria-hidden />
              <h2 className="text-base font-bold text-[var(--pd-ink-900)]">Como chegámos aqui</h2>
            </div>
            <p className="text-[13px] leading-relaxed text-[var(--pd-ink-700)] mb-4">{n.como_chegamos}</p>

            {/* Timeline dos passos reais do plano — a par do texto corrido acima, não no lugar
                dele: o texto explica o raciocínio em prosa (o que os utilizadores usam como
                referência), a timeline mostra a sequência concreta de passos executados. */}
            {analise.plano?.passos?.length > 0 && (
              <ol className="mb-4 space-y-0">
                {analise.plano.passos.map((p: any, i: number) => (
                  <li key={p.id || i} className="relative pl-6 pb-3 last:pb-0">
                    {i < analise.plano.passos.length - 1 && (
                      <span className="absolute left-[7px] top-[18px] bottom-0 w-px bg-[#E2E8E5]" aria-hidden />
                    )}
                    <span className="absolute left-0 top-[3px] flex size-[15px] items-center justify-center rounded-full bg-[#064E2C] text-[9px] font-bold text-white">
                      {i + 1}
                    </span>
                    <p className="text-[12.5px] leading-snug text-[var(--pd-ink-700)]">{p.descricao_humana}</p>
                  </li>
                ))}
              </ol>
            )}

            <div className="text-[12px] text-gray-500 space-y-1 pt-3 border-t border-[#E2E8E5]">
              <p>
                <strong className="text-[var(--pd-ink-700)]">Fontes:</strong>{' '}
                {n.fontes.map((f: any) => `${f.instituicao}${f.ano ? ` (${f.ano})` : ''}`).join('; ')}
              </p>
              <p>{nCalcs} valores calculados a partir dos dados, nenhum escrito à mão.</p>
              {analise.duracao_ms != null && <p>Produzida em {(analise.duracao_ms / 1000).toFixed(0)} segundos.</p>}
            </div>

            {avisos.length > 0 && (
              <details className="mt-4">
                <summary className="text-[12px] font-semibold text-[var(--pd-ink-700)] cursor-pointer">
                  Avisos técnicos da execução ({avisos.length})
                </summary>
                <ul className="mt-2 space-y-1.5">
                  {avisos.map((a, i) => (
                    <li key={i} className="text-[11px] leading-relaxed text-gray-500">
                      {a}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {critica?.objeccoes?.length > 0 && (
              <details className="mt-3">
                <summary className="text-[12px] font-semibold text-[var(--pd-ink-700)] cursor-pointer">
                  Revisão adversarial ({critica.objeccoes.length} objecções)
                </summary>
                <ul className="mt-2 space-y-2">
                  {critica.objeccoes.map((o: any, i: number) => (
                    <li key={i} className="text-[11px] leading-relaxed text-gray-600">
                      <span className="font-bold">[{o.gravidade}]</span> {o.descricao}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        </div>

        <QualidadeDados qualidade={qualidade} />

        <CodigoExecutado codigo={codigoExecutado} />

        {/* Só para datasets alfanuméricos: os geoespaciais já têm o mapa como forma certa de
            explorar linha a linha — mesma regra do dashboard. */}
        <TabelaExploratoria
          datasets={datasetsInfo.filter((d) => d.dataType !== 'geoespacial').map((d) => ({ id: d.id, titulo: d.titulo }))}
          datasetIdsComMapa={camadasBrutas.map((c: any) => c.dataset_id)}
        />

        <MetadadosDataset datasets={datasetsInfo} />

        {relacionadas.length > 0 && (
          <section className="rounded-2xl border border-[#E2E8E5] bg-white p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="size-4 text-[#064E2C]" aria-hidden />
              <h2 className="text-base font-bold text-[var(--pd-ink-900)]">Outras pessoas também perguntaram</h2>
            </div>
            <ul className="space-y-1">
              {relacionadas.map((r) => (
                <li key={r.id}>
                  <Link href={`/analise/${r.id}`} className="text-[13px] text-[var(--pd-ink-700)] hover:text-[#064E2C] hover:underline leading-relaxed">
                    {r.pergunta}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <PerguntasSugeridas perguntas={perguntasSugeridas} datasetIds={datasetIdsParaNovaAnalise} />
      </div>
    </div>
  )
}
