import {useEffect,useRef,useState} from 'react'
import type {AppCore} from '@/core/plugin/context-impl'
import {useAppSnapshot} from '@/shared/hooks/useAppSnapshot'
import {Button} from '@/shared/ui/Button'
import {fieldStyle} from '@/shared/ui/styles'

const text={
 it:{title:'Porta la tua libreria su questo dispositivo',intro:'Hai aperto un invito del precedente collegamento a QR. Per trasferire la libreria con LocalSend usa il percorso qui sotto. Puoi installare MooSic prima di continuare.',install:'Installa MooSic',consent:'Il browser chiederà la tua conferma: l’installazione non può avvenire senza il tuo consenso.',apple:'Su iPhone o iPad',appleSteps:['Apri questo link in Safari se il lettore QR usa un browser interno.','Tocca Condividi, poi “Aggiungi alla schermata Home” e conferma.','Apri MooSic dalla nuova icona per riprendere il collegamento.'],other:'Se il pulsante di installazione non compare',otherSteps:['Apri il menu del browser e scegli “Installa app” o “Aggiungi alla schermata Home”, quando disponibile.','Se sei in un lettore QR o nel browser interno di un’altra app, apri il link nel browser del dispositivo.'],ready:'L’app è pronta per la lettura offline.',preparing:'Preparazione automatica dell’app per la lettura offline…',unavailable:'L’installazione richiede la versione pubblicata su HTTPS, oppure localhost sullo stesso dispositivo.',failed:'La preparazione offline non è riuscita. Controlla connessione e spazio, poi ricarica questa pagina.',retry:'Ricarica e riprova',resume:'L’invito resta disponibile per dieci minuti, finché il PC tiene aperto il collegamento. Copialo prima di installare: se la nuova app non lo ritrova, incollalo in Impostazioni → Sincronizza con un altro dispositivo oppure leggi nuovamente il QR dall’app.',copy:'Copia invito per riprendere',copied:'Invito copiato. Puoi incollarlo nella nuova app.',copyFailed:'Seleziona e copia l’invito dal campo qui sotto.',link:'Invito da conservare',web:'Continua nel browser',done:'Installazione confermata',doneText:'Apri MooSic dalla nuova icona. Puoi anche proseguire con il collegamento in questa finestra.',continue:'Continua con il collegamento',failure:'Impossibile aprire la richiesta di installazione. Usa il menu del browser o riprova.'},
 en:{title:'Bring your library to this device',intro:'You opened an invitation for the previous QR connection. Use the flow below to transfer your library with LocalSend. You can install MooSic before continuing.',install:'Install MooSic',consent:'Your browser will ask for confirmation: installation requires your consent.',apple:'On iPhone or iPad',appleSteps:['Open this link in Safari if the QR reader uses an in-app browser.','Tap Share, then “Add to Home Screen” and confirm.','Open MooSic from the new icon to resume pairing.'],other:'If the install button does not appear',otherSteps:['Open the browser menu and choose “Install app” or “Add to Home Screen”, when available.','If you are in a QR reader or another app’s built-in browser, open the link in your device’s browser.'],ready:'The app is ready for offline reading.',preparing:'Automatically preparing the app for offline reading…',unavailable:'Installation requires the published HTTPS app, or localhost on this device.',failed:'Offline preparation failed. Check your connection and storage, then reload this page.',retry:'Reload and retry',resume:'The invitation stays available for ten minutes while your PC keeps pairing open. Copy it before installing: if the new app cannot find it, paste it in Settings → Sync with another device, or scan the QR again inside the app.',copy:'Copy invitation to resume',copied:'Invitation copied. You can paste it into the new app.',copyFailed:'Select and copy the invitation from the field below.',link:'Invitation to keep',web:'Continue in browser',done:'Installation confirmed',doneText:'Open MooSic from its new icon. You can also continue pairing in this window.',continue:'Continue pairing',failure:'Could not open the installation prompt. Use the browser menu or try again.'},
}

