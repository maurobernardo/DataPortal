/**
 * Bateria sobre a leitura do resultado do execucao_codigo.
 *
 * O passo perdia-se quando o modelo escrevia a explicacao antes do objecto e sem cerca ```json:
 * o parse tentava ler a prosa e rebentava com "Unexpected token 'C'". O conteudo estava la e era
 * valido, e um passo de analise nao se pode perder pela forma como a resposta vem embrulhada.
 *
 * Uso: npx tsx scripts/testar-extrair-json.ts
 */

import { extrairJson } from '../lib/analysis/execucao-codigo'

type Caso = { nome: string; texto: string; esperado: unknown | 'ERRO' }

const CASOS: Caso[] = [
  {
    nome: 'cerca json normal',
    texto: 'Aqui esta:\n```json\n{"tipo":"escalar","valor":42}\n```',
    esperado: { tipo: 'escalar', valor: 42 },
  },
  {
    nome: 'json cru sem prosa nenhuma',
    texto: '{"tipo":"escalar","valor":7}',
    esperado: { tipo: 'escalar', valor: 7 },
  },
  {
    nome: 'PROSA antes do json sem cerca (o caso que falhava)',
    texto: 'Calculei a soma por provincia e o resultado e o seguinte:\n{"tipo":"escalar","valor":13}',
    esperado: { tipo: 'escalar', valor: 13 },
  },
  {
    nome: 'cerca sem etiqueta json',
    texto: 'Resultado:\n```\n{"tipo":"escalar","valor":99}\n```',
    esperado: { tipo: 'escalar', valor: 99 },
  },
  {
    nome: 'prosa antes e depois do json',
    texto: 'Primeiro expliquei.\n{"tipo":"escalar","valor":5}\nEspero que ajude.',
    esperado: { tipo: 'escalar', valor: 5 },
  },
  {
    nome: 'duas cercas: fica com a ultima',
    texto: '```json\n{"tipo":"escalar","valor":1}\n```\ncorrigindo:\n```json\n{"tipo":"escalar","valor":2}\n```',
    esperado: { tipo: 'escalar', valor: 2 },
  },
  {
    nome: 'chavetas dentro de uma cadeia de texto nao confundem',
    texto: 'nota\n{"tipo":"escalar","valor":3,"unidade":"custa {a} mais"}',
    esperado: { tipo: 'escalar', valor: 3, unidade: 'custa {a} mais' },
  },
  {
    nome: 'aspas escapadas dentro do valor',
    texto: 'ver:\n{"tipo":"escalar","valor":4,"unidade":"diz \\"ola\\""}',
    esperado: { tipo: 'escalar', valor: 4, unidade: 'diz "ola"' },
  },
  {
    nome: 'objecto encaixado',
    texto: 'r:\n{"tipo":"lista","itens":{"a":{"b":1}}}',
    esperado: { tipo: 'lista', itens: { a: { b: 1 } } },
  },
  {
    nome: 'json partido: nao inventa resultado',
    texto: 'Nao consegui calcular. {"tipo": "escalar", "valor":',
    esperado: 'ERRO',
  },
  {
    nome: 'so prosa, sem json nenhum',
    texto: 'Nao foi possivel calcular nada com estes dados.',
    esperado: 'ERRO',
  },
  {
    nome: 'texto vazio',
    texto: '   ',
    esperado: 'ERRO',
  },
]

let falhas = 0
for (const c of CASOS) {
  let obtido: unknown | 'ERRO'
  try {
    obtido = extrairJson(c.texto)
  } catch {
    obtido = 'ERRO'
  }
  const ok = JSON.stringify(obtido) === JSON.stringify(c.esperado)
  if (!ok) falhas++
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${c.nome}\n      -> ${JSON.stringify(obtido)}`)
}

console.log(`\n${CASOS.length - falhas}/${CASOS.length} casos correctos`)
if (falhas > 0) process.exit(1)
