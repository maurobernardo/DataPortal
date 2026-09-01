import { resolveVisual } from '@/components/geo/CategoryThumb'

/**
 * Selo compacto (44px) com a mesma identidade por assunto do CategoryThumb, para listas onde uma
 * miniatura inteira não cabe (ex.: "Datasets relacionados") — em vez de uma linha de texto nua,
 * cada item ganha um ícone reconhecível, consistente com o resto do catálogo.
 */
export function CategoryIconChip({
  title,
  keywords = '',
  category,
}: {
  title: string
  keywords?: string
  category: string
}) {
  const visual = resolveVisual(title, keywords, category)
  const Icon = visual.icon

  return (
    <span
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-white"
      style={{ background: visual.c2 }}
      aria-hidden
    >
      <Icon className="size-5" strokeWidth={1.8} aria-hidden />
    </span>
  )
}
