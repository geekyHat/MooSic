import { useState, type CSSProperties } from 'react'
import type { Locale } from '@/core/i18n'
import { TUNER_RANGE, TUNING_TOLERANCE } from '@/domain/music/tuner'
import { GuitarStrings } from './GuitarStrings'
import { useTuner, type TunerError } from './useTuner'
import './tuner.css'

const errors: Record<'it' | 'en', Record<TunerError, string>> = {
  it: {
    secure: 'Per usare il microfono, apri MooSic tramite HTTPS oppure su localhost.',
    unsupported: 'Questo browser non supporta l’ascolto dal microfono. Prova un browser aggiornato.',
    denied: 'Accesso al microfono negato. Abilitalo nelle autorizzazioni del sito, poi riprova.',
    missing: 'Nessun microfono trovato. Collega un microfono e riprova.',
    busy: 'Il microfono non è disponibile. Controlla che non sia occupato da un’altra app e riprova.',
    interrupted: 'L’ascolto si è interrotto. Controlla il microfono e tocca di nuovo per accordare.',
    audio: 'Il microfono è autorizzato, ma l’audio non si è avviato. Tocca di nuovo per accordare.',
    failed: 'Impossibile avviare l’ascolto. Controlla il microfono e riprova.',
  },
  en: {
    secure: 'To use the microphone, open MooSic over HTTPS or on localhost.',
    unsupported: 'This browser does not support microphone input. Try an up-to-date browser.',
    denied: 'Microphone access denied. Allow it in the site permissions, then try again.',
    missing: 'No microphone found. Connect a microphone and try again.',
    busy: 'The microphone is unavailable. Check whether another app is using it and try again.',
    interrupted: 'Listening was interrupted. Check your microphone and tap to tune again.',
    audio: 'Audio could not start although the microphone is allowed. Tap to tune again.',
    failed: 'Could not start listening. Check your microphone and try again.',
  },
}

