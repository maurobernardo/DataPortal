import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  History,
  Info,
  LayoutDashboard,
  Lightbulb,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { obterAnalise, listarAnalisesRelacionadas } from '@/lib/analysis/persistencia'
import { procurarAnaliseAnteriorSemelhante } from '@/lib/analysis/memoria'
import { carregarDatasetsInfo, carregarGeojsonPorNivel, carregarProvincias } from '@/lib/analysis/apresentacao'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { SeloAutoria } from '@/components/analise/SeloAutoria'
import { ListaLimitacoes } from '@/components/analise/ListaLimitacoes'
import { AnaliseListaRegistos } from '@/components/analise/AnaliseListaRegistos'
import { AnaliseVisualizacoes } from '@/components/analise/AnaliseVisualizacoes'
import { MetadadosDataset } from '@/components/analise/MetadadosDataset'
import { PerguntasSugeridas } from '@/components/analise/PerguntasSugeridas'
import { PartilharBotao } from '@/components/analise/PartilharBotao'
import { TabelaExploratoria } from '@/components/analise/TabelaExploratoria'
import { getSuggestedQuestions } from '@/lib/ai-suggested-questions'
import { gerarPerguntasViaveis } from '@/lib/analysis/perguntas-viaveis'
import '@/app/geo-catalog.css'
import '@/app/ai-insights.css'

export const dynamic = 'force-dynamic'

const CORES_SEVERIDADE: Record<string, string> = {
  critico: '#B91C1C',
  alto: '#C2410C',
  medio: '#A16207',
  informativo: '#1f7752',
}

