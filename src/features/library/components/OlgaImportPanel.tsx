import { useState,useSyncExternalStore } from 'react'
import type { AppCore } from '@/core/plugin/context-impl'
import { Button } from '@/shared/ui/Button'

export function OlgaImportPanel({core,onClose}:{core:AppCore;onClose:()=>void}){
 const service=core.olga!,state=useSyncExternalStore(service.subscribe,service.getSnapshot),it=core.locale==='it'
 const [page,setPage]=useState(0),[notice,setNotice]=useState('')
 const busy=state.status==='scanning'||state.status==='saving'
 const unconfirmed=state.reviews.filter(r=>!r.confirmed||!r.target.trim()).length
 const close=async()=>{await service.cancel();onClose()}
 return <section className="mb-4 rounded-xl border border-line bg-panel p-4" aria-label="Import OLGA Archive">
  <h3>import olga archive</h3>
  <p>{it?'Seleziona lo ZIP locale senza estrarlo. I documenti vengono conservati in questo browser, senza inviarli a un server.':'Select the local ZIP without extracting it. Documents stay in this browser and are not uploaded to a server.'}</p>
  {!busy&&state.status!=='review'&&<label className="block my-3">{it?'Archivio OLGA (.zip)':'OLGA archive (.zip)'}<input className="block mt-2 max-w-full" type="file" accept=".zip,application/zip" aria-label="OLGA Archive.zip" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file){setPage(0);setNotice('');void service.prepare(file,core.artists.map(a=>a.meta.name),core.artistLinks)}}}/></label>}
  {busy&&<div role="status" aria-live="polite"><p>{state.status==='scanning'?(it?'Lettura e verifica ZIP…':'Reading and verifying ZIP…'):(it?'Salvataggio e controllo duplicati…':'Saving and checking duplicates…')}</p><progress aria-label={it?'Avanzamento OLGA':'OLGA progress'} max={state.progress.total||1} value={state.status==='saving'?state.progress.total:state.progress.bytes}/><p>{state.progress.files.toLocaleString()} {it?'file letti':'files read'}{state.status==='saving'?` · ${state.added.toLocaleString()} ${it?'nuovi':'new'} · ${state.duplicates.toLocaleString()} ${it?'duplicati':'duplicates'}`:''}</p></div>}
  {state.status==='review'&&<>
   <p>{state.scanned.toLocaleString()} {it?'documenti musicali trovati. Le copie identiche verranno saltate; titoli uguali con contenuti diversi riceveranno (n).':'music documents found. Identical copies will be skipped; matching titles with different contents receive (n).'}</p>
   <p>{state.progress.skipped.toLocaleString()} {it?'elementi esclusi (cartelle, archivi annidati, programmi, risorse e formati non musicali).':'items excluded (folders, nested archives, programs, resources and non-music formats).'}</p>
   {state.reviews.length>0&&<>
    <h4>{it?'Verifica artisti simili o generici':'Review similar or generic artist names'} ({unconfirmed})</h4>
    <p>{it?'Per unire due nomi, scegli lo stesso artista finale. Conferma anche quando vuoi mantenerli separati.':'Choose the same final artist to merge names. Also confirm names you want to keep separate.'}</p>
    {state.reviews.slice(page*10,page*10+10).map((row,index)=><div key={row.name} className="mb-3 rounded border border-line p-3">
     <label className="block">{row.name} ({row.count})<input aria-label={`${it?'Artista finale':'Final artist'} ${row.name}`} className="block w-full border border-line rounded bg-panel p-2" value={row.target} list={`olga-artists-${index}`} onChange={e=>service.review(row.name,e.target.value,false)}/></label>
     <datalist id={`olga-artists-${index}`}>{row.suggestions.map(name=><option key={name} value={name}/>)}</datalist>
     {row.suggestions.length>0&&<p className="text-sm text-muted">{it?'Nomi simili':'Similar names'}: {row.suggestions.join(' · ')}</p>}
     <label><input type="checkbox" checked={row.confirmed} disabled={!row.target.trim()} onChange={e=>service.review(row.name,row.target,e.target.checked)}/> {it?'Confermo questo artista':'I confirm this artist'}</label>
    </div>)}
    <div className="flex flex-wrap gap-2 my-3"><Button disabled={page===0} onClick={()=>setPage(page-1)}>{it?'Precedenti':'Previous'}</Button><span>{page+1} / {Math.ceil(state.reviews.length/10)}</span><Button disabled={(page+1)*10>=state.reviews.length} onClick={()=>setPage(page+1)}>{it?'Successivi':'Next'}</Button>
    <Button onClick={()=>{for(const row of state.reviews)if(!row.confirmed)service.review(row.name,row.name,true)}}>{it?'Mantieni separati e conferma i nomi rimanenti':'Keep remaining names separate and confirm'}</Button></div>
   </>}
   <Button variant="primary" disabled={unconfirmed>0} onClick={()=>{setNotice('');void service.commit(core.artists.flatMap(a=>a.songs.filter(s=>!s.meta.id.startsWith('olga-')).map(s=>({artist:a.meta.name,title:s.meta.title})))).catch(error=>setNotice(String(error)))}}>{it?'Importa nella libreria':'Import into library'}</Button>
  </>}
  {state.status==='done'&&<p role="status">{it?'Importazione completata':'Import complete'}: {state.added.toLocaleString()} {it?'aggiunti':'added'}, {state.duplicates.toLocaleString()} {it?'duplicati saltati':'duplicates skipped'}, {state.renamed.toLocaleString()} {it?'titoli numerati':'numbered titles'}.</p>}
  {(state.error||notice)&&<p role="alert">{state.error||notice}</p>}
  <div className="mt-3"><Button disabled={state.status==='saving'} onClick={()=>{if(state.status==='scanning')void service.cancel();else void close()}}>{busy?(it?'Annulla':'Cancel'):(it?'Chiudi':'Close')}</Button></div>
 </section>
}
