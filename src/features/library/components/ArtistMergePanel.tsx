import { useState } from 'react'
import type { AppCore } from '@/core/plugin/context-impl'
import { mergeLocalArtist } from '@/application/songs/importSongs'
import { artistKey, artistNames, resolveArtist } from '@/domain/songs/artists'
import { Button } from '@/shared/ui/Button'
import { Select } from '@/shared/ui/Field'
import { Panel } from '@/shared/ui/Panel'
import { importText } from '../importText'

export function ArtistMergePanel({core,onClose}:{core:AppCore;onClose:()=>void}) {
  const text=importText[core.locale]
  const sources=artistNames(core.songs.list().map(song=>resolveArtist(song.artist,core.artistLinks)))
  const [from,setFrom]=useState(sources[0]??'')
  const targets=core.artists.map(artist=>artist.meta.name).filter(name=>artistKey(name)!==artistKey(from))
  const [target,setTarget]=useState('')
  const to=targets.includes(target)?target:targets[0]??''
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  return <Panel className="mb-4"><form className="min-w-0 [&_select]:w-full" onSubmit={async event=>{
    event.preventDefault();if(!from||!to||busy)return
    setBusy(true)
    try{await mergeLocalArtist(core.songs,from,to,core.artists);await core.refreshUserLibrary();core.notify('ok',text.merged);onClose()}
    catch{setError(text.error)}finally{setBusy(false)}
  }}><h3 className="text-lg font-semibold">{text.merge}</h3><p className="my-2 text-sm text-muted">{text.mergeHelp}</p>
    <div className="grid gap-3 sm:grid-cols-2"><Select label={text.from} value={from} disabled={busy} onChange={event=>setFrom(event.target.value)}>{sources.map(name=><option key={name}>{name}</option>)}</Select><Select label={text.to} value={to} disabled={busy} onChange={event=>setTarget(event.target.value)}>{targets.map(name=><option key={name}>{name}</option>)}</Select></div>
    {error&&<p role="alert">{error}</p>}<div className="mt-3 flex flex-wrap gap-2"><Button type="submit" variant="primary" pending={busy} disabled={!from||!to}>{text.mergeConfirm}</Button><Button disabled={busy} onClick={onClose}>{text.cancel}</Button></div>
  </form></Panel>
}
