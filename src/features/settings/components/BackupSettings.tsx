import { useEffect,useRef,useState,useSyncExternalStore } from 'react'
import type { AppCore } from '@/core/plugin/context-impl'
import type { BackupPreview,BackupProgress,RestoreResult } from '@/application/backup/BackupService'
import { BackupError } from '@/domain/backup/backup'
import { useDirtyGuard } from '@/shared/navigation/NavigationGuard'
import { Button } from '@/shared/ui/Button'

export function BackupSettings({core}:{core:AppCore}){
  const service=core.backup!,it=core.locale==='it',input=useRef<HTMLInputElement>(null),dialog=useRef<HTMLDialogElement>(null),controller=useRef<AbortController|null>(null)
  const syncing=useSyncExternalStore(core.sync?.subscribe??(()=>()=>{}),()=>core.sync?.busy??false)
  const [busy,setBusy]=useState(false),[progress,setProgress]=useState<BackupProgress|null>(null),[preview,setPreview]=useState<BackupPreview|null>(null),[preferences,setPreferences]=useState(false),[result,setResult]=useState<RestoreResult|null>(null),[error,setError]=useState('')
  useDirtyGuard(busy||!!preview)
  useEffect(()=>{if(result)dialog.current?.showModal()},[result])
  useEffect(()=>()=>{controller.current?.abort();service.discard()},[service])
  const run=async(action:(signal:AbortSignal)=>Promise<void>)=>{
    const abort=new AbortController();controller.current=abort;setBusy(true);setError('');setProgress(null)
    try{await action(abort.signal)}catch(reason){
      if(!abort.signal.aborted)setError(reason instanceof BackupError?reason.code:'storage')
    }finally{if(controller.current===abort){controller.current=null;setBusy(false)}}
  }
  const download=()=>void run(async signal=>{
    const blob=await service.export({signal,progress:setProgress}),url=URL.createObjectURL(blob),link=document.createElement('a')
    link.href=url;link.download=`MooSic-backup-${new Date().toISOString().slice(0,10)}.zip`;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000)
  })
  const errors:Record<string,string>=it?{
    format:'Questo file non è un backup MooSic valido.',version:'La versione del backup non è supportata. Aggiorna MooSic e riprova.',size:'Il file supera i limiti del backup.',corrupt:'Il backup o la libreria locale contengono dati non validi. Nessun ripristino eseguito.',storage:'Spazio insufficiente o memoria locale non disponibile. Il ripristino non è stato completato.',busy:'Un altro backup è in corso.',changed:'La libreria è cambiata. Seleziona di nuovo il backup e riprova.'
  }:{format:'This is not a valid MooSic backup.',version:'Unsupported backup version. Update MooSic and try again.',size:'The file exceeds backup limits.',corrupt:'The backup or local library contains invalid data. Nothing was restored.',storage:'Not enough space or local storage is unavailable. Restore did not complete.',busy:'Another backup is running.',changed:'The library changed. Select the backup again and retry.'}
  return <section className="mm-settings-section mb-5" aria-labelledby="backup-title">
    <h2 id="backup-title" className="mb-2 text-lg">{it?'Backup e ripristino':'Backup and restore'}</h2>
    <p className="mb-3 text-sm text-muted">{it?'Salva in un file ZIP i tuoi brani, i testi importati da OLGA e le preferenze. Conserva una copia fuori dal dispositivo. Foto e PDF originali non sono archiviati: il backup contiene il testo salvato.':'Save your songs, imported OLGA documents and preferences in a ZIP file. Keep a copy outside this device. Original photos and PDFs are not stored: the backup includes saved text.'}</p>
    <div className="flex flex-wrap gap-2">
      <Button onClick={download} disabled={busy||!!preview||syncing}>{it?'Scarica backup completo':'Download full backup'}</Button>
      <Button onClick={()=>input.current?.click()} disabled={busy||!!preview||syncing}>{it?'Apri backup':'Open backup'}</Button>
      <input ref={input} type="file" accept=".zip,application/zip" disabled={syncing} aria-label={it?'File di backup':'Backup file'} className="hidden" onChange={event=>{
        const file=event.target.files?.[0];event.target.value='';if(!file)return
        setPreferences(false);setResult(null)
        void run(async signal=>setPreview(await service.prepare(file,{signal,progress:setProgress})))
      }}/>
    </div>
    {busy&&<div className="mt-3" role="status"><p>{progress?.phase==='restore'?(it?'Ripristino in corso…':'Restoring…'):progress?.phase==='verify'?(it?'Verifica del backup…':'Verifying backup…'):(it?'Preparazione del backup…':'Preparing backup…')}{progress&&progress.total>0?` ${progress.completed} / ${progress.total}`:''}</p>{progress&&progress.total>0&&<progress max={progress.total} value={progress.completed} className="w-full"/>}{progress?.phase!=='restore'&&<Button onClick={()=>controller.current?.abort()}>{it?'Annulla':'Cancel'}</Button>}</div>}
    {error&&<p role="alert" className="mt-3">{errors[error]??errors.storage}</p>}
    {preview&&<div className="mt-3 rounded-lg border border-line p-3" aria-label={it?'Anteprima del backup':'Backup preview'}>
      <p>{new Date(preview.createdAt).toLocaleString(core.locale)} · {preview.songs} {it?'brani':'songs'} · {preview.documents} {it?'documenti OLGA':'OLGA documents'}</p>
      <p className="my-2 text-sm">{it?'Il ripristino aggiunge i contenuti alla libreria. Le copie identiche vengono saltate; i titoli in conflitto ricevono un numero. Nessun brano esistente viene cancellato.':'Restore adds content to your library. Identical copies are skipped; conflicting titles receive a number. Existing songs are preserved.'}</p>
      {preview.hasPreferences&&<label className="mb-3 flex items-center gap-2"><input type="checkbox" checked={preferences} disabled={busy} onChange={e=>setPreferences(e.target.checked)}/>{it?'Ripristina anche le preferenze':'Also restore preferences'}</label>}
      <div className="flex flex-wrap gap-2"><Button variant="primary" disabled={busy} onClick={()=>void run(async signal=>{
        const value=await service.restore(preview.token,preferences,{signal,progress:setProgress});setResult(value);setPreview(null)
      })}>{it?'Unisci alla libreria':'Merge into library'}</Button><Button disabled={busy} onClick={()=>{service.discard();setPreview(null);setError('')}}>{it?'Annulla':'Cancel'}</Button></div>
    </div>}
    {result&&<dialog ref={dialog} onCancel={event=>event.preventDefault()} aria-label={it?'Backup ripristinato':'Backup restored'} className="m-auto max-w-lg rounded-xl border border-line bg-panel p-5 text-ink shadow-lg backdrop:bg-black/50"><div><h3 className="mb-3 text-lg">{it?'Backup ripristinato':'Backup restored'}</h3><p>{it?`Aggiunti ${result.songsAdded} brani e ${result.documentsAdded} documenti OLGA. Saltate ${result.songsSkipped+result.documentsSkipped} copie identiche.`:`Added ${result.songsAdded} songs and ${result.documentsAdded} OLGA documents. Skipped ${result.songsSkipped+result.documentsSkipped} identical copies.`}</p><p className="my-3">{it?'Riapri l’app per caricare la libreria e le preferenze ripristinate.':'Reopen the app to load the restored library and preferences.'}</p><Button variant="primary" autoFocus onClick={()=>location.reload()}>{it?'Riapri l’app':'Reopen app'}</Button></div></dialog>}
  </section>
}
