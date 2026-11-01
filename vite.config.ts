import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { scanAssets } from './scripts/scan-assets.mjs'
import { pwa } from './scripts/pwa.mjs'

export default defineConfig({
  base: process.env.MM_BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), scanAssets(), pwa()],
  // Prebundle lazy readers too, so first use in development cannot reload a draft.
  optimizeDeps: { include: ['tesseract.js', 'pdfjs-dist', 'qrcode', 'jsqr'] },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  server: {
    port: 5173,
    host: true,
  },
})
