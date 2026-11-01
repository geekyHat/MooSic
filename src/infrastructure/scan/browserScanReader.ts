import { MAX_SCAN_PAGES, ScanError, scanFileKind, type ScanOptions, type ScanPage, type ScanReader } from '@/application/scan/ScanReader'
import { layoutScanText, normalizeScanText } from '@/domain/songs/scanText'
import type { Worker as OcrWorker } from 'tesseract.js'

const abortError = () => new DOMException('Reading cancelled','AbortError')
function waitFor<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortError())
  return new Promise((resolve,reject) => {
    const abort = () => reject(abortError())
    signal.addEventListener('abort',abort,{once:true})
    promise.then(resolve,reject).finally(() => signal.removeEventListener('abort',abort))
  })
}
function canvasFor(width: number, height: number, maxEdge = 2400): HTMLCanvasElement {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new ScanError('image')
  const scale = Math.min(maxEdge/Math.max(width,height),Math.sqrt(4_000_000/(width*height)),2)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1,Math.round(width*scale)); canvas.height = Math.max(1,Math.round(height*scale))
  return canvas
}
function previewOf(canvas: HTMLCanvasElement): string {
  const preview = canvasFor(canvas.width,canvas.height,800)
  preview.getContext('2d')!.drawImage(canvas,0,0,preview.width,preview.height)
  const url = preview.toDataURL('image/jpeg',0.8)
  preview.width = preview.height = 0
  return url
}
async function validateSignature(file: File, kind: 'pdf' | 'image') {
  const bytes = new Uint8Array(await file.slice(0,1024).arrayBuffer())
  const ascii = new TextDecoder('latin1').decode(bytes)
  const valid = kind === 'pdf' ? ascii.includes('%PDF-') : bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff
    || bytes[0]===0x89 && ascii.slice(1,4)==='PNG' || ascii.startsWith('RIFF') && ascii.slice(8,12)==='WEBP'
  if (!valid) throw new ScanError('format')
}