export function TunerView({ locale }: { locale: Locale }) {
  const [selected, setSelected] = useState<number | null>(null)
  const it = locale === 'it', tuner = useTuner(selected)
  const listening = tuner.status === 'listening', requesting = tuner.status === 'requesting'
  const { target, cents, direction } = tuner
  const meterValue = Math.max(-TUNER_RANGE, Math.min(TUNER_RANGE, cents ?? 0))
  const status = direction === 'tuned' ? it ? 'Accordata!' : 'In tune!' : direction === 'low' ? it ? 'Troppo bassa · alza la nota' : 'Too low · tune up' : direction === 'high' ? it ? 'Troppo alta · abbassa la nota' : 'Too high · tune down' : requesting ? it ? 'Consenti l’accesso al microfono' : 'Allow microphone access' : listening ? it ? 'Pizzica una corda' : 'Pluck a string' : it ? 'Pronto ad accordare?' : 'Ready to tune?'
  const noteLabel = target ? `${it ? target.solfege + ' · ' : ''}${target.note}${target.octave}` : ''
  return <section className="mm-tuner" aria-labelledby="tuner-title">
    <header className="mm-tuner-heading">
      <div><p className="mm-tuner-eyebrow">{it ? 'IL TUO SUONO, A FUOCO' : 'FIND YOUR SOUND'}</p><h2 id="tuner-title">{it ? 'Accordatore' : 'Guitar tuner'}</h2></div>
      <span className="mm-tuner-tuning">{it ? 'Chitarra · Standard' : 'Guitar · Standard'}<small>E A D G B E · A4 = 440 Hz</small></span>
    </header>
    <div className="mm-tuner-board" data-direction={direction ?? 'idle'}>
      <div className="mm-tuner-console">
        <div className="mm-tuner-mode" role="group" aria-label={it ? 'Riconoscimento corda' : 'String detection'}>
          <button type="button" aria-pressed={selected === null} onClick={() => setSelected(null)}>{it ? 'Automatico' : 'Automatic'}</button>
          <button type="button" aria-pressed={selected !== null} onClick={() => setSelected(target?.number ?? 6)}>{it ? 'Manuale' : 'Manual'}</button>
        </div>
        <p className="mm-tuner-target">{target ? `${it ? 'CORDA' : 'STRING'} ${target.number} · ${it ? target.solfege : target.number === 6 ? 'LOW E' : target.number === 1 ? 'HIGH E' : target.note}` : it ? 'UNA CORDA ALLA VOLTA' : 'ONE STRING AT A TIME'}</p>
        <div className="mm-tuner-note" aria-hidden="true">{target?.note ?? '—'}{target && <sub>{target.octave}</sub>}<span className="mm-tuner-check">{direction === 'tuned' ? '✓' : ''}</span></div>
        <div className="mm-tuner-feedback" role="status" aria-live="polite" aria-atomic="true"><span aria-hidden="true">{direction === 'low' ? '↑ ' : direction === 'high' ? '↓ ' : ''}</span>{noteLabel && <span className="sr-only">{noteLabel}: </span>}{status}</div>
        <div className="mm-tuner-meter" role="meter" aria-label={it ? 'Scostamento dalla nota in cent' : 'Pitch deviation in cents'} aria-valuemin={-TUNER_RANGE} aria-valuemax={TUNER_RANGE} aria-valuenow={Math.round(meterValue)} aria-valuetext={cents === null ? it ? 'In attesa di una nota' : 'Waiting for a note' : `${Math.round(cents)} cent · ${status}`}>
          <div className="mm-tuner-scale" aria-hidden="true"><div className="mm-tuner-zone" style={{ left: `${50 - TUNING_TOLERANCE / (2 * TUNER_RANGE) * 100}%`, width: `${TUNING_TOLERANCE / TUNER_RANGE * 100}%` }}/>{Array.from({ length: 21 }, (_, index) => <i key={index} style={{ left: `${index * 5}%` }} data-major={index % 5 === 0}/>)}<div className="mm-tuner-needle" data-visible={cents !== null} style={{ left: `${50 + meterValue / (2 * TUNER_RANGE) * 100}%` }}/></div>
          <div className="mm-tuner-scale-labels" aria-hidden="true">{[-TUNER_RANGE, -TUNER_RANGE / 2, 0, TUNER_RANGE / 2, TUNER_RANGE].map(value => <span key={value}>{value < 0 ? `−${-value}` : value > 0 ? `+${value}` : '0'}</span>)}</div>
        </div>
        <div className="mm-tuner-readings"><span><strong>{tuner.frequency?.toFixed(1) ?? '—'}</strong> Hz</span><span><strong>{cents === null ? '—' : `${Math.round(cents) > 0 ? '+' : ''}${Math.round(cents)}`}</strong> cent</span></div>
        <p className="mm-tuner-reference">{target ? `${it ? 'Obiettivo' : 'Target'} ${target.note}${target.octave} · ${target.frequency.toFixed(2)} Hz` : it ? 'Riconoscimento automatico della corda' : 'Automatic string detection'}</p>
        <button className="mm-tuner-start" type="button" onClick={listening || requesting ? tuner.stop : () => void tuner.start()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">{listening || requesting ? <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/> : <><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></>}</svg>
          {requesting ? it ? 'Annulla' : 'Cancel' : listening ? it ? 'Ferma ascolto' : 'Stop listening' : it ? 'Tocca per accordare' : 'Tap to tune'}
        </button>
        <div className="mm-tuner-mic"><span className="mm-tuner-level" aria-hidden="true" style={{ '--input-level': Math.min(1, Math.sqrt(tuner.level) * 3) } as CSSProperties}/>{listening ? tuner.signal === 'muted' ? it ? 'Microfono silenziato' : 'Microphone muted' : it ? 'Microfono attivo' : 'Microphone on' : requesting ? it ? 'In attesa del microfono e dell’audio…' : 'Waiting for microphone and audio…' : it ? 'Microfono spento' : 'Microphone off'}</div>
        {listening && <p className="mm-tuner-signal" role="status">{tuner.signal === 'muted' ? it ? 'Il dispositivo ha silenziato l’ingresso. Controlla l’accesso al microfono nelle impostazioni del telefono.' : 'The device muted the input. Check microphone access in your phone settings.' : tuner.signal === 'silent' ? it ? 'Nessun segnale utile dal microfono. Avvicina il telefono alla chitarra e controlla le autorizzazioni.' : 'No usable microphone signal. Move the phone closer to the guitar and check permissions.' : tuner.signal === 'sound' ? it ? 'Segnale audio rilevato' : 'Audio signal detected' : it ? 'In attesa del suono…' : 'Waiting for sound…'}</p>}
        {tuner.error && <p className="mm-tuner-error" role="alert">{errors[locale][tuner.error]}</p>}
      </div>
      <div className="mm-tuner-instrument">
        <GuitarStrings active={target?.number ?? null} selected={selected} tuned={direction === 'tuned'} it={it} onSelect={setSelected}/>
        <p>{it ? 'Tocca una corda per selezionarla' : 'Tap a string to select it'}</p>
      </div>
    </div>
    <footer className="mm-tuner-help"><p>{it ? `Pizzica una corda a vuoto e lascia che risuoni. La scala copre ±${TUNER_RANGE} cent; il verde si accende entro ±10 cent. Regola la chiavetta con piccoli movimenti.` : `Pluck an open string and let it ring. The scale covers ±${TUNER_RANGE} cents; green lights up within ±10 cents. Adjust the tuning peg in small steps.`}</p><p>{it ? 'Se la corda è molto scordata, selezionala manualmente. Il suono viene analizzato sul dispositivo, senza registrazioni né invii.' : 'If a string is far out of tune, select it manually. Sound is analyzed on your device, without recording or uploading.'}</p>
      <details className="mm-tuner-troubleshooting"><summary>{it ? 'Il microfono non rileva suoni su Android?' : 'No microphone signal on Android?'}</summary><ul>
        <li>{it ? 'Attiva «Accesso al microfono» nei controlli privacy del telefono. In Impostazioni → App → il tuo browser → Autorizzazioni, consenti il microfono.' : 'Enable “Microphone access” in the phone privacy controls. In Settings → Apps → your browser → Permissions, allow the microphone.'}</li>
        <li>{it ? 'Nelle autorizzazioni del sito, consenti il microfono anche se usi la webapp installata.' : 'Allow the microphone in the site permissions, including when using the installed web app.'}</li>
        <li>{it ? 'Scollega temporaneamente le cuffie Bluetooth, chiudi le altre app che usano il microfono e riprova vicino alla chitarra.' : 'Temporarily disconnect Bluetooth headsets, close other apps using the microphone and try again close to the guitar.'}</li>
      </ul></details>
    </footer>
  </section>
}
