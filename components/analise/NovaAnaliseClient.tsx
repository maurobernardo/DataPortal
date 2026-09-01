'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  LayoutDashboard,
  Loader2,
  LineChart,
  Search,
  ShieldAlert,
  Clock,
  X,
  Compass,
  UserPlus,
  Map as MapIcon,
  Database,
  MessageSquare,
  MapPinned,
  FileText,
  LayoutGrid,
  Download,
  SlidersHorizontal,
  BookOpen,
  Mic,
  Square,
  Lightbulb,
  ArrowRight,
  Info,
} from 'lucide-react'
import { getCategoryIcon } from '@/lib/ai-category-icons'
import '@/app/geo-catalog.css'
import '@/app/ai-insights.css'

export type DatasetParaEscolha = {
  id: number
  title: string
  dataType: string
  source: string | null
  year: number | string | null
  format: string | null
  description: string | null
  category: { id: number; name: string } | null
}

const MAX_DATASETS = 3
const MIN_PERGUNTA = 5

type EventoStream = { tipo: string; [chave: string]: unknown }

/**
 * Consome o SSE de POST /api/analise.
 *
 * EventSource não suporta corpo em POST, por isso o streaming é lido manualmente do
 * ReadableStream da resposta: cada quadro "data: {...}\n\n" é um evento do pipeline.
 */
async function* lerEventos(resposta: Response): AsyncGenerator<EventoStream> {
  const leitor = resposta.body?.getReader()
  if (!leitor) return
  const descodificador = new TextDecoder()
  let restante = ''

  while (true) {
    const { done, value } = await leitor.read()
    if (done) break
    restante += descodificador.decode(value, { stream: true })
    const quadros = restante.split('\n\n')
    restante = quadros.pop() || ''
    for (const quadro of quadros) {
      const linha = quadro.split('\n').find((l) => l.startsWith('data: '))
      if (!linha) continue
      try {
        yield JSON.parse(linha.slice(6))
      } catch {
        // Quadro corrompido ou parcial: ignora-se em vez de rebentar o ecrã inteiro.
      }
    }
  }
}

// Antes rodava por 4 mensagens genéricas sem qualquer relação com o tempo real decorrido: aos 90s
// dizia a mesma coisa vaga que aos 5s, o que não é sincero (não diz nada sobre o que está mesmo a
// demorar) nem informativo. Isto substitui por texto que muda com o tempo real e diz a verdade: a
// maior parte da espera é UMA chamada ao modelo a preparar o plano, sem sub-passos para mostrar
// antes dela terminar — em vez de fingir progresso com uma frase genérica a repetir, explica-se
// isso directamente assim que o tempo o justifica.
function mensagemDeEspera(segundos: number): string {
  if (segundos < 8) return 'A carregar os dados seleccionados...'
  if (segundos < 25) return 'A interpretar a pergunta e escolher os métodos de cálculo...'
  if (segundos < 50) {
    return 'Perguntas com vários critérios pedem um plano maior, que demora mais a preparar.'
  }
  return 'Ainda a preparar o plano: perguntas assim costumam demorar entre 1 e 3 minutos nesta fase.'
}

