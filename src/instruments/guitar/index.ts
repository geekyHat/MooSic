import type {
Instrument,
InstrumentPlugin,
Position,
} from '@/core/plugin/types'
import { guitarChordLibrary, guitarChordVoicings } from './chordLibrary'
import manifest from './plugin.json'

/**
 * Standard 6-string guitar (EADGBE).
 * String ids: 1 = low E (lowest pitch) … 6 = high e.
 */
const guitar: Instrument = {
  id: 'guitar',
  capabilities:{notes:true,chords:true,diagrams:true},
  chordLibrary:guitarChordLibrary,
  chordVoicings:guitarChordVoicings,
  name: { en: 'Guitar (6-string, standard)', it: 'Chitarra (6 corde, standard)' },
  strings: [
    { id: 1, label: 'E', openMidi: 40, noteName: 'E2' },
    { id: 2, label: 'A', openMidi: 45, noteName: 'A2' },
    { id: 3, label: 'D', openMidi: 50, noteName: 'D3' },
    { id: 4, label: 'G', openMidi: 55, noteName: 'G3' },
    { id: 5, label: 'B', openMidi: 59, noteName: 'B3' },
    { id: 6, label: 'e', openMidi: 64, noteName: 'E4' },
  ],
  fretCount: 20,
  noteToPositions(midi: number): Position[] {
    const out: Position[] = []
    for (const s of this.strings) {
      const fret = midi - s.openMidi
      if (fret >= 0 && fret < this.fretCount) out.push({ fret, string: s.id })
    }
    // Preference: lowest fret first, then lower strings (bigger, easier).
    out.sort((a, b) => a.fret - b.fret || a.string - b.string)
    return out
  },
  renderHints: {
    lines: 6,
    // Top line first (tab convention: high e on top).
    lineLabels: ['e', 'B', 'G', 'D', 'A', 'E'],
    showFrets: true,
  },
  tunerTargets: [
    { midi: 40, label: 'E2' },
    { midi: 45, label: 'A2' },
    { midi: 50, label: 'D3' },
    { midi: 55, label: 'G3' },
    { midi: 59, label: 'B3' },
    { midi: 64, label: 'E4' },
  ],
}

const plugin: InstrumentPlugin = {
  manifest: manifest as InstrumentPlugin['manifest'],
  instrument: guitar,
  onEnable(ctx) {
    const cfg = ctx.config()
    if (typeof cfg.fretCount === 'number') guitar.fretCount = Math.round(cfg.fretCount)
  },
}

export default plugin
