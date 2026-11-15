import { useCallback, useEffect, useRef, useState } from 'react'
import { AutomaticStringTracker, centsBetween, createPitchDetector, GUITAR_STRINGS, PitchSmoother, TUNER_INPUT_FLOOR, tuningDirection, type GuitarString, type TuningDirection } from '@/domain/music/tuner'

export type TunerError = 'secure' | 'unsupported' | 'denied' | 'missing' | 'busy' | 'interrupted' | 'audio' | 'failed'
type Snapshot = { status: 'idle' | 'requesting' | 'listening' | 'error'; signal: 'waiting' | 'sound' | 'silent' | 'muted'; frequency: number | null; level: number; error: TunerError | null; automaticTarget: GuitarString | null; target: GuitarString | null; cents: number | null; direction: TuningDirection | null }
type Session = { context: AudioContext | null; stream: MediaStream | null; source: MediaStreamAudioSourceNode | null; analyser: AnalyserNode | null; output: GainNode | null; cancelStartup: (() => void) | null; frame: number }
const idle: Snapshot = { status: 'idle', signal: 'waiting', frequency: null, level: 0, error: null, automaticTarget: null, target: null, cents: null, direction: null }
function resumeAfterCapture(session: Session, context: AudioContext): Promise<boolean> {
  return new Promise(resolve => {
    const finish = (ready: boolean) => { clearTimeout(timer); session.cancelStartup = null; resolve(ready) }
    const timer = setTimeout(() => finish(false), 3000)
    session.cancelStartup = () => finish(false)
    void context.resume().then(() => finish(context.state === 'running'), () => finish(false))
  })
}
function feedback(snapshot: Snapshot, selected: number | null): Snapshot {
  const target = selected === null ? snapshot.automaticTarget : GUITAR_STRINGS.find(string => string.number === selected) ?? null
  const cents = target && snapshot.frequency !== null ? centsBetween(snapshot.frequency, target.frequency) : null
  const previous = target?.number === snapshot.target?.number ? snapshot.direction : null
  return { ...snapshot, target, cents, direction: cents === null ? null : tuningDirection(cents, previous) }
}
function release(session: Session) {
  session.cancelStartup?.()
  cancelAnimationFrame(session.frame)
  session.stream?.getTracks().forEach(track => { track.onended = null; track.stop() })
  session.source?.disconnect()
  session.analyser?.disconnect()
  session.output?.disconnect()
  if (session.context) {
    session.context.onstatechange = null
    void session.context.close().catch(() => {})
  }
}
export function useTuner(selected: number | null) {
  const [snapshot, setSnapshot] = useState<Snapshot>(idle)
  const selection = useRef(selected)
  useEffect(() => {
    selection.current = selected
    setSnapshot(previous => feedback(previous, selected))
  }, [selected])
  const current = useRef<Session | null>(null)
  const dispose = useCallback(() => {
    const session = current.current
    current.current = null
    if (session) release(session)
  }, [])
  const stop = useCallback(() => { dispose(); setSnapshot(feedback(idle, selection.current)) }, [dispose])
  useEffect(() => {
    const hide = () => { if (document.hidden) stop() }
    document.addEventListener('visibilitychange', hide)
    window.addEventListener('pagehide', stop)
    return () => { document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', stop); dispose() }
  }, [dispose, stop])

  const start = async () => {
    if (current.current) return
    const failBeforeStart = (error: TunerError) => setSnapshot(feedback({ ...idle, status: 'error', error }, selection.current))
    if (!window.isSecureContext) return failBeforeStart('secure')
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) return failBeforeStart('unsupported')
    const session: Session = { context: null, stream: null, source: null, analyser: null, output: null, cancelStartup: null, frame: 0 }
    current.current = session
    setSnapshot(feedback({ ...idle, status: 'requesting' }, selection.current))
    const fail = (error: TunerError) => {
      if (current.current !== session) return
      dispose()
      setSnapshot(feedback({ ...idle, status: 'error', error }, selection.current))
    }
    try {
      // Resume during the user gesture, before waiting for microphone permission.
      const context = session.context = new AudioContext()
      void context.resume().catch(() => {})
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false })
      if (current.current !== session) { stream.getTracks().forEach(track => track.stop()); return }
      session.stream = stream
      for (const track of stream.getTracks()) track.onended = () => fail('interrupted')
      if (!stream.getAudioTracks().some(track => track.readyState === 'live')) { fail('missing'); return }
      const analyser = session.analyser = context.createAnalyser()
      // Keep roughly 85–93 ms of audio even on 96 kHz input devices.
      analyser.fftSize = Math.min(32768, 2 ** Math.ceil(Math.log2(context.sampleRate * .085)))
      analyser.smoothingTimeConstant = 0
      session.source = context.createMediaStreamSource(stream)
      session.source.connect(analyser)
      // Keep the graph rendering on mobile audio backends, with no audible
      // microphone monitoring or feedback: the output gain stays at zero.
      const output = session.output = context.createGain()
      output.gain.value = 0
      analyser.connect(output)
      output.connect(context.destination)
      // Acquiring the microphone can suspend a context resumed before permission.
      const ready = await resumeAfterCapture(session, context)
      if (current.current !== session) return
      if (!ready) { fail('audio'); return }
      context.onstatechange = () => { if (context.state !== 'running') fail('interrupted') }
      const input = new Float32Array(analyser.fftSize)
      const detect = createPitchDetector(context.sampleRate, input.length)
      const smoother = new PitchSmoother()
      const strings = new AutomaticStringTracker()
      let previous = -Infinity
      const started = performance.now()
      let lastSignal = -Infinity
      const update = (time: number) => {
        if (current.current !== session) return
        if (time - previous >= 65) {
          previous = time
          analyser.getFloatTimeDomainData(input)
          const { frequency, level } = detect(input)
          const muted = stream.getAudioTracks().every(track => track.muted)
          if (!muted && level >= TUNER_INPUT_FLOOR) lastSignal = time
          const signal = muted ? 'muted' : time - lastSignal < 3000 ? 'sound' : time - started < 3000 ? 'waiting' : 'silent'
          const stableFrequency = smoother.update(muted ? null : frequency, time)
          const reading = muted ? null : stableFrequency
          const automaticTarget = strings.update(reading)
          setSnapshot(previous => feedback({ ...previous, status: 'listening', signal, frequency: reading, automaticTarget, level: muted ? 0 : level, error: null }, selection.current))
        }
        session.frame = requestAnimationFrame(update)
      }
      setSnapshot(feedback({ ...idle, status: 'listening' }, selection.current))
      session.frame = requestAnimationFrame(update)
    } catch (error) {
      const name = error instanceof DOMException ? error.name : ''
      fail(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' ? 'missing' : name === 'NotReadableError' ? 'busy' : 'failed')
    }
  }
  return { ...snapshot, start, stop }
}
