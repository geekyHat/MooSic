import { artistKey } from '../songs/artists'

export interface OlgaEntry {
  id:string; title:string; baseTitle:string; artist:string; artistFolder:string
  instrument:string; category:string; path:string; format:string; digest:string; sourceKey:string
}
export interface OlgaSource {path:string; text:string; digest:string}
export function olgaPath(path:string):{category:string;artistFolder:string;filename:string;instrument:string}|null {
  const parts=path.replaceAll('\\','/').split('/')
  if(parts.some(p=>p==='..'||p==='.')||path.startsWith('/')||/^[a-z]:/i.test(path))throw new Error('Percorso ZIP non sicuro')
  const branch=parts.findIndex(p=>/^(main(?: \d+)?|chordpro|bass|acoustic|classical|cowpie|praise_songs)$/i.test(p))
  if(branch<0||parts.length<branch+3)return null
  const category=parts[branch].toLowerCase().replace(/^main \d+$/,'main')
  const filename=parts.at(-1)!
  if(!/\.(crd|tab|btab|chopro|chordpro|pro|cho|lyr|num|txt)$/i.test(filename))return null
  const artistFolder=parts.at(-2)!
  if(artistFolder.startsWith('.')||/^resources$/i.test(artistFolder))return null
  const instrument=category==='bass'||/\.btab$/i.test(filename)?'Basso':category==='acoustic'?'Chitarra acustica':category==='classical'?'Chitarra classica':'Chitarra / accordi'
  return {category,artistFolder,filename,instrument}
}
export function readableName(name:string):string {
  return name.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_.]+/g,' ').replace(/\s+/g,' ').trim()
}
/** Equal word sets reconcile folder surname_firstname with explicit first/surname headers. No fuzzy automatic merging. */
export function artistWords(name:string):string {
  return artistKey(readableName(name)).replace(/[^\p{L}\p{N} ]/gu,' ').split(/\s+/).filter(Boolean).sort().join(' ')
}
export function describeOlga(source:OlgaSource):OlgaEntry|null {
  const info=olgaPath(source.path)
  if(!info||!source.text.trim()||source.text.includes('\0'))return null
  const header=source.text.split(/\r?\n/).slice(0,100).join('\n')
  const field=(pattern:RegExp)=>header.match(pattern)?.[1]?.trim().slice(0,240)
  const folder=readableName(info.artistFolder)
  const explicit=field(/^\s*(?:artist|performer|band)\s*:\s*(.+)$/im)??field(/\{(?:artist|a|subtitle|st)\s*:\s*([^}\n]+)\}/i)
  const artist=explicit&&artistWords(explicit)===artistWords(folder)?explicit:folder
  const title=field(/\{(?:title|t)\s*:\s*([^}\n]+)\}/i)??field(/^\s*(?:song\s*title|title)\s*:\s*(.+)$/im)??readableName(info.filename.replace(/\.[^.]+$/,''))
  return {id:'',title,baseTitle:title,artist,artistFolder:artistWords(folder),instrument:info.instrument,category:info.category,path:source.path,format:info.filename.split('.').at(-1)!.toLowerCase(),digest:source.digest,sourceKey:''}
}
export function olgaIdentity(entry:Pick<OlgaEntry,'artist'|'baseTitle'|'digest'>):string {
  return JSON.stringify([artistKey(entry.artist),artistKey(entry.baseTitle),entry.digest])
}

function artistTokens(name:string):string[]{return artistWords(name).split(' ').filter(word=>word.length>1&&!['the','and','of','van','von','de','di','da','la','los'].includes(word))}
/** Suggest incomplete names and small spelling changes, not any two bands sharing a word. */
export function similarOlgaArtist(left:string,right:string):boolean {
 const a=artistTokens(left),b=artistTokens(right)
 if(!a.length||!b.length)return false
 const short=a.length<=b.length?a:b,long=a.length<=b.length?b:a,used=new Set<number>()
 const near=(x:string,y:string)=>{
  if(x===y)return true
  if(Math.min(x.length,y.length)<4)return false
  if(Math.min(x.length,y.length)>=5&&(x.startsWith(y)||y.startsWith(x)))return true
  if(Math.abs(x.length-y.length)>1)return false
  let i=0,j=0,edits=0
  while(i<x.length&&j<y.length){if(x[i]===y[j]){i++;j++}else{if(++edits>1)return false;if(x.length>=y.length)i++;if(y.length>=x.length)j++}}
  return edits+(x.length-i)+(y.length-j)<=1
 }
 return short.every(word=>{const index=long.findIndex((other,i)=>!used.has(i)&&near(word,other));if(index<0)return false;used.add(index);return true})
}
