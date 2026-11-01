import {useContext,useEffect,useId,useRef,useState} from 'react'
import type {AppCore} from '@/core/plugin/context-impl'
import {activeSync} from '@/application/sync/PeerSyncService'
import {useAppSnapshot} from '@/shared/hooks/useAppSnapshot'
import {NavigationGuard,useDirtyGuard} from '@/shared/navigation/NavigationGuard'
import {Button} from '@/shared/ui/Button'
import {fieldStyle} from '@/shared/ui/styles'
import {syncText} from '../syncText'
import {PairingScanner} from './PairingScanner'

export function PeerSyncSettings({core}:{core:AppCore}){
 const service=core.sync!,state=useAppSnapshot(service),t=syncText[core.locale],guard=useContext(NavigationGuard)
 const id=useId()
 const localOrigin=['localhost','127.0.0.1','[::1]'].includes(location.hostname)
 const [code,setCode]=useState(state.incomingCode),[qr,setQR]=useState(''),[notice,setNotice]=useState(''),dialog=useRef<HTMLDialogElement>(null)
 const active=activeSync(state.phase),canInput=['idle','error','offer'].includes(state.phase)
 useEffect(()=>{if(state.incomingCode)setCode(state.incomingCode)},[state.incomingCode])
 useDirtyGuard(active)
 useEffect(()=>()=>{if(service.busy)service.cancel()},[service])
 useEffect(()=>{if(state.phase==='done')dialog.current?.showModal()},[state.phase])
 useEffect(()=>{
   let mounted=true;setQR('')
   if(state.shareLink)void import('qrcode').then(qr=>qr.toDataURL(localOrigin?state.outgoingCode:state.shareLink,{errorCorrectionLevel:'M',margin:4,width:600})).then(image=>{if(mounted)setQR(image)}).catch(()=>{})
   return ()=>{mounted=false}
 },[state.shareLink,state.outgoingCode,localOrigin])
 const allowed=()=>{
   if(!active&&(guard.isDirty()||core.backup?.busy||['scanning','review','saving'].includes(core.olga?.getSnapshot().status??''))){setNotice(t.draft);return false}
   setNotice('');return true
 }
 const accept=()=>{if(allowed())void service.acceptCode(code)}
 const error=state.error.startsWith('backup-')?t.errors.backup:t.errors[state.error as keyof typeof t.errors]
 const size=(bytes:number)=>`${(bytes/1024/1024).toFixed(1)} MB`
 return <section id="peer-sync" className="mm-settings-section mb-5 min-w-0 rounded-xl border border-line bg-panel p-4" aria-label={t.title}>
   <h2 tabIndex={-1} className="mb-2 text-lg">{t.title}</h2><p className="mb-2 text-sm">{t.intro}</p><p className="mb-3 text-sm text-muted">{t.policy}</p>
   {!state.supported?<p>{t.unsupported}</p>:<>
   {['idle','error'].includes(state.phase)&&<Button variant="primary" onClick={()=>{if(allowed())void service.createOffer()}}>{t.create}</Button>}
   {canInput&&<div className="my-3"><label htmlFor={id+'-input'} className="mb-2 block text-sm">{t.code}</label><textarea id={id+'-input'} className={`${fieldStyle} mt-1 w-full font-mono text-xs`} rows={3} maxLength={20000} spellCheck={false} value={code} onChange={e=>setCode(e.target.value)}/><Button disabled={!code.trim()} onClick={accept}>{t.accept}</Button><PairingScanner locale={core.locale} onCode={setCode} disabled={false}/></div>}
   {state.outgoingCode&&<div className="my-3 min-w-0 rounded-lg border border-line p-3"><p>{state.phase==='offer'?t.offer:t.answer}</p>{qr&&<><img src={qr} alt={t.qr} width={600} height={600} className="mx-auto my-3 h-auto w-full max-w-sm bg-white"/><a href={qr} download="MusicMaestro-pairing.png" className="my-2 inline-block underline">{t.saveQR}</a></>}<label htmlFor={id+'-output'} className="my-2 block text-sm">{t.out}</label><textarea id={id+'-output'} readOnly value={state.outgoingCode} rows={2} className={`${fieldStyle} mt-1 w-full font-mono text-xs`} spellCheck={false} onFocus={e=>e.target.select()}/><label htmlFor={id+'-link'} className="my-2 block text-sm">{t.link}</label><textarea id={id+'-link'} readOnly value={state.shareLink} rows={2} className={`${fieldStyle} mt-1 w-full font-mono text-xs`} spellCheck={false} onFocus={e=>e.target.select()}/><Button onClick={()=>void navigator.clipboard?.writeText(state.shareLink).then(()=>setNotice(t.copied)).catch(()=>setNotice(t.copyFail))}>{t.copy}</Button><p className="my-2 text-xs text-muted">{t.expiry}</p><p className="text-sm text-muted">{t.install}</p>{localOrigin&&<p className="mt-2 text-sm">{t.local}</p>}</div>}
   {state.comparison&&state.phase==='verify'&&<div className="my-3 rounded-lg border border-line p-3"><p>{t.verify}</p><output aria-label={t.compare} className="my-3 block font-mono text-2xl font-bold tracking-widest">{state.comparison}</output><Button variant="primary" disabled={state.confirmed} onClick={()=>void service.confirm()}>{t.confirm}</Button>{state.confirmed&&<p role="status" className="mt-2">{t.waiting}</p>}</div>}
   {['creating','connecting','transfer','restoring'].includes(state.phase)&&<p role="status" className="my-3">{t.phases[state.phase as keyof typeof t.phases]}</p>}
   {state.phase==='transfer'&&<div className="my-3 text-sm"><p>{t.sent}: {size(state.sent)} / {size(state.sendTotal)}</p><progress max={state.sendTotal||1} value={state.sent} className="w-full"/><p>{t.received}: {size(state.received)} / {size(state.receiveTotal)}</p><progress max={state.receiveTotal||1} value={state.received} className="w-full"/></div>}
   {state.phase==='review'&&state.preview&&<div className="my-3" aria-label={t.review}><h3 className="font-semibold">{t.review}</h3><p className="my-2">{state.preview.songs} {core.locale==='it'?'brani':'songs'} · {state.preview.documents} {core.locale==='it'?'documenti OLGA':'OLGA documents'}</p><Button variant="primary" onClick={()=>void service.restore()}>{t.merge}</Button></div>}
   {active&&state.phase!=='restoring'&&<Button onClick={()=>{service.cancel();setCode('');setNotice('')}}>{t.cancel}</Button>}
   {error&&<p role="alert" className="my-2">{error}</p>}{notice&&<p role="status" className="my-2">{notice}</p>}
   </>}
   {state.phase==='done'&&state.result&&<dialog ref={dialog} onCancel={e=>e.preventDefault()} aria-label={t.done} className="m-auto max-w-lg rounded-xl border border-line bg-panel p-5 text-ink shadow-lg backdrop:bg-black/50"><h3 className="mb-3 text-lg">{t.done}</h3><p>{core.locale==='it'?`Aggiunti ${state.result.songsAdded} brani e ${state.result.documentsAdded} documenti OLGA. Saltate ${state.result.songsSkipped+state.result.documentsSkipped} copie identiche.`:`Added ${state.result.songsAdded} songs and ${state.result.documentsAdded} OLGA documents. Skipped ${state.result.songsSkipped+state.result.documentsSkipped} identical copies.`}</p><Button className="mt-3" variant="primary" autoFocus onClick={()=>location.reload()}>{t.reopen}</Button></dialog>}
 </section>
}
