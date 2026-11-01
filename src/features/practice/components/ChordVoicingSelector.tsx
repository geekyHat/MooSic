import { useId, useState } from 'react'
import type { ChordFingering } from '@/domain/music/chordDiagrams'
import type { Translate } from '../model'
import { ChordDiagramSvg, chordDiagramHeight } from './ChordDiagramSvg'

export function ChordVoicingSelector({ name, positions, t }: { name: string; positions: readonly ChordFingering[]; t?: Translate }) {
  const [selected, setIndex] = useState(0)
  const statusId = useId()
  const total = positions.length
  if (!total) return null
  const index = selected % total
  const move = (step: number) => setIndex(previous => (previous + step + total) % total)
  const multiple = total > 1
  const previous = t?.('practice.voicingPrevious', { chord: name }) ?? `Previous position for ${name}`
  const next = t?.('practice.voicingNext', { chord: name }) ?? `Next position for ${name}`
  const count = t?.('practice.voicingCount', { current: index + 1, total }) ?? `${index + 1} of ${total}`
  const status = t?.('practice.voicingStatus', { current: index + 1, total, chord: name }) ?? `Position ${index + 1} of ${total} for ${name}`
  const button = 'flex min-h-[44px] w-11 shrink-0 items-center justify-center rounded-md text-xl text-muted hover:bg-accent/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent'
  return <div role="group" aria-label={t?.('practice.voicingGroup', { chord: name }) ?? `Chord positions for ${name}`} tabIndex={multiple ? 0 : undefined} className="mm-chord-diag flex w-32 shrink-0 flex-col items-center gap-1 rounded-md focus-visible:outline-2 focus-visible:outline-accent" data-voicing-index={index} data-voicing-count={total} onKeyDown={event => {
    if (!multiple || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    event.stopPropagation()
    move(event.key === 'ArrowLeft' ? -1 : 1)
  }}>
    <div className="diag-name text-[18px] font-semibold">{name}</div>
    <div className="flex w-full items-start justify-center" style={{ height: Math.max(...positions.map(chordDiagramHeight)) }}>
      <ChordDiagramSvg name={name} shape={positions[index]} descriptionId={multiple ? statusId : undefined}/>
    </div>
    {multiple ? <div className="mm-voicing-controls flex h-11 w-full items-center justify-center">
      <button type="button" className={button} aria-label={previous} title={previous} onClick={() => move(-1)}>‹</button>
      <output id={statusId} aria-label={status} aria-live="polite" className="min-w-10 whitespace-nowrap text-center text-[11px] tabular-nums">{count}</output>
      <button type="button" className={button} aria-label={next} title={next} onClick={() => move(1)}>›</button>
    </div> : <div className="h-11" aria-hidden="true"/>}
  </div>
}
