/**
 * Confirma que nomes de unidades administrativas escritos noutras formas continuam a ligar.
 *
 * "Maputo City" (base de electrificação RTM) ficava por corresponder e excluia a capital de todos
 * os cruzamentos sem falhar nada: a analise comparava 10 provincias em vez de 11 em silencio.
 *
 * Uso: DATABASE_URL=... npx tsx scripts/testar-nomes-geograficos.ts
 */
import { ligarValoresAUnidades } from '../lib/analysis/dados'

const NOMES = [
  'Maputo City', 'Maputo Cidade', 'Maputo Provincia', 'Maputo',
  'Nampula', 'Nampula Province', 'Zambezia', 'Cabo Delgado',
  'Niassa', 'Sofala', 'Manica', 'Tete', 'Gaza', 'Inhambane',
]
;(async () => {
  const r = await ligarValoresAUnidades(NOMES, 'teste', 'admin1', { permitirDifuso: true })
  console.log(`correspondencia: ${r ? (r.taxa_correspondencia * 100).toFixed(1) + '%' : 'nenhuma'}`)
  if (r) {
    console.log('metodo:', r.metodo)
    console.log('sem correspondencia:', r.nao_correspondidos.length ? r.nao_correspondidos.join(', ') : '(nenhum)')
    const cod = (nome: string) => r.ligacoes.get(NOMES.indexOf(nome)) || 'SEM PAR'
    console.log('Maputo City      ->', cod('Maputo City'))
    console.log('Maputo Cidade    ->', cod('Maputo Cidade'))
    console.log('Maputo Provincia ->', cod('Maputo Provincia'))
    console.log('Nampula Province ->', cod('Nampula Province'))
    console.log('cidade != provincia:', cod('Maputo City') !== cod('Maputo Provincia'))
  }
  process.exit(0)
})()
