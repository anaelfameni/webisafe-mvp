import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore: types not provided for vite-plugin-sitemap
import sitemap from 'vite-plugin-sitemap'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), sitemap({
    hostname: 'https://webisafe.vercel.app',
    dynamicRoutes: ['/', '/analyse', '/contact', '/tarifs', '/protect', '/a-propos', '/cgu', '/confidentialite'],
    exclude: ['/payment', '/admin', '/rapport/:id'],
    lastmod: new Date().toISOString(),
  }), cloudflare()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://webisafe.vercel.app',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path, // garde /api/scan tel quel
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
})