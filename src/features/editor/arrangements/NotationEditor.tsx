import { useGridNavigation } from '../hooks/useGridNavigation'
/**
 * Standard-notation editor: a piano-roll over the guitar range (E2–E4).
 * Click a cell to place a one-beat note; click again to remove.
 * Black-key rows are tinted. Data: UserSheetNote[] { beat, midi, durBeats }.
 */
import { midiToName } from '@/domain/music/stringPositions'
import type { UserSheetNote } from '@/domain/songs/types'
import { useMemo } from 'react'

const TOP_MIDI = 64 // E4 (guitar high e)
const BOTTOM_MIDI = 40 // E2 (guitar low E)
const BLACK = new Set([1, 3, 6, 8, 10])
const CELL = 36
const LABEL_W = 52

interface Props {
  value: UserSheetNote[]
  onChange: (notes: UserSheetNote[]) => void
  bars: number
  beatsPerBar: number
  t: (key: string, vars?: Record<string, string | number>) => string
}

export function NotationEditor({ value, onChange, bars, beatsPerBar, t }: Props) {
  const totalBeats = Math.max(1, bars * beatsPerBar)
  const pitches = useMemo(
    () => Array.from({ length: TOP_MIDI - BOTTOM_MIDI + 1 }, (_, i) => TOP_MIDI - i),
    [],
  )
  const grid = useGridNavigation(pitches.length,totalBeats)
  const cell = useMemo(() => {
    const m = new Map<string, UserSheetNote>()
    for (const n of value) m.set(`${n.beat}:${n.midi}`, n)
    return m
  }, [value])

  function click(beat: number, midi: number) {
    const existing = cell.get(`${beat}:${midi}`)
    const rest = value.filter((n) => !(n.beat === beat && n.midi === midi))
    if (!existing) rest.push({ beat, midi, durBeats: 1 })
    onChange(rest)
  }

  return (
    <div>
      <p className="mb-2 text-xs text-muted">{t('editor.sheet.hint')}</p>
      <div className="max-h-96 overflow-auto rounded-lg border border-line">
        <table className="border-collapse" style={{ width: LABEL_W + totalBeats * CELL }}>
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-30 border-b border-r border-line bg-panel" style={{ width: LABEL_W }} />
              {Array.from({ length: totalBeats }, (_, b) => (
                <th
                  key={b}
                  className={`border-b border-line bg-panel text-center text-[10px] font-normal text-muted ${
                    b % beatsPerBar === 0 ? 'border-l border-line' : ''
                  }`}
                  style={{ width: CELL, minWidth: CELL }}
                >
                  {b % beatsPerBar === 0 ? b / beatsPerBar + 1 : '·'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pitches.map((midi) => {
              const black = BLACK.has(midi % 12)
              return (
                <tr key={midi}>
                  <td
                    className={`sticky left-0 z-10 border-b border-r border-line pr-1.5 text-right text-[10px] ${
                      black ? 'bg-accent/10 text-muted' : 'bg-panel text-ink'
                    }`}
                    style={{ width: LABEL_W }}
                  >
                    {midiToName(midi)}
                  </td>
                  {Array.from({ length: totalBeats }, (_, beat) => {
                    const filled = cell.has(`${beat}:${midi}`)
                    return (
                      <td
                        key={beat}
                        className={`border-b border-line p-0 ${beat % beatsPerBar === 0 ? 'border-l border-line' : ''}`}
                        style={{ width: CELL, minWidth: CELL }}
                      >
                        <button
                          type="button"
                          {...grid(TOP_MIDI-midi,beat)}
                          onClick={() => click(beat, midi)}
                          aria-label={`${midiToName(midi)}, ${t('practice.bar')} ${Math.floor(beat / beatsPerBar) + 1}, ${t('editor.beat')} ${beat % beatsPerBar + 1}`}
                          aria-pressed={filled}
                          className={`block h-9 w-full cursor-pointer text-sm leading-none transition-colors ${
                            filled ? 'bg-accent/35 text-accent' : 'hover:bg-accent/10'
                          }`}
                        >
                          {filled ? '•' : ''}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
