import { useEffect,useMemo,useRef,useState } from 'react'
import type { AppCore } from '@/core/plugin/context-impl'
import type { ArrangementKind, ContentSong } from '@/core/plugin/types'
import type { LibraryLocation } from '@/domain/navigation/location'
import { Button } from '@/shared/ui/Button'
import { useLibrary } from './hooks/useLibrary'
import { filterLibrary } from './model/filterLibrary'
import { alphabeticPage,alphabeticSort,letterCounts,LIBRARY_VIEWS,songsForView,singleArrangement,type LibraryLetter,type LibraryViewId } from './model/browseLibrary'
import { SongImportPanel } from './components/SongImportPanel'
import { ArtistMergePanel } from './components/ArtistMergePanel'
import { OlgaImportPanel } from './components/OlgaImportPanel'
import { LibraryBrowseMenu } from './components/LibraryBrowseMenu'
import { AlphabetIndex } from './components/AlphabetIndex'
import { AlphabeticalList } from './components/AlphabeticalList'
import { ArtistCard,SongCard } from './components/LibraryCards'
import { LibraryVersions } from './components/LibraryVersions'
import { LibraryFilters } from './components/LibraryFilters'
import { importText } from './importText'
import { ScanImportPanel } from './components/ScanImportPanel'
import { scanText } from './scanText'

