/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react', 'chart.js', 'react-chartjs-2'],
    /** Evita chunk em `.next/server/vendor-chunks/mysql2.js` que pode falhar em dev; carrega mysql2 a partir de node_modules. */
    serverComponentsExternalPackages: ['mysql2'],
  },
  webpack: (config, { isServer, nextRuntime }) => {
    if (nextRuntime === 'edge') {
      config.resolve = config.resolve || {}
      config.resolve.alias = {
        ...config.resolve.alias,
        mysql2: false,
        'mysql2/promise': false,
      }
    }
    // pdfjs-dist (pré-visualização de PDF em `PreVisualizacaoPdf`) tem, no seu próprio código, um
    // `require('canvas')` condicional para correr em Node sem DOM. É código morto em qualquer dos
    // dois lados: no browser porque `document` existe, e no servidor porque o componente é 'use
    // client' e só chama `import('pdfjs-dist')` dentro de um `useEffect`, que nunca corre durante
    // a renderização no servidor. Mas o webpack bundla os componentes cliente também para a
    // passagem de servidor (para o HTML da primeira pintura), e nessa passagem `isServer` é
    // verdadeiro — a primeira versão desta correcção só aplicava o alias quando `!isServer`, e por
    // isso continuava a rebentar: a compilação que faltava tratar era exactamente essa.
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    }
    return config
  },
  async headers() {
    // connect-src precisa de https://www.google.com e wss://www.google.com para o reconhecimento
    // de voz do Chrome (webkitSpeechRecognition, usado em "Perguntar por voz" na análise nova):
    // o próprio motor de voz do navegador liga-se aos servidores da Google para transcrever, e o
    // CSP bloqueia essa ligação como qualquer outra se o destino não estiver explicitamente aqui.
    // worker-src cai para script-src, e depois para default-src, quando não está declarado — mas
    // o pdf.js (pré-visualização de relatórios) por vezes carrega o seu worker via Blob URL em
    // vez de directamente do URL do ficheiro, e "blob:" nunca esteve em nenhum dos dois. Sem
    // "worker-src 'self' blob:" explícito, essa criação do worker era recusada em silêncio pelo
    // CSP: a pré-visualização falhava sempre, com a mesma mensagem de erro em qualquer PDF,
    // porque o problema nunca foi um ficheiro específico, era a política do próprio portal.
    const cspBase =
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://translate.google.com https://translate.googleapis.com https://translate-pa.googleapis.com https://www.gstatic.com https://www.google.com; style-src 'self' 'unsafe-inline' https://www.gstatic.com https://fonts.googleapis.com; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.opentopomap.org https://*.basemaps.cartocdn.com https://server.arcgisonline.com https://*.arcgis.com https://unpkg.com https://www.gstatic.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.arcgis.com https://translate.googleapis.com https://translate-pa.googleapis.com https://translate.google.com https://www.google.com wss://www.google.com; frame-src 'self' https://*.arcgis.com https://*.maps.arcgis.com https://app.powerbi.com https://*.powerbi.com https://translate.google.com; worker-src 'self' blob:; base-uri 'self'; form-action 'self'"
    return [
      {
        // Páginas de mapa individuais (/maps/[slug]) precisam de "frame-ancestors 'self'": são a
        // única coisa que este próprio site embute num iframe (pré-visualização do dashboard no
        // card do catálogo, MapCatalogHeroVisual). 'self' continua a bloquear qualquer site
        // externo de as enquadrar — só relaxa a auto-incorporação, não abre para terceiros.
        source: '/maps/:slug*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: `${cspBase}; frame-ancestors 'self'` },
        ],
      },
      {
        // /embed/* é a única família de páginas pensada de propósito para ser incorporada em
        // sites de terceiros (ex.: um artigo de jornal a embutir uma análise pública) — por isso é
        // a única excepção deliberada a "frame-ancestors 'none'". Cada página aqui já verifica por
        // si só que só mostra conteúdo explicitamente marcado como público antes de renderizar.
        source: '/embed/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: `${cspBase}; frame-ancestors *` },
        ],
      },
      {
        source: '/:path((?!maps/|embed/).*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: `${cspBase}; frame-ancestors 'none'` },
        ],
      },
    ]
  },
}

module.exports = nextConfig