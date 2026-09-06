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
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true, svg: true, svgFilters: true } })
}
