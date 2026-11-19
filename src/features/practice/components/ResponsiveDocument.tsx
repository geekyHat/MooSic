import { useEffect, useMemo, useRef, useState } from 'react'
import type { InlineChord } from '@/domain/music/chordSymbol'
import { documentBlocks, tabSegments } from '@/domain/songs/responsiveDocument'
import { transposeChord } from '@/domain/music/transpose'
import { ChordLyricsLine } from '@/shared/ui/ChordLyricsLine'
import { InlineChordDocument } from './InlineChordDocument'

/** Derived reading layout. The original document remains available separately. */
export function ResponsiveDocument({ source, chords, semitones, it }: { source: string; chords: readonly InlineChord[]; semitones: number; it: boolean }) {
  const blocks = useMemo(() => documentBlocks(source), [source])
  const container = useRef<HTMLDivElement>(null), ruler = useRef<HTMLSpanElement>(null)
  const [columns, setColumns] = useState(20)
  useEffect(() => {
    const element = container.current, measure = ruler.current
    if (!element || !measure) return
    const resize = () => {
      const style = getComputedStyle(element)
      const width = element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      setColumns(Math.max(4, Math.floor(width / (measure.getBoundingClientRect().width / 10)) - 3))
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(element); observer.observe(measure)
    return () => observer.disconnect()
  }, [])
  return <>
    <div ref={container} className="mm-responsive-document mt-4 rounded-xl border border-line bg-panel p-3" role="region" aria-label={it ? 'Documento OLGA' : 'OLGA document'}>
      <span ref={ruler} className="mm-tab-ruler" aria-hidden="true"/>
      {blocks.map((block, index) => {
        if (block.kind === 'tab') return <div className="mm-ascii-tab" key={index}>
          {tabSegments(block.rows, columns).map(({ start, end }) => <pre className="mm-tab-segment" key={start} data-source-start={start} data-source-end={end}>{block.rows.map(row => `${row.label || ' '}${start ? '↳' : '|'}${row.body.slice(start, end)}`).join('\n')}<span className="sr-only">{end < Math.max(...block.rows.map(row => row.body.length)) ? it ? '\nContinua nella sezione seguente' : '\nContinued in the next section' : ''}</span></pre>)}
        </div>
        if (block.kind === 'lyrics') return <div className="mm-document-line" key={index}><ChordLyricsLine text={block.text} anchors={block.anchors.map(anchor => ({ ...anchor, name: transposeChord(anchor.name, semitones) }))}/></div>
        const local = chords.filter(chord => chord.start >= block.offset && chord.end <= block.offset + block.text.length).map(chord => ({ ...chord, start: chord.start - block.offset, end: chord.end - block.offset }))
        return <div className="mm-document-line" key={index}><InlineChordDocument source={block.text} chords={local} semitones={semitones}/>{block.text && index < blocks.length - 1 ? '\n' : !block.text ? <br/> : null}</div>
      })}
    </div>
    <details className="mm-original-document mt-4"><summary>{it ? 'Impaginazione originale' : 'Original layout'}</summary>
      <pre tabIndex={0} aria-label={it ? 'Sorgente OLGA originale' : 'Original OLGA source'} className="mt-2 max-w-full overflow-x-auto rounded-xl border border-line bg-panel p-3 text-sm leading-relaxed" style={{ whiteSpace: 'pre', tabSize: 8 }}>{source}</pre>
    </details>
  </>
}
