import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
// @ts-ignore: types not provided for vite-plugin-sitemap
import sitemap from 'vite-plugin-sitemap'

export default defineConfig({
  plugins: [
    react(),
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