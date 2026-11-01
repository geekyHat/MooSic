import type { AppCore } from '@/core/plugin/context-impl'
import { useAppSnapshot } from '@/shared/hooks/useAppSnapshot'
import { Button } from '@/shared/ui/Button'
import { pwaText } from '../pwaText'
export function PwaSettings({core}:{core:AppCore}){
  const service=core.pwa!,state=useAppSnapshot(service),t=pwaText[core.locale]
  const error=t.errors[state.error as keyof typeof t.errors]
  return <section id="pwa-installation" className="mb-5 rounded-xl border border-line bg-panel p-4" aria-label={t.title}>
    <h2 className="mb-2 text-lg">{t.title}</h2>
    {state.installed?<p>{t.installed}</p>:<><Button disabled={!state.canInstall} onClick={()=>void service.install()}>{t.install}</Button><p className="my-2 text-sm text-muted">{t.instructions}</p></>}
    {!state.supported?<p className="text-sm text-muted">{t.dev}</p>:<>
      <p role="status" className="my-3 font-medium">{state.coreReady?(state.ocrReady?t.ready:t.core):t.preparing}</p>
      {!state.ocrReady&&<p className="mb-2 text-sm text-muted">{t.pack}{state.ocrBytes>0?` (${Math.ceil(state.ocrBytes/1024/1024)} MB)`:''}</p>}
      <div className="my-3 flex flex-wrap gap-2"><Button disabled={!state.coreReady||state.downloading||state.ocrReady} onClick={()=>void service.prepareOffline()}>{state.downloading?`${t.downloading} ${state.completed}/${state.total}`:t.download}</Button><Button disabled={state.updating||state.downloading} onClick={()=>void service.checkUpdate()}>{t.check}</Button>{state.updateReady&&<Button variant="primary" disabled={state.updating} onClick={()=>void service.applyUpdate()}>{t.update}</Button>}</div>
      {error&&<p role="alert" className="my-2 text-sm">{error}</p>}
      <Button disabled={state.persistent===true} onClick={()=>void service.protectStorage()}>{t.protect}</Button>
      {state.persistent!==null&&<p className="mt-2 text-sm">{state.persistent?t.protected:t.notProtected}</p>}
      <p className="mt-2 text-xs text-muted">{t.storage}</p>
    </>}
  </section>
}
