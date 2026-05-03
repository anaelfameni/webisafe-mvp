import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore: types not provided for vite-plugin-sitemap
import sitemap from 'vite-plugin-sitemap'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ mode }) => {
  // Charge TOUTES les variables du .env (pas seulement VITE_*) dans process.env
  // pour que les handlers API locaux (api/contact.js) y aient accès.
  const env = loadEnv(mode, process.cwd(), '')
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) process.env[k] = v
  }

  return {
    plugins: [react(), sitemap({
      hostname: 'https://webisafe.vercel.app',
      dynamicRoutes: ['/', '/analyse', '/contact', '/tarifs', '/protect', '/a-propos', '/cgu', '/confidentialite'],
      exclude: ['/payment', '/admin', '/rapport/:id'],
      lastmod: new Date().toISOString(),
    }), {
      name: 'api-local-handlers',
      configureServer(server) {
        // --- /api/contact ---
        server.middlewares.use('/api/contact', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Méthode non autorisée' }))
            return
          }
          let body = ''
          req.on('data', (chunk: any) => (body += chunk))
          req.on('end', async () => {
            try {
              const parsed = JSON.parse(body || '{}')
              const mod = await server.ssrLoadModule('/api/contact.js')
              const handler = mod.default
              const fakeReq: any = { method: 'POST', body: parsed }
              const fakeRes: any = {
                statusCode: 200,
                status(code: number) { this.statusCode = code; return this },
                setHeader(_k: string, _v: string) { return this },
                json(payload: any) {
                  res.statusCode = this.statusCode
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify(payload))
                  return this
                },
              }
              await handler(fakeReq, fakeRes)
            } catch (err: any) {
              console.error('[api-contact-local] exception:', err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: `Erreur locale: ${err?.message || 'inconnue'}` }))
            }
          })
        })

        // --- /api/scan ---
        server.middlewares.use('/api/scan', async (req, res) => {
          if (req.method === 'OPTIONS') {
            res.statusCode = 200
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, x-user-id')
            res.end()
            return
          }
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Méthode non autorisée' }))
            return
          }
          let body = ''
          req.on('data', (chunk: any) => (body += chunk))
          req.on('end', async () => {
            try {
              const parsed = JSON.parse(body || '{}')
              const mod = await server.ssrLoadModule('/api/scan.js')
              const handler = mod.default
              const fakeReq: any = {
                method: 'POST',
                headers: { 'x-user-id': req.headers['x-user-id'] || req.headers['X-User-Id'] || '' },
                body: parsed,
              }
              const fakeRes: any = {
                statusCode: 200,
                status(code: number) { this.statusCode = code; return this },
                setHeader(_k: string, _v: string) { return this },
                json(payload: any) {
                  res.statusCode = this.statusCode
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify(payload))
                  return this
                },
              }
              await handler(fakeReq, fakeRes)
            } catch (err: any) {
              console.error('[api-scan-local] exception:', err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: `Erreur locale: ${err?.message || 'inconnue'}` }))
            }
          })
        })
      },
    }, cloudflare()],
    server: {
      port: 5173,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'framework'
              }
              if (id.includes('framer-motion')) {
                return 'animation'
              }
              if (id.includes('lucide-react')) {
                return 'icons'
              }
              if (id.includes('jspdf') || id.includes('autotable')) {
                return 'pdf'
              }
              if (id.includes('@supabase')) {
                return 'db'
              }
              return 'vendor'
            }
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  };
})