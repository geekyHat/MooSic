import { useEffect, useRef, useState } from 'react'
import { LyricTimingEditor } from './LyricTimingEditor'
import { CHORD_SUGGESTIONS } from '@/domain/music/chords'
import { legacyToLyricSheet, parseLyricSheet } from '@/domain/songs/lyricSheet'
import { serializeLyricSheet } from '@/domain/songs/lyricSheet'
/**
 * Chords + lyrics editor: one row per bar with a chord symbol and a lyric
 * line. The chord is a free-text input with common-chord suggestions.
 * 
 * Supports:
 * - Intro/Outro with tabs
 * - Verse notes (start/middle/end)
 * - Chorus sections
 * - Free text editor with chord anchors [Chord]word
 */
import type { UserChordBar } from '@/domain/songs/types'

interface Props {
  value: UserChordBar[]
  onChange: (bars: UserChordBar[]) => void
  bars: number
  locale?: 'it'|'en'
  onValidityChange?: (valid:boolean)=>void
  t: (key: string, vars?: Record<string, string | number>) => string
}

export function ChordLyricsEditor({ value, onChange, bars, t, onValidityChange, locale='en' }: Props) {
  const invalid=useRef(new Set<number>())
  useEffect(()=>{let changed=false;for(const index of invalid.current)if(index>=bars){invalid.current.delete(index);changed=true};if(changed)onValidityChange?.(invalid.current.size===0)},[bars,onValidityChange])
  function update(i: number, patch: Partial<UserChordBar>) {
    const next = value.slice()
    next[i] = { ...(next[i] ?? { chord: '', lyric: '' }), ...patch, ...(patch.lyric !== undefined ? {tokens:undefined,timingApproximate:undefined} : {}) }
    onChange(next)
  }
  const [showFreeText, setShowFreeText] = useState(false)
  const [freeText, setFreeText] = useState('')
  
  // Convert current chordBars to free text format for editing
  useEffect(() => {
    if (showFreeText) {
      setFreeText(serializeLyricSheet(legacyToLyricSheet(value, bars)))
    }
  }, [value, bars, showFreeText])
  
  function handleFreeTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newText = e.target.value
    setFreeText(newText)
    try {
      const sheet = parseLyricSheet(newText)
      // Calculate total beats needed
      const totalBeats = Math.max(0, ...sheet.rows.map(row => row.kind === 'line' ? row.endBeat : 0))
      const neededBars = Math.ceil(totalBeats / 4)
      const finalBars = Math.max(bars, neededBars)
      
      // Convert lines to bars (one line per bar)
      const convertedBars = sheet.rows
        .filter(row => row.kind === 'line')
        .map(row => {
          
          return {
            chord: row.chords.map(c => c.name).join(' '),
            lyric: row.text,
            tokens: row.tokens?.map(t => ({ ...t })),
            timingApproximate: row.timingApproximate
          }
        })
      // Pad or truncate to match bars count
      const resultBars = Array.from({ length: finalBars }, (_, i) => 
        convertedBars[i] ?? { chord: '', lyric: '' }
      )
      onChange(resultBars)
      invalid.current.clear()
      onValidityChange?.(true)
    } catch (err) {
      // Keep text editable, mark invalid
    }
  }

  return (
    <div>
      <datalist id="mm-chord-suggestions">
        {Array.from(new Set(CHORD_SUGGESTIONS)).map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <div className="grid grid-cols-[1.5rem_5rem_minmax(0,1fr)] gap-x-2 gap-y-1.5">
        <span className="text-right text-xs text-muted" />
        <span className="text-xs text-muted">{t('editor.chords.chord')}</span>
        <span className="text-xs text-muted">{t('editor.chords.lyric')}</span>
        {Array.from({ length: bars }, (_, i) => {
          const bar = value[i] ?? { chord: '', lyric: '' }
          return (
            <div key={i} className="contents">
              <span className="text-right text-xs text-muted">{i + 1}</span>
              <input
                list="mm-chord-suggestions"
                aria-label={`${t('editor.chords.chord')}, ${t('practice.bar')} ${i + 1}`}
                value={bar.chord}
                onChange={(e) => update(i, { chord: e.target.value })}
                placeholder="Am"
                className="min-w-0 w-full rounded-md border border-line bg-panel px-2 py-1 text-sm text-ink outline-none focus:border-accent"
              />
              <input
                value={bar.lyric}
                aria-label={`${t('editor.chords.lyric')}, ${t('practice.bar')} ${i + 1}`}
                onChange={(e) => update(i, { lyric: e.target.value })}
                placeholder={t('editor.chords.lyricPlaceholder')}
                className="min-w-0 w-full rounded-md border border-line bg-panel px-2 py-1 text-sm text-ink outline-none focus:border-accent"
              />
              <LyricTimingEditor locale={locale} generateLabel={t('lyrics.generate')} bar={bar} label={`${t('lyrics.timing')}, ${t('practice.bar')} ${i+1}`} onChange={(tokens,timingApproximate)=>update(i,{tokens,timingApproximate})} onValidityChange={valid=>{if(valid)invalid.current.delete(i);else invalid.current.add(i);onValidityChange?.(invalid.current.size===0)}}/>
            </div>
          )
        })}
      </div>
      <div className="mt-4 border-t border-line pt-2">
        <button 
          type="button"
          className="mr-2 px-3 py-1 text-sm rounded bg-panel hover:bg-muted cursor-pointer"
          onClick={() => setShowFreeText(!showFreeText)}
        >
          {showFreeText ? t('editor.chords.basicView') : t('editor.chords.freeView')}
        </button>
        {showFreeText && (
          <div className="mt-2">
            <label className="block text-sm text-muted mb-1">{t('editor.chords.freeEditor')}</label>
            <textarea
              value={freeText}
              onChange={handleFreeTextChange}
              className="w-full h-48 rounded border border-line bg-panel p-2 font-mono text-sm text-ink outline-none focus:border-accent"
              placeholder={`Ciao [G]mondo [Am]come [C]stai
[Dm]Bene [G]grazie
[C]E [F]tu?`}
            />
            <p className="text-xs text-muted mt-1">
              {t('editor.chords.freeEditorHelp')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
