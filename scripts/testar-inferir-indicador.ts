/**
 * Bateria sobre a escolha automatica do indicador em ficheiros de formato longo.
 *
 * O planeador omite o filtro com frequencia, e sem ele a agregacao soma toneladas com hectares.
 * Bloquear resolvia a correccao mas perdia a analise inteira (quatro passos de uma vez, num teste
 * real). Inferir a partir da descricao do passo recupera esses casos, mas so quando ha um vencedor
 * CLARO: escolher entre "producao" e "area cultivada" ao acaso seria o mesmo erro silencioso.
 *
 * Uso: npx tsx scripts/testar-inferir-indicador.ts
 */
import { inferirIndicador } from '../lib/analysis/executor'
import type { Tabela } from '../lib/analysis/dados'

const INDICADORES = [
  'Produção de milho (toneladas)',
  'Área cultivada de milho (ha)',
  'Produção de arroz (toneladas)',
  'Área cultivada de arroz (ha)',
]
function tabela(vals: string[] = INDICADORES): Tabela {
  return {
    dataset_id: 1, titulo: 'cereais',
    colunas: ['variable_name_pt', 'value'],
    linhas: vals.map((v) => [v, '10']),
    n_linhas: vals.length, truncado: false,
  } as Tabela
}
const passo = (descricao: string, coluna_metrica = 'value') =>
  ({ id: 'p1', descricao_humana: descricao, coluna_metrica } as any)

type Caso = { nome: string; descricao: string; esperado: string | null; vals?: string[] }
const CASOS: Caso[] = [
  { nome: 'descricao nomeia producao de milho', descricao: 'Soma a producao de milho por provincia', esperado: 'Produção de milho (toneladas)' },
  { nome: 'descricao nomeia area cultivada de arroz', descricao: 'Compara a area cultivada de arroz entre provincias', esperado: 'Área cultivada de arroz (ha)' },
  { nome: 'acentos e maiusculas nao impedem', descricao: 'PRODUÇÃO DE ARROZ por distrito', esperado: 'Produção de arroz (toneladas)' },
  { nome: 'so diz "milho": empate entre producao e area, nao escolhe', descricao: 'Analisa o milho por provincia', esperado: null },
  { nome: 'descricao generica sem indicador: nao escolhe', descricao: 'Resume os valores por provincia', esperado: null },
  { nome: 'descricao vazia: nao escolhe', descricao: '', esperado: null },
  // Pedir uma cultura que o ficheiro nao tem: "producao" empata entre milho e arroz, e escolher
  // um deles em silencio seria responder sobre outra coisa. O empate tem de deixar o passo falhar.
  { nome: 'cultura inexistente: empate entre producoes, nao escolhe', descricao: 'Soma a producao de castanha de caju', esperado: null },
  { nome: 'um so indicador na tabela: escolhe-o se corresponder', descricao: 'Soma a producao de milho', esperado: 'Produção de milho (toneladas)', vals: ['Produção de milho (toneladas)'] },
  { nome: 'tuberculose: casos notificados', descricao: 'Soma casos de TB notificados por provincia em 2020', esperado: 'Casos de TB Notificados Todas as Formas (contagem)', vals: ['Casos de TB Notificados Todas as Formas (contagem)', 'Taxa de sucesso do tratamento (percentagem)'] },
]

let falhas = 0
for (const c of CASOS) {
  const r = inferirIndicador(tabela(c.vals), 'variable_name_pt', passo(c.descricao))
  const obtido = r ? r.valor : null
  const ok = obtido === c.esperado
  if (!ok) falhas++
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${c.nome}\n      -> ${obtido ?? 'nao escolhe (passo falha, como deve)'}`)
}
console.log(`\n${CASOS.length - falhas}/${CASOS.length} casos correctos`)
if (falhas > 0) process.exit(1)
