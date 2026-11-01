import type {
Instrument,
InstrumentPlugin,
Position,
} from '@/core/plugin/types'
import manifest from './plugin.json'

/**
 * Soprano ukulele (gCEA).
 * This is the contract test for the instrument plugin system:
 * it must work with zero changes to the core or to other plugins.
 */
const ukulele: Instrument = {
  id: 'ukulele',
  name: { en: 'Ukulele (4-string, gCEA)', it: 'Ukulele (4 corde, gCEA)' },
  strings: [
    { id: 1, label: 'A', openMidi: 69, noteName: 'A4' },
    { id: 2, label: 'E', openMidi: 64, noteName: 'E4' },
    { id: 3, label: 'C', openMidi: 60, noteName: 'C4' },
    { id: 4, label: 'g', openMidi: 55, noteName: 'G3' },
  ],
  fretCount: 16,
  noteToPositions(midi: number): Position[] {
    const out: Position[] = []
    for (const s of this.strings) {
      const fret = midi - s.openMidi
      if (fret >= 0 && fret < this.fretCount) out.push({ fret, string: s.id })
    }
    out.sort((a, b) => a.fret - b.fret || a.string - b.string)
    return out
  },
  renderHints: {
    lines: 4,
    // Top line first (tab convention: low g on top).
    lineLabels: ['g', 'C', 'E', 'A'],
    showFrets: true,
  },
  tunerTargets: [
    { midi: 69, label: 'A4' },
    { midi: 64, label: 'E4' },
    { midi: 60, label: 'C4' },
    { midi: 55, label: 'G3' },
  ],
}

const plugin: InstrumentPlugin = {
  manifest: manifest as InstrumentPlugin['manifest'],
  instrument: ukulele,
  onEnable(ctx) {
    const cfg = ctx.config()
    if (typeof cfg.fretCount === 'number') ukulele.fretCount = Math.round(cfg.fretCount)
  },
}

export default plugin
