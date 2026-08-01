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
    return config
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://translate.google.com https://translate.googleapis.com https://translate-pa.googleapis.com https://www.gstatic.com https://www.google.com; style-src 'self' 'unsafe-inline' https://www.gstatic.com https://fonts.googleapis.com; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.opentopomap.org https://*.basemaps.cartocdn.com https://server.arcgisonline.com https://*.arcgis.com https://unpkg.com https://www.gstatic.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.arcgis.com https://translate.googleapis.com https://translate-pa.googleapis.com https://translate.google.com; frame-src 'self' https://*.arcgis.com https://*.maps.arcgis.com https://app.powerbi.com https://*.powerbi.com https://translate.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig