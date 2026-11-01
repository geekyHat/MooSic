import type { ChordFingering } from '@/domain/music/chordDiagrams'

const NUT_Y = 24
const FRET_SPACING = 15

function geometry(shape: ChordFingering) {
  const frets = shape.strings.slice().reverse()
  const used = frets.filter((fret): fret is number => fret !== null && fret > 0)
  const startFret = shape.baseFret ?? (used.length && Math.max(...used) > 4 ? Math.min(...used) : 1)
  const fretCount = Math.max(4, ...used.map(fret => fret - startFret + 1))
  const stringX = frets.map((_, index) => 4 + (frets.length - index - 1) * 12)
  const lastX = 4 + (frets.length - 1) * 12
  return { frets, startFret, fretCount, stringX, lastX, width: lastX + 10, height: NUT_Y + fretCount * FRET_SPACING + 12 }
}

export const chordDiagramHeight = (shape: ChordFingering) => geometry(shape).height

export function ChordDiagramSvg({ name, shape, descriptionId }: { name: string; shape: ChordFingering; descriptionId?: string }) {
  const { frets, startFret, fretCount, stringX, lastX, width, height } = geometry(shape)
  return <svg role="img" aria-label={name} aria-describedby={descriptionId} width={width} height={height} viewBox={`0 0 ${width} ${height}`} data-base-fret={startFret} data-frets={shape.strings.map(fret => fret ?? 'x').join(' ')}>
    {startFret > 1 && <>
      <circle cx={width / 2} cy="9" r="8" fill="none" stroke="var(--mm-ink)" strokeWidth="1.2"/>
      <text x={width / 2} y="12.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--mm-ink)">{startFret}</text>
    </>}
    <line x1="4" y1={NUT_Y} x2={lastX} y2={NUT_Y} stroke="var(--mm-ink)" strokeWidth={startFret === 1 ? 4 : 1.5}/>
    {Array.from({ length: fretCount }, (_, index) => <line key={index} x1="4" y1={NUT_Y + (index + 1) * FRET_SPACING} x2={lastX} y2={NUT_Y + (index + 1) * FRET_SPACING} stroke="var(--mm-muted)" strokeWidth="1.5"/>)}
    {stringX.map((x, index) => <line key={index} x1={x} y1={NUT_Y} x2={x} y2={NUT_Y + fretCount * FRET_SPACING} stroke="var(--mm-muted)" strokeWidth="1.5"/>)}
    {frets.map((fret, index) => {
      const x = stringX[index]
      if (fret === null) return <text key={index} x={x} y={NUT_Y - 8} textAnchor="middle" fontSize="12" fill="var(--mm-note-bad)">x</text>
      if (fret === 0) return <circle key={index} cx={x} cy={NUT_Y - 12} r="4.5" fill="none" stroke="var(--mm-muted)" strokeWidth="1.2"/>
      return <circle key={index} cx={x} cy={NUT_Y + (fret - startFret) * FRET_SPACING + FRET_SPACING / 2} r="6" fill="var(--mm-accent)"/>
    })}
  </svg>
}
