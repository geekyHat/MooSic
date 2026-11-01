import { useId, useRef, useState } from 'react'
import type { AppCore } from '@/core/plugin/context-impl'
import { importSongs, planImports, type ImportChoice } from '@/application/songs/importSongs'
import { SongStorageError } from '@/application/songs/SongRepository'
import { IMPORT_EXTENSIONS, MAX_IMPORT_BYTES, parseSongFile, SongImportError } from '@/domain/songs/importSong'
import { useDirtyGuard } from '@/shared/navigation/NavigationGuard'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'
import { Panel } from '@/shared/ui/Panel'
import { importText } from '../importText'
import { artistNames } from '@/domain/songs/artists'
import { scanText } from '../scanText'

export function SongImportPanel({core,onClose,initialChoices=[],onBack}:{core:AppCore;onClose:()=>void;initialChoices?:ImportChoice[];onBack?:(choices:ImportChoice[])=>void}) {
  const text=importText[core.locale]
  const [choices,setChoices]=useState<ImportChoice[]>(initialChoices)
  const [errors,setErrors]=useState<{filename:string;message:string}[]>([])
  const [busy,setBusy]=useState(false)
  const [bulkArtist,setBulkArtist]=useState('')
  const fileInput=useRef<HTMLInputElement>(null)
  const reading=useRef(false)
  const suggestionsId=useId()
  const request=useDirtyGuard(choices.length>0 || busy)
  const plans=planImports(choices,core.songs.list(),core.artists)
  const missing=choices.some(choice=>!choice.name.trim()||!choice.artist.trim())
  const incomplete=choices.filter(choice=>!choice.name.trim()||!choice.artist.trim()).length
  const needsReview=choices.filter(choice=>choice.entry.metadata.needsReview&&!choice.metadataConfirmed).length
  const reviewCount=choices.filter((choice,index)=>choice.entry.metadata.needsReview&&!choice.metadataConfirmed||plans[index].status==='confirm').length
  const unresolved=plans.some(plan=>plan.status==='confirm')||needsReview>0
  const names=artistNames([...core.artists.map(artist=>artist.meta.name),...choices.filter(choice=>!choice.entry.metadata.needsReview||choice.metadataConfirmed).map(choice=>choice.artist)])
  const selected=choices.length+errors.filter(error=>error.filename).length
  const update=(index:number,patch:Partial<ImportChoice>)=>setChoices(previous=>previous.map((choice,i)=>i===index?{...choice,...patch}:choice))
  async function read(files:File[]) {
    if(reading.current)return
    if(selected+files.length>25){setErrors(previous=>[...previous,{filename:'',message:text.batch}]);return}
    reading.current=true
    setBusy(true)
    const next:ImportChoice[]=[],failures:{filename:string;message:string}[]=[]
    for(const file of files) {
      try {
        if(file.size>MAX_IMPORT_BYTES)throw new SongImportError('size')
        const buffer=await file.arrayBuffer()
        let content:string
        try {content=new TextDecoder('utf-8',{fatal:true}).decode(buffer)}catch{throw new SongImportError('format')}
        const entry=parseSongFile(file.name,content,artistNames([...names,...next.filter(choice=>!choice.entry.metadata.needsReview).map(choice=>choice.artist)]))
        next.push({entry,name:entry.song.name,artist:entry.song.artist,confirmed:false,metadataConfirmed:!entry.metadata.needsReview})
      } catch(error) {
        failures.push({filename:file.name,message:error instanceof SongImportError?text.errors[error.code]+(error.detail?' ('+error.detail+')':''):text.error})
      }
    }
    setChoices(previous=>[...previous,...next]);setErrors(previous=>[...previous,...failures]);setBusy(false);reading.current=false
  }
  async function commit() {
    if(busy||missing||unresolved||errors.length)return
    setBusy(true)
    try {
      const result=await importSongs(core.songs,choices,core.artists)
      await core.refreshUserLibrary()
      const first=result.find(plan=>plan.status!=='duplicate')
      if(first)core.openSong(first.song.id)
      core.notify('ok',`${text.done}: ${result.filter(plan=>plan.status!=='duplicate').length} ${text.added}, ${result.filter(plan=>plan.status==='duplicate').length} ${text.skipped}.`)
      setChoices([]);onClose()
    }catch(error){setErrors([{filename:'',message:text.error+(error instanceof SongStorageError?' '+core.t(`storage.${error.code}`):'')}])}
    finally{setBusy(false)}
  }
  return <Panel className="mb-4 min-w-0">
    <form className="min-w-0 [&_input]:w-full" aria-label={text.title} aria-busy={busy} onSubmit={event=>{event.preventDefault();void commit()}}>
      <fieldset disabled={busy} className="min-w-0">
        <h3 className="text-lg font-semibold">{text.title}</h3>
        <p className="my-2 text-sm text-muted">{text.help}</p>
        <input ref={fileInput} className="hidden" type="file" aria-label={text.files} accept={IMPORT_EXTENSIONS} multiple onChange={event=>{const files=Array.from(event.target.files??[]);event.target.value='';if(files.length)void read(files)}}/>
        {!onBack&&<><Button onClick={()=>fileInput.current?.click()}>{text.addFiles}</Button>
        <p className="my-2 text-xs text-muted">{text.selectHelp}</p></>}
        <p role="status" aria-live="polite" className="my-3 text-sm font-medium">{selected} {text.selected} · {incomplete} {text.incomplete} · {reviewCount} {text.reviewCount}</p>
        {choices.some(choice=>!choice.artist.trim())&&<div className="my-3 rounded-lg border border-line p-3">
          <datalist id={suggestionsId}>{names.map(name=><option key={name} value={name}/>)}</datalist>
          <Field label={text.bulkArtist} list={suggestionsId} maxLength={200} value={bulkArtist} onChange={event=>setBulkArtist(event.target.value)}/>
          <Button className="mt-2" disabled={!bulkArtist.trim()} onClick={()=>setChoices(previous=>previous.map(choice=>choice.artist.trim()?choice:{...choice,artist:bulkArtist.trim(),confirmed:false,matchedAlias:undefined}))}>{text.applyMissing}</Button>
        </div>}
        {errors.map((error,index)=><div key={index} role="alert" className="my-3 rounded-lg border border-line p-3 text-sm"><p className="break-words">{error.filename}: {error.message}</p><Button onClick={()=>setErrors(previous=>previous.filter((_,i)=>i!==index))}>{text.remove}</Button></div>)}
        {choices.length>0&&<div role="region" aria-label={text.preview} className="mt-4 space-y-4">
          {choices.map((choice,index)=>{
            const plan=plans[index]
            return <section key={choice.entry.song.id} className="min-w-0 rounded-lg border border-line p-3">
              <h4 className="mb-2 break-words font-semibold">{choice.entry.filename}</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={`${text.artist} — ${choice.entry.filename}`} required maxLength={200} description={!choice.artist.trim()?text.artistRequired:undefined} value={choice.artist} onChange={event=>update(index,{artist:event.target.value,confirmed:false,matchedAlias:undefined,metadataConfirmed:false})}/>
                <Field label={`${text.name} — ${choice.entry.filename}`} required maxLength={200} description={!choice.name.trim()?text.titleRequired:undefined} value={choice.name} onChange={event=>update(index,{name:event.target.value,metadataConfirmed:false})}/>
              </div>
              <p className="my-2 text-xs text-muted">{choice.artist===choice.entry.song.artist?text.artistSources[choice.entry.metadata.artistSource]:text.manualMetadata}</p>
              {choice.entry.metadata.needsReview&&!choice.metadataConfirmed&&<div role="group" aria-label={text.reviewMetadata} className="my-3 rounded-lg border border-accent p-3">
                <p className="mb-2 text-sm">{text.reviewMetadata}</p>
                <div className="flex flex-wrap gap-2"><Button disabled={!choice.artist.trim()||!choice.name.trim()} onClick={()=>update(index,{metadataConfirmed:true})}>{text.confirmMetadata}</Button><Button onClick={()=>update(index,{artist:choice.name,name:choice.artist,confirmed:false,matchedAlias:undefined,metadataConfirmed:true})}>{text.swapMetadata}</Button></div>
              </div>}
              {plan.status==='confirm'&&<div role="group" aria-label={text.question} className="mt-3 rounded-lg border border-accent p-3">
                <p className="mb-2 font-medium">{text.question}</p>
                <div className="flex flex-wrap gap-2">{plan.candidates.map(name=><Button key={name} onClick={()=>update(index,{artist:name,confirmed:true,matchedAlias:choice.artist,metadataConfirmed:true})}>{text.yes}: {name}</Button>)}<Button onClick={()=>update(index,{confirmed:true,matchedAlias:undefined})}>{text.different}</Button></div>
              </div>}
              <p role="status" className="my-2 break-words text-sm font-medium">{text[plan.status]}{plan.status==='rename'?` “${plan.song.name}”`:''}</p>
              <ul className="ml-4 list-disc text-xs text-muted">{choice.entry.warnings.map((warning,i)=><li key={i}>{text[warning.code]}{warning.detail?`: ${warning.detail}`:''}</li>)}</ul>
              <details className="my-3 min-w-0"><summary className="cursor-pointer text-sm">{text.original}</summary><pre className="mt-2 max-h-64 max-w-full overflow-auto rounded-lg bg-canvas p-2 text-xs">{choice.entry.song.arrangements[0]?.source?.text}</pre></details>
              <Button onClick={()=>setChoices(previous=>previous.filter((_,i)=>i!==index))}>{text.remove}</Button>
            </section>
          })}
        </div>}
        {missing&&<p className="mt-2 text-sm text-muted">{text.missing}</p>}
        <div className="mt-4 flex flex-wrap gap-2"><Button type="submit" variant="primary" disabled={!choices.length||missing||unresolved||errors.length>0}>{text.save}</Button>{onBack&&<Button onClick={()=>onBack(choices)}>{scanText[core.locale].back}</Button>}<Button onClick={()=>request(onClose)}>{text.cancel}</Button></div>
      </fieldset>
      {busy&&<p role="status">{text.loading}</p>}
    </form>
  </Panel>
}