export function NovaAnaliseClient({ datasets }: { datasets: DatasetParaEscolha[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pesquisa, setPesquisa] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | number | null>(null)
  const [seleccionados, setSeleccionados] = useState<number[]>([])
  const [pergunta, setPergunta] = useState('')
  const [aCorrer, setACorrer] = useState(false)
  const [aAbrirDashboard, setAAbrirDashboard] = useState(false)
  const [mensagemEspera, setMensagemEspera] = useState(mensagemDeEspera(0))
  const [progresso, setProgresso] = useState(5)
  // Progresso real (não só decorativo): os passos do plano já vinham com descrições pensadas para
  // isto ("descricao_humana... é lida em tempo real numa barra de progresso" — prompts.ts) mas a
  // UI nunca os mostrava, só um spinner genérico a rodar mensagens por tempo. Numa análise de
  // 2-4 minutos isso é indistinguível de estar pendurada; uma lista que vai marcando passos reais
  // mostra que está mesmo a trabalhar.
  const [passosPlano, setPassosPlano] = useState<{ id: string; descricao_humana: string; feito: boolean }[]>([])
  // PLANO-ARQUITETURA-DUAS-FASES.md: o SSE já emitia 'calc_pronto' assim que cada valor era
  // calculado, mas nada no browser fazia nada com isso — o utilizador só via a barra genérica
  // durante os 3-8 minutos todos. Mostrar os números reais a aparecer ao vivo ataca directamente
  // a percepção de "ecrã vazio", sem mudar nada do tempo real de cálculo.
  const [calcsAoVivo, setCalcsAoVivo] = useState<{ id: string; valor: number | string; unidade: string }[]>([])
  // Segundos reais decorridos (não simulados como a barra de progresso abaixo): o Planeamento
  // sozinho pode levar 90-185s sem emitir nenhum evento, e nesse intervalo a barra de progresso
  // genérica é indistinguível de estar pendurada. Um contador que sobe de verdade, mesmo sem
  // dizer o mecanismo interno, já comunica "ainda está vivo" de forma honesta.
  const [segundosDecorridos, setSegundosDecorridos] = useState(0)
  const [indiceCuriosidade, setIndiceCuriosidade] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  // Recusa do motor: os dados não respondem à pergunta feita. Estado separado do `erro` porque
  // não é uma avaria e não se lê como tal — traz a causa concreta e as perguntas que estes dados
  // respondem bem, para o utilizador ter saída em vez de um beco.
  const [inviavel, setInviavel] = useState<{
    evidencia: { tipo: string; exigido: string; disponivel: string; explicacao: string }
    sugestoes: { pergunta: string; porque: string }[]
  } | null>(null)
  const [manualExpanded, setManualExpanded] = useState<Record<string | number, boolean>>({})
  const abortRef = useRef<AbortController | null>(null)
  const inviavelRef = useRef<HTMLElement>(null)
  const perguntaRef = useRef<HTMLTextAreaElement>(null)

  // Leva a pessoa ate a explicacao. Sem isto, clicar em Analisar e receber uma recusa deixava a
  // pagina visualmente na mesma: o motivo e as alternativas ficavam fora do ecra, e a impressao era
  // de que nada tinha acontecido. Uma recusa so cumpre a sua funcao se for lida.
  useEffect(() => {
    if (!inviavel) return
    inviavelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [inviavel])

  // Pergunta por voz (PLANO-INTELIGENCIA-PORTAL.md): usa o reconhecimento de voz do próprio
  // navegador (Web Speech API — só Chrome/Edge, por isso o botão só aparece quando existe), que é
  // grátis. Uma versão universal (qualquer navegador) exigiria gravar o áudio e mandá-lo para um
  // serviço pago de transcrição (ex.: Google Cloud Speech-to-Text) — decidiu-se ficar com a opção
  // grátis por agora. O texto que sai do reconhecimento de voz vem quase sempre sem pontuação e a
  // confundir nomes de províncias/termos técnicos; por isso, ao parar de gravar, esse texto passa
  // uma vez pelo modelo (`/api/analise/corrigir-transcricao`) só para corrigir a forma, nunca o
  // conteúdo.
  const [reconhecimentoDisponivel, setReconhecimentoDisponivel] = useState(false)
  const [aGravarVoz, setAGravarVoz] = useState(false)
  const [aCorrigirVoz, setACorrigirVoz] = useState(false)
  const reconhecimentoRef = useRef<any>(null)
  const textoAntesDaGravacaoRef = useRef('')
  const transcricaoFinalRef = useRef('')
  // O Chrome dispara "onend" sozinho ao fim de poucos segundos de silêncio, mesmo com
  // continuous=true (ex.: a pessoa demora um instante a começar a falar depois de clicar) — sem
  // isto, a gravação parecia parar sozinha a meio da pergunta. Esta flag distingue esse corte
  // automático (reinicia sozinho, sem o utilizador reparar) de um "parar" a sério, clicado.
  const gravacaoDesejadaRef = useRef(false)
  // No Chrome mobile o pedido de permissão do sistema (Android) é assíncrono: o primeiro toque
  // chega a arrancar o reconhecimento antes da resposta do popup de permissão chegar, e falha com
  // "not-allowed" mesmo que a pessoa vá aceitar de seguida. Esta flag permite tentar de novo, uma
  // única vez, em vez de mostrar logo um erro que confunde quem está a aceitar a permissão agora.
  const tentouReiniciarAposPermissaoRef = useRef(false)

  useEffect(() => {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setReconhecimentoDisponivel(Boolean(Ctor))
    return () => {
      gravacaoDesejadaRef.current = false
      reconhecimentoRef.current?.stop()
    }
  }, [])

  async function finalizarGravacaoVoz() {
    setAGravarVoz(false)
    const bruto = transcricaoFinalRef.current.trim()
    if (!bruto) return

    setACorrigirVoz(true)
    try {
      const res = await fetch('/api/analise/corrigir-transcricao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: bruto }),
      })
      const dados = await res.json().catch(() => null)
      const corrigido = res.ok && dados?.texto ? dados.texto : bruto
      const base = textoAntesDaGravacaoRef.current
      const separador = base && !base.endsWith(' ') ? ' ' : ''
      setPergunta(`${base}${separador}${corrigido}`.slice(0, 500))
    } catch {
      // Falhou a correcção: fica o texto bruto já preenchido em tempo real durante a gravação.
    } finally {
      setACorrigirVoz(false)
    }
  }

  function criarReconhecimento() {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const reconhecimento = new Ctor()
    reconhecimento.lang = 'pt-PT'
    reconhecimento.continuous = true
    reconhecimento.interimResults = true

    reconhecimento.onresult = (evento: any) => {
      let interim = ''
      for (let i = evento.resultIndex; i < evento.results.length; i++) {
        const resultado = evento.results[i]
        if (resultado.isFinal) {
          transcricaoFinalRef.current += resultado[0].transcript
        } else {
          interim += resultado[0].transcript
        }
      }
      const base = textoAntesDaGravacaoRef.current
      const separador = base && !base.endsWith(' ') ? ' ' : ''
      setPergunta(`${base}${separador}${transcricaoFinalRef.current}${interim}`.slice(0, 500))
    }

    reconhecimento.onerror = (evento: any) => {
      // "no-speech" é só "ainda não ouvi nada" — não é razão para desistir enquanto o utilizador
      // continuar a querer gravar; outros erros (ex.: microfone recusado) esses sim terminam.
      if (evento?.error === 'no-speech') return

      if (evento?.error === 'not-allowed' && !tentouReiniciarAposPermissaoRef.current && gravacaoDesejadaRef.current) {
        tentouReiniciarAposPermissaoRef.current = true
        setTimeout(() => {
          if (!gravacaoDesejadaRef.current) return
          try {
            reconhecimento.start()
          } catch {
            gravacaoDesejadaRef.current = false
            setAGravarVoz(false)
          }
        }, 400)
        return
      }

      gravacaoDesejadaRef.current = false
      console.error('[perguntar-por-voz] erro do reconhecimento de voz:', evento?.error, evento?.message)
      alert(`Erro no reconhecimento de voz: ${evento?.error || 'desconhecido'}${evento?.message ? `: ${evento.message}` : ''}`)
    }

    reconhecimento.onend = () => {
      if (gravacaoDesejadaRef.current) {
        // Corte automático do navegador em silêncio: recomeça sozinho, sem perder o que já foi
        // dito (transcricaoFinalRef mantém-se), o utilizador nem chega a notar.
        try {
          reconhecimento.start()
          return
        } catch {
          /* se falhar a reiniciar, finaliza como se tivesse mesmo parado */
        }
      }
      finalizarGravacaoVoz()
    }

    return reconhecimento
  }

  function alternarGravacaoVoz() {
    if (aGravarVoz) {
      gravacaoDesejadaRef.current = false
      reconhecimentoRef.current?.stop()
      return
    }

    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!Ctor) return

    textoAntesDaGravacaoRef.current = pergunta
    transcricaoFinalRef.current = ''
    gravacaoDesejadaRef.current = true
    tentouReiniciarAposPermissaoRef.current = false
    reconhecimentoRef.current = criarReconhecimento()
    reconhecimentoRef.current.start()
    setAGravarVoz(true)
  }

  // Pré-preenche a partir de "Perguntas sugeridas" de uma análise anterior (?datasets=1,2&pergunta=...):
  // o utilizador continua a ter de carregar em "Analisar" — nunca dispara sozinho, isso teria um
  // custo real sem confirmação.
  useEffect(() => {
    const datasetsParam = searchParams.get('datasets')
    const perguntaParam = searchParams.get('pergunta')
    if (datasetsParam) {
      const ids = datasetsParam
        .split(',')
        .map((v) => Number.parseInt(v, 10))
        .filter((id) => Number.isFinite(id) && datasets.some((d) => d.id === id))
        .slice(0, MAX_DATASETS)
      if (ids.length > 0) setSeleccionados(ids)
    }
    if (perguntaParam) setPergunta(perguntaParam.slice(0, 500))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Enquanto a análise corre, a mensagem muda com o TEMPO REAL decorrido (mensagemDeEspera), não
  // por uma rotação arbitrária desligada da realidade — e a barra de progresso avança por tempo,
  // já que não há sub-passos reais para mostrar antes do plano estar pronto.
  useEffect(() => {
    if (!aCorrer || aAbrirDashboard) return
    const intervaloMensagem = setInterval(() => {
      setSegundosDecorridos((s) => {
        setMensagemEspera(mensagemDeEspera(s + 1))
        return s + 1
      })
    }, 1000)
    const intervaloProgresso = setInterval(() => {
      setProgresso((p) => (p < 90 ? p + 1.5 : p))
    }, 800)
    // Roda por curiosidades sobre o portal enquanto a análise corre — só decorativo no sentido de
    // que não representa progresso, mas o conteúdo em si é real (números contados, funcionalidades
    // que existem de facto), não frases vazias a fingir actividade.
    const intervaloCuriosidade = setInterval(() => {
      setIndiceCuriosidade((i) => i + 1)
    }, 7000)
    return () => {
      clearInterval(intervaloMensagem)
      clearInterval(intervaloProgresso)
      clearInterval(intervaloCuriosidade)
    }
  }, [aCorrer, aAbrirDashboard])

  // Chips de categoria: calculados sobre TODOS os datasets (não os já filtrados por pesquisa),
  // senão a lista de categorias encolhia à medida que se escrevia na pesquisa.
  const categoriasDisponiveis = useMemo(() => {
    // Mesma correcção do agrupamento principal: chave inclui sempre o tipo de dado (uma categoria
    // pode ter datasets geoespaciais e alfanuméricos ao mesmo tempo), e o rótulo diz sempre o tipo,
    // não só quando há colisão de nome com outra categoria.
    const mapa = new Map<string, { nomeBase: string; tipoLabel: string; total: number }>()
    for (const d of datasets) {
      const idCategoria = d.category?.id ?? 'sem-categoria'
      const chave = `${idCategoria}::${d.dataType}`
      const nomeBase = d.category?.name || 'Sem categoria'
      const tipoLabel = d.dataType === 'geoespacial' ? 'Geoespacial' : 'Alfanumérico'
      const actual = mapa.get(chave)
      mapa.set(chave, { nomeBase, tipoLabel, total: (actual?.total || 0) + 1 })
    }
    return Array.from(mapa.entries())
      .map(([chave, v]) => ({ chave, ...v }))
      .sort((a, b) => `${a.nomeBase} ${a.tipoLabel}`.localeCompare(`${b.nomeBase} ${b.tipoLabel}`))
  }, [datasets])

  // Curiosidades sobre o portal para a tela de espera: números reais (contados a partir dos
  // datasets recebidos por prop, nunca inventados) misturados com funcionalidades genuínas que
  // já existem — não é decoração vazia, é a mesma informação que aparece noutras páginas do
  // portal, só trazida para aqui onde a pessoa está, de qualquer forma, à espera.
  const nGeoespaciais = useMemo(() => datasets.filter((d) => d.dataType === 'geoespacial').length, [datasets])
  const nAlfanumericos = datasets.length - nGeoespaciais
  // Guia do portal de ponta a ponta, não só factos soltos sobre esta análise: conta, navegação,
  // cada catálogo, e as funcionalidades das próprias análises — a mesma informação que estaria
  // espalhada por várias páginas de ajuda, trazida para aqui porque é aqui que a pessoa está, de
  // qualquer forma, uns minutos parada. Números reais (datasets.length etc.), o resto são
  // funcionalidades genuínas do portal, não texto de enchimento.
  const curiosidades = useMemo(
    () => [
      {
        icone: Database,
        texto: `O portal tem ${datasets.length} conjuntos de dados disponíveis, ${nGeoespaciais} geoespaciais e ${nAlfanumericos} alfanuméricos, distribuídos por ${categoriasDisponiveis.length} categorias.`,
      },
      {
        icone: UserPlus,
        texto: 'Sem conta ainda? Criar uma é grátis e dá acesso a guardar análises, favoritos e pedidos de dados personalizados.',
      },
      {
        icone: MapIcon,
        texto: 'Em "Geoespaciais" exploras mapas e camadas do país inteiro sem precisar de fazer nenhuma pergunta em português: filtra, visualiza e descarrega directamente.',
      },
      {
        icone: Database,
        texto: 'Em "Alfanuméricos" ficam as tabelas de dados sem componente de mapa: estatísticas, indicadores e séries por sector.',
      },
      {
        icone: MapPinned,
        texto: '"Mapas Inteligentes" tem dashboards de mapa já montados sobre temas específicos, prontos a explorar sem configurar nada.',
      },
      {
        icone: FileText,
        texto: '"Relatórios" reúne documentos e publicações já escritos, para quem prefere ler uma análise pronta em vez de fazer uma pergunta.',
      },
      {
        icone: LayoutGrid,
        texto: '"Serviços" lista outras ferramentas do portal, incluindo pedidos de dados que ainda não estejam publicados.',
      },
      {
        icone: SlidersHorizontal,
        texto: 'Nos mapas de uma análise dá para comparar duas unidades lado a lado: activa "Comparar" e clica em duas províncias, distritos ou pontos.',
      },
      {
        icone: Search,
        texto: 'Os mapas têm pesquisa por nome de unidade e filtro por província ou distrito, para ires direito à área que te interessa.',
      },
      {
        icone: Download,
        texto: 'Cada análise pode ser descarregada em PDF ou HTML, ou partilhada por link, no botão no topo da página de resultado.',
      },
      {
        icone: BookOpen,
        texto: 'Uma análise pode juntar até 3 datasets ao mesmo tempo, cruzando dados de fontes diferentes numa só pergunta.',
      },
      {
        icone: Compass,
        texto: 'Todas as tuas análises anteriores ficam à distância de um clique em "Minhas análises", no topo desta página.',
      },
    ],
    [datasets.length, nGeoespaciais, nAlfanumericos, categoriasDisponiveis.length]
  )

  const filtrados = (pesquisa.trim()
    ? datasets.filter((d) => d.title.toLowerCase().includes(pesquisa.trim().toLowerCase()))
    : datasets
  ).filter((d) => categoriaFiltro === null || `${d.category?.id ?? 'sem-categoria'}::${d.dataType}` === categoriaFiltro)

  const grupos = useMemo(() => {
    // Chave inclui SEMPRE o tipo de dado, não só o id da categoria: uma categoria (ex.: "Saúde")
    // pode ter datasets geoespaciais e alfanuméricos ao mesmo tempo, e antes ficavam todos no
    // mesmo acordeão, só distinguíveis pela etiqueta pequena "Geo"/"Tabular" dentro do cartão —
    // fácil de passar despercebido a percorrer a lista. Separar sempre por tipo garante que cada
    // grupo é homogéneo (nunca mistura os dois) e que o rótulo do cabeçalho é sempre exacto.
    const mapa = new Map<string, { categoria: { id: number; name: string } | null; dataType: string; itens: DatasetParaEscolha[] }>()
    for (const d of filtrados) {
      const idCategoria = d.category?.id ?? 'sem-categoria'
      const chave = `${idCategoria}::${d.dataType}`
      if (!mapa.has(chave)) mapa.set(chave, { categoria: d.category, dataType: d.dataType, itens: [] })
      mapa.get(chave)!.itens.push(d)
    }
    const lista = Array.from(mapa.entries()).map(([chave, valor]) => ({ chave, ...valor }))

    // O tipo de dado (Geoespacial/Alfanumérico) aparece sempre no cabeçalho, mesmo quando o nome
    // da categoria já é único: cada cartão lá dentro só tem um tipo (o grupo é sempre homogéneo),
    // por isso o cabeçalho pode sempre dizê-lo com certeza — não é só desambiguação, é informação
    // útil por si só antes de sequer abrir o grupo.
    return lista
      .map((g) => {
        const nomeBase = g.categoria?.name || 'Sem categoria'
        const tipoLabel = g.dataType === 'geoespacial' ? 'Geoespacial' : 'Alfanumérico'
        return { ...g, nomeBase, tipoLabel }
      })
      .sort((a, b) => `${a.nomeBase} ${a.tipoLabel}`.localeCompare(`${b.nomeBase} ${b.tipoLabel}`))
  }, [filtrados])

  const temFiltro = pesquisa.trim().length > 0

  // Só a primeira categoria vem aberta por omissão — com todas abertas de uma vez (como esteve
  // antes) o ecrã ficava cheio logo ao entrar na página, antes de a pessoa sequer escrever a
  // pergunta. Continua sem caixa com scroll interno (isso é que incomodava no telemóvel): abrir
  // mais categorias só estica a página normalmente, não cria uma zona presa a arrastar.
  function estaExpandido(chave: number | string, indice: number) {
    if (chave in manualExpanded) return manualExpanded[chave]
    return indice === 0
  }

  function alternarCategoria(chave: number | string, indice: number) {
    setManualExpanded((prev) => ({ ...prev, [chave]: !estaExpandido(chave, indice) }))
  }

  function alternar(id: number) {
    setSeleccionados((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_DATASETS) return prev
      return [...prev, id]
    })
  }

  const perguntaValida = pergunta.trim().length >= MIN_PERGUNTA
  const datasetsValidos = seleccionados.length > 0
  const podeAnalisar = perguntaValida && datasetsValidos

  // `perguntaAlternativa` serve o clique numa sugestão do ecrã de recusa: o texto tem de valer já
  // nesta chamada, e não no render seguinte, senão a análise arrancava com a pergunta antiga.
  async function iniciar(perguntaAlternativa?: string) {
    const texto = (perguntaAlternativa ?? pergunta).trim()
    if (!datasetsValidos || texto.length < MIN_PERGUNTA) return
    if (perguntaAlternativa) setPergunta(perguntaAlternativa)
    setACorrer(true)
    setErro(null)
    setInviavel(null)
    setMensagemEspera(mensagemDeEspera(0))
    setProgresso(5)
    setPassosPlano([])
    setCalcsAoVivo([])
    setSegundosDecorridos(0)

    const controlador = new AbortController()
    abortRef.current = controlador

    try {
      const resposta = await fetch('/api/analise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pergunta: texto,
          dataset_ids: seleccionados,
          fontes_externas: false,
        }),
        signal: controlador.signal,
      })

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null)
        throw new Error(corpo?.error || `Falha ao iniciar a análise (${resposta.status})`)
      }

      for await (const evento of lerEventos(resposta)) {
        if (evento.tipo === 'concluido') {
          // Mantém o ecrã de espera visível: só sai dele quando a navegação para o
          // dashboard já tiver a página seguinte pronta, nunca voltando ao ecrã de selecção.
          setAAbrirDashboard(true)
          setProgresso(100)
          router.push(evento.url as string)
          return
        } else if (evento.tipo === 'inviavel') {
          // Não navega: não há dashboard nenhum do outro lado. Fica aqui, com os datasets ainda
          // seleccionados, para o utilizador poder escolher uma das alternativas sem recomeçar.
          setInviavel({
            evidencia: evento.evidencia as any,
            sugestoes: (evento.sugestoes as any[]) || [],
          })
          setACorrer(false)
          return
        } else if (evento.tipo === 'erro') {
          throw new Error((evento.mensagem as string) || 'A análise falhou')
        } else if (evento.tipo === 'plano_pronto') {
          const passos = (evento.passos as { id: string; descricao_humana: string }[]) || []
          setPassosPlano(passos.map((p) => ({ ...p, feito: false })))
        } else if (evento.tipo === 'passo_fim') {
          const id = evento.id as string
          setPassosPlano((prev) => prev.map((p) => (p.id === id ? { ...p, feito: true } : p)))
        } else if (evento.tipo === 'calc_pronto') {
          const id = evento.id as string
          const valor = evento.valor as number | string
          const unidade = (evento.unidade as string) || ''
          setCalcsAoVivo((prev) => [...prev, { id, valor, unidade }].slice(-6))
        }
      }
      throw new Error('A ligação terminou antes da análise concluir. Tente novamente.')
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setErro(e?.message || 'Algo correu mal.')
        setACorrer(false)
      }
    } finally {
      abortRef.current = null
    }
  }

  return (
    <div className="pdx min-h-screen">
      <div className="w-full max-w-[1280px] mx-auto px-4 md:px-6 py-6">
        {!aCorrer && (
          <div className="flex items-center justify-end gap-2 mb-2">
            <Link href="/analise" className="pdx-btn">
              <LayoutDashboard className="size-4" aria-hidden />
              Minhas análises
            </Link>
          </div>
        )}

        <header className="pdx-cabecalho-pagina">
          <p className="pdx-selo">
            <LineChart className="size-3.5" aria-hidden />
            Motor de análise profunda
          </p>
          <h1>Faça uma pergunta aos dados</h1>
          <p>
            Escreva a pergunta em português ou em inglês, como escreveria a um colega: por exemplo
            "quais as províncias com mais produção de milho em 2023" ou "compare o número de
            escolas entre Nampula e Sofala". Escolha entre 1 e 3 datasets abaixo antes de perguntar.
            Verificamos os dados com cuidado antes de responder, por isso uma análise pode levar
            entre 30 segundos e alguns minutos consoante a complexidade da pergunta; veja o guia
            acima para saber mais sobre como tirar melhor partido de cada análise.
          </p>
        </header>

        {!aCorrer && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 lg:gap-5 items-start">
              <section className="pdx-panel">
                <div className="pdx-panel-head">
                  <span className="pdx-panel-icone" aria-hidden>
                    <MessageSquare className="size-3.5" />
                  </span>
                  <label htmlFor="na-pergunta">
                    <h2>Pergunta</h2>
                  </label>
                  <span className="ml-auto">
                  {reconhecimentoDisponivel && (
                    <button
                      type="button"
                      onClick={alternarGravacaoVoz}
                      disabled={aCorrigirVoz}
                      className="pdx-chip"
                      title={aGravarVoz ? 'Parar gravação' : 'Fazer a pergunta por voz'}
                      aria-pressed={aGravarVoz}
                    >
                      {aCorrigirVoz ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          A corrigir…
                        </>
                      ) : aGravarVoz ? (
                        <>
                          <Square className="size-3 fill-current" aria-hidden />
                          A gravar… parar
                        </>
                      ) : (
                        <>
                          <Mic className="size-3.5" aria-hidden />
                          Perguntar por voz
                        </>
                      )}
                    </button>
                  )}
                  </span>
                </div>
                <div className="pdx-panel-body">
                  <textarea
                    id="na-pergunta"
                    ref={perguntaRef}
                    value={pergunta}
                    onChange={(e) => setPergunta(e.target.value)}
                    rows={5}
                    maxLength={500}
                    placeholder="Ex.: Onde estão concentradas as escolas em Moçambique?"
                    className="pdx-textarea"
                  />
                  <p className="mt-2 text-[11px] text-right pdx-num" style={{ color: 'var(--ink-faint)' }}>
                    {pergunta.length}/500
                  </p>
                </div>
              </section>

              <section className="pdx-panel flex flex-col min-w-0">
                <div className="pdx-panel-head">
                  <span className="pdx-panel-icone" aria-hidden>
                    <Database className="size-3.5" />
                  </span>
                  <h2>Datasets</h2>
                  <span className="pdx-contador ml-auto" data-completo={datasetsValidos}>
                    {seleccionados.length}/{MAX_DATASETS}
                  </span>
                </div>
                <div className="pdx-panel-body">

                {seleccionados.length > 0 && (
                  <ul aria-label="Datasets seleccionados" className="flex flex-wrap gap-1.5 mb-3">
                    {seleccionados.map((id) => {
                      const d = datasets.find((x) => x.id === id)
                      if (!d) return null
                      return (
                        <li key={id}>
                          <span className="pdx-etiqueta">
                            <span className="truncate max-w-[150px]">{d.title}</span>
                            <button
                              type="button"
                              onClick={() => alternar(id)}
                              aria-label={`Remover ${d.title} da selecção`}
                            >
                              <X className="size-3.5" aria-hidden />
                            </button>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}

                <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Filtrar por categoria">
                  <button
                    type="button"
                    onClick={() => setCategoriaFiltro(null)}
                    aria-pressed={categoriaFiltro === null}
                    className="pdx-chip"
                  >
                    Todas · {datasets.length}
                  </button>
                  {categoriasDisponiveis.map((c) => (
                    <button
                      key={c.chave}
                      type="button"
                      onClick={() => setCategoriaFiltro((v) => (v === c.chave ? null : c.chave))}
                      aria-pressed={categoriaFiltro === c.chave}
                      className="pdx-chip"
                    >
                      {c.nomeBase}{' '}
                      <span style={{ color: categoriaFiltro === c.chave ? 'var(--gold-soft)' : '#7a5c12' }}>
                        · {c.tipoLabel}
                      </span>{' '}
                      · {c.total}
                    </button>
                  ))}
                </div>

                <label
                  htmlFor="na-pesquisa-dataset"
                  className="block text-[11px] font-bold uppercase tracking-wide mb-1.5"
                  style={{ color: 'var(--ink-faint)' }}
                >
                  Procurar dataset
                </label>
                <div className="relative mb-3">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 size-4 z-10"
                    style={{ color: 'var(--ink-faint)' }}
                    aria-hidden
                  />
                  <input
                    id="na-pesquisa-dataset"
                    type="text"
                    value={pesquisa}
                    onChange={(e) => setPesquisa(e.target.value)}
                    placeholder="Nome do dataset..."
                    className="pdx-campo pdx-campo-com-icone w-full"
                  />
                </div>

                <div className="space-y-3">
                  {grupos.map((grupo, indice) => {
                    const expandido = estaExpandido(grupo.chave, indice)
                    const CategoryIcon = getCategoryIcon(grupo.categoria?.name)
                    return (
                      <div key={grupo.chave} className="pdx-grupo">
                        <button
                          type="button"
                          onClick={() => alternarCategoria(grupo.chave, indice)}
                          aria-expanded={expandido}
                        >
                          {/* Categoria é a informação que organiza esta lista inteira: sem destaque
                              próprio (antes era texto cinza do mesmo peso visual dos títulos dos
                              datasets lá dentro), passava despercebida a quem percorre vários
                              grupos seguidos. Verde de marca continua a ser a base; só o tipo de
                              dado (Geoespacial/Alfanumérico) tem cor própria, para se distinguir do
                              nome da categoria à primeira vista. */}
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="icone" aria-hidden>
                              <CategoryIcon className="w-4 h-4" />
                            </span>
                            <span className="nome">
                              {grupo.nomeBase} <span className="tipo">· {grupo.tipoLabel}</span>
                            </span>
                            <span className="conta">{grupo.itens.length}</span>
                          </span>
                          {expandido ? (
                            <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--forest-800)' }} aria-hidden />
                          ) : (
                            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--forest-800)' }} aria-hidden />
                          )}
                        </button>
                        {expandido && (
                          <div className="grid grid-cols-1 gap-2 p-3">
                            {grupo.itens.map((d) => {
                              const activo = seleccionados.includes(d.id)
                              const desactivado = !activo && seleccionados.length >= MAX_DATASETS
                              return (
                                <button
                                  key={d.id}
                                  type="button"
                                  disabled={desactivado}
                                  aria-pressed={activo}
                                  onClick={() => alternar(d.id)}
                                  className="pdx-dataset"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="titulo line-clamp-2">{d.title}</p>
                                    <span className="caixa" aria-hidden>
                                      {activo && <Check className="size-3" />}
                                    </span>
                                  </div>
                                  {d.description && <p className="desc line-clamp-2">{d.description}</p>}
                                  <div className="flex items-center flex-wrap gap-1.5 mt-2">
                                    <span
                                      className="pdx-tipo"
                                      data-tipo={d.dataType === 'geoespacial' ? 'geoespacial' : 'tabular'}
                                    >
                                      {d.dataType === 'geoespacial' ? 'Geo' : 'Tabular'}
                                    </span>
                                    {d.format && <span className="pdx-formato">{d.format}</span>}
                                  </div>
                                  <p className="rodape">{[d.source, d.year].filter(Boolean).join(' · ')}</p>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {grupos.length === 0 && (
                    <p className="text-[13px] py-4 text-center" style={{ color: 'var(--ink-faint)' }}>
                      Nenhum dataset encontrado.
                    </p>
                  )}
                </div>
                </div>
              </section>
            </div>

            {erro && (
              <div className="pdx-erro">
                <ShieldAlert className="size-4 shrink-0 mt-0.5" aria-hidden />
                <p className="m-0">{erro}</p>
              </div>
            )}

            {/* Recusa fundamentada. Deliberadamente sem vermelho nem ícone de alarme: nada falhou,
                e pintar isto como avaria ensinaria o utilizador a ler uma decisão correcta do motor
                como um defeito do portal. O par "o que pediu / o que os dados têm" mostra o
                raciocínio em vez de só o afirmar, que é o que torna a recusa credível. */}
            {inviavel && (
              <section ref={inviavelRef} className="pdx-panel mt-4 scroll-mt-24">
                <div className="pdx-panel-body pdx-recusa">
                  <h2>Estes dados não respondem a essa pergunta</h2>
                  <p className="explicacao">{inviavel.evidencia.explicacao}</p>

                  <dl className="pdx-confronto">
                    <div>
                      <dt>A pergunta precisa de</dt>
                      <dd>{inviavel.evidencia.exigido}</dd>
                    </div>
                    <div>
                      <dt>Os dados seleccionados têm</dt>
                      <dd>{inviavel.evidencia.disponivel || 'nada equivalente'}</dd>
                    </div>
                  </dl>

                  <p className="pdx-recusa-nota">
                    <Info className="size-3.5 shrink-0 mt-0.5" aria-hidden />
                    Preferimos não publicar nada a publicar uma análise que responderia a outra
                    pergunta.
                  </p>
                </div>

                {inviavel.sugestoes.length > 0 && (
                  <div
                    className="px-5 py-4"
                    style={{ borderTop: '1px solid var(--line-soft)', background: 'var(--paper-dim)' }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Lightbulb className="size-4" style={{ color: 'var(--forest-700)' }} aria-hidden />
                      <h3 className="text-[13.5px] font-bold" style={{ color: 'var(--forest-800)' }}>
                        O que estes dados respondem bem
                      </h3>
                    </div>
                    <p className="text-[12.5px] mb-3" style={{ color: 'var(--ink-soft)' }}>
                      Verificámos cada uma destas contra as colunas dos datasets que escolheu.
                      Clique numa para analisar.
                    </p>
                    <ul className="flex flex-col gap-2">
                      {inviavel.sugestoes.map((s, i) => (
                        <li key={i}>
                          <button type="button" onClick={() => iniciar(s.pergunta)} className="pdx-sugestao w-full">
                            <span className="min-w-0">
                              <span className="block font-semibold">{s.pergunta}</span>
                              {s.porque && <span className="pdx-sugestao-porque">{s.porque}</span>}
                            </span>
                            <ArrowRight className="size-4 shrink-0 mt-0.5" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            <div className="pdx-accoes-fundo">
              <div>
                <div className="flex items-center gap-2 text-[13px] font-semibold">
                  <span className="pdx-estado-pronto" data-ok={perguntaValida}>
                    {perguntaValida ? (
                      <CheckCircle2 className="size-4" aria-hidden />
                    ) : (
                      <Circle className="size-4" aria-hidden />
                    )}
                    Pergunta
                  </span>
                  <span style={{ color: 'var(--line)' }} aria-hidden>
                    ·
                  </span>
                  <span className="pdx-estado-pronto" data-ok={datasetsValidos}>
                    {datasetsValidos ? (
                      <CheckCircle2 className="size-4" aria-hidden />
                    ) : (
                      <Circle className="size-4" aria-hidden />
                    )}
                    Datasets {seleccionados.length}/{MAX_DATASETS}
                  </span>
                </div>
                {!podeAnalisar && (
                  <p className="text-[12px] mt-1" style={{ color: 'var(--ink-faint)' }} aria-live="polite">
                    Seleccione 1 a {MAX_DATASETS} datasets e escreva a sua pergunta (mín. {MIN_PERGUNTA} caracteres).
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => iniciar()}
                disabled={!podeAnalisar}
                className="pdx-btn pdx-btn-primary pdx-btn-grande"
              >
                Analisar
              </button>
            </div>
          </>
        )}

        {aCorrer && (
          <section className="pdx-panel p-8 md:p-10 text-center">
            <div className="pdx-progresso-anel mx-auto mb-5">
              <Loader2 className="size-7 animate-spin" aria-hidden />
            </div>
            <p className="text-base font-bold mb-1.5" style={{ color: 'var(--ink)' }}>
              {aAbrirDashboard ? 'A abrir a análise...' : 'A analisar, aguarde...'}
            </p>
            <p className="text-[13px] mb-1 min-h-[1.25em]" style={{ color: 'var(--ink-soft)' }}>
              {aAbrirDashboard ? 'Quase pronto.' : mensagemEspera}
            </p>
            {/* Tempo real decorrido, não simulado: nos primeiros 60-200s (Planeamento) não há
                nenhum evento real para mostrar — este contador é a única prova honesta de que
                continua a correr, em vez de deixar a barra de progresso parecer presa sozinha. */}
            {!aAbrirDashboard && (
              <p className="text-[11px] mb-6 pdx-num" style={{ color: 'var(--ink-faint)' }}>
                {Math.floor(segundosDecorridos / 60)}:{String(segundosDecorridos % 60).padStart(2, '0')} decorridos
              </p>
            )}

            <div
              className="pdx-barra-progresso"
              role="progressbar"
              aria-valuenow={Math.round(progresso)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progresso da análise"
            >
              <div style={{ width: `${progresso}%` }} />
            </div>
            {!aAbrirDashboard && passosPlano.length === 0 && segundosDecorridos > 45 && (
              <p className="pdx-aviso-espera mb-6">
                <Clock className="size-3.5 shrink-0" aria-hidden />
                Os primeiros passos aparecem aqui assim que o plano estiver pronto.
              </p>
            )}

            {/* Números reais a aparecer assim que cada cálculo termina (evento calc_pronto) — não
                é decorativo nem simulado, é o mesmo valor que vai aparecer na resposta final. */}
            {calcsAoVivo.length > 0 && !aAbrirDashboard && (
              <div className="flex flex-wrap justify-center gap-2 mb-5 max-w-md mx-auto">
                {calcsAoVivo.map((c, i) => (
                  <span
                    key={`${c.id}-${i}`}
                    className="pd-live-calc-in pdx-calc-vivo"
                  >
                    {c.valor}
                    {c.unidade ? <span className="unidade">{c.unidade}</span> : null}
                  </span>
                ))}
              </div>
            )}

            {/* Lista real do plano, não decorativa: cada passo marca-se assim que o cálculo real
                correspondente termina (evento passo_fim) — mostra trabalho a acontecer de facto
                em vez de um spinner indistinguível de estar pendurado numa análise longa. */}
            {passosPlano.length > 0 && !aAbrirDashboard && (
              <ul className="max-w-sm mx-auto text-left space-y-2">
                {passosPlano.map((p) => (
                  <li key={p.id} className={`pdx-passo${p.feito ? ' feito' : ''}`}>
                    {p.feito ? (
                      <Check className="size-3.5 mt-0.5 shrink-0" style={{ color: 'var(--forest-700)' }} aria-hidden />
                    ) : (
                      <Loader2 className="size-3.5 mt-0.5 animate-spin shrink-0" aria-hidden />
                    )}
                    <span>{p.descricao_humana}</span>
                  </li>
                ))}
              </ul>
            )}

            {!aAbrirDashboard && (
              <div className="mt-8 pt-6 max-w-md mx-auto space-y-4" style={{ borderTop: '1px solid var(--line)' }}>
                {/* A pessoa não tem de ficar presa a olhar para isto: a análise continua a correr
                    no servidor mesmo que saia da página, e fica guardada para consultar depois. */}
                <div className="pdx-caixa-info">
                  <Compass className="size-4 mt-0.5 shrink-0" style={{ color: 'var(--forest-700)' }} aria-hidden />
                  <p className="m-0">
                    Podes sair desta página à vontade: a análise continua a correr e fica guardada em{' '}
                    <Link href="/analise" className="font-semibold hover:underline" style={{ color: 'var(--forest-700)' }}>
                      Minhas análises
                    </Link>{' '}
                    assim que terminar.
                  </p>
                </div>

                {/* Guia do portal, não só factos sobre o motor: números reais contados a partir
                    dos datasets recebidos (nunca inventados), o resto são funcionalidades
                    genuínas do portal (ver definição de `curiosidades` acima). */}
                {(() => {
                  const actual = curiosidades[indiceCuriosidade % curiosidades.length]
                  const Icone = actual.icone
                  return (
                    <div
                      key={indiceCuriosidade % curiosidades.length}
                      className="pd-live-calc-in pdx-caixa-info"
                      style={{ background: 'var(--card)' }}
                    >
                      <span
                        className="flex items-center justify-center size-8 rounded-full shrink-0"
                        style={{ background: 'var(--paper-dim)', color: 'var(--forest-700)' }}
                      >
                        <Icone className="size-4" aria-hidden />
                      </span>
                      <p className="m-0 pt-1">{actual.texto}</p>
                    </div>
                  )
                })()}
                <div className="flex items-center justify-center gap-1.5">
                  {curiosidades.map((_, i) => (
                    <span
                      key={i}
                      className="pdx-ponto"
                      data-activo={i === indiceCuriosidade % curiosidades.length}
                      aria-hidden
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

    </div>
  )
}
