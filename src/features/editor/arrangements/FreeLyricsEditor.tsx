import {parseLyricSheet, serializeLyricSheet} from '@/domain/songs/lyricSheet'
import {isLyricSheet} from '@/domain/songs/lyricValidation'
import type {UserLyricLine, UserLyricSheet} from '@/domain/songs/types'
import {useDirtyGuard} from '@/shared/navigation/NavigationGuard'
import {Button} from '@/shared/ui/Button'
import {ChordLyricsLine} from '@/shared/ui/ChordLyricsLine'
import {fieldStyle} from '@/shared/ui/styles'
import {useEffect, useId, useRef, useState} from 'react'
import {LyricTimingEditor} from './LyricTimingEditor'
import {freeLyricsText} from './freeLyricsText'

interface Props {
  value: UserLyricSheet
  onChange: (sheet: UserLyricSheet) => void
  onValidityChange: (valid: boolean) => void
  locale: 'it'|'en'
  maxBeats: number
  t: (key:string) => string
}
export function FreeLyricsEditor({value, onChange, onValidityChange, locale, maxBeats, t}: Props) {
  const labels=freeLyricsText[locale], id=useId()
  const [source,setSource]=useState(()=>serializeLyricSheet(value))
  const [syntaxError,setSyntaxError]=useState(false)
  const [invalidTimings,setInvalidTimings]=useState<Set<string>>(()=>new Set())
  const [chord,setChord]=useState('Am')
  const textarea=useRef<HTMLTextAreaElement>(null)
  const caret=useRef(0)
  // An invalid raw edit is still a user-owned draft, even if the last parsed value is unchanged.
  useDirtyGuard(source !== serializeLyricSheet(value))
  const valid=isLyricSheet(value,maxBeats) && !syntaxError && !value.rows.some(row=>invalidTimings.has(row.id))
  useEffect(()=>{onValidityChange(valid)},[valid,onValidityChange])

  function update(text:string) {
    setSource(text)
    try {const sheet=parseLyricSheet(text,value);setSyntaxError(false);onChange(sheet)}
    catch {setSyntaxError(true)}
  }
  function updateLine(id:string, patch:Partial<UserLyricLine>) {
    onChange({...value,rows:value.rows.map(row=>row.kind==='line'&&row.id===id?{...row,...patch}:row)})
  }
  function insertChord() {
    if(!chord.trim()||/[\[\]{}\r\n]/.test(chord)||chord.length>32)return
    const offset=caret.current, mark=`[${chord.trim()}]`
    update(source.slice(0,offset)+mark+source.slice(offset))
    requestAnimationFrame(()=>{textarea.current?.focus();textarea.current?.setSelectionRange(offset+mark.length,offset+mark.length);caret.current=offset+mark.length})
  }
  const numbered=value.rows.filter((row):row is UserLyricLine=>row.kind==='line')
  return <div className="min-w-0 space-y-4">
    <p id={`${id}-help`} className="text-sm text-muted">{labels.help}</p>
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-0">{labels.chord}<input className={`${fieldStyle} block w-28`} maxLength={32} value={chord} onChange={event=>setChord(event.target.value)}/></label>
      <Button onClick={insertChord} disabled={!chord.trim()||/[\[\]{}\r\n]/.test(chord)}>{labels.insert}</Button>
      <a className="inline-flex min-h-10 items-center rounded-lg border border-line px-3 text-sm text-accent" download="song.chopro" href={`data:text/plain;charset=utf-8,${encodeURIComponent(source)}`}>{labels.export}</a>
    </div>
    <label htmlFor={id} className="block font-medium">{labels.source}</label>
    <textarea ref={textarea} id={id} className={`${fieldStyle} block min-h-64 w-full resize-y font-mono leading-7`} value={source} aria-invalid={syntaxError} aria-describedby={`${id}-help ${id}-hint${syntaxError?` ${id}-error`:''}`} onChange={event=>{caret.current=event.target.selectionStart;update(event.target.value)}} onSelect={event=>{caret.current=event.currentTarget.selectionStart}} spellCheck={false}/>
    <p id={`${id}-hint`} className="text-sm text-muted">{labels.hint}</p>
    {syntaxError&&<p id={`${id}-error`} role="alert" className="text-bad">{labels.syntax}</p>}
    {!syntaxError&&numbered.length>0&&!valid&&<p role="alert" className="text-bad">{labels.invalid}</p>}
    <section aria-label={labels.preview} className="mm-lyrics-preview min-w-0 rounded-xl border border-line bg-panel p-4">
      <h4 className="mb-3 text-sm font-semibold text-muted">{labels.preview}</h4>
      {value.rows.map(row=>row.kind==='section'?<h5 key={row.id} className="mm-lyric-section mb-2 mt-4 font-semibold text-accent">{row.title}</h5>:row.kind==='spacer'?<div key={row.id} className="h-5" aria-hidden="true"/>:<div key={row.id} className="mm-sheet-line"><ChordLyricsLine text={row.text} anchors={row.chords}/></div>)}
    </section>
    {numbered.length>0&&<details><summary className="cursor-pointer text-sm font-medium">{labels.timing}</summary>
      <div className="mt-3 space-y-3">{numbered.map((row,index)=><fieldset key={row.id} className="min-w-0 rounded-lg border border-line p-3">
        <legend className="max-w-full break-words px-1 text-sm">{labels.line} {index+1}: {row.text.slice(0,60)||row.chords.map(chord=>chord.name).join(' ')}</legend>
        <div className="mb-2 flex flex-wrap gap-3">{(['startBeat','endBeat'] as const).map(key=><label key={key} className="text-sm">{key==='startBeat'?labels.start:labels.end}, {labels.line} {index+1}<input type="number" min={0} max={maxBeats} step="0.25" className={`${fieldStyle} block w-28`} value={row[key]} onChange={event=>updateLine(row.id,{[key]:Number(event.target.value)})}/></label>)}</div>
        {!!row.text.trim()&&<LyricTimingEditor locale={locale} bar={{chord:'',lyric:row.text,tokens:row.tokens,timingApproximate:row.timingApproximate}} duration={row.endBeat-row.startBeat} label={`${t('lyrics.timing')}, ${labels.line} ${index+1}`} generateLabel={t('lyrics.generate')} onChange={(tokens,timingApproximate)=>updateLine(row.id,{tokens,timingApproximate})} onValidityChange={valid=>setInvalidTimings(previous=>{if(valid&&!previous.has(row.id)||!valid&&previous.has(row.id))return previous;const next=new Set(previous);if(valid)next.delete(row.id);else next.add(row.id);return next})}/>}
      </fieldset>)}</div>
    </details>}
  </div>
}
