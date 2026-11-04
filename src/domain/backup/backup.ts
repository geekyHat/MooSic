import type { OlgaEntry } from '../olga/catalog'
import type { UserSong } from '../songs/types'
import { isSong, record } from '../songs/validation'
export interface BackupPreferences {locale:'it'|'en';theme:string;enabled:string[];config:Record<string,Record<string,unknown>>}
export interface BackupDocument {entry:OlgaEntry;file:string;sha256:string}
export interface BackupManifest {format:'musicmaestro-backup';version:1;createdAt:string;songs:UserSong[];preferences?:BackupPreferences;documents:BackupDocument[]}
export const BACKUP_LIMITS={compressed:256*1024*1024,expanded:532*1024*1024,manifest:20*1024*1024,document:2*1024*1024,documents:60000,songs:10000}
export class BackupError extends Error {
  readonly code:'format'|'version'|'size'|'corrupt'|'storage'|'busy'|'changed'|'empty'
  constructor(code:BackupError['code']){super(`Backup: ${code}`);this.code=code}
}
export function validPreferences(value:unknown):value is BackupPreferences {
  return record(value)&&(value.locale==='it'||value.locale==='en')&&typeof value.theme==='string'&&value.theme.length<=200
    &&Array.isArray(value.enabled)&&value.enabled.length<=1000&&value.enabled.every(id=>typeof id==='string'&&id.length<=200)
    &&record(value.config)&&Object.keys(value.config).length<=1000&&Object.values(value.config).every(config=>record(config)&&Object.keys(config).length<=1000&&Object.values(config).every(v=>typeof v==='boolean'||typeof v==='string'&&v.length<=10000||typeof v==='number'&&Number.isFinite(v)))
}
export function parseBackupManifest(value:unknown):BackupManifest {
  if(!record(value)||value.format!=='musicmaestro-backup')throw new BackupError('format')
  if(value.version!==1)throw new BackupError('version')
  if(typeof value.createdAt!=='string'||!Number.isFinite(Date.parse(value.createdAt))||!Array.isArray(value.songs)||value.songs.length>BACKUP_LIMITS.songs||!value.songs.every(isSong)||new Set(value.songs.map(song=>song.id)).size!==value.songs.length)throw new BackupError('corrupt')
  if(value.preferences!==undefined&&!validPreferences(value.preferences))throw new BackupError('corrupt')
  if(!Array.isArray(value.documents)||value.documents.length>BACKUP_LIMITS.documents)throw new BackupError('size')
  const ids=new Set<string>(),keys=new Set<string>(),files=new Set<string>()
  for(const item of value.documents){
    if(!record(item)||!record(item.entry)||typeof item.file!=='string'||!/^olga\/\d{6}\.txt$/.test(item.file)||typeof item.sha256!=='string'||!/^[a-f0-9]{64}$/.test(item.sha256))throw new BackupError('corrupt')
    const entry=item.entry
    if(!['id','title','baseTitle','artist','artistFolder','instrument','category','path','format','digest','sourceKey'].every(key=>typeof entry[key]==='string'&&String(entry[key]).length<=4096)||!entry.id||!entry.sourceKey||!entry.title||!entry.artist||ids.has(String(entry.id))||keys.has(String(entry.sourceKey))||files.has(item.file))throw new BackupError('corrupt')
    ids.add(String(entry.id));keys.add(String(entry.sourceKey));files.add(item.file)
  }
  return value as unknown as BackupManifest
}
