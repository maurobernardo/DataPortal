'use client'

import { useState } from 'react'
import { AnaliseSerieGeografica } from './AnaliseSerieGeografica'
import { AnaliseMapaDestaque } from './AnaliseMapaDestaque'
import { AnaliseMapaPontos } from './AnaliseMapaPontos'
import { AnaliseGrafico } from './AnaliseGrafico'
import { FaixaKPIs } from './FaixaKPIs'
import { PodioRanking } from './PodioRanking'
import { CartaoTendencia } from './CartaoTendencia'
import { TabelaResumoProvincia } from './TabelaResumoProvincia'
import { CartaoOutliers } from './CartaoOutliers'
import { geometriaPrecisaDaSuaPropriaCamada } from '@/lib/analysis/rotulos-cliente'

/** Formas que precisam da largura toda para se lerem. */
const FORMA_LARGA = new Set(['heatmap', 'sankey', 'cordas', 'caixa', 'funil'])

/**
 * Envolve mapa, gráficos, KPIs e pódio da página de detalhe (/analise/[id]) num só componente de
 * cliente para poderem partilhar estado: clicar num KPI ou numa barra do gráfico destaca a mesma
 * unidade no mapa, exactamente como já acontecia em /analise/[id]/dashboard (DashboardApresentacao)
 * — só que essa ligação nunca tinha chegado a esta página, que corre como componente de servidor.
 */
