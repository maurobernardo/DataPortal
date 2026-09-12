import DOMPurify from 'dompurify'

/**
 * Sanitiza HTML/SVG antes de o injectar com `dangerouslySetInnerHTML`.
 *
 * Os painéis de mapas (components/maps/*.tsx) constroem estas strings a partir de dados do
 * catálogo (nomes de província, de indicador, de instituição) — texto que vem de ficheiros
 * carregados por quem gere o portal, não escrito por quem só consulta. Mesmo sendo "conteúdo de
 * confiança" hoje, injectar directamente sem passar por aqui deixava a aplicação a um dataset mal
 * formatado (ou a uma conta administrativa comprometida) de distância de um XSS a sério. `SVG:
 * true` porque vários destes painéis geram gráficos como SVG, não só HTML.
 */
export function sanitizarHtml(html: string): string {
  // O pacote `dompurify` (build de browser) só funciona com um `window` real: fora do browser
  // (SSR/geração estática em Node) `DOMPurify.sanitize` nem sequer existe como função, e chamar
  // isto rebentava o build inteiro ("eb.sanitize is not a function") em qualquer página estática
  // que renderizasse um destes painéis de mapa, incluindo páginas sem nenhuma relação com mapas
  // (apanhado ao vivo: /politica-privacidade também falhava a gerar, por partilhar um chunk
  // corrompido pelo erro anterior). Os componentes que chamam esta função ('use client', em
  // components/maps/*.tsx) tornam a renderizar no cliente logo a seguir à hidratação, altura em
  // que `window` já existe e a sanitização acontece a sério — este `return html` cobre só a
  // primeira passagem no servidor.
  if (typeof window === 'undefined') return html
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true, svg: true, svgFilters: true } })
}
