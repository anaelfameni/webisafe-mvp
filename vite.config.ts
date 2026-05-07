import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
// @ts-ignore: types not provided for vite-plugin-sitemap
import sitemap from 'vite-plugin-sitemap'
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
          console.error('PDF local error:', error)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Erreur génération PDF locale' }))
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
        '/corrections',
      ],
      exclude: ['/payment', '/admin', '/rapport/:id'],
      lastmod: new Date(),
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
    exclude: ['**/node_modules/**', '**/dist/**', '**/.vite/**', 'e2e/**'],
  },
})