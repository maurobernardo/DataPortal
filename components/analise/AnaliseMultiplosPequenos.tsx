'use client'

import { useMemo } from 'react'
import { CLASSES_TEMATICAS, calcularLimites, classeParaValor } from '@/lib/analysis/simbologia'
import { caixaEnvolvente, caminhoDaGeometria, criarProjeccao } from '@/lib/analysis/projeccao-miniatura'

/**
 * O mesmo indicador em vários momentos, lado a lado.
 *
 * Responde ao que o mapa de mudança não responde. A mudança diz quanto variou entre o princípio e o
 * fim e apaga o percurso: uma província que subiu, caiu e voltou ao mesmo sítio sai como "sem
 * mudança", o que é verdade e não é a história. Aqui vê-se cada momento.
 *
 * Duas decisões de construção fazem esta figura funcionar ou falhar.
 *
 * A ESCALA É PARTILHADA. Os limites são calculados uma vez sobre os valores de TODOS os períodos
 * juntos. Se cada mapa classificasse os seus próprios valores, o vermelho de 2018 e o vermelho de
 * 2023 significariam números diferentes, e a figura impediria exactamente a comparação que promete.
 * É o erro mais comum em múltiplos pequenos e é invisível: os mapas continuam bonitos.
 *
 * E são SVG, não Leaflet. Seis mapas interactivos com tiles seriam seis pedidos de rede, seis
 * instâncias a competir pelo rato, e uma exportação pesada. Um múltiplo pequeno não é para explorar
 * ao clique: é para ser lido de uma vez, e imprimir. Sem tiles, sem zoom, sem interacção.
 */

type Periodo = { rotulo: string; unidades: { codigo: string; nome: string; valor: number }[] }

export type MultiploVista = {
  passo_id: string
  metrica: string
  nivel: string
  unidade: string
  periodos: Periodo[]
}

const COR_SEM_DADOS = '#dcd8cc'
const LARGURA = 240
const ALTURA = 260

function formatar(v: number): string {
  const casas = Number.isInteger(v) ? 0 : Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2
  return v.toLocaleString('pt-PT', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

export function AnaliseMultiplosPequenos({
  multiplo,
  geojson,
}: {
  multiplo: MultiploVista
  geojson: { features: { properties: { codigo?: string; nome?: string }; geometry: any }[] } | null
}) {
  const { limites, caminhoPorCodigo } = useMemo(() => {
    // A escala partilhada: todos os períodos, de uma vez.
    const todos = multiplo.periodos.flatMap((p) => p.unidades.map((u) => u.valor)).filter(Number.isFinite)
    const lim = calcularLimites(todos, CLASSES_TEMATICAS.length, 'quartis')
    const vazio = { limites: lim, caminhoPorCodigo: new Map<string, string>() }

    if (!geojson?.features?.length) return vazio
    const caixa = caixaEnvolvente(geojson.features)
    if (!caixa) return vazio
    const projectar = criarProjeccao(caixa, LARGURA, ALTURA)

    const caminhos = new Map<string, string>()
    for (const f of geojson.features) {
      const codigo = f.properties?.codigo
      if (!codigo) continue
      const d = caminhoDaGeometria(f.geometry, projectar)
      if (d) caminhos.set(codigo, d)
    }
    return { limites: lim, caminhoPorCodigo: caminhos }
  }, [multiplo, geojson])

  if (!geojson?.features?.length || caminhoPorCodigo.size === 0) return null

  const valores = multiplo.periodos.flatMap((p) => p.unidades.map((u) => u.valor)).filter(Number.isFinite)
  const min = Math.min(...valores)
  const max = Math.max(...valores)

  return (
    <section className="pdx-panel mb-5">
      <div className="pdx-panel-head">
        <h2>{multiplo.metrica}</h2>
        <span className="pdx-panel-sub">
          {multiplo.periodos.length} momentos, na mesma escala
        </span>
      </div>

      <div className="pdx-panel-body">
        <div className="pdx-multiplos">
          {multiplo.periodos.map((periodo) => {
            const porCodigo = new Map(periodo.unidades.map((u) => [u.codigo, u]))
            return (
              <figure key={periodo.rotulo}>
                <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" aria-label={`${multiplo.metrica} em ${periodo.rotulo}`}>
                  {Array.from(caminhoPorCodigo).map(([codigo, d]) => {
                    const u = porCodigo.get(codigo)
                    const cor =
                      u && Number.isFinite(u.valor)
                        ? CLASSES_TEMATICAS[classeParaValor(u.valor, limites)].cor
                        : COR_SEM_DADOS
                    return (
                      <path key={codigo} d={d} fill={cor} stroke="#ffffff" strokeWidth={0.5}>
                        <title>{u ? `${u.nome}: ${formatar(u.valor)}${multiplo.unidade}` : codigo}</title>
                      </path>
                    )
                  })}
                </svg>
                <figcaption>{periodo.rotulo}</figcaption>
              </figure>
            )
          })}
        </div>

        {/* Uma legenda só, no fim, porque a escala é uma só. Repeti-la por mapa sugeriria o
            contrário, que é precisamente o mal-entendido a evitar. */}
        <div className="pdx-multiplos-legenda">
          {CLASSES_TEMATICAS.map((classe, i) => {
            const de = i === 0 ? min : limites[i - 1]
            const ate = i === limites.length ? max : limites[i]
            return (
              <span key={classe.rotulo}>
                <span className="chave" style={{ background: classe.cor }} aria-hidden />
                {classe.rotulo}
                <span className="intervalo">
                  {formatar(de)}–{formatar(ate)}
                  {multiplo.unidade}
                </span>
              </span>
            )
          })}
        </div>
      </div>
    </section>
  )
}
