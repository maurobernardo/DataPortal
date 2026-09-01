import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Anchor,
  Apple,
  Banknote,
  Bike,
  Bird,
  Briefcase,
  Bug,
  Building2,
  CloudLightning,
  CloudRain,
  Coins,
  Compass,
  Droplets,
  Factory,
  Fence,
  Fish,
  Flag,
  Flame,
  Fuel,
  GraduationCap,
  HeartPulse,
  Hospital,
  Landmark,
  Leaf,
  Layers,
  MapPinned,
  Milestone,
  Mountain,
  Percent,
  Table2,
  Palmtree,
  PawPrint,
  Pickaxe,
  Plane,
  Plug,
  Radio,
  Route,
  School,
  Ship,
  Signal,
  Siren,
  Sprout,
  Store,
  Syringe,
  Thermometer,
  TreePine,
  Tractor,
  Trees,
  TrendingUp,
  Umbrella,
  Users,
  Waves,
  Wheat,
  Globe2,
} from 'lucide-react'

type Pattern = 'contour' | 'grid' | 'dots' | 'waves' | 'rings' | 'diagonal'

type Visual = {
  icon: LucideIcon
  c1: string
  c2: string
  c3: string
  pattern: Pattern
}

/**
 * Identidade visual por assunto do dataset (não por categoria genérica): o texto do título +
 * descrição + palavras-chave é comparado, do termo mais específico ao mais genérico, contra esta
 * lista, para que a miniatura funcione como um "logótipo" reconhecível do próprio dataset —
 * malária tem um ícone, estradas outro, rios outro — em vez de repetir a mesma arte para toda a
 * categoria "Saúde" ou "Infraestrutura". Mesh-gradient (3 tons) + ícone + padrão em SVG: sem
 * texto gerado, sem imagem de IA.
 */
const SUBJECT_VISUALS: { match: string[]; visual: Visual }[] = [
  // Saúde — específico primeiro
  { match: ['malaria', 'malária', 'mosquito'], visual: { icon: Bug, c1: '#FCA5A5', c2: '#B91C1C', c3: '#450A0A', pattern: 'dots' } },
  { match: ['vacina', 'imuniza'], visual: { icon: Syringe, c1: '#F9A8D4', c2: '#DB2777', c3: '#831843', pattern: 'grid' } },
  { match: ['nutric', 'nutriç', 'desnutri', 'alimentar'], visual: { icon: Apple, c1: '#FCA5A5', c2: '#DC2626', c3: '#7F1D1D', pattern: 'dots' } },
  { match: ['hospital', 'unidade sanitaria', 'unidade sanitária', 'clinica', 'clínica', 'centro de saude'], visual: { icon: Hospital, c1: '#FDA4AF', c2: '#E11D48', c3: '#881337', pattern: 'grid' } },
  { match: ['hiv', 'sida', 'tuberculose', 'colera', 'cólera', 'epidemi'], visual: { icon: Thermometer, c1: '#FECACA', c2: '#B91C1C', c3: '#450A0A', pattern: 'rings' } },
  { match: ['saude', 'saúde', 'health'], visual: { icon: HeartPulse, c1: '#FB7185', c2: '#E11D48', c3: '#881337', pattern: 'waves' } },

  // Água / clima
  { match: ['rio', 'rios', 'bacia hidrografica', 'bacia hidrográfica'], visual: { icon: Waves, c1: '#67E8F9', c2: '#0891B2', c3: '#164E63', pattern: 'waves' } },
  { match: ['saneamento', 'esgoto'], visual: { icon: Droplets, c1: '#7DD3FC', c2: '#0369A1', c3: '#0C4A6E', pattern: 'grid' } },
  { match: ['chuva', 'precipita'], visual: { icon: CloudRain, c1: '#93C5FD', c2: '#1D4ED8', c3: '#1E3A8A', pattern: 'dots' } },
  { match: ['ciclone', 'tempestade', 'trovoada'], visual: { icon: CloudLightning, c1: '#A5B4FC', c2: '#4338CA', c3: '#1E1B4B', pattern: 'diagonal' } },
  { match: ['seca', 'estiagem'], visual: { icon: Flame, c1: '#FDBA74', c2: '#C2410C', c3: '#431407', pattern: 'dots' } },
  { match: ['clima', 'meteorolog', 'temperatura'], visual: { icon: Umbrella, c1: '#67E8F9', c2: '#0E7490', c3: '#164E63', pattern: 'waves' } },
  { match: ['hidrografia', 'agua', 'água', 'water'], visual: { icon: Droplets, c1: '#38BDF8', c2: '#0369A1', c3: '#0C4A6E', pattern: 'waves' } },
  { match: ['inunda', 'cheia', 'cheias'], visual: { icon: Waves, c1: '#93C5FD', c2: '#1D4ED8', c3: '#1E3A8A', pattern: 'waves' } },
  { match: ['risco', 'desastre', 'emergencia', 'emergência', 'resposta'], visual: { icon: Siren, c1: '#FCA5A5', c2: '#DC2626', c3: '#450A0A', pattern: 'diagonal' } },

  // Agricultura / recursos naturais
  { match: ['pesca', 'pescador', 'aquacultura'], visual: { icon: Fish, c1: '#5EEAD4', c2: '#0D9488', c3: '#134E4A', pattern: 'waves' } },
  { match: ['gado', 'pecuaria', 'pecuária', 'bovino', 'caprino'], visual: { icon: PawPrint, c1: '#FDE68A', c2: '#B45309', c3: '#451A03', pattern: 'dots' } },
  { match: ['cereal', 'cereais', 'milho', 'arroz', 'trigo', 'producao agricola', 'produção agrícola'], visual: { icon: Wheat, c1: '#FDE047', c2: '#CA8A04', c3: '#713F12', pattern: 'dots' } },
  { match: ['irriga'], visual: { icon: Droplets, c1: '#BEF264', c2: '#4D7C0F', c3: '#1A2E05', pattern: 'grid' } },
  { match: ['agricultura', 'agro', 'cultura'], visual: { icon: Sprout, c1: '#BEF264', c2: '#65A30D', c3: '#365314', pattern: 'grid' } },
  { match: ['maquinaria agricola', 'tractor', 'trator'], visual: { icon: Tractor, c1: '#FACC15', c2: '#A16207', c3: '#422006', pattern: 'diagonal' } },
  { match: ['floresta', 'desmata', 'madeira'], visual: { icon: TreePine, c1: '#4ADE80', c2: '#166534', c3: '#052E16', pattern: 'dots' } },
  { match: ['biodiversidade', 'fauna', 'especies', 'espécies'], visual: { icon: Bird, c1: '#86EFAC', c2: '#15803D', c3: '#14532D', pattern: 'contour' } },
  { match: ['conserva', 'area protegida', 'área protegida', 'parque nacional', 'reserva'], visual: { icon: Trees, c1: '#86EFAC', c2: '#15803D', c3: '#14532D', pattern: 'contour' } },
  { match: ['uso do solo', 'vegetacao', 'vegetação', 'ambiente'], visual: { icon: Leaf, c1: '#6EE7B7', c2: '#0F766E', c3: '#134E4A', pattern: 'grid' } },

  // Infraestrutura / energia
  { match: ['estrada', 'rodovia', 'ponte'], visual: { icon: Route, c1: '#CBD5E1', c2: '#475569', c3: '#0F172A', pattern: 'diagonal' } },
  { match: ['ferrovia', 'comboio', 'linha ferrea'], visual: { icon: Milestone, c1: '#CBD5E1', c2: '#475569', c3: '#0F172A', pattern: 'grid' } },
  { match: ['aeroporto', 'aviacao', 'aviação'], visual: { icon: Plane, c1: '#A5B4FC', c2: '#4338CA', c3: '#1E1B4B', pattern: 'diagonal' } },
  { match: ['porto', 'maritimo', 'marítimo', 'naval'], visual: { icon: Ship, c1: '#7DD3FC', c2: '#0369A1', c3: '#0C4A6E', pattern: 'waves' } },
  { match: ['energia electrica', 'energia eléctrica', 'electricidade', 'eletricidade', 'rede electrica'], visual: { icon: Plug, c1: '#FDE68A', c2: '#D97706', c3: '#452103', pattern: 'grid' } },
  { match: ['petroleo', 'petróleo', 'gas natural', 'gás natural', 'combustivel', 'combustível'], visual: { icon: Fuel, c1: '#FDBA74', c2: '#C2410C', c3: '#431407', pattern: 'diagonal' } },
  { match: ['minera', 'mina', 'carvao', 'carvão'], visual: { icon: Pickaxe, c1: '#D6D3D1', c2: '#57534E', c3: '#1C1917', pattern: 'grid' } },
  { match: ['telecomunica', 'internet', 'rede movel', 'rede móvel'], visual: { icon: Signal, c1: '#A5B4FC', c2: '#4338CA', c3: '#1E1B4B', pattern: 'dots' } },
  { match: ['radio', 'rádio', 'difusao', 'difusão'], visual: { icon: Radio, c1: '#FDE68A', c2: '#B45309', c3: '#451A03', pattern: 'rings' } },
  { match: ['ciclovia', 'bicicleta'], visual: { icon: Bike, c1: '#86EFAC', c2: '#15803D', c3: '#14532D', pattern: 'diagonal' } },
  { match: ['infraestrutura', 'infra', 'zona industrial'], visual: { icon: Factory, c1: '#A5B4FC', c2: '#4338CA', c3: '#1E1B4B', pattern: 'diagonal' } },

  // Administrativo / fronteiras
  { match: ['fronteira', 'limite internacional'], visual: { icon: Flag, c1: '#C4B5FD', c2: '#7C3AED', c3: '#2E1065', pattern: 'diagonal' } },
  { match: ['distrito', 'posto administrativo', 'localidade'], visual: { icon: MapPinned, c1: '#C4B5FD', c2: '#7C3AED', c3: '#2E1065', pattern: 'diagonal' } },
  { match: ['provinc', 'administrativ'], visual: { icon: Landmark, c1: '#A78BFA', c2: '#6D28D9', c3: '#3B0764', pattern: 'grid' } },

  // Turismo
  { match: ['praia', 'costa', 'costeiro'], visual: { icon: Anchor, c1: '#67E8F9', c2: '#0891B2', c3: '#164E63', pattern: 'waves' } },
  { match: ['hotel', 'alojamento', 'turistico', 'turístico'], visual: { icon: Palmtree, c1: '#5EEAD4', c2: '#0D9488', c3: '#134E4A', pattern: 'waves' } },
  { match: ['turismo', 'turism'], visual: { icon: Compass, c1: '#2DD4BF', c2: '#0F766E', c3: '#134E4A', pattern: 'contour' } },

  // Economia
  { match: ['comercio', 'comércio', 'mercado', 'loja'], visual: { icon: Store, c1: '#FCD34D', c2: '#C2410C', c3: '#431407', pattern: 'grid' } },
  { match: ['industria', 'indústria', 'fabrica', 'fábrica'], visual: { icon: Factory, c1: '#FDE68A', c2: '#B45309', c3: '#451A03', pattern: 'diagonal' } },
  { match: ['pib', 'financ', 'receita', 'divisas', 'moeda'], visual: { icon: Coins, c1: '#FDE047', c2: '#A16207', c3: '#422006', pattern: 'dots' } },
  { match: ['economia', 'economi', 'exporta'], visual: { icon: TrendingUp, c1: '#FBBF24', c2: '#B45309', c3: '#451A03', pattern: 'grid' } },

  // Demografia
  { match: ['censo', 'migra'], visual: { icon: Users, c1: '#F0ABFC', c2: '#A21CAF', c3: '#4A044E', pattern: 'rings' } },
  { match: ['demografia', 'populac', 'população'], visual: { icon: Users, c1: '#F472B6', c2: '#BE185D', c3: '#500724', pattern: 'dots' } },

  // Estatísticas / tabelas (dados alfanuméricos)
  { match: ['emprego', 'desemprego', 'trabalho', 'mao de obra', 'mão de obra'], visual: { icon: Briefcase, c1: '#FDBA74', c2: '#C2410C', c3: '#431407', pattern: 'grid' } },
  { match: ['salario', 'salário', 'remuneracao', 'remuneração'], visual: { icon: Banknote, c1: '#BBF7D0', c2: '#15803D', c3: '#14532D', pattern: 'dots' } },
  { match: ['orcamento', 'orçamento', 'despesa', 'divida publica', 'dívida pública'], visual: { icon: Banknote, c1: '#FDE68A', c2: '#B45309', c3: '#451A03', pattern: 'grid' } },
  { match: ['inflacao', 'inflação', 'preco', 'preço', 'precos', 'preços', 'cambio', 'câmbio'], visual: { icon: Percent, c1: '#FCA5A5', c2: '#B91C1C', c3: '#450A0A', pattern: 'diagonal' } },
  { match: ['idh', 'indicador social', 'bem estar', 'bem-estar'], visual: { icon: TrendingUp, c1: '#93C5FD', c2: '#1D4ED8', c3: '#1E3A8A', pattern: 'rings' } },

  // Educação
  { match: ['universidade', 'ensino superior'], visual: { icon: GraduationCap, c1: '#60A5FA', c2: '#1D4ED8', c3: '#1E3A8A', pattern: 'grid' } },
  { match: ['alfabetiz', 'literacia'], visual: { icon: Users, c1: '#93C5FD', c2: '#2563EB', c3: '#1E3A8A', pattern: 'dots' } },
  { match: ['escola', 'educacao', 'educação', 'ensino'], visual: { icon: School, c1: '#BFDBFE', c2: '#1D4ED8', c3: '#172554', pattern: 'diagonal' } },

  // Relevo
  { match: ['relevo', 'topograf', 'altitude', 'geolog'], visual: { icon: Mountain, c1: '#D6D3D1', c2: '#78716C', c3: '#292524', pattern: 'contour' } },
  { match: ['gado bravio', 'vedacao', 'vedação', 'cerca'], visual: { icon: Fence, c1: '#FDE68A', c2: '#B45309', c3: '#451A03', pattern: 'diagonal' } },
]

