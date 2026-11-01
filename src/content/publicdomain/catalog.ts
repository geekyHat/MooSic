import index from './index.json'
import type { RawContentArtist } from '@/core/plugin/types'

/** Shipped repertoire only. Browser libraries are never used as installation seeds. */
export const artists=(index as {artists:RawContentArtist[]}).artists
const raw=import.meta.glob('./pieces/*.{abc,cho}',{query:'?raw',import:'default',eager:true}) as Record<string,string>
export const files:Record<string,string>=Object.fromEntries(Object.entries(raw).map(([path,text])=>[path.split('/').at(-1)!,text]))
