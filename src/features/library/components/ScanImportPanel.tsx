import { useEffect, useId, useRef, useState } from 'react'
import { ScanError, scanFileKind, type ScanLanguage, type ScanProgress, type ScanResult } from '@/application/scan/ScanReader'
import type { ImportChoice } from '@/application/songs/importSongs'
import type { AppCore } from '@/core/plugin/context-impl'
import { artistNames } from '@/domain/songs/artists'
import { parseSongFile, SongImportError } from '@/domain/songs/importSong'
import { normalizeScanText } from '@/domain/songs/scanText'
import { useDirtyGuard } from '@/shared/navigation/NavigationGuard'
import { Button } from '@/shared/ui/Button'
import { Select } from '@/shared/ui/Field'
import { Panel } from '@/shared/ui/Panel'
import { fieldStyle } from '@/shared/ui/styles'
import { importText } from '../importText'
import { scanText } from '../scanText'
import { SongImportPanel } from './SongImportPanel'

export function ScanImportPanel({core,onClose}:{core:AppCore;onClose:()=>void}) {
  const t = scanText[core.locale], id = useId()
  const input = useRef<HTMLInputElement>(null), camera = useRef<HTMLInputElement>(null)
  const active = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const [file,setFile] = useState<File | null>(null)
  const [result,setResult] = useState<ScanResult | null>(null)
  const [text,setText] = useState('')
  const [page,setPage] = useState(0)
  const [language,setLanguage] = useState<ScanLanguage>(core.locale==='it'?'ita':'eng')
  const [rotation,setRotation] = useState<0 | 90 | 180 | 270>(0)
  const [forceOcr,setForceOcr] = useState(false)
  const [progress,setProgress] = useState<ScanProgress | null>(null)
  const [error,setError] = useState('')
  const [stopped,setStopped] = useState(false)
  const [choice,setChoice] = useState<ImportChoice | null>(null)
  const [review,setReview] = useState(false)
  const busy = progress!==null
  const request = useDirtyGuard(!!text.trim() || busy)
  useEffect(() => {mounted.current=true;return () => {mounted.current=false;active.current?.abort()}},[])

  async function read(next: File, nextRotation = rotation) {
    if (active.current || !core.scan) return
    setError('');setStopped(false)
    try {scanFileKind(next)} catch (error) {setError(error instanceof ScanError?t.errors[error.code]:t.errors.format);return}
    const controller = new AbortController()
    active.current = controller
    setFile(next);setResult(null);setText('');setChoice(null);setPage(0)
    setProgress({phase:'opening',page:1,pages:1,progress:0})
    try {
      const output = await core.scan.read(next,{language,rotation:nextRotation,forceOcr,signal:controller.signal,onProgress:value => {if(mounted.current && !controller.signal.aborted)setProgress(value)}})
      if (mounted.current && !controller.signal.aborted) {setResult(output);setText(output.text)}
    } catch (error) {
      if (mounted.current && !controller.signal.aborted) setError(error instanceof ScanError?t.errors[error.code]:t.errors.recognition)
    } finally {
      if (active.current===controller) {active.current=null;if(mounted.current)setProgress(null)}
    }
  }
  const select = (next?: File) => {if(next)request(() => {setRotation(0);void read(next,0)})}
  const stop = () => {active.current?.abort();active.current=null;setProgress(null);setStopped(true)}
  function previewImport() {
    if (!file || !text.trim() || busy) return
    try {
      const entry = parseSongFile(file.name.replace(/\.[^.]+$/,'')+'.cho',normalizeScanText(text),artistNames(core.artists.map(artist=>artist.meta.name)))
      entry.filename=file.name
      entry.metadata={...entry.metadata,needsReview:true}
      setChoice({entry,name:choice?.name??entry.song.name,artist:choice?.artist??entry.song.artist,confirmed:false,metadataConfirmed:false})
      setError('');setReview(true)
    } catch (error) {setError(error instanceof SongImportError?importText[core.locale].errors[error.code]+(error.detail?` (${error.detail})`:''):t.errors.recognition)}
  }

  if (review && choice) return <SongImportPanel core={core} onClose={onClose} initialChoices={[choice]} onBack={choices=>{setChoice(choices[0]??null);setReview(false)}}/>
  return <Panel className="mb-4 min-w-0">
    <section aria-labelledby={id+'-title'} aria-busy={busy} className="min-w-0">
      <h3 id={id+'-title'} className="text-lg font-semibold">{t.title}</h3>
      <p className="my-2 text-sm text-muted">{t.help}</p>
      <p className="my-2 text-sm text-muted">{t.privacy}</p>
      <p className="my-2 text-xs text-muted">{t.limits}</p>
      <input ref={input} className="hidden" type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf" aria-label={t.files} disabled={busy} onChange={event=>{const next=event.target.files?.[0];event.target.value='';select(next)}}/>
      <input ref={camera} className="hidden" type="file" accept="image/*" capture="environment" aria-label={t.cameraFile} disabled={busy} onChange={event=>{const next=event.target.files?.[0];event.target.value='';select(next)}}/>
      <div className="my-3 flex flex-wrap gap-2"><Button disabled={busy} onClick={()=>input.current?.click()}>{t.choose}</Button><Button disabled={busy} onClick={()=>camera.current?.click()}>{t.camera}</Button></div>
      <fieldset disabled={busy} className="min-w-0">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label={t.language} value={language} onChange={event=>setLanguage(event.target.value as ScanLanguage)}><option value="eng">{t.english}</option><option value="ita">{t.italian}</option></Select>
          {file && !/\.pdf$/i.test(file.name) && file.type!=='application/pdf' && <Select label={t.rotate} value={rotation} onChange={event=>setRotation(Number(event.target.value) as typeof rotation)}>{([0,90,180,270] as const).map(angle=><option key={angle} value={angle}>{angle}°</option>)}</Select>}
        </div>
        <label className="my-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={forceOcr} onChange={event=>setForceOcr(event.target.checked)} aria-describedby={id+'-force'}/>{t.force}</label>
        <p id={id+'-force'} className="mb-3 text-xs text-muted">{t.forceHelp}</p>
        {file && <div className="my-3 flex flex-wrap items-center gap-2"><span className="max-w-full break-words text-sm font-medium">{file.name}</span><Button onClick={()=>request(()=>void read(file))}>{t.read}</Button></div>}
      </fieldset>
      {progress && <div role="status" aria-live="polite" className="my-3 text-sm"><p>{t[progress.phase]} {t.page} {progress.page} {t.of} {progress.pages}{progress.phase==='recognizing'?` · ${Math.round(progress.progress*100)}%`:''}</p><Button className="mt-2" onClick={stop}>{t.stop}</Button></div>}
      {stopped && <p role="status" className="my-2 text-sm">{t.stopped}</p>}
      {error && <p role="alert" className="my-3 break-words text-sm">{error}</p>}
      {result && <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <h4 className="mb-2 font-medium">{t.source}</h4>
          <img className="max-h-[32rem] w-full rounded-lg border border-line object-contain bg-white" src={result.pages[page].preview} alt={`${t.source} — ${t.page} ${page+1}`}/>
          <p className="my-2 text-xs text-muted">{result.pages[page].method==='text'?t.extracted:t.ocr}</p>
          {result.pages.length>1 && <div className="flex items-center justify-center gap-3"><Button aria-label={t.previous} disabled={!page} onClick={()=>setPage(value=>value-1)}>‹</Button><span className="text-sm">{t.page} {page+1} {t.of} {result.pages.length}</span><Button aria-label={t.next} disabled={page===result.pages.length-1} onClick={()=>setPage(value=>value+1)}>›</Button></div>}
        </div>
        <div className="min-w-0"><label htmlFor={id+'-text'} className="mb-2 block font-medium">{t.recognized}</label><p id={id+'-hint'} className="mb-2 text-xs text-muted">{t.editHelp}</p><textarea id={id+'-text'} aria-describedby={id+'-hint'} className={`${fieldStyle} min-h-80 w-full resize-y font-mono text-sm`} rows={18} maxLength={100000} spellCheck={false} value={text} onChange={event=>{setText(event.target.value);setError('')}}/></div>
      </div>}
      <p className="mt-4 text-xs text-muted">{t.saved}</p>
      <div className="mt-4 flex flex-wrap gap-2"><Button variant="primary" disabled={busy||!text.trim()} onClick={previewImport}>{t.review}</Button><Button onClick={()=>request(onClose)}>{t.cancel}</Button></div>
    </section>
  </Panel>
}
