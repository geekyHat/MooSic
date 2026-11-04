import {readFileSync} from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { scanAssets } from './scripts/scan-assets.mjs'
import { pwa } from './scripts/pwa.mjs'

const packageVersion=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8')).version as string
export default defineConfig(({command})=>{
  const appVersion=process.env.MM_APP_VERSION??packageVersion
  if(!/^\d+\.\d+\.\d+$/.test(appVersion))throw new Error('Invalid application release version')
  const appBuild=process.env.MM_BUILD_ID??process.env.GITHUB_SHA??(command==='build'?Date.now().toString(36):'development')
  return {
  base: process.env.MM_BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), scanAssets(), pwa({appVersion,appBuild})],
  define:{__APP_BUILD__:JSON.stringify(appBuild),__APP_VERSION__:JSON.stringify(appVersion)},
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
}})