export function LibraryView({core,onOpen,onEdit,location,onLocationChange}:{core:AppCore;onOpen:(songId:string,version:string,kind:ArrangementKind)=>void;onEdit?:(songId:string)=>void;location:LibraryLocation;onLocationChange:(patch:Partial<LibraryLocation>,replace?:boolean)=>void}){
  const snapshot=useLibrary(core),t=core.t
  const artists=snapshot.status==='idle'||(snapshot.status==='loading'&&snapshot.revision===0)?null:snapshot.artists
  const localSongIds=new Set(core.songs.list().map(song=>song.id))
  const {filters,panel,mode,artistId:selectedArtistId,songId:selectedSongId,rootLetter,artistLetter,limit}=location
  const update=(patch:Partial<LibraryLocation>,replace=false)=>onLocationChange(patch,replace)
  const setPanel=(panel:LibraryLocation['panel'])=>update({panel})
  const setFilters=(filters:LibraryLocation['filters'])=>update({filters,limit:48},true)
  const [focusRequest,setFocusRequest]=useState(0)
  const heading=useRef<HTMLHeadingElement>(null)
  const letter=selectedArtistId?artistLetter:rootLetter
  const selectedArtist=artists?.find(artist=>artist.meta.id===selectedArtistId)
  const catalogIds=useMemo(()=>new Set(artists?.flatMap(artist=>artist.songs.map(song=>song.meta.id))??[]),[artists])
  useEffect(()=>{
    if(!artists)return
    if(selectedArtistId&&!selectedArtist)update({artistId:null,songId:null},true)
    else if(selectedSongId&&!catalogIds.has(selectedSongId))update({songId:null},true)
  },[artists,selectedArtistId,selectedArtist,selectedSongId,catalogIds])
  useEffect(()=>{
    if(!focusRequest)return
    heading.current?.focus({preventScroll:true})
    heading.current?.scrollIntoView({block:'nearest'})
  },[focusRequest])
  const focusResults=()=>setFocusRequest(value=>value+1)

  const filteredArtists=useMemo(()=>filterLibrary(artists??[],filters),[artists,filters])
  const sortedArtists=useMemo(()=>alphabeticSort(filteredArtists,artist=>artist.meta.name,core.locale,artist=>artist.meta.id),[filteredArtists,core.locale])
  const artistOverview=mode==='artists'&&!selectedArtistId
  const rows=useMemo(()=>{
    if(artistOverview)return []
    const scope=selectedArtistId?filteredArtists.filter(artist=>artist.meta.id===selectedArtistId):filteredArtists
    return alphabeticSort(songsForView(scope,mode),row=>row.song.meta.title,core.locale,row=>`${row.artist.meta.name}\0${row.song.meta.id}`)
  },[filteredArtists,selectedArtistId,mode,core.locale,artistOverview])
  const counts=useMemo(()=>artistOverview?letterCounts(sortedArtists,artist=>artist.meta.name):letterCounts(rows,row=>row.song.meta.title),[artistOverview,sortedArtists,rows])
  const artistPage=alphabeticPage(sortedArtists,artist=>artist.meta.name,letter,limit)
  const songPage=alphabeticPage(rows,row=>row.song.meta.title,letter,limit)
  const total=artistOverview?artistPage.total:songPage.total
  const shown=artistOverview?artistPage.items.length:songPage.items.length
  const selectedRow=selectedSongId?rows.find(row=>row.song.meta.id===selectedSongId):undefined
  const title=selectedSongId?(selectedRow?.song.meta.title??t('library.song')):selectedArtist?`${t('library.browse.songs')} · ${selectedArtist.meta.name}`:t(LIBRARY_VIEWS.find(view=>view.id===mode)!.label)
  const filterOptions=useMemo(()=>{
    const composers=new Set<string>(),genres=new Set<string>()
    for(const artist of artists??[])for(const song of artist.songs){composers.add(song.meta.composer??'—');genres.add(song.meta.genre??'—')}
    const compare=new Intl.Collator(core.locale,{numeric:true,sensitivity:'base'}).compare
    return {composers:[...composers].sort(compare),genres:[...genres].sort(compare)}
  },[artists,core.locale])
  const changeMode=(view:LibraryViewId)=>{update({mode:view,artistId:null,songId:null,rootLetter:'all',limit:48});focusResults()}
  const openArtist=(id:string)=>{update({artistId:id,songId:null,artistLetter:'all',limit:48});focusResults()}
  const back=()=>{update(selectedSongId?{songId:null}:{artistId:null,songId:null,limit:48});focusResults()}
  const selectLetter=(next:LibraryLetter)=>{update({...(selectedArtistId?{artistLetter:next}:{rootLetter:next}),limit:48});focusResults()}
  const openSong=(song:ContentSong)=>{
    const only=singleArrangement(song)
    if(only)onOpen(song.meta.id,only.versionId,only.kind)
    else {update({songId:song.meta.id});focusResults()}
  }

  return <div className="mm-library">
    <div className="mm-library-header">
      <h2 className="mb-3 text-[22px]">{t('library.title')}</h2>
      <LibraryBrowseMenu selected={mode} onChange={changeMode} t={t}/>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="primary" disabled={panel!==null||artists===null} onClick={()=>setPanel('import')}>{importText[core.locale].open}</Button>
        {core.scan&&<Button disabled={panel!==null||artists===null} onClick={()=>setPanel('scan')}>{scanText[core.locale].open}</Button>}
        {core.olga&&<Button disabled={panel!==null||artists===null} onClick={()=>setPanel('olga')}>import olga archive</Button>}
        {localSongIds.size>0&&<Button disabled={panel!==null||artists===null} onClick={()=>setPanel('merge')}>{importText[core.locale].merge}</Button>}
      </div>
      {panel==='olga'&&core.olga&&<OlgaImportPanel core={core} onClose={()=>setPanel(null)}/>}
      {panel==='import'&&<SongImportPanel core={core} onClose={()=>setPanel(null)}/>}
      {panel==='scan'&&<ScanImportPanel core={core} onClose={()=>setPanel(null)}/>}
      {panel==='merge'&&<ArtistMergePanel core={core} onClose={()=>setPanel(null)}/>}
      <LibraryFilters filters={filters} {...filterOptions} onChange={setFilters} t={t}/>
      {!selectedSongId&&<AlphabetIndex selected={letter} counts={counts} onChange={selectLetter} t={t}/>}
    </div>
    {(selectedArtistId||selectedSongId)&&<Button className="mb-4" onClick={back}>← {t('library.back')}</Button>}
    <section id="library-results" aria-labelledby="library-results-title">
      <h3 id="library-results-title" ref={heading} tabIndex={-1} className="mb-3 break-words text-lg font-semibold">{title}</h3>
      {artists===null?<p role="status">{t('library.browse.loading')}</p>:artists.length===0?<p className="text-sm text-muted">{t('library.empty')}</p>:<>
        {!selectedSongId&&<p role="status" className="mb-3 text-sm text-muted">{t('library.browse.count',{shown,total})}{letter!=='all'?` · ${letter}`:''}</p>}
        {selectedSongId?selectedRow?<LibraryVersions song={selectedRow.song} t={t} emptyLabel={t('library.browse.noArrangement')} onEdit={localSongIds.has(selectedRow.song.meta.id)?onEdit:undefined} onOpen={(version,kind)=>onOpen(selectedRow.song.meta.id,version,kind)}/>:<p>{t('library.noResults')}</p>:total===0?<p>{t('library.noResults')}</p>:artistOverview?
          <AlphabeticalList items={artistPage.items} label={artist=>artist.meta.name} itemKey={artist=>artist.meta.id} render={artist=><ArtistCard artist={artist} t={t} onOpen={()=>openArtist(artist.meta.id)}/>}/>:
          <AlphabeticalList items={songPage.items} label={row=>row.song.meta.title} itemKey={row=>row.song.meta.id} render={row=><SongCard row={row} t={t} onOpen={()=>openSong(row.song)} onArtist={!selectedArtistId?openArtist:undefined} onEdit={localSongIds.has(row.song.meta.id)?onEdit:undefined}/>}/>
        }
        {!selectedSongId&&shown<total&&<Button className="mt-4" onClick={()=>update({limit:limit+48},true)}>{t('library.browse.more')} ({shown} / {total})</Button>}
      </>}
    </section>
    {snapshot.errors.length>0&&<div className="mt-3 text-sm text-muted" role="alert"><Button onClick={()=>void core.reloadLibrary()}>{t('library.browse.retry')}</Button>{snapshot.errors.map(error=><div key={error}>{error}</div>)}</div>}
  </div>
}
