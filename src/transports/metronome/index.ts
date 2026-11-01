import type { Transport,TransportPlugin } from '@/core/plugin/types'
import manifest from './plugin.json'

let unsub: (() => void) | null = null
let unsubSync: (() => void) | null = null
let lastScheduledK = -1
let lastRate = 1
const sources = new Set<OscillatorNode>()

function reset(): void {
  lastScheduledK = -1
  for (const source of sources) {
    try { source.stop() } catch { /* already ended */ }
  }
  sources.clear()
}

function click(actx: AudioContext, at: number, accent: boolean): void {
  const osc = actx.createOscillator()
  const gain = actx.createGain()
  osc.type = 'square'
  osc.frequency.value = accent ? 1320 : 880
  gain.gain.setValueAtTime(accent ? 0.35 : 0.2, at)
  gain.gain.exponentialRampToValueAtTime(0.001, at + (accent ? 0.07 : 0.045))
  osc.connect(gain)
  gain.connect(actx.destination)
  sources.add(osc)
  osc.onended = () => { sources.delete(osc); osc.disconnect(); gain.disconnect() }
  osc.start(at)
  osc.stop(at + 0.09)
}

/**
 * Metronome transport (manual §6.4).
 * Listens to the scheduler's 'schedule-window' events and schedules clicks on
 * the Web Audio clock at exact times — the transport decides *what* to hear,
 * the scheduler decides *when*.
 */
const metronome: Transport = {
  id: 'metronome',
  label: { en: 'Metronome', it: 'Metronome' },
  async start(ctx) {
    if (unsub) return
    reset()
    lastRate = ctx.scheduler.tempoFactor
    unsubSync = ctx.scheduler.on('sync', reset)
    unsub = ctx.scheduler.on('schedule-window', (w) => {
      if (ctx.scheduler.tempoFactor !== lastRate) {
        reset()
        lastRate = ctx.scheduler.tempoFactor
      }
      const piece = ctx.score.get()
      const actx = ctx.scheduler.audioContext
      if (!piece || !actx) return
      const beatLen = piece.secondsPerBeat
      const beatsPerBar = piece.timeSignature.numerator
      let k = Math.max(0, Math.floor(w.from / beatLen))
      while (true) {
        const t = k * beatLen
        if (t > w.to + 1e-9) break
        if (t >= w.from - 1e-9 && k > lastScheduledK) {
          const at = Math.max(w.toAudioTime(t), actx.currentTime)
          click(actx, at, (k % beatsPerBar) === 0)
          lastScheduledK = k
        }
        k++
        if (k > 4096) break
      }
    })
  },
  stop() {
    unsub?.()
    unsub = null
    unsubSync?.()
    unsubSync = null
    reset()
  },
}

const plugin: TransportPlugin = {
  manifest: manifest as TransportPlugin['manifest'],
  transport: metronome,
}

export default plugin
