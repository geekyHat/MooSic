import type {AppCore} from '@/core/plugin/context-impl'
import {PeerSyncSettings} from './PeerSyncSettings'

export function LegacySyncSettings({core}:{core:AppCore}){
 const it=core.locale==='it'
 return <details id="legacy-peer-sync" className="mb-5 min-w-0 rounded-xl border border-line p-3">
  <summary className="cursor-pointer font-semibold">{it?'Avanzate: vecchio collegamento con due codici':'Advanced: old two-code connection'}</summary>
  <p className="my-3 text-sm text-muted">{it?'Questo è il collegamento WebRTC precedente e richiede il codice di risposta. Per usare LocalSend scegli Trasferisci con LocalSend qui sopra.':'This is the previous WebRTC connection and requires a reply code. To use LocalSend, choose Transfer with LocalSend above.'}</p>
  <PeerSyncSettings core={core}/>
 </details>
}
