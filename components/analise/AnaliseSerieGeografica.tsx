'use client'

import { useState } from 'react'
import { Map as MapIcon, List } from 'lucide-react'
import { AnaliseMapaCoropletico } from './AnaliseMapaCoropletico'
import { escolherMapa, formasDeMapaPermitidas, type TipoMapa } from '@/lib/analysis/forma-do-mapa'
import { somarFazSentido } from '@/lib/analysis/forma-do-grafico'

/** Nome de cada forma no selector. Curto, porque partilha a barra com "Mapa / Lista". */
const ROTULO_MAPA: Record<string, string> = {
  coropletico: 'Área',
  simbolos: 'Círculos',
  pontos: 'Pontos',
  agrupamento: 'Agrupado',
  calor: 'Calor',
  rede: 'Rede',
  destaque: 'Destaque',
  mudanca: 'Mudança',
}

type Serie = {
  passo_id: string
  nivel: 'admin1' | 'admin2' | 'admin3'
  /** Os valores são variações com sinal: manda o mapa usar a escala centrada no zero. */
  variacao?: boolean
  unidades: { codigo: string; nome: string; valor: number; categoria?: string }[]
  metrica: string
  normalizacao: string
  modo?: 'continuo' | 'categorico'
}

type FeatureColecao = {
  type: 'FeatureCollection'
  features: { type: 'Feature'; properties: { codigo: string; nome: string }; geometry: any }[]
}

const ROTULO_NIVEL: Record<string, string> = {
  admin1: 'Província',
  admin2: 'Distrito',
  admin3: 'Posto administrativo',
}

const ROTULO_NORMALIZACAO: Record<string, string> = {
  nenhuma: 'valores absolutos',
  densidade_km2: 'por 1 000 km²',
  per_capita: 'por habitante',
  por_1000: 'por 1 000 habitantes',
  percentagem_do_total: '% do total',
}