export function AnaliseVisualizacoes({
  numerosChave,
  calcs,
  graficos,
  destaques,
  camadasBrutas,
  series,
  geojsonPorNivel,
  provincias,
  temMapaOuGraficos,
}: {
  numerosChave: any[]
  calcs: Record<string, any>
  graficos: any[]
  destaques: any[]
  camadasBrutas: any[]
  series: any[]
  geojsonPorNivel?: Record<string, any>
  provincias?: { codigo: string; nome: string }[]
  temMapaOuGraficos: boolean
}) {
  const [unidadeDestacada, setUnidadeDestacada] = useState<string | null>(null)

  // Séries com dados de facto (algumas categorias filtradas podem devolver vazio para um dado
  // nível) — mesma lógica que AnaliseSerieGeografica usa internamente, replicada aqui só para
  // escolher o índice inicial por omissão de forma consistente com o que o mapa vai mostrar.
  const comDados = series.filter((s: any) => s.unidades && s.unidades.length > 0)
  const ORDEM_FINURA: Record<string, number> = { admin3: 3, admin2: 2, admin1: 1 }
  const indiceMaisFino = comDados.reduce(
    (melhor: number, s: any, i: number) =>
      (ORDEM_FINURA[s.nivel] || 0) > (ORDEM_FINURA[comDados[melhor]?.nivel] || 0) ? i : melhor,
    0
  )
  // Estado partilhado: quando há várias séries (ex.: uma por cultura filtrada), trocar de série
  // no selector do mapa tem de actualizar TAMBÉM o pódio, os outliers e a tabela por província —
  // antes, cada um desses cartões olhava sempre para series[0] directamente, presos na primeira
  // categoria mesmo depois do utilizador escolher outra no mapa.
  const [serieActivaIndice, setSerieActivaIndice] = useState(indiceMaisFino)
  const serieActiva = comDados[Math.min(serieActivaIndice, comDados.length - 1)]

  // Séries de datasets DIFERENTES (ex.: cruzar reservas nacionais com florestais) não podem
  // partilhar um único cartão de mapa com um só selector — a de florestais ficava escondida atrás
  // de "OBJECTID 1" das nacionais, sem forma óbvia de a encontrar. Um cartão por dataset, cada um
  // com o seu próprio selector quando esse dataset tiver mais de uma série.
  const gruposPorDataset = new Map<string, typeof series>()
  for (const s of series) {
    const chave = String(s.dataset_id ?? 'sem-dataset')
    const grupo = gruposPorDataset.get(chave) || []
    grupo.push(s)
    gruposPorDataset.set(chave, grupo)
  }
  const gruposSeries = Array.from(gruposPorDataset.entries())
  const [activaPorDataset, setActivaPorDataset] = useState<Record<string, number>>({})

  // Só faz sentido destacar por nome se o coroplético por unidade estiver mesmo visível: quando
  // há pontos/linhas/polígonos próprios sem série calculada, esse mapa não existe aqui.
  const nomesUnidades =
    series.length === 0 ? [] : Array.from(new Set(series.flatMap((s: any) => s.unidades.map((u: any) => u.nome as string))))

  return (
    <>
      <FaixaKPIs
        numerosChave={numerosChave || []}
        calcs={calcs}
        graficos={graficos}
        series={series}
        nomesUnidades={nomesUnidades}
        unidadeDestacada={unidadeDestacada}
        onDestacar={setUnidadeDestacada}
      />

      {serieActiva && serieActiva.unidades.length >= 2 && (
        <PodioRanking unidades={serieActiva.unidades} metrica={serieActiva.metrica} />
      )}

      {serieActiva && <CartaoOutliers unidades={serieActiva.unidades} metrica={serieActiva.metrica} />}

      {(() => {
        const temporal = graficos.find((g: any) => g.categoria === 'temporal' && g.series?.[0])
        if (!temporal) return null
        return <CartaoTendencia titulo={temporal.titulo} eixoX={temporal.eixoX} valores={temporal.series[0].valores} />
      })()}

      {serieActiva && serieActiva.nivel !== 'admin1' && provincias && provincias.length > 0 && (
        <TabelaResumoProvincia unidades={serieActiva.unidades} metrica={serieActiva.metrica} provincias={provincias} />
      )}

      {temMapaOuGraficos && (
        // O mapa tem altura fixa (filtros + legenda + Leaflet, ~460px) e a grelha de gráficos
        // cresce com a quantidade — lado a lado numa divisão fixa (7/5), uma das duas colunas
        // ficava sempre bem mais curta que a outra, com um vazio grande por baixo. Em vez de
        // tentar equilibrar a divisão consoante a quantidade de gráficos (nunca dá certo para
        // todos os casos), empilha-se: mapa à largura toda, gráficos numa grelha larga a seguir.
        <div className="space-y-4 mb-5">
          {(destaques.length > 0 || series.length > 0 || camadasBrutas.length > 0) && (
            <div className="space-y-4">
              {gruposSeries.map(([chave, grupo]) => (
                <AnaliseSerieGeografica
                  key={chave}
                  series={grupo}
                  geojsonPorNivel={geojsonPorNivel}
                  provincias={provincias}
                  unidadeDestacada={unidadeDestacada}
                  // Sem `?? 0`: passar zero enquanto ninguem clicou sobrepunha-se ao criterio
                  // do proprio componente (serie de variacao primeiro, senao o nivel mais fino) e
                  // abria sempre na primeira serie gerada. `undefined` deixa o componente decidir.
                  activaIndice={activaPorDataset[chave]}
                  onMudarActiva={(i) => setActivaPorDataset((prev) => ({ ...prev, [chave]: i }))}
                />
              ))}
              {destaques.map((d: any) => (
                <AnaliseMapaDestaque key={d.passo_id} destaque={d} />
              ))}
              {/* Só esconde a camada bruta de um dataset quando HÁ série calculada PARA ESSE
                  dataset (o coroplético já o substitui) — comparar por dataset_id, não por
                  "existe alguma série": ao cruzar dois datasets geoespaciais, uma série calculada
                  só de um deles não pode esconder o mapa do outro, que nunca teve série nenhuma. */}
              {camadasBrutas
                .filter((c: any) => geometriaPrecisaDaSuaPropriaCamada(c.tipoGeometria) || !series.some((s: any) => s.dataset_id === c.dataset_id))
                .map((c: any) => (
                  <AnaliseMapaPontos key={c.dataset_id} camada={c} unidadeDestacada={unidadeDestacada} />
                ))}
            </div>
          )}
          {graficos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {graficos.map((g: any) => (
                // Mesma razão do dashboard: matriz de cor e fluxo não cabem num terço de largura.
                <div key={g.passo_id} className={FORMA_LARGA.has(g.tipo) ? 'sm:col-span-2 xl:col-span-3' : undefined}>
                  <AnaliseGrafico
                    grafico={g}
                    categoriaActiva={unidadeDestacada}
                    aoClicarCategoria={setUnidadeDestacada}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
