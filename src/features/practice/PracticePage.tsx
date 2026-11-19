import type { AppCore } from '@/core/plugin/context-impl'
import type { ArrangementKind } from '@/core/plugin/types'
import { inlineChords, parseChordSymbol } from '@/domain/music/chordSymbol'
import { chordDefinitions, transposeDefinitions } from '@/domain/music/chordDiagrams'
import { transposeChord } from '@/domain/music/transpose'
import { transposePieceChords } from '@/domain/score/transposeChords'
import { useEffect, useMemo, useState, type RefObject } from 'react'
import { ArrangementSelector } from './components/ArrangementSelector'
import { PracticeToolbar } from './components/PracticeToolbar'
import { TransposeControls } from './components/TransposeControls'
import { ChordDiagrams } from './components/ChordDiagrams'
import { ChordSheet } from './components/ChordSheet'
import { DisplayTabs } from './components/DisplayTabs'
import { ResponsiveDocument } from './components/ResponsiveDocument'
import { PieceSummary } from './components/PieceSummary'
import { useScoreRenderer } from './hooks/useScoreRenderer'
import { useTranspose } from './hooks/useTranspose'
import type { DisplayTab } from './model'

type PracticeProps = { core: AppCore; scrollContainer: RefObject<HTMLElement | null>; display?:DisplayTab|null; onDisplayChange?:(display:DisplayTab)=>void; onArrangementChange?:(kind:ArrangementKind)=>void }

export function PracticeView({ core, scrollContainer, ...navigation }: PracticeProps) {
  const readingKey = [core.currentSongId, core.currentVersionId, core.currentArrangement, core.score?.id].join(':')
  useEffect(() => {
    core.playback.pause()
    return () => core.playback.pause()
  }, [core, core.score])
  if (core.score?.source?.format.startsWith('olga')) return <OlgaDocument key={readingKey} core={core} scrollContainer={scrollContainer}/>
  return <MusicalPractice key={readingKey} core={core} scrollContainer={scrollContainer} {...navigation}/>
}

function OlgaDocument({ core, scrollContainer }: PracticeProps) {
  const piece = core.score!, source = piece.source!, it = core.locale === 'it'
  const transpose = useTranspose()
  const chords = useMemo(() => source.format === 'olga' ? inlineChords(source.text) : [], [source])
  const definitions = useMemo(() => source.format === 'olga' ? chordDefinitions(source.text) : undefined, [source])
  const names = useMemo(() => chords.map(chord => chord.symbol.name), [chords])
  const diagramDefinitions = useMemo(() => transposeDefinitions(names, definitions, transpose.semitones, core.instrument?.fretCount ?? 20), [names, definitions, transpose.semitones, core.instrument])
  return <section className="mm-reading-column mx-auto w-full min-w-0 max-w-4xl" aria-label="OLGA">
    <h2>{piece.title}</h2>
    <p>{piece.composer} · {piece.document?.instrument} · {piece.document?.format.toUpperCase()}</p>
    <p className="text-sm text-muted">{it ? 'Usa lo scorrimento automatico per leggere al tuo ritmo. Gli accordi nel formato [Am] sono riconosciuti; testo e TAB si adattano alla larghezza dello schermo.' : 'Use autoscroll to read at your own pace. Chords in [Am] format are recognized; text and TAB adapt to the screen width.'}</p>
    <details><summary>{it ? 'Percorso nell’archivio' : 'Archive path'}</summary><p className="break-all">{piece.document?.path}</p></details>
    <PracticeToolbar key={piece.id + source.format} container={scrollContainer} t={core.t} disabled={source.format !== 'olga'}>
      {chords.length > 0 && <TransposeControls value={transpose} t={core.t}/>}
    </PracticeToolbar>
    {chords.length > 0 && <p className="mb-3 text-xs text-muted">{core.t('practice.transposeScope')}</p>}
    {core.instrument?.capabilities?.diagrams && chords.length > 0 && <ChordDiagrams t={core.t} selectionKey={transpose.semitones} chords={names.map(name => transposeChord(name, transpose.semitones))} definitions={diagramDefinitions} preferLibrary={transpose.semitones !== 0} instrument={core.instrument} unavailableLabel={core.t('practice.chordUnavailable')}/>}
    {source.format === 'olga-reference' ? <p role="status">{it ? 'Caricamento documento…' : 'Loading document…'}</p> : source.format === 'olga-error' ? <p role="alert">{source.text}</p> : <ResponsiveDocument source={source.text} chords={chords} semitones={transpose.semitones} it={it}/>}
  </section>
}

