import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
// @ts-ignore: types not provided for vite-plugin-sitemap
import sitemap from 'vite-plugin-sitemap'
import { VitePWA } from 'vite-plugin-pwa'
import { generatePdf } from './lib/generatePdf.js'
import { buildPdfFilename } from './lib/pdfModel.js'

function pdfApiPlugin() {
  return {
    name: 'webisafe-pdf-api',
    configureServer(server) {
      server.middlewares.use('/api/generate-pdf', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          res.end()
          return
        }
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        try {
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const scanData = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
          const pdf = await generatePdf(scanData)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/pdf')
          res.setHeader('Content-Disposition', `attachment; filename="${buildPdfFilename(scanData)}"`)
          res.setHeader('Cache-Control', 'no-store')
          res.end(pdf)
        } catch (error) {
          console.error('[PDF local]', error?.stack || error)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: `Génération PDF locale impossible : ${String(error?.message || error).slice(0, 280)}` }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    pdfApiPlugin(),
    sitemap({
      hostname: 'https://webisafe.vercel.app',
      dynamicRoutes: [
        '/',
        '/analyse',
        '/contact',
        '/tarifs',
        '/protect',
        '/protect/status',
        '/corrections',
        '/ressources',
        '/white-label',
        '/a-propos',
        '/cgu',
        '/confidentialite',
        '/partenaire',
      ],
      exclude: ['/payment', '/admin', '/rapport/:id'],
      lastmod: new Date(),
      generateRobotsTxt: false,
    }),
    // O.4 — Service Worker pour cache statique (PWA légère, pas d'app shell offline complète)
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.svg', 'robots.txt', 'sitemap.xml'],
      manifestFilename: 'manifest.webmanifest',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        importScripts: ['/webpush-handler.js'],
        navigateFallbackDenylist: [/^\/api\//, /^\/admin/, /^\/dashboard/, /^\/agence/, /^\/payment/, /^\/rapport/],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https?:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
  port: 5173,
  hmr: {
    overlay: false,
  },
    proxy: {
      '/api': {
        target: 'https://webisafe.vercel.app',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/.vite/**', 'e2e/**', '**/api_disabled/**'],
    testTimeout: 15000,
  },
})