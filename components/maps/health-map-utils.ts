export type VarMeta = {
  label: string
  unit: string
  hi: 'bad' | 'good' | 'both'
  min: number
  max: number
  desc: string
}

/** Salvaguarda: converte uma chave técnica (ex. "TECI_adm3") num rótulo legível, caso
 * falte uma entrada em VAR_META para a variável seleccionada. */
export function humanizeVarKey(key: string): string {
  return key
    .replace(/_adm\d+$/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export const VAR_META: Record<string, VarMeta> = {
  HSSI_adm3: {
    label: 'Stress do sistema de saúde',
    unit: '/10',
    hi: 'bad',
    min: 0,
    max: 10,
    desc: 'Maior valor = sistema mais sob stress (RH, unidades, carga OPD)',
  },
  TECI_adm3: {
    label: 'Convergência da tripla epidemia',
    unit: '/10',
    hi: 'bad',
    min: 0,
    max: 10,
    desc: 'VHI × TB × Malária em simultâneo. Maior = pior convergência',
  },
  ETI_adm3: {
    label: 'Transição epidemiológica',
    unit: '',
    hi: 'bad',
    min: 0,
    max: 1,
    desc: '1 = carga comunicável dominante, 0 = DCNT dominante',
  },
  MMPG_adm3: {
    label: 'Lacuna de prevenibilidade MM',
    unit: '×',
    hi: 'bad',
    min: 0.3,
    max: 4,
    desc: 'Rácio MMR observada/esperada. >1 = excesso de mortes evitáveis',
  },
  GHAD_adm3: {
    label: 'Défice de acesso geográfico',
    unit: '%',
    hi: 'bad',
    min: 0,
    max: 80,
    desc: '% população fora do alcance efectivo dos cuidados',
  },
  CHCG_adm3: {
    label: 'Lacuna de convergência infantil',
    unit: '/1k',
    hi: 'both',
    min: -40,
    max: 60,
    desc: 'U5MR vs nacional (56,5). Negativo = melhor que a média nacional',
  },
  CHVI_adm3: {
    label: 'Vulnerabilidade climática-saúde',
    unit: '/10',
    hi: 'bad',
    min: 0,
    max: 10,
    desc: 'Malária + ciclone + cheias + variabilidade pluviométrica',
  },
  HSER_adm3: {
    label: 'Rácio de eficiência do sistema',
    unit: '',
    hi: 'good',
    min: 0,
    max: 20,
    desc: 'Consultas por profissional por dia útil. Maior = mais produtivo',
  },
  HCCR_adm3: {
    label: 'Conclusão da cascata VIH',
    unit: '%',
    hi: 'good',
    min: 0,
    max: 100,
    desc: '% que completa testagem → ART → supressão viral',
  },
  HEG_adm3: {
    label: 'Gradiente de equidade',
    unit: '',
    hi: 'bad',
    min: 0,
    max: 2.5,
    desc: 'Rácio quintil rico/pobre vs média provincial. Maior = pior equidade',
  },
  RFHN_adm3: {
    label: 'Nexo resiliência-fragilidade',
    unit: '',
    hi: 'good',
    min: 0,
    max: 1,
    desc: '(1-fragilidade) × capacidade RH. Maior = mais resiliente',
  },
  SDCFR_adm3: {
    label: 'Taxa de falha na cascata',
    unit: '%',
    hi: 'bad',
    min: 0,
    max: 80,
    desc: '% mulheres em ANC que não completam parto institucional',
  },
  DDHRI_adm3: {
    label: 'Prontidão do dividendo demográfico',
    unit: '/10',
    hi: 'good',
    min: 0,
    max: 10,
    desc: 'Quota jovem × contracepção × capacidade RH',
  },
  PDBRS_adm3: {
    label: 'Rank de carga de doença',
    unit: '',
    hi: 'both',
    min: 1,
    max: 11,
    desc: 'Posição provincial 1–11 (1 = maior carga)',
  },
  NEDS_adm3: {
    label: 'Condicionante ecológico nutricional',
    unit: '',
    hi: 'bad',
    min: 0,
    max: 30,
    desc: 'Desnutrição × variabilidade pluviométrica / 100',
  },
  HWGEI_adm3: {
    label: 'Equidade de género na força de trabalho',
    unit: '',
    hi: 'both',
    min: 0.3,
    max: 0.8,
    desc: 'Quota feminina de profissionais. 0,5 = paridade',
  },
  UAI_adm3: {
    label: 'Índice de acesso urbano',
    unit: '/10',
    hi: 'good',
    min: 0,
    max: 10,
    desc: 'População urbana × densidade de unidades',
  },
  OHZRP_adm3: {
    label: 'Risco zoonótico One Health',
    unit: '/10',
    hi: 'bad',
    min: 0,
    max: 10,
    desc: 'População rural × pecuária × cobertura florestal',
  },
  IMSS_adm3: {
    label: 'Sinergia imunização × desnutrição',
    unit: '',
    hi: 'bad',
    min: 0,
    max: 30,
    desc: '(100-DPT3%) × desnutrição. Maior = ambas as lacunas coexistem',
  },
  DQCS_adm3: {
    label: 'Confiança na qualidade dos dados',
    unit: '%',
    hi: 'good',
    min: 20,
    max: 90,
    desc: '% variáveis com qualidade decisória para a província',
  },
}

export const VAR_GROUPS: { label: string; options: { value: string; label: string }[] }[] = [
  {
    label: 'Sistema de saúde',
    options: [
      { value: 'HSSI_adm3', label: 'HSSI: Índice de stress do sistema' },
      { value: 'HSER_adm3', label: 'HSER: Rácio de eficiência' },
      { value: 'RFHN_adm3', label: 'RFHN: Nexus resiliência-fragilidade' },
      { value: 'DQCS_adm3', label: 'DQCS: Confiança na qualidade dos dados' },
    ],
  },
  {
    label: 'Epidemiologia',
    options: [
      { value: 'TECI_adm3', label: 'TECI: Convergência da tripla epidemia' },
      { value: 'ETI_adm3', label: 'ETI: Transição epidemiológica' },
      { value: 'HCCR_adm3', label: 'HCCR: Conclusão da cascata VIH' },
    ],
  },
  {
    label: 'Materno-infantil',
    options: [
      { value: 'MMPG_adm3', label: 'MMPG: Lacuna de prevenibilidade MM' },
      { value: 'CHCG_adm3', label: 'CHCG: Lacuna de convergência infantil' },
      { value: 'SDCFR_adm3', label: 'SDCFR: Taxa de falha na cascata' },
      { value: 'IMSS_adm3', label: 'IMSS: Sinergia imunização × desnutrição' },
    ],
  },
  {
    label: 'Acesso e equidade',
    options: [
      { value: 'GHAD_adm3', label: 'GHAD: Défice de acesso geográfico' },
      { value: 'HEG_adm3', label: 'HEG: Gradiente de equidade' },
      { value: 'UAI_adm3', label: 'UAI: Índice de acesso urbano' },
    ],
  },
  {
    label: 'Clima e ambiente',
    options: [
      { value: 'CHVI_adm3', label: 'CHVI: Vulnerabilidade climática-saúde' },
      { value: 'NEDS_adm3', label: 'NEDS: Condicionante ecológico nutricional' },
      { value: 'OHZRP_adm3', label: 'OHZRP: Risco zoonótico One Health' },
    ],
  },
  {
    label: 'Demografia',
    options: [
      { value: 'DDHRI_adm3', label: 'DDHRI: Prontidão do dividendo demográfico' },
      { value: 'HWGEI_adm3', label: 'HWGEI: Equidade de género RH' },
      { value: 'PDBRS_adm3', label: 'PDBRS: Rank de carga de doença' },
    ],
  },
]

export const PROVINCES = [
  'all',
  'Niassa',
  'Cabo Delgado',
  'Nampula',
  'Zambézia',
  'Tete',
  'Manica',
  'Sofala',
  'Inhambane',
  'Gaza',
  'Maputo Província',
  'Maputo Cidade',
] as const

function lerpColor(a: string, b: string, t: number) {
  const ah = parseInt(a.replace('#', ''), 16)
  const bh = parseInt(b.replace('#', ''), 16)
  const ar = (ah >> 16) & 255
  const ag = (ah >> 8) & 255
  const ab = ah & 255
  const br = (bh >> 16) & 255
  const bg = (bh >> 8) & 255
  const bb = bh & 255
  const rr = Math.round(ar + (br - ar) * t)
  const rg = Math.round(ag + (bg - ag) * t)
  const rb = Math.round(ab + (bb - ab) * t)
  return '#' + [rr, rg, rb].map((x) => x.toString(16).padStart(2, '0')).join('')
}

export function colourScale(val: number | null | undefined, meta: VarMeta) {
  if (val === null || val === undefined || Number.isNaN(val)) return '#94a3b8'
  const { min, max, hi } = meta
  const t = Math.max(0, Math.min(1, (val - min) / (max - min)))
  if (hi === 'both') {
    const mid = 0.5
    if (t < mid) return lerpColor('#2196f3', '#ffffff', t / mid)
    return lerpColor('#ffffff', '#ef4444', (t - mid) / mid)
  }
  if (hi === 'bad') return lerpColor('#22c55e', '#ef4444', t)
  if (hi === 'good') return lerpColor('#ef4444', '#22c55e', t)
  return '#94a3b8'
}

export function fmt(val: unknown, unit = '') {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return 'N/D'
  const n = typeof val === 'number' ? val : parseFloat(String(val))
  return (Number.isInteger(n) ? n : n.toFixed(2)) + unit
}

export function getRadius(pop: number | undefined, sizeByPop: boolean) {
  if (!sizeByPop) return 9
  const p = pop || 0
  if (p > 500_000) return 18
  if (p > 200_000) return 14
  if (p > 100_000) return 11
  if (p > 50_000) return 8
  return 6
}
