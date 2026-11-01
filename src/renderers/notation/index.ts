import type { RendererHandle,RendererPlugin } from '@/core/plugin/types'
import type { NoteEvent } from '@/domain/score/types'
import manifest from './plugin.json'
const plugin: RendererPlugin = {
 manifest: manifest as RendererPlugin['manifest'],
 renderer: {id:'notation',label:{en:'Notation',it:'Notazione'},render(piece,instrument,target){
  let destroyed=false,inner:RendererHandle|undefined,time:number|undefined,active:NoteEvent[]=[]
  target.textContent='…'
  void import('./renderNotation').then(({renderNotation})=>{
   if(destroyed)return
   inner=renderNotation(piece,instrument,target);if(time!==undefined)inner.update(time,active)
  }).catch(()=>{if(!destroyed){target.textContent='Notation unavailable / Notazione non disponibile';target.setAttribute('role','alert')}})
  return {update(t,notes){time=t;active=notes;inner?.update(t,notes)},seek(t){time=t;inner?.seek(t)},destroy(){destroyed=true;inner?.destroy?.();target.replaceChildren();target.removeAttribute('role')}}
 }}
}
export default plugin