export const browserScanReader: ScanReader = {
  async read(file, options) {
    const kind = scanFileKind(file)
    await validateSignature(file,kind)
    const controller = new AbortController(), signal = controller.signal
    const abort = () => controller.abort()
    options.signal.addEventListener('abort',abort,{once:true})
    if (options.signal.aborted) abort()
    let timedOut = false
    const timer = setTimeout(() => {timedOut=true;abort()},300_000)
    let worker: OcrWorker | undefined
    let workerPromise: Promise<OcrWorker> | undefined
    let page = 1, pages = 1
    const report = (phase: Parameters<ScanOptions['onProgress']>[0]['phase'],progress=0) => {
      if (!signal.aborted) options.onProgress({phase,progress,page,pages})
    }
    const assetBase = new URL(`${import.meta.env.BASE_URL}scan-assets/`,location.href).href
    async function recognize(canvas: HTMLCanvasElement): Promise<string> {
      if (!worker) {
        report('loading')
        const {createWorker,OEM,PSM} = await waitFor(import('tesseract.js'),signal)
        let failed!: (reason: unknown) => void
        const failure = new Promise<never>((_,reject) => {failed=reject})
        workerPromise = createWorker(options.language,OEM.LSTM_ONLY,{
          workerPath:`${assetBase}ocr/worker.min.js`,corePath:`${assetBase}ocr`,langPath:`${assetBase}ocr`,
          workerBlobURL:false,cacheMethod:'none',
          logger: message => report(message.status==='recognizing text'?'recognizing':'loading',message.progress),
          errorHandler: (error: unknown) => failed(error),
        })
        // Initialization may finish after cancellation; terminate its worker as soon as available.
        void workerPromise.then(created => {if(signal.aborted)void created.terminate()},() => {})
        worker = await waitFor(Promise.race([workerPromise,failure]),signal)
        await waitFor(worker.setParameters({preserve_interword_spaces:'1',tessedit_pageseg_mode:PSM.AUTO}),signal)
      }
      report('recognizing')
      const result = await waitFor(worker.recognize(canvas,{rotateAuto:true}),signal)
      return normalizeScanText(result.data.text)
    }
    try {
      report('opening')
      const output: ScanPage[] = []
      if (kind === 'image') {
        const bitmap = await waitFor(createImageBitmap(file),signal)
        let canvas: HTMLCanvasElement | undefined
        try {
          if (bitmap.width*bitmap.height > 60_000_000) throw new ScanError('image')
          const sideways = options.rotation===90 || options.rotation===270
          canvas = canvasFor(sideways?bitmap.height:bitmap.width,sideways?bitmap.width:bitmap.height)
          const ctx = canvas.getContext('2d')!
          ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height)
          ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(options.rotation*Math.PI/180)
          const width = sideways?canvas.height:canvas.width, height = sideways?canvas.width:canvas.height
          ctx.drawImage(bitmap,-width/2,-height/2,width,height)
          output.push({text:await recognize(canvas),preview:previewOf(canvas),method:'ocr'})
        } finally {bitmap.close();if(canvas)canvas.width=canvas.height=0}
      } else {
        const pdfjs = await waitFor(import('pdfjs-dist'),signal)
        const {default:workerUrl} = await waitFor(import('pdfjs-dist/build/pdf.worker.min.mjs?url'),signal)
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
        const loading = pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),
          cMapUrl:`${assetBase}pdf/cmaps/`,cMapPacked:true,standardFontDataUrl:`${assetBase}pdf/standard_fonts/`,wasmUrl:`${assetBase}pdf/wasm/`,
          useSystemFonts:false,isOffscreenCanvasSupported:false,enableXfa:false})
        const destroy = () => {void loading.destroy()}
        signal.addEventListener('abort',destroy,{once:true})
        try {
          const pdf = await waitFor(loading.promise,signal)
          pages = pdf.numPages
          if (pages > MAX_SCAN_PAGES) throw new ScanError('pages')
          for (page=1;page<=pages;page++) {
            report('rendering')
            const pdfPage = await waitFor(pdf.getPage(page),signal)
            const original = pdfPage.getViewport({scale:1})
            const canvas = canvasFor(original.width,original.height)
            const viewport = pdfPage.getViewport({scale:canvas.width/original.width})
            const render = pdfPage.render({canvas,viewport})
            const cancel = () => render.cancel()
            signal.addEventListener('abort',cancel,{once:true})
            try {
              await waitFor(render.promise,signal)
              const content = options.forceOcr ? undefined : await waitFor(pdfPage.getTextContent(),signal)
              const text = content ? normalizeScanText(layoutScanText(content.items.flatMap(item => {
                if (!('str' in item)) return []
                const [x,y] = viewport.convertToViewportPoint(item.transform[4],item.transform[5])
                return [{text:item.str,x,y,width:item.width*viewport.scale,height:item.height*viewport.scale}]
              }))) : ''
              const hasText = (text.match(/\p{L}/gu)?.length ?? 0) >= 20
              output.push({text:hasText?text:await recognize(canvas),preview:previewOf(canvas),method:hasText?'text':'ocr'})
              if (output.reduce((sum,item) => sum+item.text.length,0)>100000) throw new ScanError('size')
            } finally {signal.removeEventListener('abort',cancel);canvas.width=canvas.height=0;pdfPage.cleanup()}
          }
        } finally {signal.removeEventListener('abort',destroy);await loading.destroy()}
      }
      const text = normalizeScanText(output.map(item => item.text).join('\n\n'))
      if (!text) throw new ScanError('empty')
      if (text.length>100000) throw new ScanError('size')
      if (signal.aborted) throw abortError()
      return {pages:output,text}
    } catch (error) {
      if (timedOut) throw new ScanError('timeout')
      if (signal.aborted) throw abortError()
      if (error instanceof ScanError) throw error
      if (error instanceof Error && error.name==='PasswordException') throw new ScanError('password')
      throw new ScanError(kind==='image'?'image':'recognition')
    } finally {
      clearTimeout(timer);options.signal.removeEventListener('abort',abort);controller.abort()
      if (worker) await worker.terminate()
    }
  },
}
