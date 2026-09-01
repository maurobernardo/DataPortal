const { loadEnvConfig } = require('@next/env')

// Carrega .env/.env.production a partir da pasta deste ficheiro, em vez de confiar em
// process.cwd() — em Passenger/cPanel o processo pode arrancar com cwd diferente da raiz
// da app, o que faz o Next não encontrar o .env e cair nos valores por omissão (localhost).
loadEnvConfig(__dirname)

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const app = next({ dev: false, dir: __dirname })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  // Por omissão o Node corta qualquer pedido aos 5 minutos (requestTimeout), mesmo com dados a
  // fluir — a análise por IA (SSE, pode legitimamente levar 10+ minutos) cai a meio por causa
  // disto, sem relação nenhuma com maxDuration da rota (isso só tem efeito na Vercel). Desligado
  // aqui porque este servidor corre atrás de um proxy do cPanel que já impõe o seu próprio limite.
  server.requestTimeout = 0
  server.headersTimeout = 65000
  server.keepAliveTimeout = 65000

  server.listen(process.env.PORT || 3000, () => {
    console.log('> Server ready')
  })
})
