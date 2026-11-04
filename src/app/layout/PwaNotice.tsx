import { useContext,useEffect,useState } from 'react'
import type { AppCore } from '@/core/plugin/context-impl'
import { useAppSnapshot } from '@/shared/hooks/useAppSnapshot'
import { NavigationGuard } from '@/shared/navigation/NavigationGuard'
import { Button } from '@/shared/ui/Button'
export function PwaNotice({core}:{core:AppCore}) {
  const service=core.pwa!,state=useAppSnapshot(service),guard=useContext(NavigationGuard),[dismissed,setDismissed]=useState(''),it=core.locale==='it'
  useEffect(()=>service.start(()=>!guard.isDirty()&&!['scanning','saving','review'].includes(core.olga?.getSnapshot().status??'')&&!core.backup?.busy&&!core.sync?.busy),[service,guard,core])
  useEffect(()=>{
    const shell=document.querySelector<HTMLElement>('.mm-shell')
    if(state.updating)shell?.setAttribute('inert','')
    else shell?.removeAttribute('inert')
    return ()=>shell?.removeAttribute('inert')
  },[state.updating])
  const release=JSON.stringify([state.availableBuild,state.availableVersion,state.version])
  if(state.updating)return <div role="alert" className="fixed inset-0 z-[100] flex items-center justify-center bg-panel/95 p-5 text-lg"><div><p>{it?'Aggiornamento in corso…':'Updating…'}</p><p className="mt-2 text-sm">{state.appVersion}{state.availableVersion?` → ${state.availableVersion}`:''}</p><p className="mt-2 text-sm">{it?'Se l’attivazione non termina, l’app sblocca i comandi per riprovare.':'If activation does not finish, the app unlocks so you can retry.'}</p></div></div>
  if(!(state.updateReady||state.reloadRequired)||dismissed===release)return null
  return <aside aria-label={it?'Aggiornamento disponibile':'Update available'} className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-xl border border-line bg-panel p-4 shadow-lg">
    <p>{it?'È disponibile una nuova versione di MooSic.':'A new version of MooSic is available.'} {state.appVersion}{state.availableVersion?` → ${state.availableVersion}`:''}{state.availableBuild?` · ${state.availableBuild.slice(0,12)}`:''}</p>
    {state.error==='busy-tabs'&&<p role="alert" className="my-2 text-sm">{it?'Salva o annulla le bozze e termina le importazioni in tutte le schede aperte.':'Save or discard drafts and finish imports in every open tab.'}</p>}
    {['update-timeout','update-failed'].includes(state.error)&&<p role="alert" className="my-2 text-sm">{it?'L’aggiornamento non è stato completato. Puoi riprovare; i dati della libreria restano sul dispositivo.':'The update did not complete. You can retry; library data stays on this device.'}</p>}
    <div className="mt-3 flex flex-wrap gap-2"><Button variant="primary" onClick={()=>void service.applyUpdate()}>{it?'Installa aggiornamento':'Install update'}</Button><Button onClick={()=>setDismissed(release)}>{it?'Più tardi':'Later'}</Button></div>
  </aside>
}
