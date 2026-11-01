import type { OlgaService } from '@/application/olga/OlgaService'
import type { ContentPlugin,RawContentArtist } from '@/core/plugin/types'
import type { Piece } from '@/domain/score/types'
import { artistKey } from '@/domain/songs/artists'

export function olgaContent(service:OlgaService):ContentPlugin {
 let pieces=new Map<string,Piece>()
 return {
  manifest:{id:'content-olga',type:'content',name:{it:'Archivio OLGA locale',en:'Local OLGA archive'},version:'1.0.0',apiVersion:1,permissions:['storage']},
  async artists(){
   pieces=new Map();const artists=new Map<string,RawContentArtist>()
   for(const entry of service.entries){
    const key=artistKey(entry.artist),artist=artists.get(key)??{meta:{id:`olga-artist-${encodeURIComponent(key)}`,name:entry.artist},songs:[]}
    const piece:Piece={id:entry.id,title:entry.title,composer:entry.artist,instrumentId:'instrument-guitar',tempo:120,timeSignature:{numerator:4,denominator:4},secondsPerBeat:0.5,barLength:2,bars:1,duration:2,notes:[],source:{format:'olga-reference',text:entry.sourceKey},document:{instrument:entry.instrument,path:entry.path,format:entry.format}}
    pieces.set(entry.id,piece)
    artist.songs.push({meta:{id:entry.id,title:entry.title,composer:entry.artist,genre:entry.instrument,tags:['OLGA',entry.category]},versions:[{id:'original',name:`OLGA · ${entry.format.toUpperCase()}`,arrangements:[{kind:/^(crd|chopro|chordpro|pro|cho|lyr)$/.test(entry.format)?'lyrics':'tabs',file:entry.id}]}]})
    artists.set(key,artist)
   }
   return [...artists.values()]
  },
  file(){return undefined},
  buildPiece(file){return pieces.get(file)??null},
 }
}