const DEFAULT_VISUAL: Visual = { icon: Globe2, c1: '#4ADE80', c2: '#064E2C', c3: '#04361F', pattern: 'contour' }

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/**
 * Compara por palavra (não por substring bruta): evita falsos positivos como "aviação" a
 * corresponder a "via", e falsos negativos como "unidades sanitárias" (plural) a não corresponder
 * a "unidade sanitaria" (singular) só porque o "s" do plural cai antes do espaço.
 */
function phraseMatches(subjectWords: string[], phrase: string) {
  const parts = normalize(phrase).split(/\s+/)
  return parts.every((p) => subjectWords.some((w) => w.startsWith(p)))
}

function findVisual(words: string[]): Visual | null {
  for (const entry of SUBJECT_VISUALS) {
    if (entry.match.some((m) => phraseMatches(words, m))) return entry.visual
  }
  return null
}

function toWords(text: string) {
  return normalize(text || '').split(/\s+/).filter(Boolean)
}

/**
 * Título primeiro, depois palavras-chave, só depois a categoria — nessa ordem de confiança: um
 * dataset chamado "Limite de Distritos" arrumado numa categoria ampla como "Segurança Alimentar",
 * com tags genéricas partilhadas por muitos datasets, deve mostrar o ícone do assunto real do
 * título (distrito), não o da categoria ou de uma tag emprestada.
 */
