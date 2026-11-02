import {useRef} from 'react'
import {Button} from '@/shared/ui/Button'
import {canShareLibrary,downloadLibrary} from '../libraryTransfer'

interface Props {
 locale:'it'|'en';file:File|null;disabled:boolean;sharing:boolean;notice:string
 onPrepare:()=>void;onShare:()=>void;onDiscard:()=>void;onImport:(file:File)=>void
}
export function LibraryTransfer({locale,file,disabled,sharing,notice,onPrepare,onShare,onDiscard,onImport}:Props){
 const it=locale==='it',input=useRef<HTMLInputElement>(null),shareable=file&&canShareLibrary(file)
 return <section id="library-transfer" aria-labelledby="library-transfer-title" className="mm-settings-section mb-5 min-w-0 rounded-xl border border-line bg-panel p-4">
  <h2 tabIndex={-1} id="library-transfer-title" className="mb-2 text-lg">{it?'Trasferisci con LocalSend':'Transfer with LocalSend'}</h2>
  <p className="mb-3 text-sm text-muted">{it?'Porta brani salvati, TAB e documenti OLGA su un altro dispositivo, senza abbinamenti QR o server esterni. È uno scambio manuale: per riportare le modifiche, ripeti il trasferimento in senso inverso.':'Move saved songs, TAB and OLGA documents to another device, without QR pairing or external servers. This is a manual exchange: transfer back to bring changes to the first device.'}</p>
  <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm">
   <li>{it?'Installa LocalSend su entrambi i dispositivi e collegali alla stessa rete Wi-Fi/LAN. Il PC può essere collegato via cavo.':'Install LocalSend on both devices and connect them to the same Wi-Fi/LAN. The PC can use Ethernet.'} <a href="https://localsend.org/download" target="_blank" rel="noopener noreferrer" className="underline">{it?'Scarica LocalSend (sito esterno)':'Download LocalSend (external site)'}</a></li>
   <li>{it?'Prepara il file della libreria. Salvalo e invialo con LocalSend scegliendo il dispositivo destinatario, poi accetta la ricezione. Se disponibile, puoi usare il pulsante Condividi e scegliere LocalSend nel menu del sistema.':'Prepare the library file. Save it and send it with LocalSend by choosing the receiving device, then accept receipt. If available, use Share and choose LocalSend in the system menu.'}</li>
   <li>{it?'Sul dispositivo destinatario apri MooSic → Impostazioni → Importa libreria ricevuta. Seleziona lo ZIP, controlla l’anteprima e premi Unisci alla libreria.':'On the receiving device open MooSic → Settings → Import received library. Select the ZIP, review the preview and press Merge into library.'}</li>
  </ol>
  <div className="flex flex-wrap gap-2">
   <Button variant="primary" disabled={disabled} onClick={onPrepare}>{it?'Prepara file della libreria':'Prepare library file'}</Button>
   <Button disabled={disabled} onClick={()=>input.current?.click()}>{it?'Importa libreria ricevuta':'Import received library'}</Button>
  </div>
  <input ref={input} type="file" accept=".zip,application/zip" disabled={disabled} aria-label={it?'File della libreria ricevuta':'Received library file'} className="hidden" onChange={event=>{const selected=event.target.files?.[0];event.target.value='';if(selected)onImport(selected)}}/>
  {file&&<div className="mt-4 min-w-0 rounded-lg border border-line p-3" aria-label={it?'Libreria pronta per il trasferimento':'Library ready to transfer'}>
   <p role="status" className="break-words font-semibold">{it?'File pronto: ':'File ready: '}{file.name} · {(file.size/1024/1024).toFixed(2)} MB</p>
   <p className="my-2 text-sm text-muted">{it?'Il file contiene la libreria al momento della preparazione. Salva prima le bozze e preparalo di nuovo dopo altre modifiche. Il file ZIP non è cifrato; LocalSend cifra il trasferimento.':'This file contains the library at preparation time. Save drafts first and prepare it again after further changes. The ZIP file is not encrypted; LocalSend encrypts the transfer.'}</p>
   <div className="flex flex-wrap gap-2">
    {shareable&&<Button variant="primary" disabled={disabled} pending={sharing} onClick={onShare}>{it?'Condividi…':'Share…'}</Button>}
    <Button disabled={disabled} onClick={()=>downloadLibrary(file)}>{it?'Salva file per LocalSend':'Save file for LocalSend'}</Button>
    <Button disabled={disabled} onClick={onDiscard}>{it?'Chiudi file pronto':'Dismiss prepared file'}</Button>
   </div>
   {!shareable&&<p className="mt-2 text-sm">{it?'Questo browser non consente di condividere direttamente questo ZIP. Salva il file, apri LocalSend e selezionalo da Invia.':'This browser cannot share this ZIP directly. Save the file, open LocalSend and select it from Send.'}</p>}
   {notice&&<p role="status" className="mt-2 text-sm">{notice}</p>}
  </div>}
  <p className="mt-3 text-sm text-muted">{it?'MooSic non installa né apre automaticamente LocalSend e non rileva il completamento del trasferimento. I contenuti esistenti vengono conservati; le copie identiche sono saltate. Foto/PDF originali e bozze non salvate non sono inclusi.':'MooSic does not install or open LocalSend automatically and cannot detect when the transfer completes. Existing content is preserved; identical copies are skipped. Original photos/PDFs and unsaved drafts are not included.'}</p>
 </section>
}
