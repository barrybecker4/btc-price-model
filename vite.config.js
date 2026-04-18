import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Same-origin proxy so browser fetches avoid CryptoCompare CORS (only certain localhost origins are allowed).
const cryptoCompareProxy = {
  '/api/cryptocompare': {
    target: 'https://min-api.cryptocompare.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/cryptocompare/, ''),
  },
}

// https://vite.dev/config/
// Relative base: assets resolve next to index.html (GitHub Pages subfolders, IDE "Open in browser").
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: cryptoCompareProxy,
  },
  preview: {
    proxy: cryptoCompareProxy,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
