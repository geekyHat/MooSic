import type { Instrument,RendererPlugin } from '@/core/plugin/types'
import type { Piece } from '@/domain/score/types'
import { useEffect,useRef } from 'react'
/** One owner for the static reading view, renderer handle and ResizeObserver. */
export function useScoreRenderer(piece:Piece|null,instrument:Instrument|null,renderers:RendererPlugin[],display:string){
 const containers=useRef(new Map<string,HTMLDivElement>())
 const ids=renderers.map(r=>r.manifest.id).join(',')
 useEffect(()=>{
  if(!piece||!instrument)return
  const id=display==='tabs'?'renderer-tab':display==='notation'?'renderer-notation':null
  const plugin=renderers.find(r=>r.manifest.id===id),el=id?containers.current.get(id):null
  if(!plugin||!el)return
  let handle:ReturnType<typeof plugin.renderer.render>|undefined
  let frame=0,width=el.clientWidth
  const render=()=>{handle?.destroy?.();el.replaceChildren();handle=plugin.renderer.render(piece,instrument,el)}
  render()
  const observer=new ResizeObserver(()=>{const next=el.clientWidth;if(next===width)return;width=next;cancelAnimationFrame(frame);frame=requestAnimationFrame(render)})
  observer.observe(el)
  return ()=>{observer.disconnect();cancelAnimationFrame(frame);handle?.destroy?.();el.replaceChildren()}
 },[piece,instrument,ids,display])
 return containers
}
