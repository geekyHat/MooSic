import { useCallback, useEffect, useRef, useState } from 'react'
import { AutomaticStringTracker, centsBetween, createPitchDetector, GUITAR_STRINGS, PitchSmoother, tuningDirection, type GuitarString, type TuningDirection } from '@/domain/music/tuner'

export type TunerError = 'secure' | 'unsupported' | 'denied' | 'missing' | 'busy' | 'interrupted' | 'failed'
type Snapshot = { status: 'idle' | 'requesting' | 'listening' | 'error'; frequency: number | null; level: number; error: TunerError | null; automaticTarget: GuitarString | null; target: GuitarString | null; cents: number | null; direction: TuningDirection | null }
type Session = { context: AudioContext | null; stream: MediaStream | null; source: MediaStreamAudioSourceNode | null; analyser: AnalyserNode | null; frame: number }
const idle: Snapshot = { status: 'idle', frequency: null, level: 0, error: null, automaticTarget: null, target: null, cents: null, direction: null }
function feedback(snapshot: Snapshot, selected: number | null): Snapshot {
  const target = selected === null ? snapshot.automaticTarget : GUITAR_STRINGS.find(string => string.number === selected) ?? null
  const cents = target && snapshot.frequency !== null ? centsBetween(snapshot.frequency, target.frequency) : null
  const previous = target?.number === snapshot.target?.number ? snapshot.direction : null
  return { ...snapshot, target, cents, direction: cents === null ? null : tuningDirection(cents, previous) }
}
function release(session: Session) {
  cancelAnimationFrame(session.frame)
  session.stream?.getTracks().forEach(track => { track.onended = null; track.stop() })
  session.source?.disconnect()
  session.analyser?.disconnect()
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
    const session: Session = { context: null, stream: null, source: null, analyser: null, frame: 0 }
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
      const resumed = context.resume().then(() => true, () => false)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false })
      if (current.current !== session) { stream.getTracks().forEach(track => track.stop()); return }
      session.stream = stream
      for (const track of stream.getTracks()) track.onended = () => fail('interrupted')
      if (!await resumed) { fail('failed'); return }
      if (current.current !== session) return
      if (context.state !== 'running') { fail('interrupted'); return }
      context.onstatechange = () => { if (context.state !== 'running') fail('interrupted') }
      const analyser = session.analyser = context.createAnalyser()
      // Keep roughly 85–93 ms of audio even on 96 kHz input devices.
      analyser.fftSize = Math.min(32768, 2 ** Math.ceil(Math.log2(context.sampleRate * .085)))
      analyser.smoothingTimeConstant = 0
      session.source = context.createMediaStreamSource(stream)
      session.source.connect(analyser)
      // No connection to the speakers: listening must never feed back.
      const input = new Float32Array(analyser.fftSize)
      const detect = createPitchDetector(context.sampleRate, input.length)
      const smoother = new PitchSmoother()
      const strings = new AutomaticStringTracker()
      let previous = -Infinity
      const update = (time: number) => {
        if (current.current !== session) return
        if (time - previous >= 65) {
          previous = time
          analyser.getFloatTimeDomainData(input)
          const { frequency, level } = detect(input)
          const stableFrequency = smoother.update(frequency, time)
          const automaticTarget = strings.update(stableFrequency)
          setSnapshot(previous => feedback({ ...previous, status: 'listening', frequency: stableFrequency, automaticTarget, level, error: null }, selection.current))
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
