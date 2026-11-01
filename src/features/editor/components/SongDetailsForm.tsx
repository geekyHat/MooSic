import type { UserSong } from '@/domain/songs/types'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'
import { Panel } from '@/shared/ui/Panel'
import { GENRES } from '../model/presentation'
import { ArtistField } from './ArtistField'
type Translate = (key: string) => string
export function SongDetailsForm({song, artists, saving, onChange, onSave, onCancel, t, locale}: {
  song: UserSong
  artists: string[]
  saving: boolean
  onChange: (song: UserSong) => void
  onSave: () => void | Promise<void>
  onCancel: () => void
  t: Translate
  locale: 'it' | 'en'
}) {
  return <Panel className="mb-4"><form onSubmit={event => {event.preventDefault(); void onSave()}}>
    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t('editor.songInfo')}</h3>
    <datalist id="mm-genre-suggestions-2">{GENRES.map(genre => <option key={genre} value={genre}/>)}</datalist>
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      <ArtistField value={song.artist} onChange={artist => onChange({...song, artist})} artists={artists} t={t}/>
      <Field label={t('editor.name')} required value={song.name} onChange={event => onChange({...song, name: event.target.value})} error={song.name.trim() ? undefined : t('editor.name')}/>
      <Field label={t('editor.genre')} list="mm-genre-suggestions-2" value={song.genre} onChange={event => onChange({...song, genre: event.target.value})}/>
    </div>
    <p className="mt-2 text-xs text-muted">{locale === 'it' ? 'Salva solo i dettagli. Usa Salva nell’arrangiamento per salvare la composizione.' : 'Saves details only. Use Save in the arrangement to save the composition.'}</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <Button type="submit" variant="primary" pending={saving} disabled={!song.name.trim()}>{t('editor.saveDetails')}</Button>
      <Button disabled={saving} onClick={onCancel}>{t('editor.cancel')}</Button>
    </div>
  </form></Panel>
}
