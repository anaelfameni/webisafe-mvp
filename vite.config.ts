import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore: types not provided for vite-plugin-sitemap
import sitemap from 'vite-plugin-sitemap'

export default defineConfig({
  plugins: [
    react(),
    sitemap({
      hostname: 'https://webisafe.vercel.app',
      dynamicRoutes: [
        { path: '/', changefreq: 'daily', priority: 1.0 },
        { path: '/analyse', changefreq: 'weekly', priority: 0.9 },
        { path: '/contact', changefreq: 'monthly', priority: 0.6 },
        { path: '/pricing', changefreq: 'weekly', priority: 0.8 },
      ],
      exclude: ['/payment', '/admin', '/rapport/:id'],
      lastmod: new Date().toISOString(),
    }),
  ],
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