function MusicalPractice({ core, scrollContainer, display:requestedDisplay, onDisplayChange, onArrangementChange }: PracticeProps) {
  const piece = core.score, instrument = core.instrument, renderers = core.enabledRenderers, t = core.t
  const transpose = useTranspose()
  const available: DisplayTab[] = []
  if (renderers.some(renderer => renderer.manifest.id === 'renderer-tab')) available.push('tabs')
  if (renderers.some(renderer => renderer.manifest.id === 'renderer-notation')) available.push('notation')
  if (piece?.lyrics?.length) available.push('chords')
  const defaultDisplay = available.includes('chords') ? 'chords' : available[0] ?? 'tabs'
  const [display, setDisplay] = useState<DisplayTab>(defaultDisplay)
  const requested = requestedDisplay ?? display
  const selected = available.includes(requested) ? requested : defaultDisplay
  const containers = useScoreRenderer(piece, instrument, renderers, selected)
  const definitions = useMemo(() => piece?.source ? chordDefinitions(piece.source.text) : undefined, [piece])
  const names = useMemo(() => [...(piece?.chords?.map(chord => chord.name) ?? []), ...(piece?.lyrics?.flatMap(line => line.anchors?.map(anchor => anchor.name) ?? []) ?? [])], [piece])
  const diagramDefinitions = useMemo(() => transposeDefinitions(names, definitions, transpose.semitones, instrument?.fretCount ?? 20), [names, definitions, transpose.semitones, instrument])
  const readingPiece = useMemo(() => piece ? transposePieceChords(piece, transpose.semitones) : null, [piece, transpose.semitones])
  useEffect(() => { setDisplay(defaultDisplay) }, [piece])
  if (!piece) return <p className="text-muted">{t('practice.select')}</p>
  if (!instrument) return <p className="text-muted">{t('library.empty')}</p>
  return <div className="mm-practice-view mm-reading-column mx-auto flex min-w-0 min-h-full w-full max-w-4xl flex-col">
    <PieceSummary piece={piece} instrument={instrument} locale={core.locale} t={t}/>
    <ArrangementSelector version={core.currentVersion} selected={core.currentArrangement} onChange={kind => onArrangementChange ? onArrangementChange(kind) : core.setArrangement(kind)} t={t}/>
    <DisplayTabs available={available} selected={selected} onChange={onDisplayChange ?? setDisplay} t={t}/>
    <PracticeToolbar key={piece.id + selected} container={scrollContainer} t={t}>
      {selected === 'chords' && names.some(name => parseChordSymbol(name)) && <TransposeControls value={transpose} t={t}/>}
    </PracticeToolbar>
    {instrument.capabilities?.diagrams && names.length > 0 && (selected === 'notation' || selected === 'chords') ? <ChordDiagrams t={t} selectionKey={selected === 'chords' ? transpose.semitones : 0} chords={selected === 'chords' ? names.map(name => transposeChord(name, transpose.semitones)) : names} definitions={selected === 'chords' ? diagramDefinitions : definitions} preferLibrary={selected === 'chords' && transpose.semitones !== 0} instrument={instrument} unavailableLabel={t('practice.chordUnavailable')}/> : null}
    <div id="display-panel" role="tabpanel" aria-label={t(`display.${selected}`)} aria-labelledby={available.length > 1 ? `display-tab-${selected}` : undefined} tabIndex={0} className="min-w-0">
      {selected === 'chords' ? <ChordSheet piece={readingPiece!}/> : <div className="mm-renderer-panel mt-3.5 flex min-h-[120px] flex-col overflow-hidden rounded-xl border border-line bg-panel">
        <header className="border-b border-line px-3.5 py-2 text-sm font-semibold text-muted">{t(`display.${selected}`)}</header>
        <div className="mm-renderer-body min-h-0 flex-1 overflow-x-auto px-3 py-2.5" ref={element => {
          const id = selected === 'tabs' ? 'renderer-tab' : 'renderer-notation'
          if (element) containers.current.set(id, element)
          else containers.current.delete(id)
        }}/>
      </div>}
    </div>
  </div>
}
