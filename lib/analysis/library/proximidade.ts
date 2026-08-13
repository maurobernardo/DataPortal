import type { Ponto } from './geo'
import { distanciaKm } from './geo'

/**
 * Distância e proximidade entre dois datasets geoespaciais (PLANO-INTELIGENCIA-PRO-MAX.md, Fase
 * 3): "que escolas ficam a mais de 10km de uma estrada", "quantas escolas há num raio de 5km de
 * cada unidade sanitária". Antes destes métodos, o catálogo só sabia relacionar dois datasets
 * juntando-os por unidade administrativa comum (juntar_datasets) — nunca por distância real entre
 * as suas geometrias.
 *
 * Comparação ponto-a-ponto entre todas as feições de A e todas as de B é O(|A|×|B|): cada par
 * paga uma fórmula de Haversine, não uma consulta espacial indexada (sem uma dependência nova
 * tipo R-tree, não há forma barata de evitar isto). Para os tamanhos reais dos datasets do portal
 * (dezenas a milhares de feições) isto corre em bem menos de um segundo; o guard-rail abaixo
 * existe para nunca deixar um par de datasets desproporcionalmente grandes bloquear o servidor.
 */

// 1577×9535 (Unidades Sanitárias × Escolas, os dois maiores datasets pontuais do portal) já dá
// ~15M pares — o tecto tem de cobrir isso com margem. Medido ao vivo: 20M pares de Haversine
// correm em poucos segundos em Node, aceitável para um passo que corre em paralelo com outros
// durante uma análise já orçada em 30-60s.
const MAX_PARES = 20_000_000

function verificarOrcamento(nA: number, nB: number, metodo: string) {
  if (nA * nB > MAX_PARES) {
    throw new Error(
      `${metodo}: ${nA} × ${nB} pares de distância excede o que é computável directamente aqui. ` +
        `Usa filtro_unidade para reduzir o âmbito geográfico, ou execucao_codigo para uma ` +
        `abordagem que não precise de comparar todos os pares.`
    )
  }
}

/** Para cada ponto de A, a distância (km) ao ponto mais próximo de B. */
export function distanciasParaMaisProximo(pontosA: Ponto[], pontosB: Ponto[]): number[] {
  verificarOrcamento(pontosA.length, pontosB.length, 'distancia_minima')
  return pontosA.map((a) => {
    let menor = Infinity
    for (const b of pontosB) {
      const d = distanciaKm(a, b)
      if (d < menor) menor = d
    }
    return menor
  })
}

/**
 * Para cada ponto de A, quantos pontos de B caem dentro de `raioKm` — ou, se `pesos` for dado
 * (um valor por ponto de B, ex. uma coluna numérica), a SOMA desses pesos em vez da contagem.
 */
export function contarDentroDoRaio(
  pontosA: Ponto[],
  pontosB: Ponto[],
  raioKm: number,
  pesos?: number[]
): number[] {
  verificarOrcamento(pontosA.length, pontosB.length, 'contagem_buffer')
  return pontosA.map((a) => {
    let total = 0
    for (let j = 0; j < pontosB.length; j++) {
      if (distanciaKm(a, pontosB[j]) <= raioKm) total += pesos ? pesos[j] : 1
    }
    return total
  })
}