export function resolveVisual(title: string, keywords: string, category: string): Visual {
  return (
    findVisual(toWords(title)) ??
    findVisual(toWords(keywords)) ??
    findVisual(toWords(category)) ??
    DEFAULT_VISUAL
  )
}

/** Padrão geométrico decorativo (todas em SVG, sem imagens). */
function ThumbPattern({ pattern, uid }: { pattern: Pattern; uid: string }) {
  if (pattern === 'contour') {
    return (
      <g stroke="white" strokeOpacity="0.24" strokeWidth="1.2" fill="none">
        <path d="M-20,110 Q60,60 140,100 T300,90" />
        <path d="M-20,70 Q70,20 150,60 T320,50" />
        <path d="M-20,150 Q60,110 150,140 T320,130" />
      </g>
    )
  }
  if (pattern === 'waves') {
    return (
      <g stroke="white" strokeOpacity="0.24" strokeWidth="1.4" fill="none">
        <path d="M-20,40 Q40,20 80,40 T180,40 T280,40 T340,40" />
        <path d="M-20,80 Q40,60 80,80 T180,80 T280,80 T340,80" />
        <path d="M-20,120 Q40,100 80,120 T180,120 T280,120 T340,120" />
      </g>
    )
  }
  if (pattern === 'grid') {
    return (
      <g stroke="white" strokeOpacity="0.16" strokeWidth="1">
        {Array.from({ length: 7 }, (_, i) => (
          <line key={`v${i}`} x1={i * 46} y1={0} x2={i * 46} y2={160} />
        ))}
        {Array.from({ length: 4 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 46} x2={320} y2={i * 46} />
        ))}
      </g>
    )
  }
  if (pattern === 'rings') {
    return (
      <g stroke="white" strokeOpacity="0.24" strokeWidth="1.3" fill="none">
        <circle cx="250" cy="30" r="24" />
        <circle cx="250" cy="30" r="44" />
        <circle cx="250" cy="30" r="64" />
        <circle cx="250" cy="30" r="84" />
      </g>
    )
  }
  if (pattern === 'diagonal') {
    return (
      <g stroke="white" strokeOpacity="0.18" strokeWidth="10">
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} x1={-40 + i * 50} y1={200} x2={40 + i * 50} y2={-40} />
        ))}
      </g>
    )
  }
  return (
    <g fill="white" fillOpacity="0.24">
      {Array.from({ length: 8 }, (_, r) =>
        Array.from({ length: 12 }, (_, c) => (
          <circle key={`${uid}-${r}-${c}`} cx={12 + c * 28} cy={12 + r * 22} r={1.6} />
        ))
      )}
    </g>
  )
}

