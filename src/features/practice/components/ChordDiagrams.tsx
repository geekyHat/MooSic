import type { Instrument } from '@/core/plugin/types'
import { chordFingerings, type ChordFingering } from '@/domain/music/chordDiagrams'
import type { Translate } from '../model'
import { ChordVoicingSelector } from './ChordVoicingSelector'

export function ChordDiagrams({ chords, unavailableLabel, instrument, definitions, preferLibrary, t, selectionKey = 0 }: {
  chords: readonly string[]
  unavailableLabel: string
  instrument: Instrument
  definitions?: ReadonlyMap<string, ChordFingering>
  preferLibrary?: boolean
  t?: Translate
  selectionKey?: string | number
}) {
  if (!chords.length) return null
  const uniqueChords = Array.from(new Set(chords)).sort()
  return <div className="mm-chord-diagrams flex flex-wrap items-start justify-center gap-4 px-4 pb-1 pt-2 max-narrow:gap-3 max-narrow:px-0">
    {uniqueChords.map(name => {
      const positions = chordFingerings(name, {
        library: instrument.chordLibrary,
        voicings: instrument.chordVoicings,
        definitions,
        stringCount: instrument.strings.length,
        maxFret: instrument.fretCount,
        preferLibrary,
      })
      if (!positions.length) return <div key={name} className="mm-chord-diag flex w-32 shrink-0 flex-col items-center gap-1">
        <div className="diag-name text-[18px] font-semibold">{name}</div>
        <span className="flex min-h-[96px] max-w-24 items-center text-center text-xs text-muted">{unavailableLabel}</span>
        <div className="h-11" aria-hidden="true"/>
      </div>
      // Keep choices across parent updates; reset when the song/key/available shapes change.
      const identity = JSON.stringify([selectionKey, name, instrument.id, positions])
      return <ChordVoicingSelector key={identity} name={name} positions={positions} t={t}/>
    })}
  </div>
}
