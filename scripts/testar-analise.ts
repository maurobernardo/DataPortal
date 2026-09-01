/**
 * Teste de fumo do motor de análise (PLANO-MOTOR-FINAL.md, secção 3, item 4).
 *
 * Corre um punhado de perguntas fixas contra um servidor já em execução (local ou produção) e
 * confirma que cada uma termina sem cair no ecrã de falha degradada. Não substitui testes
 * automatizados normais (não há nenhum framework de testes configurado neste projecto) — é uma
 * verificação rápida, pensada para correr antes de qualquer deploy que mexa em
 * `lib/analysis/**` ou `app/api/analise/**`, apanhando regressões como a de hoje (um `maxItems`
 * no schema que quebrava a chamada à API) antes de chegarem a um utilizador real.
 *
 * Uso:
 *   BASE_URL=http://localhost:3000 SMOKE_EMAIL=admin@exemplo.com SMOKE_PASSWORD=... \
 *     npx tsx scripts/testar-analise.ts
 *
 * Ajuste TESTES abaixo com ids de datasets reais deste portal antes de correr.
 */

import { obterAnalise } from '../lib/analysis/persistencia'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const EMAIL = process.env.SMOKE_EMAIL
const PASSWORD = process.env.SMOKE_PASSWORD

type Teste = { nome: string; pergunta: string; datasetIds: number[] }

// Ajustar os ids de dataset para IDs reais e estáveis deste portal antes de correr em produção.
const TESTES: Teste[] = [
  { nome: 'simples, um dataset', pergunta: 'Qual província tem maior valor nesta métrica?', datasetIds: [65] },
  {
    nome: 'granularidade geográfica mista (a que falhava antes da correcção)',
    pergunta: 'Existe relação entre estas duas variáveis, por distrito?',
    datasetIds: [65, 66],
  },
]

async function login(): Promise<string> {
  if (!EMAIL || !PASSWORD) {
    throw new Error('Defina SMOKE_EMAIL e SMOKE_PASSWORD (uma conta admin de teste) antes de correr.')
  }
  const resposta = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  const setCookie = resposta.headers.get('set-cookie')
  if (!resposta.ok || !setCookie) {
    throw new Error(`Login falhou: ${resposta.status} ${await resposta.text().catch(() => '')}`)
  }
  // Só interessa o par nome=valor, não os atributos (Path, HttpOnly, etc.).
  return setCookie.split(';')[0]
}

async function correrTeste(cookie: string, teste: Teste): Promise<{ ok: boolean; detalhe: string; ms: number }> {
  const inicio = Date.now()
  const resposta = await fetch(`${BASE_URL}/api/analise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ pergunta: teste.pergunta, dataset_ids: teste.datasetIds }),
  })
  if (!resposta.ok || !resposta.body) {
    return { ok: false, detalhe: `POST falhou: ${resposta.status}`, ms: Date.now() - inicio }
  }

  const leitor = resposta.body.getReader()
  const decoder = new TextDecoder()
  let analiseId: string | null = null
  let buffer = ''
  while (true) {
    const { done, value } = await leitor.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const linhas = buffer.split('\n\n')
    buffer = linhas.pop() || ''
    for (const bloco of linhas) {
      const linha = bloco.split('\n').find((l) => l.startsWith('data: '))
      if (!linha) continue
      const evento = JSON.parse(linha.slice(6))
      if (evento.tipo === 'inicio' || evento.tipo === 'concluido') analiseId = evento.analise_id
      if (evento.tipo === 'concluido') break
    }
    if (analiseId && buffer === '' && linhas.some((b) => b.includes('"tipo":"concluido"'))) break
  }

  const ms = Date.now() - inicio
  if (!analiseId) return { ok: false, detalhe: 'nunca recebeu analise_id', ms }

  const analise = await obterAnalise(analiseId)
  if (!analise) return { ok: false, detalhe: `análise ${analiseId} não encontrada na base de dados`, ms }
  if (analise.estado === 'erro') return { ok: false, detalhe: `estado=erro (${analiseId})`, ms }
  if (!analise.narrativa?.resolvida) return { ok: false, detalhe: `sem narrativa resolvida (${analiseId})`, ms }
  if (String(analise.narrativa.resolvida.titulo || '').startsWith('Não foi possível concluir')) {
    return { ok: false, detalhe: `caiu no fallback degradado (${analiseId})`, ms }
  }
  return { ok: true, detalhe: analiseId, ms }
}

async function principal() {
  console.log(`A testar ${TESTES.length} perguntas contra ${BASE_URL}...\n`)
  const cookie = await login()

  let falhas = 0
  for (const teste of TESTES) {
    process.stdout.write(`- ${teste.nome}: `)
    try {
      const resultado = await correrTeste(cookie, teste)
      const segundos = (resultado.ms / 1000).toFixed(1)
      if (resultado.ok) {
        console.log(`OK (${segundos}s) — ${resultado.detalhe}`)
      } else {
        falhas++
        console.log(`FALHOU (${segundos}s) — ${resultado.detalhe}`)
      }
    } catch (erro: any) {
      falhas++
      console.log(`FALHOU — excepção: ${erro?.message || erro}`)
    }
  }

  console.log(`\n${TESTES.length - falhas}/${TESTES.length} testes passaram.`)
  process.exit(falhas > 0 ? 1 : 0)
}

principal().catch((erro) => {
  console.error('Erro fatal no teste de fumo:', erro)
  process.exit(1)
})
