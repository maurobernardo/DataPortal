'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  BookOpenCheck,
  BookText,
  ClipboardCheck,
  Download,
  Flag,
  Languages,
  Loader2,
  Lock,
  Minus,
  ScanSearch,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { TextoComRealce } from './TextoComRealce'
import { gerarPdfDoResumo } from '@/lib/relatorios/exportar-resumo-pdf'
import { gerarOnePagerPdf } from '@/lib/relatorios/exportar-onepager-pdf'
import { EmAnaliseRelatorio } from './EmAnaliseRelatorio'
import { construirTabelaDados } from '@/lib/relatorios/tabela-dados'
import { construirLinhaTempo } from '@/lib/relatorios/linha-tempo'
import { construirDestaques } from '@/lib/relatorios/destaques'
import { classificarAchado } from '@/lib/relatorios/classificar-achado'
import { AIChartRenderer } from '@/components/ai-insights/AIChartRenderer'
import { MapaGeografiaRelatorio } from './MapaGeografiaRelatorio'

/**
 * A análise deste relatório, pronta a ler.
 *
 * A escolha central é dar três profundidades, e deixar quem lê escolher, em vez de decidir por
 * ele: a razão mais comum para não se ler um relatório não é ser longo, é não se saber se vale a
 * pena antes de começar. Um resumo rápido responde a "isto interessa-me?"; um resumo médio equipa
 * para uma conversa; tudo é para quem vai mesmo trabalhar com o documento.
 *
 * Preparar esta análise (ler o PDF pela primeira vez) tem um custo real. A equipa do portal pode
 * preparar um relatório com antecedência no painel administrativo, mas nem sempre o faz antes de
 * alguém o querer ler: por isso quem tem sessão iniciada também pode pedir a análise na hora,
 * pagando por ela. É a mesma operação nos dois casos, e o resultado fica guardado depois de feito
 * uma vez: quem chegar a seguir vê-o pronto, sem pagar outra vez pelo mesmo relatório.
 */

type Digesto = {
  o_que_e: { assunto: string; geografia: string; periodo: string; metodologia: string }
  resumo_curto: string
  resumo_medio: string
  achados: { texto: string; pagina: number; ano?: number | null }[]
  recomendacoes: { texto: string; responsavel: string | null; prazo: string | null; pagina: number }[]
  o_que_nao_diz: string[]
  fontes: { instituicao: string; documento: string | null; ano: number | null }[]
  resultado?: { tipo: 'obtido' | 'esperado' | 'nao_aplicavel'; texto: string | null; pagina: number | null }
  glossario?: { termo: string; definicao: string; pagina: number }[]
  credibilidade?: { tipo_dado: 'primario' | 'secundario' | 'misto' | null; tamanho_amostra: string | null; observacoes: string | null }
  afirmacoes_numericas?: {
    texto: string
    tema: string
    geografia: string
    periodo_inicio: number | null
    periodo_fim: number | null
    valor: number
    unidade: string
    pagina: number
    tipo: 'nivel' | 'variacao'
  }[]
}

type Estado = 'pendente' | 'a_processar' | 'pronto' | 'erro' | 'digitalizado'

