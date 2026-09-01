/**
 * Prepara os mapas Leaflet para serem capturados pelo html2canvas sem o `foreignObjectRendering`.
 *
 * O Leaflet posiciona quase tudo o que desenha (o painel do mapa, o contentor de tiles, cada tile,
 * os marcadores e o painel SVG das linhas e polígonos) com `transform: translate3d(...)`, porque é
 * o que o browser acelera por hardware ao arrastar. O caminho normal do html2canvas recalcula
 * essas posições à mão e erra-as: os tiles saem deslocados e as linhas correm para fora do mapa.
 *
 * Era por isso que a exportação usava `foreignObjectRendering: true`. Só que esse caminho tem um
 * defeito pior: desloca o conteúdo todo para cima (medido: 426px), e o relatório saía sem
 * cabeçalho.
 *
 * A saída é tirar a translação do sítio onde o html2canvas se engana e pô-la onde ele acerta:
 * converte-se cada `transform` que seja só uma translação em `left`/`top` equivalentes, captura-se,
 * e repõe-se tudo como estava. Nada disto é permanente e nada disto muda o que o utilizador vê:
 * entre a preparação e a reposição não há repintura visível, porque o valor calculado é o mesmo.
 */

type Reposicao = { el: HTMLElement; transform: string; left: string; top: string }

/** Extrai a translação de uma matriz CSS, e devolve null se houver rotação, escala ou inclinação. */
function translacaoPura(transform: string): { x: number; y: number } | null {
  if (!transform || transform === 'none') return null

  const matrix3d = transform.match(/^matrix3d\((.+)\)$/)
  if (matrix3d) {
    const v = matrix3d[1].split(',').map((n) => Number.parseFloat(n))
    if (v.length !== 16) return null
    // Só translação: a diagonal a 1 e o resto da parte linear a 0.
    const linearIntacta =
      v[0] === 1 && v[1] === 0 && v[2] === 0 && v[4] === 0 && v[5] === 1 && v[6] === 0 && v[8] === 0 && v[9] === 0 && v[10] === 1
    if (!linearIntacta) return null
    return { x: v[12], y: v[13] }
  }

  const matrix = transform.match(/^matrix\((.+)\)$/)
  if (matrix) {
    const v = matrix[1].split(',').map((n) => Number.parseFloat(n))
    if (v.length !== 6) return null
    if (v[0] !== 1 || v[1] !== 0 || v[2] !== 0 || v[3] !== 1) return null
    return { x: v[4], y: v[5] }
  }

  return null
}

/**
 * Converte as translações dos mapas em `left`/`top` e devolve a função que repõe tudo.
 * Se não houver mapas nenhuns na raiz, não toca em nada.
 */
export function assentarTransformesLeaflet(raiz: HTMLElement): () => void {
  const mapas = Array.from(raiz.querySelectorAll<HTMLElement>('.leaflet-container'))
  if (mapas.length === 0) return () => {}

  const reposicoes: Reposicao[] = []

  for (const mapa of mapas) {
    // O próprio contentor não leva transform; o que interessa é tudo o que o Leaflet posiciona
    // lá dentro, do painel do mapa a cada tile.
    for (const el of Array.from(mapa.querySelectorAll<HTMLElement>('*'))) {
      const estilo = window.getComputedStyle(el)
      const t = translacaoPura(estilo.transform)
      if (!t || (t.x === 0 && t.y === 0)) continue

      const esquerda = Number.parseFloat(estilo.left)
      const topo = Number.parseFloat(estilo.top)
      reposicoes.push({ el, transform: el.style.transform, left: el.style.left, top: el.style.top })
      el.style.transform = 'none'
      el.style.left = `${(Number.isFinite(esquerda) ? esquerda : 0) + t.x}px`
      el.style.top = `${(Number.isFinite(topo) ? topo : 0) + t.y}px`
    }
  }

  return () => {
    for (const r of reposicoes) {
      r.el.style.transform = r.transform
      r.el.style.left = r.left
      r.el.style.top = r.top
    }
  }
}
