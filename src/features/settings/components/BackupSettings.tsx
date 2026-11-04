import { useEffect,useRef,useState,useSyncExternalStore } from 'react'
import type { AppCore } from '@/core/plugin/context-impl'
import type { BackupPreview,BackupProgress,BackupSummary,RestoreResult } from '@/application/backup/BackupService'
import { BackupError } from '@/domain/backup/backup'
import { useDirtyGuard } from '@/shared/navigation/NavigationGuard'
import { Button } from '@/shared/ui/Button'
import { LibraryTransfer } from './LibraryTransfer'
import { canShareLibrary,libraryFile } from '../libraryTransfer'

export function BackupSettings({core}:{core:AppCore}){
  const service=core.backup!,it=core.locale==='it',input=useRef<HTMLInputElement>(null),dialog=useRef<HTMLDialogElement>(null),controller=useRef<AbortController|null>(null)
  const syncing=useSyncExternalStore(core.sync?.subscribe??(()=>()=>{}),()=>core.sync?.busy??false)
  const [busy,setBusy]=useState(false),[progress,setProgress]=useState<BackupProgress|null>(null),[preview,setPreview]=useState<BackupPreview|null>(null),[preferences,setPreferences]=useState(false),[result,setResult]=useState<RestoreResult|null>(null),[error,setError]=useState('')
  const [file,setFile]=useState<File|null>(null),[sharing,setSharing]=useState(false),[shareNotice,setShareNotice]=useState('')
  const [summary,setSummary]=useState<BackupSummary|null>(null),[importName,setImportName]=useState('')
  const previewPanel=useRef<HTMLDivElement>(null)
  const disabled=busy||sharing||!!preview||syncing
  useDirtyGuard(busy||sharing||!!preview)
  useEffect(()=>{if(preview)previewPanel.current?.scrollIntoView({block:'nearest'})},[preview])
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
  const prepareTransfer=()=>void run(async signal=>{
    setFile(null);setSummary(null);setShareNotice('')
    let count=0
    const blob=await service.export({signal,progress:setProgress,summary:value=>{count=value.songs+value.documents;setSummary(value)}})
    signal.throwIfAborted();if(!count)throw new BackupError('empty')
    setFile(libraryFile(blob))
  })
  const importFile=(selected:File,library=false)=>{
    setFile(null);setSummary(null);setShareNotice('');setPreferences(false);setResult(null);setImportName(selected.name)
    void run(async signal=>{
      const value=await service.prepare(selected,{signal,progress:setProgress})
      if(library&&!value.songs&&!value.documents){service.discard();throw new BackupError('empty')}
      setPreview(value)
    })
  }
  const share=async()=>{
    if(!file||disabled||!canShareLibrary(file))return
    setSharing(true);setShareNotice('')
    try{
      await navigator.share({files:[file]})
      setShareNotice(it?'File passato al menu di condivisione. Controlla la ricezione in LocalSend, poi importalo in MooSic.':'File handed to the sharing menu. Check receipt in LocalSend, then import it in MooSic.')
    }catch(reason){
      if(!(reason instanceof DOMException&&reason.name==='AbortError'))setShareNotice(it?'Condivisione non disponibile. Salva il file e invialo da LocalSend.':'Sharing unavailable. Save the file and send it from LocalSend.')
    }finally{setSharing(false)}
  }
  const errors:Record<string,string>=it?{
    empty:'Nessun brano o documento OLGA da trasferire. Controlla di usare il browser e l’indirizzo che contengono la libreria e seleziona il file corretto.',format:'Questo file non è un backup MooSic valido.',version:'La versione del backup non è supportata. Aggiorna MooSic e riprova.',size:'Il file supera i limiti del backup.',corrupt:'Il backup o la libreria locale contengono dati non validi. Nessun ripristino eseguito.',storage:'Spazio insufficiente o memoria locale non disponibile. Il ripristino non è stato completato.',busy:'Un altro backup è in corso.',changed:'La libreria è cambiata. Seleziona di nuovo il backup e riprova.'
  }:{empty:'No songs or OLGA documents to transfer. Use the browser and address that contain your library and select the correct file.',format:'This is not a valid MooSic backup.',version:'Unsupported backup version. Update MooSic and try again.',size:'The file exceeds backup limits.',corrupt:'The backup or local library contains invalid data. Nothing was restored.',storage:'Not enough space or local storage is unavailable. Restore did not complete.',busy:'Another backup is running.',changed:'The library changed. Select the backup again and retry.'}
  return <><LibraryTransfer locale={core.locale} file={file} summary={summary} error={error==='empty'?errors.empty:''} disabled={disabled} sharing={sharing} notice={shareNotice} onPrepare={prepareTransfer} onShare={()=>void share()} onDiscard={()=>{setFile(null);setShareNotice('')}} onImport={selected=>importFile(selected,true)}/><section className="mm-settings-section mb-5" aria-labelledby="backup-title">
    <h2 id="backup-title" className="mb-2 text-lg">{it?'Backup e ripristino':'Backup and restore'}</h2>
    <p className="mb-3 text-sm text-muted">{it?'Salva in un file ZIP i tuoi brani, i testi importati da OLGA e le preferenze. Conserva una copia fuori dal dispositivo. Foto e PDF originali non sono archiviati: il backup contiene il testo salvato.':'Save your songs, imported OLGA documents and preferences in a ZIP file. Keep a copy outside this device. Original photos and PDFs are not stored: the backup includes saved text.'}</p>
    <div className="flex flex-wrap gap-2">
      <Button onClick={download} disabled={disabled}>{it?'Scarica backup completo':'Download full backup'}</Button>
      <Button onClick={()=>input.current?.click()} disabled={disabled}>{it?'Apri backup':'Open backup'}</Button>
      <input ref={input} type="file" accept=".zip,application/zip" disabled={disabled} aria-label={it?'File di backup':'Backup file'} className="hidden" onChange={event=>{
        const file=event.target.files?.[0];event.target.value='';if(!file)return
        importFile(file)
      }}/>
    </div>
    {busy&&<div className="mt-3" role="status"><p>{progress?.phase==='restore'?(it?'Ripristino in corso…':'Restoring…'):progress?.phase==='verify'?(it?'Verifica del backup…':'Verifying backup…'):(it?'Preparazione del backup…':'Preparing backup…')}{progress&&progress.total>0?` ${progress.completed} / ${progress.total}`:''}</p>{progress&&progress.total>0&&<progress max={progress.total} value={progress.completed} className="w-full"/>}{progress?.phase!=='restore'&&<Button onClick={()=>controller.current?.abort()}>{it?'Annulla':'Cancel'}</Button>}</div>}
    {error&&error!=='empty'&&<p role="alert" className="mt-3">{errors[error]??errors.storage}</p>}
    {preview&&<div ref={previewPanel} className="mt-3 rounded-lg border border-line p-3" aria-label={it?'Anteprima del backup':'Backup preview'}>
      <h3 className="mb-2 break-words font-semibold">{importName}</h3>
      <p className="mb-2 font-semibold">{(preview.songs+preview.documents).toLocaleString(core.locale)} {it?'elementi nel file':'items in this file'}</p>
      <p>{new Date(preview.createdAt).toLocaleString(core.locale)} · {preview.songs} {it?'brani':'songs'} · {preview.documents} {it?'documenti OLGA':'OLGA documents'}</p>
      <p className="my-2 text-sm">{it?'Il ripristino aggiunge i contenuti alla libreria. Le copie identiche vengono saltate; i titoli in conflitto ricevono un numero. Nessun brano esistente viene cancellato.':'Restore adds content to your library. Identical copies are skipped; conflicting titles receive a number. Existing songs are preserved.'}</p>
      {preview.hasPreferences&&<label className="mb-3 flex items-center gap-2"><input type="checkbox" checked={preferences} disabled={busy} onChange={e=>setPreferences(e.target.checked)}/>{it?'Ripristina anche le preferenze':'Also restore preferences'}</label>}
      <div className="flex flex-wrap gap-2"><Button variant="primary" disabled={busy} onClick={()=>void run(async signal=>{
        const value=await service.restore(preview.token,preferences,{signal,progress:setProgress});setResult(value);setPreview(null)
      })}>{it?'Unisci alla libreria':'Merge into library'}</Button><Button disabled={busy} onClick={()=>{service.discard();setPreview(null);setError('')}}>{it?'Annulla':'Cancel'}</Button></div>
    </div>}
    {result&&<dialog ref={dialog} onCancel={event=>event.preventDefault()} aria-label={it?'Backup ripristinato':'Backup restored'} className="m-auto max-w-lg rounded-xl border border-line bg-panel p-5 text-ink shadow-lg backdrop:bg-black/50"><div><p className="mb-2 text-lg font-semibold">{(result.songsAdded+result.documentsAdded).toLocaleString(core.locale)} {it?'elementi aggiunti':'items added'}</p><h3 className="mb-3 text-lg">{it?'Backup ripristinato':'Backup restored'}</h3><p>{it?`Aggiunti ${result.songsAdded} brani e ${result.documentsAdded} documenti OLGA. Saltate ${result.songsSkipped+result.documentsSkipped} copie identiche.`:`Added ${result.songsAdded} songs and ${result.documentsAdded} OLGA documents. Skipped ${result.songsSkipped+result.documentsSkipped} identical copies.`}</p>{!result.songsAdded&&!result.documentsAdded&&result.songsSkipped+result.documentsSkipped>0&&<p className="my-3 font-semibold">{it?'La libreria contiene già tutti gli elementi del file. Nessun duplicato è stato aggiunto.':'Your library already contains every item in this file. No duplicates were added.'}</p>}<p className="my-3">{it?'Riapri l’app per caricare la libreria e le preferenze ripristinate.':'Reopen the app to load the restored library and preferences.'}</p><Button variant="primary" autoFocus onClick={()=>location.reload()}>{it?'Riapri l’app':'Reopen app'}</Button></div></dialog>}
  </section></>
}
