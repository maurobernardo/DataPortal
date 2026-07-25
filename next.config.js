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
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.opentopomap.org https://*.basemaps.cartocdn.com https://server.arcgisonline.com https://*.arcgis.com https://unpkg.com; font-src 'self' data:; connect-src 'self' https://*.arcgis.com; frame-src 'self' https://*.arcgis.com https://*.maps.arcgis.com https://app.powerbi.com https://*.powerbi.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig