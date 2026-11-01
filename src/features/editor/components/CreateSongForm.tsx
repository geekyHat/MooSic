import { useDirtyGuard } from '@/shared/navigation/NavigationGuard'
import { useState } from 'react'
import { BTN_GHOST,BTN_PRIMARY,CARD,GENRES,INPUT } from '../model/presentation'
import { ArtistField } from './ArtistField'
export function CreateForm({
  visible,
  onCreate,
  onCancel,
  t,
  artists,
}: {
  visible: boolean
  onCreate: (name: string, artist: string, genre: string) => void|Promise<void>
  onCancel: () => void
  t: (key: string, vars?: Record<string, string | number>) => string
  artists: string[]
}) {
  const [name, setName] = useState('')
  const [artist, setArtist] = useState('')
  const [genre, setGenre] = useState('')
  const [saving, setSaving] = useState(false)
  const request = useDirtyGuard(visible && !!(name || artist || genre))
  if (!visible) return null
  return (
    <form className={`${CARD} mb-4`} aria-busy={saving} onSubmit={async event => {
      event.preventDefault()
      if (saving || !name.trim()) return
      setSaving(true)
      try { await onCreate(name.trim(), artist.trim(), genre.trim()) }
      finally { setSaving(false) }
    }}>
      <fieldset disabled={saving} className="min-w-0">
      <h3 className="mb-3 font-semibold text-ink">{t('editor.newSong')}</h3>
      <datalist id="mm-genre-suggestions">
        {GENRES.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <div className="space-y-2.5">
        <ArtistField value={artist} onChange={setArtist} artists={artists} t={t} autoFocus/>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">{t('editor.name')}</span>
          <input
            className={`${INPUT} w-full`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('editor.namePlaceholder')}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">{t('editor.genre')}</span>
          <input
            list="mm-genre-suggestions"
            className={`${INPUT} w-full`}
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder={t('editor.genrePlaceholder')}
          />
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          className={BTN_PRIMARY}
          disabled={!name.trim()}
          style={{ opacity: name.trim() ? 1 : 0.5 }}
          type="submit"
        >
          {t('editor.create')}
        </button>
        <button type="button" className={BTN_GHOST} onClick={()=>request(onCancel)}>
          {t('editor.cancel')}
        </button>
      </div>
      </fieldset>
    </form>
  )
}
