import {
  Building2,
  Database,
  Droplet,
  GraduationCap,
  HeartPulse,
  Landmark,
  Leaf,
  MapPinned,
  TrendingUp,
  Users,
  Wheat,
  type LucideIcon,
} from 'lucide-react'

const RULES: { match: RegExp; icon: LucideIcon }[] = [
  { match: /ambiente|floresta|conservaç|reserva|parque/i, icon: Leaf },
  { match: /demografia|população|censo/i, icon: Users },
  { match: /infraestrutura|energia|electr|estrada|transporte/i, icon: Building2 },
  { match: /limites administrativos|distrito|prov[ií]ncia|administra/i, icon: Landmark },
  { match: /agricultura|agrári|gado|pecuár/i, icon: Wheat },
  { match: /hidrografia|água|rio|bacia/i, icon: Droplet },
  { match: /educaç|escola|aluno/i, icon: GraduationCap },
  { match: /turismo/i, icon: MapPinned },
  { match: /sa[uú]de|hospital|doença|vacin/i, icon: HeartPulse },
  { match: /economia|com[eé]rcio|ind[uú]stria/i, icon: TrendingUp },
]

export function getCategoryIcon(name?: string | null): LucideIcon {
  if (name) {
    for (const rule of RULES) {
      if (rule.match.test(name)) return rule.icon
    }
  }
  return Database
}
