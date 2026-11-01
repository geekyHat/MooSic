import type {LyricToken, UserChordBar} from '@/domain/songs/types'
import {isLyricTiming} from '@/domain/songs/lyricValidation'
import {useDirtyGuard} from '@/shared/navigation/NavigationGuard'
import {Button} from '@/shared/ui/Button'
import {useEffect, useState} from 'react'

interface Props {
  bar: UserChordBar
  onChange: (tokens: LyricToken[] | undefined, approximate?: boolean) => void
  onValidityChange: (valid: boolean) => void
  label: string
  generateLabel: string
  duration?: number
  locale?: 'it'|'en'
}
export function LyricTimingEditor({bar, onChange, onValidityChange, label, generateLabel, duration=4, locale='en'}: Props) {
  const [draft, setDraft]=useState<string|null>(null), [error, setError]=useState('')
  const [rows,setRows]=useState<LyricToken[]|null>(null)
  useDirtyGuard(!!error)
  useEffect(()=>{setDraft(null);setRows(null);setError('');onValidityChange(true)},[bar.lyric])
  const text=draft??(bar.tokens?JSON.stringify(bar.tokens,null,2):'')
  const words=rows??bar.tokens
  const labels=locale==='it'?{word:'parola',start:'Beat iniziale',end:'Beat finale'}:{word:'word',start:'Start beat',end:'End beat'}
  function update(source: string, approximate=false) {
    setDraft(source)
    if (!source.trim()) {setRows(null);onChange(undefined);setError('');onValidityChange(true);return}
    try {
      const tokens:unknown=JSON.parse(source)
      // Keep invalid numeric drafts editable in the table without publishing them as valid data.
      if(Array.isArray(tokens)&&tokens.every(token=>token&&typeof token==='object'&&typeof token.text==='string'&&typeof token.startBeat==='number'&&typeof token.endBeat==='number'))setRows(tokens)
      if (!isLyricTiming(tokens,bar.lyric,duration)) throw new Error('Invalid timing')
      onChange(tokens,approximate);setError('');onValidityChange(true)
    } catch {
      setError(`JSON: [{"text":"…","startBeat":0,"endBeat":1}], 0 ≤ start < end ≤ ${duration}`)
      onValidityChange(false)
    }
  }
  return <details className="col-span-3 mb-2 min-w-0 text-sm">
    <summary>{label}</summary>
    <p>{label}: 0–{duration} beat. {bar.tokens&&!bar.timingApproximate?'':'≈'}</p>
    <Button onClick={()=>{
      const words=bar.lyric.trim().split(/\s+/).filter(Boolean)
      update(words.length?JSON.stringify(words.map((text,i)=>({text,startBeat:i*duration/words.length,endBeat:(i+1)*duration/words.length})),null,2):'',true)
    }}>{generateLabel}</Button>
    {words&&<div className="my-3 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">{words.map((word,index)=><fieldset key={index} className="col-span-2 min-w-0 rounded border border-line p-2">
      <legend className="max-w-full break-words px-1">{index+1}. {word.text}</legend>
      <div className="grid grid-cols-2 gap-2">{(['startBeat','endBeat'] as const).map(key=><label key={key} className="min-w-0">{key==='startBeat'?labels.start:labels.end}, {labels.word} {index+1}<input type="number" min={0} max={duration} step="0.25" value={word[key]} className="block min-h-10 w-full rounded border border-line bg-panel px-2 text-ink" onChange={event=>update(JSON.stringify(words.map((token,i)=>i===index?{...token,[key]:Number(event.target.value)}:token),null,2))}/></label>)}</div>
    </fieldset>)}</div>}
    <label className="block">{label}<textarea aria-invalid={!!error} className="block min-h-28 w-full rounded border border-line bg-panel p-2 font-mono text-ink" value={text} onChange={e=>update(e.target.value)}/></label>
    {error&&<p role="alert" className="text-bad">{error}</p>}
  </details>
}
