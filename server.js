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
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(process.env.PORT || 3000, () => {
    console.log('> Server ready')
  })
})
