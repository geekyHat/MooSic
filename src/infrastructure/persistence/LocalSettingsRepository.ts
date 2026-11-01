import type { SettingsRepository,SettingsSnapshot } from '@/application/settings/SettingsService'
import { record } from '@/domain/songs/validation'
export class LocalSettingsRepository implements SettingsRepository{
 load():Partial<SettingsSnapshot>{
  try{
   const value:unknown=JSON.parse(localStorage.getItem('mm:settings')??'{}')
   if(!record(value))return {}
   return {locale:value.locale==='en'||value.locale==='it'?value.locale:undefined,enabled:Array.isArray(value.enabled)?value.enabled.filter((id):id is string=>typeof id==='string'):undefined,config:record(value.config)?Object.fromEntries(Object.entries(value.config).filter(([,v])=>record(v))) as SettingsSnapshot['config']:undefined}
  }catch{return {}}
 }
 save(value:SettingsSnapshot){localStorage.setItem('mm:settings',JSON.stringify(value))}
}