/**
 * `title`/`keywords`: o que o dataset É, testado primeiro. `category`: usado só como recurso
 * quando o título não sugere nada específico. A miniatura funciona como um logótipo do dataset,
 * não da secção onde está arrumado.
 */
export function CategoryThumb({
  title,
  keywords = '',
  category,
  index,
  kind = 'geo',
  showKind = true,
}: {
  title: string
  keywords?: string
  category: string
  index: number
  /** Diferencia visualmente o tipo de dados (mapa vs. tabela) com um selo no canto. */
  kind?: 'geo' | 'alf'
  /** Desliga o selo de tipo quando o card já mostra essa informação noutro badge. */
  showKind?: boolean
}) {
  const visual = resolveVisual(title, keywords, category)
  const Icon = visual.icon
  const KindIcon = kind === 'alf' ? Table2 : Layers
  const uid = `ct-${index}`

  return (
    <div
      className={`cat-thumb cat-thumb--${kind}`}
      style={{ background: visual.c2 }}
      aria-hidden
    >
      <svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" className="cat-thumb-pattern">
        <ThumbPattern pattern={visual.pattern} uid={uid} />
      </svg>
      {showKind && (
        <div className="cat-thumb-kind">
          <KindIcon className="size-3" strokeWidth={2} aria-hidden />
          {kind === 'alf' ? 'Tabela' : 'Mapa'}
        </div>
      )}
      <div className="cat-thumb-icon">
        <Icon className="size-6" strokeWidth={1.8} aria-hidden />
      </div>
    </div>
  )
}
