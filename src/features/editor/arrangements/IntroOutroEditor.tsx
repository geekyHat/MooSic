import { useGridNavigation } from '../hooks/useGridNavigation'
/**
 * Intro/Outro tab editor: simple grid to place tab notes before first bar or after last bar.
 * Similar to TabEditor but only for intro/outro sections.
 */
import { GUITAR_GRID, midiToName } from '@/domain/music/stringPositions'
import type { UserTabNote } from '@/domain/songs/types'
import { useMemo, useState } from 'react'

const FRET_MAX = 15
const CELL = 28

interface Props {
  value: UserTabNote[]
  onChange: (notes: UserTabNote[]) => void
  label: string
  t: (key: string, vars?: Record<string, string | number>) => string
}

export function IntroOutroEditor({ value, onChange, label, t }: Props) {
  const [activeFret, setActiveFret] = useState(0)
  const totalBeats = 4 // Fixed: intro/outro are 4 beats

  const grid = useGridNavigation(6, totalBeats)
  const cellFret = useMemo(() => {
    const m = new Map<string, number>()
    for (const n of value) m.set(`${n.row}:${n.beat}`, n.fret)
    return m
  }, [value])

  function clickCell(row: number, beat: number) {
    const existing = cellFret.get(`${row}:${beat}`)
    const rest = value.filter((n) => !(n.row === row && n.beat === beat))
    if (existing !== activeFret) rest.push({ row, beat, fret: activeFret })
    onChange(rest)
  }

  return (
    <div className="mt-2">
      <span className="mb-2 block text-xs font-semibold text-accent">{label}</span>
      
      {/* Fret palette */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-muted">{t('editor.tab.fret')}</span>
        {Array.from({ length: FRET_MAX + 1 }, (_, f) => (
          <button
            key={f}
            type="button"
            aria-pressed={activeFret === f}
            onClick={() => setActiveFret(f)}
            className={`h-7 min-w-7 cursor-pointer rounded-md border px-1.5 text-xs transition-colors ${
              activeFret === f
                ? 'border-accent bg-accent/20 font-semibold text-accent'
                : 'border-line bg-transparent text-ink hover:bg-accent/10'
            }`}
          >
            {f === 0 ? t('editor.tab.open') : f}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange([])}
          className="ml-1 h-7 cursor-pointer rounded-md border border-line px-2.5 text-xs text-muted transition-colors hover:bg-accent/10"
        >
          {t('editor.tab.clear')}
        </button>
      </div>

      {/* What the active fret sounds like on each string */}
      <div className="mt-2.5 mb-3 flex flex-wrap gap-1.5 text-[11px] text-muted">
        {GUITAR_GRID.map((g) => (
          <span key={g.string} className="rounded bg-accent/10 px-1.5 py-0.5">
            {g.label} → <span className="font-medium text-ink">{midiToName(g.midi + activeFret)}</span>
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="border-collapse" style={{ width: 30 + totalBeats * CELL }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-b border-r border-line bg-panel" style={{ width: 30 }} />
              {Array.from({ length: totalBeats }, (_, b) => (
                <th
                  key={b}
                  className="border-b border-line text-center text-[10px] font-normal text-muted"
                  style={{ width: CELL, minWidth: CELL }}
                >
                  {b + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GUITAR_GRID.map((g, row) => (
              <tr key={g.string}>
                <td
                  className="sticky left-0 z-10 border-b border-r border-line bg-panel text-center text-xs font-semibold text-ink"
                  style={{ width: 30 }}
                >
                  {g.label}
                </td>
                {Array.from({ length: totalBeats }, (_, beat) => {
                  const fret = cellFret.get(`${row}:${beat}`)
                  const filled = fret !== undefined
                  return (
                    <td
                      key={beat}
                      className="border-b border-line p-0"
                      style={{ width: CELL, minWidth: CELL }}
                    >
                      <button
                        type="button"
                        {...grid(row, beat)}
                        aria-pressed={filled}
                        aria-label={`${g.label}, ${midiToName(g.midi + (fret ?? activeFret))}, ${t('editor.beat')} ${beat + 1}`}
                        onClick={() => clickCell(row, beat)}
                        title={`${g.label} @ ${t('editor.tab.fret')} ${activeFret} = ${midiToName(g.midi + activeFret)}`}
                        className={`h-7 w-full cursor-pointer text-xs transition-colors ${
                          filled
                            ? 'bg-accent/25 font-semibold text-accent'
                            : 'text-transparent hover:bg-accent/10'
                        }`}
                      >
                        {fret === undefined ? '·' : fret === 0 ? 'o' : fret}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