export default async function PaginaAnalise({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { de?: string }
}) {
  // De onde a pessoa veio. Só há dois destinos possíveis e ambos são caminhos internos fixos, por
  // isso o parâmetro nunca entra numa URL sem passar por esta escolha.
  const veioDaLista = searchParams?.de === 'lista'
  const voltarHref = veioDaLista ? '/analise' : '/analise/nova'
  const voltarRotulo = veioDaLista ? 'Minhas análises' : 'Nova análise'
  const sufixoOrigem = veioDaLista ? '?de=lista' : ''
  const sessao = await getCurrentUser()
  if (!sessao) redirect(`/login?next=/analise/${params.id}`)

  const analise = await obterAnalise(params.id)
  if (!analise) notFound()

  // Uma análise é privada de quem a pediu enquanto não for marcada como pública.
  if (!analise.publico && analise.utilizador_id !== sessao.userId) {
    redirect('/analise/nova')
  }

  // "planeando"/"executando"/"compondo" são estados legítimos EM CURSO, não uma falha — antes,
  // abrir os detalhes de uma análise ainda a processar (ex.: a partir de "Minhas análises", que já
  // a lista logo ao ser criada) caía no MESMO ecrã de "não foi publicada" que uma análise que
  // falhou de verdade, porque a única condição verificada era "não tem narrativa ainda", que é
  // verdade tanto para "ainda a processar" como para "falhou" — confuso e simplesmente falso para
  // o primeiro caso. Mostra-se aqui uma mensagem honesta e distinta, sem redirecionar sozinho (o
  // pipeline pode legitimamente levar minutos; um refresh automático agressivo não ajudaria).
  if (analise.estado !== 'erro' && analise.estado !== 'pronto') {
    return (
      <div className="pdx min-h-screen">
        <div className="w-full max-w-3xl mx-auto px-4 md:px-6 py-6">
          <Breadcrumbs items={[{ label: 'AI Insights', href: '/analise/nova' }, { label: 'Análise' }]} />
          <div className="pdx-panel">
            <div className="pdx-panel-head">
              <span className="pdx-panel-icone" aria-hidden>
                <Info className="size-3.5 animate-pulse" />
              </span>
              <h2>Esta análise ainda está a ser processada</h2>
            </div>
            <div className="pdx-panel-body p-6">
              <p className="pdx-lede">{analise.pergunta}</p>
              <p className="text-[14px] leading-relaxed mt-4 mb-6" style={{ color: 'var(--ink-soft)' }}>
                Perguntas com vários critérios podem demorar alguns minutos. Actualiza esta página
                daqui a pouco, ou volta a &ldquo;Minhas análises&rdquo; mais tarde; fica lá assim
                que terminar.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/analise/${analise.id}`} className="pdx-btn pdx-btn-primary">
                  Actualizar
                </Link>
                <Link href="/analise" className="pdx-btn">
                  Minhas análises
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (analise.estado === 'erro' || !analise.narrativa?.resolvida) {
    const mensagem = analise.narrativa?.erro
    const critica = analise.narrativa?.critica
    const fatais = (critica?.objeccoes || []).filter((o: any) => o.gravidade === 'FATAL')

    return (
      <div className="pdx min-h-screen">
        <div className="w-full max-w-3xl mx-auto px-4 md:px-6 py-6">
          <Breadcrumbs items={[{ label: 'AI Insights', href: '/analise/nova' }, { label: 'Análise' }]} />
          <div className="pdx-panel">
            <div className="pdx-panel-head">
              <span className="pdx-panel-icone" aria-hidden>
                <ShieldAlert className="size-3.5" />
              </span>
              <h2>Esta análise não foi publicada</h2>
            </div>
            <div className="pdx-panel-body p-6">
              <p className="pdx-lede">{analise.pergunta}</p>
              {fatais.length > 0 ? (
                <>
                  <p className="text-[14px] leading-relaxed mt-4 mb-3" style={{ color: 'var(--ink-soft)' }}>
                    A revisão automática encontrou problemas que impedem a publicação. É
                    deliberado: o portal prefere não responder a responder com um número que não
                    se sustenta.
                  </p>
                  <ul className="pdx-objeccoes">
                    {fatais.map((o: any, i: number) => (
                      <li key={i}>{o.descricao}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-[14px] mt-4" style={{ color: 'var(--ink-soft)' }}>
                  {mensagem || 'A análise falhou.'}
                </p>
              )}
              <Link href="/analise/nova" className="pdx-btn pdx-btn-primary mt-6">
                Voltar e reformular
              </Link>
            </div>
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
  const listas = analise.resultados?.listas || []
  const avisos: string[] = analise.resultados?.avisos || []
  const achados = analise.achados || []
  const calcs = analise.resultados?.calcs || {}
  const nCalcs = Object.keys(calcs).length

  const [datasetsInfo, geojsonPorNivel, provincias, analiseAnterior, relacionadas] = await Promise.all([
    carregarDatasetsInfo(analise.datasets_ids || [], camadasBrutas),
    carregarGeojsonPorNivel(series),
    series.length > 0 ? carregarProvincias().catch(() => []) : Promise.resolve([]),
    // Best-effort: "desde a última vez" e "outros também perguntaram" são enriquecimento, não
    // requisitos para a página funcionar — uma falha aqui não pode impedir a análise de aparecer.
    analise.utilizador_id
      ? procurarAnaliseAnteriorSemelhante(analise.utilizador_id, analise.datasets_ids || [], analise.pergunta, analise.id).catch(() => null)
      : Promise.resolve(null),
    listarAnalisesRelacionadas(analise.datasets_ids || [], analise.id).catch(() => []),
  ])

  // Perguntas sugeridas inteligentes (PLANO-DATAPROPROMAX.md): antes eram sempre o mesmo texto
  // genérico gerado a partir só da categoria do dataset, igual para toda a gente. Agora priorizam
  // perguntas REAIS que outras pessoas já fizeram sobre estes mesmos datasets (`relacionadas`, já
  // carregado para a secção "Outras pessoas também perguntaram") — só cai para o gerador por
  // modelo/categoria quando ainda não há histórico suficiente sobre este dataset em concreto.
  const perguntaActualNormalizada = analise.pergunta.trim().toLowerCase()
  const perguntasReaisUnicas = Array.from(
    new Set(
      relacionadas
        .map((r) => r.pergunta.trim())
        .filter((p) => p.toLowerCase() !== perguntaActualNormalizada)
    )
  )
  // As perguntas VERIFICADAS vêm primeiro: são as mesmas que o motor oferece quando recusa uma
  // análise, e cada uma foi confrontada com as colunas, os métodos, os níveis geográficos e a
  // cobertura temporal reais destes datasets. O gerador por modelo/categoria só conhece o TÍTULO do
  // ficheiro, por isso propunha perguntas que podiam não ter resposta nenhuma nos dados — sugerir
  // aqui o que o portal recusaria a seguir é o mesmo defeito que já corrigimos no ecrã de recusa.
  // Fica como último recurso, para a secção nunca aparecer vazia.
  const perguntasVerificadas = (
    await gerarPerguntasViaveis(
      datasetsInfo.map((d) => d.id),
      undefined,
      analise.pergunta
    ).catch(() => [])
  ).map((p) => p.pergunta)

  const perguntasTemplate = getSuggestedQuestions(
    datasetsInfo.map((d) => ({ title: d.titulo, category: d.categoria ? { name: d.categoria } : null, dataType: d.dataType, year: d.ano }))
  )
  const perguntasSugeridas = Array.from(
    new Set([...perguntasVerificadas, ...perguntasReaisUnicas, ...perguntasTemplate])
  )
    .filter((p) => p.trim().toLowerCase() !== perguntaActualNormalizada)
    .slice(0, 4)
  const datasetIdsParaNovaAnalise = datasetsInfo.map((d) => d.id).join(',')

  const temMapaOuGraficos = destaques.length > 0 || series.length > 0 || camadasBrutas.length > 0 || graficos.length > 0

  return (
    <div className="pdx min-h-screen">
      <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 py-6">
        <Breadcrumbs items={[{ label: 'AI Insights', href: '/analise/nova' }, { label: 'Análise' }]} />

        <div className="flex items-center justify-between gap-3 mb-2">
          <Link href={voltarHref} className="pdx-btn">
            <ArrowLeft className="size-4" aria-hidden />
            {voltarRotulo}
          </Link>
        </div>

        {/* Hero: R6 (título é a conclusão) + a pergunta feita em destaque, não uma linha cinzenta
            no rodapé — é a primeira coisa que o próprio utilizador reconhece como "sim, foi isto
            que eu perguntei". O CTA para o dashboard fica aqui, com peso visual, porque é a
            segunda acção mais provável logo a seguir a ler a resposta. */}
        <header className="pdx-hero">
          <div className="pdx-marca">
            <img src="/images/logo.png" alt="" width={34} height={31} />
            <p className="pdx-hero-eyebrow">Data Portal · dataportal.co.mz</p>
          </div>
          <h1 className="pdx-hero-titulo">{n.titulo}</h1>
          <p className="pdx-hero-sub">{n.subtitulo}</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="pdx-hero-pergunta">
              <p>Pergunta feita</p>
              <p>{analise.pergunta}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <PartilharBotao analiseId={analise.id} publicoInicial={analise.publico} variante="clara" />
              {/* Algumas perguntas produzem só resposta escalar, sem mapa nem gráfico — o botão
                  para um dashboard vazio seria uma promessa que a resposta não cumpre. */}
              {(series.length > 0 || graficos.length > 0 || destaques.length > 0 || camadasBrutas.length > 0) && (
                <Link href={`/analise/${analise.id}/dashboard${sufixoOrigem}`} className="pdx-btn-claro">
                  <LayoutDashboard className="size-4" aria-hidden />
                  Abrir dashboard e descarregar
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Fase 4 (memória): mostra os dois lados sem calcular a diferença — os valores já vêm
            formatados com unidade própria, e subtrair strings formatadas seria inventar um número
            sem cálculo real por trás (R1). */}
        {analiseAnterior && (
          <section className="pdx-panel pdx-panel-convite mb-5">
            <div className="pdx-panel-head">
              <span className="pdx-panel-icone" aria-hidden>
                <History className="size-3.5" />
              </span>
              <h2>Desde a última vez que perguntaste algo parecido</h2>
            </div>
            <div className="pdx-panel-body">
              <p className="text-[12px] mb-3" style={{ color: 'var(--ink-faint)' }}>
                &ldquo;{analiseAnterior.pergunta}&rdquo; ·{' '}
                {new Date(analiseAnterior.criadoEm).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {analiseAnterior.numerosChave.slice(0, 4).map((antes) => {
                const agora = (n.numeros_chave || []).find((k: any) => k.rotulo === antes.rotulo)
                if (!agora) return null
                return (
                  <div key={antes.rotulo} className="pdx-meta-cartao">
                    <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--ink-faint)' }}>
                      {antes.rotulo}
                    </p>
                    <div className="flex items-center gap-2 text-[15px] font-bold pdx-num">
                      <span style={{ color: 'var(--ink-faint)' }}>{antes.valor}</span>
                      <span aria-hidden style={{ color: 'var(--line)' }}>→</span>
                      <span style={{ color: 'var(--forest-800)' }}>{agora.valor}</span>
                    </div>
                  </div>
                )
              })}
              </div>
            </div>
          </section>
        )}

        <section className="pdx-panel mb-5">
          <div className="pdx-panel-body p-6">
            <div className="pdx-narrativa">
              {/* `temMapaOuGraficos` continua a mandar no destaque: sem mapa nem gráfico, esta
                  frase é a resposta inteira e sobe um degrau de tamanho. */}
              <p className={`pdx-lede${temMapaOuGraficos ? '' : ' pdx-lede-so'}`}>{n.resposta_directa}</p>
              {(n.o_que_mostram || n.porque) && (
                <div className="pdx-narr">
                  {n.o_que_mostram && (
                    <div className="pdx-narr-col">
                      <h2>O que os dados mostram</h2>
                      <p>{n.o_que_mostram}</p>
                    </div>
                  )}
                  {n.porque && (
                    <div className="pdx-narr-col alt">
                      <h2>Porquê</h2>
                      <p>{n.porque}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* KPIs, pódio, mapa e gráficos partilham estado de cliente aqui (clicar num KPI ou numa
            barra destaca a mesma unidade no mapa) — a mesma ligação que já existia no dashboard
            (DashboardApresentacao), agora também nesta página. */}
        <AnaliseVisualizacoes
          numerosChave={n.numeros_chave || []}
          calcs={calcs}
          graficos={graficos}
          destaques={destaques}
          camadasBrutas={camadasBrutas}
          series={series}
          geojsonPorNivel={geojsonPorNivel}
          provincias={provincias}
          temMapaOuGraficos={temMapaOuGraficos}
        />

        {/* As listas ficam logo a seguir às visualizações e ANTES dos achados: quem perguntou
            "quais são" quer os nomes, e enterrá-los debaixo do que não perguntou seria repetir de
            outra maneira o defeito que este bloco existe para corrigir. */}
        {listas.map((lista: any) => (
          <div key={lista.passo_id} className="mb-5">
            <AnaliseListaRegistos lista={lista} />
          </div>
        ))}

        {/* Achados como secção própria de largura total (não espremidos numa barra lateral
            estreita): cresce e encolhe com o número real de achados em vez de forçar a coluna do
            lado a igualar a altura do conteúdo principal. */}
        {achados.length > 0 && (
          <section className="pdx-panel mb-5">
            <div className="pdx-panel-head">
              <span className="pdx-panel-icone" aria-hidden>
                <Lightbulb className="size-3.5" />
              </span>
              <h2>O que não perguntou mas devia saber</h2>
            </div>
            <div
              className={`pdx-panel-body grid grid-cols-1 gap-3 ${
                Math.min(achados.length, 6) >= 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : Math.min(achados.length, 6) === 2 ? 'sm:grid-cols-2' : ''
              }`}
            >
              {achados.slice(0, 6).map((a: any, i: number) => (
                <div
                  key={i}
                  className="pdx-achado"
                  style={{ ['--achado-cor' as any]: CORES_SEVERIDADE[a.severidade] || 'var(--forest-600)' }}
                >
                  <p>{a.titulo}</p>
                  {a.texto && <p>{a.texto}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* R8: bloco obrigatório, nunca vazio — a par de "Como chegámos aqui", separado da
            auditoria técnica (avisos, revisão adversarial), que fica em <details> por baixo. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <section className="pdx-panel">
            {/* Antes era um cartão âmbar/aviso — mas a lista abaixo são limitações honestas de
                âmbito, não erros da análise; a cor de alarme fazia um resultado correcto parecer
                suspeito. Fica com o mesmo tratamento neutro do painel ao lado ("Como chegámos
                aqui"): o conteúdo (R8) mantém-se obrigatório, só a cor deixa de acusar. */}
            <div className="pdx-panel-head">
              <span className="pdx-panel-icone" aria-hidden>
                <AlertTriangle className="size-3.5" />
              </span>
              <h2>O que isto não diz</h2>
            </div>
            <ListaLimitacoes limitacoes={n.o_que_nao_diz} />
          </section>

          <section className="pdx-panel">
            <div className="pdx-panel-head">
              <span className="pdx-panel-icone" aria-hidden>
                <Info className="size-3.5" />
              </span>
              <h2>Como chegámos aqui</h2>
            </div>
            <div className="pdx-panel-body">
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--ink-soft)' }}>{n.como_chegamos}</p>

            {/* Timeline dos passos reais do plano — a par do texto corrido acima, não no lugar
                dele: o texto explica o raciocínio em prosa (o que os utilizadores usam como
                referência), a timeline mostra a sequência concreta de passos executados. */}
            {analise.plano?.passos?.length > 0 && (
              <ol className="mb-4 space-y-0">
                {analise.plano.passos.map((p: any, i: number) => (
                  <li key={p.id || i} className="relative pl-6 pb-3 last:pb-0">
                    {i < analise.plano.passos.length - 1 && (
                      <span
                        className="absolute left-[7px] top-[18px] bottom-0 w-px"
                        style={{ background: 'var(--line)' }}
                        aria-hidden
                      />
                    )}
                    <span
                      className="absolute left-0 top-[3px] flex size-[15px] items-center justify-center rounded-full text-[9px] font-bold text-white pdx-num"
                      style={{ background: 'var(--forest-700)' }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-[12.5px] leading-snug" style={{ color: 'var(--ink-soft)' }}>{p.descricao_humana}</p>
                  </li>
                ))}
              </ol>
            )}

            <div className="pdx-rodape space-y-1">
              <p>
                <strong>Fontes:</strong>{' '}
                {n.fontes.map((f: any) => `${f.instituicao}${f.ano ? ` (${f.ano})` : ''}`).join('; ')}
              </p>
              <p>{nCalcs} valores calculados a partir dos dados, nenhum escrito à mão.</p>
              {analise.duracao_ms != null && <p>Produzida em {(analise.duracao_ms / 1000).toFixed(0)} segundos.</p>}
            </div>

            {avisos.length > 0 && (
              <details className="pdx-detalhes mt-4">
                <summary>Avisos técnicos da execução ({avisos.length})</summary>
                <ul className="mt-2 space-y-1.5">
                  {avisos.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </details>
            )}

            {critica?.objeccoes?.length > 0 && (
              <details className="pdx-detalhes mt-3">
                <summary>Revisão adversarial ({critica.objeccoes.length} objecções)</summary>
                <ul className="mt-2 space-y-2">
                  {critica.objeccoes.map((o: any, i: number) => (
                    <li key={i}>
                      <span className="font-bold">[{o.gravidade}]</span> {o.descricao}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            </div>
          </section>
        </div>

        {/* Só para datasets alfanuméricos: os geoespaciais já têm o mapa como forma certa de
            explorar linha a linha — mesma regra do dashboard. */}
        <TabelaExploratoria
          datasets={datasetsInfo.filter((d) => d.dataType !== 'geoespacial').map((d) => ({ id: d.id, titulo: d.titulo }))}
          datasetIdsComMapa={camadasBrutas.map((c: any) => c.dataset_id)}
        />

        <MetadadosDataset datasets={datasetsInfo} />

        {relacionadas.length > 0 && (
          <section className="pdx-panel pdx-panel-convite mb-5">
            <div className="pdx-panel-head">
              <span className="pdx-panel-icone" aria-hidden>
                <Users className="size-3.5" />
              </span>
              <h2>Outras pessoas também perguntaram</h2>
            </div>
            <div className="pdx-panel-body grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {relacionadas.map((r) => (
                <Link key={r.id} href={`/analise/${r.id}`} className="pdx-sugestao">
                  <span>{r.pergunta}</span>
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              ))}
            </div>
          </section>
        )}

        <PerguntasSugeridas perguntas={perguntasSugeridas} datasetIds={datasetIdsParaNovaAnalise} />

        <SeloAutoria analiseId={analise.id} criadoEm={analise.criado_em} />
      </div>
    </div>
  )
}
