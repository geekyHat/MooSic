import { useId, useRef, useState } from 'react'
import { artistKey, suggestArtists } from '@/domain/songs/artists'
import { INPUT } from '../model/presentation'

export function ArtistField({value, onChange, artists, t, autoFocus = false}: {
  value: string
  onChange: (value: string) => void
  artists: string[]
  t: (key: string) => string
  autoFocus?: boolean
}) {
  const id = useId()
  const container = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const suggestions = suggestArtists(value, artists)
  const exists = artists.some(name => artistKey(name) === artistKey(value))
  return <div ref={container} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
  }} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); input.current?.focus(); setFocused(false) }
  }}>
    <label htmlFor={id} className="mb-1 block text-xs text-muted">{t('editor.artist')}</label>
    <input ref={input} id={id} className={`${INPUT} w-full`} value={value} autoFocus={autoFocus}
      autoComplete="off" placeholder={t('editor.artistPlaceholder')} aria-describedby={`${id}-hint`}
      onFocus={() => setFocused(true)} onChange={event => { onChange(event.target.value); setFocused(true) }}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' && suggestions.length) {
          event.preventDefault()
          container.current?.querySelector<HTMLButtonElement>('button')?.focus()
        }
      }}/>
    <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{t(!value.trim() ? 'editor.artistHint' : exists ? 'editor.artistExists' : 'editor.artistNew')}</p>
    {focused && suggestions.length > 0 && <div role="group" aria-label={t('editor.artistSuggestions')} className="mt-2 flex flex-wrap gap-2">
      {suggestions.map(name => <button key={artistKey(name)} type="button" className="cursor-pointer rounded-lg border border-line bg-panel px-3 py-2 text-left text-sm hover:border-accent"
        onClick={() => { onChange(name); input.current?.focus(); setFocused(false) }}>{name}</button>)}
    </div>}
  </div>
}