function formatar(v: number): string {
  const casas = Number.isInteger(v) ? 0 : Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2
  return v.toLocaleString('pt-PT', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

/**
 * Ranking com barra de fundo por unidade administrativa.
 *
 * Escolhe-se ranking em vez de coroplético porque as séries chegam já normalizadas mas sem
 * geometria anexada: mostrar uma barra ordenada com o valor é honesto, enquanto um mapa exigiria
 * carregar polígonos que esta vista ainda não tem.
 */
export function AnaliseSerieGeografica({
  series,
  geojsonPorNivel,
  unidadeDestacada,
  provincias,
  activaIndice,
  onMudarActiva,
}: {
  series: Serie[]
  geojsonPorNivel?: Partial<Record<string, FeatureColecao>>
  unidadeDestacada?: string | null
  provincias?: { codigo: string; nome: string }[]
  /** Quando o pai (AnaliseVisualizacoes) quer partilhar qual série está activa com outros
   *  cartões (pódio, tabela por província, outliers) — sem isto cada um escolhia a sua própria
   *  série por omissão (normalmente a [0]), e trocar de cultura/categoria aqui não actualizava
   *  os outros cartões, que ficavam presos na primeira categoria mesmo depois de o utilizador
   *  escolher outra no selector do mapa. */
  activaIndice?: number
  onMudarActiva?: (i: number) => void
}) {
  // Uma análise que desce três níveis produz várias séries: mostrar todas de uma vez seria
  // ruído, por isso o utilizador escolhe o nível, que é também o drill-down do R4.
  const comDados = series.filter((s) => s.unidades && s.unidades.length > 0)

  // R4 diz para descer ao nível mais fino disponível — mas escolher sempre o separador 0 (a
  // primeira série gerada, normalmente província) ignorava isso: uma pergunta sobre um distrito
  // específico abria sempre no nível nacional/provincial, o menos relevante para o que foi
  // perguntado. Por omissão, abre no nível mais fino que a análise conseguiu calcular.
  const ORDEM_FINURA: Record<string, number> = { admin3: 3, admin2: 2, admin1: 1 }
  const maisFinoEntre = (candidatas: Serie[]) =>
    candidatas.reduce(
      (melhor, s, i) => ((ORDEM_FINURA[s.nivel] || 0) > (ORDEM_FINURA[candidatas[melhor]?.nivel] || 0) ? i : melhor),
      0
    )

  /*
   * Uma série de VARIAÇÃO ganha ao nível mais fino.
   *
   * Verificado ao vivo numa análise a perguntar "como evoluiu a produção de milho em cada
   * província": o motor calculou a variação entre 2018 e 2024 e o mapa abria no total acumulado,
   * com a variação escondida no terceiro separador. O total é uma resposta a outra pergunta, e é a
   * que ficava à vista.
   *
   * A presença da série é que decide, e é um sinal fiável: `variacao_geografica` só entra no plano
   * quando o planeador leu a pergunta como sendo sobre mudança. Entre várias variações, continua a
   * mandar o nível mais fino, que é a regra de R4 que já existia.
   */
  const variacoes = comDados.filter((s) => s.variacao === true)
  const indicePreferido =
    variacoes.length > 0
      ? comDados.indexOf(variacoes[maisFinoEntre(variacoes)])
      : maisFinoEntre(comDados)

  // Todos os hooks antes de qualquer return condicional: um useState depois de um early return
  // muda a ordem dos hooks entre renders e parte o componente.
  const [activaInterna, setActivaInterna] = useState(indicePreferido)
  const [expandido, setExpandido] = useState(false)
  const [vista, setVista] = useState<'mapa' | 'lista'>('mapa')

  const activa = activaIndice ?? activaInterna
  const setActiva = onMudarActiva ?? setActivaInterna

  if (comDados.length === 0) return null

  const serie = comDados[Math.min(activa, comDados.length - 1)]
  const ordenadas = [...serie.unidades].sort((a, b) => b.valor - a.valor)
  const maximo = ordenadas[0]?.valor || 1
  const visiveis = expandido ? ordenadas : ordenadas.slice(0, 12)

  /*
   * Como desenhar o que foi medido.
   *
   * Duas condições decidem se somar as unidades dá um total que existe: a série não pode estar
   * normalizada (por habitante, por km²), e o nome da métrica não pode denunciar uma taxa. As
   * duas juntas, porque uma série sem normalização declarada pode na mesma ser uma média de
   * percentagens vinda do próprio ficheiro, e nesse caso somar províncias dá 900%.
   *
   * Quando o valor É uma contagem, a cor sai da área e vai para o tamanho de um círculo: pintar
   * a área faria Niassa, que tem quase o dobro da superfície de Nampula, parecer melhor servida
   * por ser grande.
   */
  const aditivo = serie.normalizacao === 'nenhuma' && somarFazSentido(serie.metrica)
  const dadosDoMapa = {
    geometria: 'poligono' as const,
    nFeicoes: geojsonPorNivel?.[serie.nivel]?.features?.length ?? ordenadas.length,
    temValorPorUnidade: true,
    valorEAditivo: aditivo,
    nUnidadesComValor: ordenadas.length,
    categorico: serie.modo === 'categorico',
    // Vem declarado pelo executor, nunca deduzido de haver negativos: um saldo migratório também
    // tem negativos e não é a variação de coisa nenhuma.
    eVariacao: serie.variacao === true,
  }
  const escolhaDoMapa = escolherMapa(dadosDoMapa)
  const formasDeMapa = formasDeMapaPermitidas(dadosDoMapa)
  const [formaEscolhida, setFormaEscolhida] = useState<TipoMapa | null>(null)
  // Se os dados mudarem e a escolha manual antiga deixar de ser honesta, volta-se à do motor.
  const formaDoMapa =
    formaEscolhida && formasDeMapa.includes(formaEscolhida) ? formaEscolhida : escolhaDoMapa.tipo
  const geojsonDaSerie = geojsonPorNivel?.[serie.nivel]
  const temMapa = !!geojsonDaSerie && geojsonDaSerie.features.length > 0
  const mostrarMapa = temMapa && vista === 'mapa'

  return (
    <section className="pdx-panel">
      <div className="pdx-panel-head">
        <span className="pdx-panel-icone" aria-hidden>
          <MapIcon className="size-3.5" />
        </span>
        <h2>
          {serie.metrica} por {(ROTULO_NIVEL[serie.nivel] || serie.nivel).toLowerCase()}
        </h2>
        {temMapa && mostrarMapa && formasDeMapa.length > 1 && (
          <div className="pdx-abas shrink-0" role="group" aria-label="Como desenhar o mapa">
            {formasDeMapa.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={formaDoMapa === f}
                onClick={() => setFormaEscolhida(f)}
                title={ROTULO_MAPA[f]}
              >
                {ROTULO_MAPA[f]}
              </button>
            ))}
          </div>
        )}
        {temMapa && (
          <div className="pdx-abas ml-auto shrink-0" role="tablist" aria-label="Como ver os dados">
            <button type="button" role="tab" aria-selected={vista === 'mapa'} onClick={() => setVista('mapa')}>
              <MapIcon className="size-3.5 inline-block mr-1 align-[-2px]" aria-hidden />
              Mapa
            </button>
            <button type="button" role="tab" aria-selected={vista === 'lista'} onClick={() => setVista('lista')}>
              <List className="size-3.5 inline-block mr-1 align-[-2px]" aria-hidden />
              Lista
            </button>
          </div>
        )}
      </div>
      <div className="pdx-panel-body">
      <p className="text-[12px] mb-4 pdx-num" style={{ color: 'var(--ink-faint)' }}>
        {ordenadas.length} unidades · {ROTULO_NORMALIZACAO[serie.normalizacao] || serie.normalizacao}
      </p>

      {comDados.length > 1 && (
        // Selector de série: são filtros, não acções, por isso chips e não botões de barra.
        <div className="flex flex-wrap gap-1.5 mb-4">
          {comDados.map((s, i) => (
            <button
              key={s.passo_id}
              type="button"
              onClick={() => setActiva(i)}
              title={s.metrica}
              aria-pressed={i === activa}
              className="pdx-chip"
            >
              {s.metrica}
            </button>
          ))}
        </div>
      )}

      {mostrarMapa ? (
        <AnaliseMapaCoropletico
          geojson={geojsonDaSerie!}
          unidades={serie.unidades}
          metrica={serie.metrica}
          modo={serie.modo}
          forma={formaDoMapa === 'simbolos' || formaDoMapa === 'mudanca' ? formaDoMapa : 'coropletico'}
          unidadeDestacada={unidadeDestacada}
          provincias={serie.nivel !== 'admin1' ? provincias : undefined}
        />
      ) : (
        <ol className="pdx-barras">
          {visiveis.map((u, i) => (
            <li key={u.codigo}>
              <div className="fundo" style={{ width: `${Math.max(2, (u.valor / maximo) * 100)}%` }} aria-hidden />
              <div className="linha">
                <span className="nome">
                  <span className="posicao">{i + 1}</span>
                  {u.nome}
                </span>
                <span className="valor">{formatar(u.valor)}</span>
              </div>
            </li>
          ))}
        </ol>
      )}

      {mostrarMapa && escolhaDoMapa.porque && formaDoMapa === escolhaDoMapa.tipo && (
        <p className="pdx-porque-forma">{escolhaDoMapa.porque}</p>
      )}

      {!mostrarMapa && ordenadas.length > 12 && (
        <button type="button" onClick={() => setExpandido((v) => !v)} className="pdx-ligacao mt-3">
          {expandido ? 'Mostrar menos' : `Ver as ${ordenadas.length} unidades`}
        </button>
      )}
      </div>
    </section>
  )
}
