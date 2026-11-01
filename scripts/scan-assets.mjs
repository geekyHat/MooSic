import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/** Same-origin, pinned OCR assets in both dev and the static build; no CDN at runtime. */
export function scanAssets() {
  const root = fileURLToPath(new URL('../node_modules/', import.meta.url))
  const files = new Map()
  const add = (name, source) => files.set(`scan-assets/${name}`, path.join(root,source))
  add('ocr/worker.min.js','tesseract.js/dist/worker.min.js')
  for (const variant of ['lstm','simd-lstm','relaxedsimd-lstm']) add(`ocr/tesseract-core-${variant}.wasm.js`,`tesseract.js-core/tesseract-core-${variant}.wasm.js`)
  for (const language of ['eng','ita']) add(`ocr/${language}.traineddata.gz`,`@tesseract.js-data/${language}/4.0.0_best_int/${language}.traineddata.gz`)
  for (const directory of ['cmaps','standard_fonts','wasm']) {
    for (const entry of readdirSync(path.join(root,'pdfjs-dist',directory), {withFileTypes:true})) {
      if (entry.isFile()) add(`pdf/${directory}/${entry.name}`,`pdfjs-dist/${directory}/${entry.name}`)
    }
  }
  for (const [name,source] of [['tesseract-LICENSE.txt','tesseract.js/LICENSE.md'],['tesseract-core-LICENSE.txt','tesseract.js-core/LICENSE'],['pdfjs-LICENSE.txt','pdfjs-dist/LICENSE'],['eng-package.json','@tesseract.js-data/eng/package.json'],['ita-package.json','@tesseract.js-data/ita/package.json']]) add(name,source)
  return {
    name:'local-scan-assets',
    configureServer(server) {
      server.middlewares.use((request,response,next) => {
        const url = new URL(request.url ?? '/', 'http://localhost')
        const prefix = server.config.base
        const key = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : ''
        const source = files.get(key)
        if (!source) return next()
        response.setHeader('Content-Type',key.endsWith('.js')?'text/javascript':key.endsWith('.gz')?'application/gzip':'application/octet-stream')
        response.end(readFileSync(source))
      })
    },
    generateBundle() {
      for (const [fileName,source] of files) this.emitFile({type:'asset',fileName,source:readFileSync(source)})
    },
  }
}
