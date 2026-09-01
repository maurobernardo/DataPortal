import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CategoryThumb } from '@/components/geo/CategoryThumb'
import { MapRequestButton } from '@/components/maps/MapRequestButton'
import { FavoriteButton } from '@/components/FavoriteButton'
import { iconeParaCapacidade } from '@/lib/maps-highlight-icons'
import {
  MAP_EXPERIENCE_LABELS,
  type PublicMapDashboard,
} from '@/lib/maps-catalog'

export function MapCard({
  map,
  index,
  isFavorited = false,
  viewCount,
}: {
  map: PublicMapDashboard
  index: number
  isFavorited?: boolean
  viewCount?: number
}) {
  const exp = MAP_EXPERIENCE_LABELS[map.experienceType]
  const highlights = (map.highlights ?? []).slice(0, 2)

  // Uma só linha de metadados-chave: os dois primeiros badges do catálogo (já são os factos mais
  // relevantes de cada mapa) + visualizações SEMPRE presente (mesmo "0"), nunca uma linha extra
  // condicional — era isso que fazia a altura dos cards variar de coluna para coluna.
  const metaValues = [...map.badges.slice(0, 2), `${(viewCount ?? 0).toLocaleString('pt-PT')} visualizações`]

  return (
    <article className="mp-card pd-card-lift">
      {/* a) Uma badge de tipo + favorito no canto oposto — sem ícone decorativo de mapa. */}
      <div className="mp-card-thumb">
        <CategoryThumb
          title={map.title}
          keywords={[map.subtitle, ...(map.badges ?? [])].join(' ')}
          category={map.category}
          index={index}
          kind="geo"
          showKind={false}
        />
        <span className={`mp-card-type mp-card-type--${map.experienceType}`}>{exp.short}</span>
      </div>
      <FavoriteButton
        entityType="map"
        entityId={map.slug}
        initialFavorited={isFavorited}
        className="mp-card-favorite"
      />

      <div className="mp-card-body">
        {/* c) Categoria como label colorido, sem badge duplicada ao lado. */}
        <span className="mp-card-category">{map.category}</span>

        {/* d) Título e descrição, ambos truncados a 2 linhas. */}
        <h3 className="mp-card-title">
          <Link href={`/maps/${map.slug}`}>{map.title}</Link>
        </h3>
        <p className="mp-card-desc">{map.description}</p>

        {/* e) + h) Uma linha de metadados, visualizações sempre incluída. */}
        <p className="mp-card-metaline">{metaValues.join(' · ')}</p>

        {/* f) Até 2 capacidades, cada uma com o seu próprio ícone. */}
        {highlights.length > 0 && (
          <ul className="mp-card-highlights">
            {highlights.map((h) => {
              const Icon = iconeParaCapacidade(h)
              return (
                <li key={h}>
                  <Icon className="size-3.5 shrink-0" aria-hidden />
                  <span>{h}</span>
                </li>
              )
            })}
          </ul>
        )}

        {/* g) Rodapé fixo: acção primária preenchida, acção secundária como link de texto. */}
        <div className="mp-card-actions">
          <Link href={`/maps/${map.slug}`} className="mp-btn mp-btn-primary">
            Abrir experiência
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <MapRequestButton
            map={{
              title: map.title,
              slug: map.slug,
              coverage: map.coverage,
              description: map.description,
            }}
            className="mp-card-secondary-link"
          />
        </div>
      </div>
    </article>
  )
}