export function PainelDigesto({
  reportId,
  titulo,
  ano,
  autenticado,
}: {
  reportId: number
  titulo: string
  ano: string
  autenticado: boolean
}) {
  const [digesto, setDigesto] = useState<Digesto | null>(null)
  const [estado, setEstado] = useState<Estado>('pendente')
  const [carregou, setCarregou] = useState(false)
  const [profundidade, setProfundidade] = useState<'curto' | 'medio' | 'completo'>('curto')
  const [idioma, setIdioma] = useState<'pt' | 'en'>('pt')
  const [aTraduzir, setATraduzir] = useState(false)
  const [erroTraducao, setErroTraducao] = useState<string | null>(null)
  const [aIniciarAnalise, setAIniciarAnalise] = useState(false)
  const [erroAnalise, setErroAnalise] = useState<string | null>(null)
  const [aGerarPdf, setAGerarPdf] = useState(false)
  const [erroPdf, setErroPdf] = useState<string | null>(null)
  const [aGerarOnePager, setAGerarOnePager] = useState(false)
  const [erroOnePager, setErroOnePager] = useState<string | null>(null)
  const [termoGlossarioAberto, setTermoGlossarioAberto] = useState<number | null>(null)
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function descarregarPdf() {
    if (!digesto) return
    setAGerarPdf(true)
    setErroPdf(null)
    try {
      await gerarPdfDoResumo({ titulo, ano, digesto, reportId })
    } catch (e: any) {
      setErroPdf(e?.message || 'Não foi possível gerar o PDF')
    } finally {
      setAGerarPdf(false)
    }
  }

  async function descarregarOnePager() {
    if (!digesto) return
    setAGerarOnePager(true)
    setErroOnePager(null)
    try {
      await gerarOnePagerPdf({ titulo, ano, digesto })
    } catch (e: any) {
      setErroOnePager(e?.message || 'Não foi possível gerar a ficha')
    } finally {
      setAGerarOnePager(false)
    }
  }

  async function buscar(idiomaAlvo: 'pt' | 'en') {
    const r = await fetch(`/api/reports/${reportId}/digesto?idioma=${idiomaAlvo}`)
    const d = await r.json().catch(() => null)
    if (!d) return
    setDigesto(d.digesto)
    setEstado(d.estado)
  }

  useEffect(() => {
    let vivo = true
    buscar('pt').finally(() => vivo && setCarregou(true))
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId])

  // Enquanto o processamento está a decorrer, verifica de novo a cada poucos segundos: é a única
  // situação em que o estado muda sem uma acção da pessoa que está a ver a página.
  useEffect(() => {
    if (estado !== 'a_processar') {
      if (intervaloRef.current) clearInterval(intervaloRef.current)
      return
    }
    intervaloRef.current = setInterval(() => buscar(idioma), 4000)
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado])

  async function trocarIdioma(alvo: 'pt' | 'en') {
    if (alvo === idioma) return
    setTermoGlossarioAberto(null)
    if (alvo === 'pt') {
      setIdioma('pt')
      buscar('pt')
      return
    }
    setATraduzir(true)
    setErroTraducao(null)
    try {
      const r = await fetch(`/api/reports/${reportId}/traduzir`, { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível traduzir')
      setDigesto(d.digesto)
      setIdioma('en')
    } catch (e: any) {
      setErroTraducao(e?.message || 'Não foi possível traduzir')
    } finally {
      setATraduzir(false)
    }
  }

  async function analisar() {
    setAIniciarAnalise(true)
    setErroAnalise(null)
    try {
      const r = await fetch(`/api/reports/${reportId}/analisar`, { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível analisar este relatório')
      setEstado(d.estado)
      if (d.estado === 'pronto') buscar('pt')
    } catch (e: any) {
      setErroAnalise(e?.message || 'Não foi possível analisar este relatório')
    } finally {
      setAIniciarAnalise(false)
    }
  }

  const tabelaDados = useMemo(
    () => construirTabelaDados(digesto?.afirmacoes_numericas ?? []),
    [digesto]
  )
  const linhaTempo = useMemo(
    () =>
      construirLinhaTempo({
        achados: (digesto?.achados ?? []).map((a) => ({ ...a, ano: a.ano ?? null })),
        afirmacoes_numericas: digesto?.afirmacoes_numericas ?? [],
      }),
    [digesto]
  )
  const destaques = useMemo(() => {
    if (!digesto) return []
    return construirDestaques(
      {
        resultado: digesto.resultado ?? { tipo: 'nao_aplicavel', texto: null, pagina: null },
        o_que_e: digesto.o_que_e,
        fontes: digesto.fontes,
        achados: digesto.achados.map((a) => ({ ...a, ano: a.ano ?? null })),
      },
      tabelaDados
    )
  }, [digesto, tabelaDados])

  if (!carregou) return null

  if (estado === 'digitalizado') {
    return (
      <div className="rpt-detail-hero">
        <div className="rpt-detail-body">
          <h2 className="rpt-digesto-titulo"><BookOpenCheck className="size-4" aria-hidden />Análise deste relatório</h2>
          <p className="rpt-detail-text">
            Este ficheiro parece ser uma imagem digitalizada, sem texto que se possa ler: não é
            possível preparar um resumo automático deste documento.
          </p>
        </div>
      </div>
    )
  }

  // O resumo é gerado uma vez, mas VER o conteúdo é sempre por sessão: sem uma conta, nunca há
  // conteúdo a mostrar, mesmo que outra pessoa já o tenha pedido. Sem isto, a primeira pessoa a
  // pedir a análise desbloqueava o resumo para toda a gente que visitasse a página a seguir.
  if (!autenticado) {
    return (
      <div className="rpt-detail-hero">
        <div className="rpt-detail-body rpt-digesto-bloqueado">
          <Lock className="size-5" aria-hidden />
          <div>
            <h2 className="rpt-digesto-titulo"><BookOpenCheck className="size-4" aria-hidden />Análise deste relatório</h2>
            <p className="rpt-detail-text">
              {estado === 'pronto'
                ? 'Este relatório já tem um resumo pronto. Inicie sessão gratuitamente para o ver: é uma análise pessoal, disponível para quem a pedir.'
                : 'Inicie sessão gratuitamente para pedir a análise deste relatório: um resumo com os principais pontos e a página de cada um.'}
            </p>
            <Link href={`/login?next=/relatorios/${reportId}%23analise`} className="rpt-btn rpt-btn-primary">
              Iniciar sessão
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (estado === 'a_processar') {
    return (
      <div className="rpt-detail-hero">
        <div className="rpt-detail-body">
          <EmAnaliseRelatorio />
        </div>
      </div>
    )
  }

  if (estado === 'pendente' || estado === 'erro' || !digesto) {
    return (
      <div className="rpt-detail-hero">
        <div className="rpt-detail-body">
          <h2 className="rpt-digesto-titulo"><BookOpenCheck className="size-4" aria-hidden />Análise deste relatório</h2>
          <p className="rpt-detail-text">
            {estado === 'erro'
              ? 'A última tentativa de analisar este relatório falhou. Pode tentar de novo.'
              : estado === 'pronto'
                ? 'Este relatório já foi analisado. Peça a análise para a desbloquear para si: não é gerada de novo, só fica disponível na sua conta.'
                : 'Este relatório ainda não tem um resumo. Pode pedi-lo agora.'}
          </p>
          <button type="button" onClick={analisar} disabled={aIniciarAnalise} className="rpt-btn rpt-btn-primary">
            {aIniciarAnalise ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ScanSearch className="size-4" aria-hidden />}
            {aIniciarAnalise ? 'A começar…' : 'Analisar este relatório'}
          </button>
          {erroAnalise && <p className="rpt-digesto-erro">{erroAnalise}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="rpt-detail-hero">
      <div className="rpt-detail-body">
        <div className="rpt-digesto-cabecalho">
          <h2 className="rpt-digesto-titulo"><BookOpenCheck className="size-4" aria-hidden />Análise deste relatório</h2>
          <div className="rpt-digesto-controlos">
            <div className="rpt-digesto-abas" role="group" aria-label="Quanto quer ler">
              <button type="button" aria-pressed={profundidade === 'curto'} onClick={() => setProfundidade('curto')}>
                Resumo rápido
              </button>
              <button type="button" aria-pressed={profundidade === 'medio'} onClick={() => setProfundidade('medio')}>
                Resumo médio
              </button>
              <button type="button" aria-pressed={profundidade === 'completo'} onClick={() => setProfundidade('completo')}>
                Tudo
              </button>
            </div>
            <div className="rpt-digesto-abas" role="group" aria-label="Idioma">
              <button type="button" aria-pressed={idioma === 'pt'} onClick={() => trocarIdioma('pt')}>
                Português
              </button>
              <button type="button" aria-pressed={idioma === 'en'} onClick={() => trocarIdioma('en')} disabled={aTraduzir}>
                {aTraduzir ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Languages className="size-3" aria-hidden />}
                Inglês
              </button>
            </div>
          </div>
        </div>
        {erroTraducao && <p className="rpt-digesto-erro">{erroTraducao}</p>}

        {destaques.length > 0 && (
          <div className="rpt-digesto-destaques">
            {destaques.map((d, i) => (
              <div key={i} className="rpt-digesto-destaque">
                <strong>{d.valor}</strong>
                <span>{d.rotulo}</span>
              </div>
            ))}
          </div>
        )}

        <div className="rpt-digesto-contexto">
          <span>
            <strong>Sobre o quê:</strong> <TextoComRealce texto={digesto.o_que_e.assunto} />
          </span>
          <span>
            <strong>Onde:</strong> <TextoComRealce texto={digesto.o_que_e.geografia} />
          </span>
          <span>
            <strong>Quando:</strong> <TextoComRealce texto={digesto.o_que_e.periodo} />
          </span>
        </div>

        <p className="rpt-detail-text">
          <TextoComRealce texto={digesto.resumo_curto} />
        </p>

        {digesto.resultado && digesto.resultado.tipo !== 'nao_aplicavel' && digesto.resultado.texto && (
          <div
            className={
              digesto.resultado.tipo === 'obtido'
                ? 'rpt-digesto-resultado rpt-digesto-resultado-obtido'
                : 'rpt-digesto-resultado rpt-digesto-resultado-esperado'
            }
          >
            {digesto.resultado.tipo === 'obtido' ? (
              <Flag className="size-4" aria-hidden />
            ) : (
              <Target className="size-4" aria-hidden />
            )}
            <div>
              <strong>{digesto.resultado.tipo === 'obtido' ? 'Resultado obtido' : 'O que se espera'}</strong>
              <p>
                <TextoComRealce texto={digesto.resultado.texto} />
                {digesto.resultado.pagina != null && (
                  <span className="rpt-digesto-pagina">página {digesto.resultado.pagina}</span>
                )}
              </p>
            </div>
          </div>
        )}

        {profundidade !== 'curto' && (
          <>
            <p className="rpt-detail-text">
              <TextoComRealce texto={digesto.resumo_medio} />
            </p>
            <p className="rpt-digesto-metodologia">
              <strong>Como foi feito o estudo:</strong> <TextoComRealce texto={digesto.o_que_e.metodologia} />
            </p>

            {digesto.credibilidade &&
              (digesto.credibilidade.tipo_dado || digesto.credibilidade.tamanho_amostra || digesto.credibilidade.observacoes) && (
                <p className="rpt-digesto-credibilidade">
                  <ClipboardCheck className="size-3.5" aria-hidden />
                  {digesto.credibilidade.tipo_dado && (
                    <span className="rpt-digesto-credibilidade-selo">
                      {digesto.credibilidade.tipo_dado === 'primario'
                        ? 'Dado primário'
                        : digesto.credibilidade.tipo_dado === 'secundario'
                          ? 'Dado secundário'
                          : 'Dados primários e secundários'}
                    </span>
                  )}
                  {digesto.credibilidade.tamanho_amostra && <span> Amostra: {digesto.credibilidade.tamanho_amostra}.</span>}
                  {digesto.credibilidade.observacoes && <span> {digesto.credibilidade.observacoes}</span>}
                </p>
              )}
          </>
        )}

        {profundidade === 'completo' && (
          <>
            {digesto.achados.length > 0 && (
              <section className="rpt-digesto-seccao">
                <h3>O que o relatório encontrou</h3>
                <ul className="rpt-digesto-lista">
                  {digesto.achados.map((a, i) => {
                    const tipo = classificarAchado(a.texto)
                    const IconeAchado = tipo === 'risco' ? TrendingDown : tipo === 'oportunidade' ? TrendingUp : Minus
                    return (
                      <li key={i}>
                        <span className={`rpt-digesto-achado-icone rpt-digesto-achado-icone-${tipo}`}>
                          <IconeAchado className="size-3.5" aria-hidden />
                        </span>
                        <span>
                          <TextoComRealce texto={a.texto} />
                        </span>
                        <span className="rpt-digesto-pagina">página {a.pagina}</span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {digesto.recomendacoes.length > 0 && (
              <section className="rpt-digesto-seccao">
                <h3>O que o relatório recomenda</h3>
                <ul className="rpt-digesto-lista">
                  {digesto.recomendacoes.map((r, i) => (
                    <li key={i}>
                      <span>
                        <TextoComRealce texto={r.texto} />
                        {(r.responsavel || r.prazo) && (
                          <span className="rpt-digesto-meta-recomendacao">
                            {r.responsavel ? ` · Quem deve agir: ${r.responsavel}` : ''}
                            {r.prazo ? ` · Prazo: ${r.prazo}` : ''}
                          </span>
                        )}
                      </span>
                      <span className="rpt-digesto-pagina">página {r.pagina}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {digesto.fontes.length > 0 && (
              <section className="rpt-digesto-seccao">
                <h3>Fontes citadas no relatório</h3>
                <ul className="rpt-digesto-lista rpt-digesto-lista-simples">
                  {digesto.fontes.map((f, i) => (
                    <li key={i}>
                      {f.instituicao}
                      {f.documento ? `, ${f.documento}` : ''}
                      {f.ano ? ` (${f.ano})` : ''}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {tabelaDados.variaveis.length > 0 && (
              <section className="rpt-digesto-seccao">
                <h3>Variáveis e dados usados neste relatório</h3>
                <div className="rpt-digesto-tabela-wrap">
                  <table className="rpt-digesto-tabela">
                    <thead>
                      <tr>
                        <th>Variável</th>
                        <th>Geografia</th>
                        <th>Unidade</th>
                        <th>Período</th>
                        <th>Valor mais recente</th>
                        <th>Pontos</th>
                        <th>Página</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabelaDados.variaveis.map((v, i) => (
                        <tr key={i}>
                          <td>{v.tema}</td>
                          <td>{v.geografia}</td>
                          <td>{v.unidade || 'n/d'}</td>
                          <td>{v.periodo ?? 'n/d'}</td>
                          <td>
                            {v.ultimoValor.toLocaleString('pt-PT', { maximumFractionDigits: 2 })}
                            {v.unidade ? ` ${v.unidade}` : ''}
                          </td>
                          <td>{v.nPontos}</td>
                          <td>{v.paginas.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {tabelaDados.graficos.length > 0 && (
              <section className="rpt-digesto-seccao">
                <h3>Em gráfico</h3>
                <div className="rpt-digesto-graficos">
                  {tabelaDados.graficos.map((g, i) => (
                    <AIChartRenderer key={i} chart={g} />
                  ))}
                </div>
              </section>
            )}

            {linhaTempo.length > 0 && (
              <section className="rpt-digesto-seccao">
                <h3>Linha do tempo</h3>
                <ol className="rpt-digesto-timeline">
                  {linhaTempo.map((evento, i) => (
                    <li key={i} className={`rpt-digesto-timeline-item rpt-digesto-timeline-${evento.tipo}`}>
                      <span className="rpt-digesto-timeline-ano">{evento.ano}</span>
                      <span className="rpt-digesto-timeline-texto">
                        <TextoComRealce texto={evento.texto} />
                        <span className="rpt-digesto-pagina">página {evento.pagina}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <MapaGeografiaRelatorio reportId={reportId} />

            {digesto.glossario && digesto.glossario.length > 0 && (
              <section className="rpt-digesto-seccao">
                <h3>Glossário</h3>
                <div className="rpt-digesto-glossario-pills">
                  {digesto.glossario.map((g, i) => (
                    <button
                      key={i}
                      type="button"
                      className="rpt-digesto-glossario-pill"
                      aria-pressed={termoGlossarioAberto === i}
                      onClick={() => setTermoGlossarioAberto((actual) => (actual === i ? null : i))}
                    >
                      {g.termo}
                    </button>
                  ))}
                </div>
                {termoGlossarioAberto != null && digesto.glossario[termoGlossarioAberto] && (
                  <div className="rpt-digesto-glossario-definicao">
                    <strong>{digesto.glossario[termoGlossarioAberto].termo}</strong>
                    <p>
                      <TextoComRealce texto={digesto.glossario[termoGlossarioAberto].definicao} />
                      <span className="rpt-digesto-pagina">página {digesto.glossario[termoGlossarioAberto].pagina}</span>
                    </p>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        <div className="rpt-digesto-rodape">
          <button type="button" onClick={descarregarPdf} disabled={aGerarPdf} className="rpt-btn rpt-btn-outline">
            {aGerarPdf ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
            {aGerarPdf ? 'A preparar o PDF…' : 'Descarregar este resumo em PDF'}
          </button>
          <button type="button" onClick={descarregarOnePager} disabled={aGerarOnePager} className="rpt-btn rpt-btn-outline">
            {aGerarOnePager ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <BookText className="size-4" aria-hidden />}
            {aGerarOnePager ? 'A preparar a ficha…' : 'Descarregar ficha de uma página'}
          </button>
          {erroPdf && <p className="rpt-digesto-erro">{erroPdf}</p>}
          {erroOnePager && <p className="rpt-digesto-erro">{erroOnePager}</p>}
        </div>
      </div>
    </div>
  )
}
