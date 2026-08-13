import { db } from '../lib/db'
import { carregarTabela, colunaValores } from '../lib/analysis/dados'

/**
 * Preenche geo_unidades.populacao ao nível de província a partir do dataset 56
 * (Data4Moz L02 Demografia e População), variável L02_V001 "Total Population", ano 2017.
 *
 * 2017 e não o ano mais recente disponível (2023) porque é o ano do Censo que também fundamenta
 * area_km2 e os centróides já carregados: manter os denominadores no mesmo ano de referência
 * evita comparar uma fronteira de 2017 com uma população de 2023 sem o dizer.
 *
 * Só existe cobertura ao nível de província nesta fonte: distrito e posto administrativo ficam
 * sem população, o que o executor tem de recusar explicitamente em vez de silenciar (R1/R9).
 */

// "Maputo" (província) e "Maputo Cidade" colidiriam no normalizador genérico de nomes (ambos
// perdem o sufixo "cidade"/"provincia"), por isso o mapeamento é explícito em vez de reutilizar
// a correspondência difusa.
const CODIGO_POR_NOME: Record<string, string> = {
  NIASSA: '01',
  'CABO DELGADO': '02',
  NAMPULA: '03',
  ZAMBÉZIA: '04',
  TETE: '05',
  MANICA: '06',
  SOFALA: '07',
  INHAMBANE: '08',
  GAZA: '09',
  'MAPUTO PROVÍNCIA': '10',
  'MAPUTO CIDADE': '11',
}

async function main() {
  const t = await carregarTabela(56)
  if ('erro' in t) throw new Error(t.erro)

  const geoType = colunaValores(t, 'geography_type')
  const geoName = colunaValores(t, 'geography_name')
  const year = colunaValores(t, 'year')
  const varId = colunaValores(t, 'variable_id')
  const valor = colunaValores(t, 'value')

  let actualizados = 0
  const naoEncontrados: string[] = []

  for (let i = 0; i < t.n_linhas; i++) {
    if (geoType[i] !== 'Province' || varId[i] !== 'L02_V001' || year[i] !== '2017') continue

    const nome = geoName[i].trim().toUpperCase()
    const codigo = CODIGO_POR_NOME[nome]
    const pop = Number.parseInt(valor[i], 10)

    if (!codigo || !Number.isFinite(pop)) {
      naoEncontrados.push(`${geoName[i]} (pop=${valor[i]})`)
      continue
    }

    const [resultado] = (await db.execute(
      `UPDATE geo_unidades SET populacao = ? WHERE nivel = 'admin1' AND codigo = ?`,
      [pop, codigo]
    )) as [any, unknown]
    actualizados += resultado.affectedRows
    console.log(`  ${nome} (${codigo}): ${pop.toLocaleString('pt-PT')} habitantes`)
  }

  console.log(`\n${actualizados} províncias actualizadas.`)
  if (naoEncontrados.length) console.log(`Não reconhecidos: ${naoEncontrados.join(', ')}`)

  const [semPop] = (await db.execute(
    `SELECT codigo, nome FROM geo_unidades WHERE nivel = 'admin1' AND populacao IS NULL`
  )) as [any[], unknown]
  if (semPop.length) {
    console.log(`\nAviso: províncias sem população após a carga: ${semPop.map((r: any) => r.nome).join(', ')}`)
  }
}

main()
  .then(() => db.end())
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