function focusTransfer(){requestAnimationFrame(()=>{document.getElementById('library-transfer-title')?.focus()})}
function focusPairing(){requestAnimationFrame(()=>{const section=document.getElementById('peer-sync'),details=section?.closest('details');if(details)details.open=true;section?.scrollIntoView({block:'start'});section?.querySelector<HTMLElement>('h2')?.focus({preventScroll:true})})}

export function SyncInstallWelcome({core}:{core:AppCore}){
 const sync=useAppSnapshot(core.sync!),pwa=useAppSnapshot(core.pwa!),t=text[core.locale]
 const [dismissed,setDismissed]=useState(''),[notice,setNotice]=useState(''),[installing,setInstalling]=useState(false),[requested,setRequested]=useState(false),field=useRef<HTMLTextAreaElement>(null)
 const pending=sync.phase==='idle'&&!!sync.incomingCode,apple=/iPhone|iPad|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1
 useEffect(()=>{if(pending&&pwa.installed&&!requested)focusTransfer()},[pending,pwa.installed,requested,sync.incomingCode])
 if(!pending||dismissed===sync.incomingCode||pwa.installed&&!requested)return null
 const link=new URL(import.meta.env.BASE_URL,location.href).href+'#/settings?sync='+encodeURIComponent(sync.incomingCode)
 const install=async()=>{
  setNotice('');setInstalling(true);setRequested(true)
  try{await core.pwa!.install()}catch{setNotice(t.failure)}finally{setInstalling(false)}
 }
 const copy=async()=>{try{await navigator.clipboard.writeText(link);setNotice(t.copied)}catch{const details=field.current?.closest('details');if(details)details.open=true;field.current?.focus();field.current?.select();setNotice(t.copyFailed)}}
 return <section aria-label={t.title} className="mb-5 min-w-0 rounded-xl border border-accent bg-panel p-4">
  <h2 className="mb-2 text-xl font-bold">{pwa.installed?t.done:t.title}</h2>
  <p className="mb-3">{pwa.installed?t.doneText:t.intro}</p>
  {!pwa.installed&&<>
   {pwa.canInstall&&<Button variant="primary" pending={installing} onClick={()=>void install()}>{t.install}</Button>}
   <p className="my-2 text-sm text-muted">{t.consent}</p>
   {(!pwa.canInstall||apple)&&<div className="my-3"><h3 className="mb-2 font-semibold">{apple?t.apple:t.other}</h3><ol className="list-decimal space-y-2 pl-5 text-sm">{(apple?t.appleSteps:t.otherSteps).map(step=><li key={step}>{step}</li>)}</ol></div>}
  </>}
  <p role="status" className="my-3 text-sm">{!pwa.supported?t.unavailable:pwa.error==='offline-failed'?t.failed:pwa.coreReady?t.ready:t.preparing}</p>
  {pwa.error==='offline-failed'&&<Button onClick={()=>location.reload()}>{t.retry}</Button>}
  <p className="mb-3 text-sm text-muted">{t.resume}</p>
  <Button onClick={()=>void copy()}>{t.copy}</Button>
  <details className="my-3 text-sm"><summary className="cursor-pointer">{t.link}</summary><textarea ref={field} aria-label={t.link} value={link} readOnly rows={2} className={`${fieldStyle} mt-2 w-full font-mono text-xs`} onFocus={event=>event.target.select()}/></details>
  {notice&&<p role="status" className="my-2 text-sm">{notice}</p>}
  {pwa.error==='install-failed'&&<p role="alert" className="my-2 text-sm">{t.failure}</p>}
  <Button variant="primary" className="mb-2 mr-2" onClick={()=>{core.sync!.cancel();location.hash='/settings';focusTransfer()}}>{core.locale==='it'?'Usa LocalSend invece del QR':'Use LocalSend instead of QR'}</Button>
  <Button variant={pwa.installed?'primary':'secondary'} onClick={()=>{setDismissed(sync.incomingCode);focusPairing()}}>{pwa.installed?t.continue:t.web}</Button>
 </section>
}
