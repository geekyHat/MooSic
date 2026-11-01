import type { OlgaEntry,OlgaSource } from '@/domain/olga/catalog'
export interface OlgaRepository {
  list():Promise<OlgaEntry[]>
  stage(batch:string,sources:{key:string;text:string}[]):Promise<void>
  commit(entries:OlgaEntry[],batch:string):Promise<void>
  discard(batch:string):Promise<void>
  source(key:string):Promise<string>
  equalSources(pairs:[string,string][]):Promise<boolean[]>
}
export interface OlgaProgress {bytes:number;total:number;files:number;skipped:number}
export type ReadOlgaZip=(file:Blob,signal:AbortSignal,progress:(p:OlgaProgress)=>void)=>AsyncIterable<OlgaSource[]>
