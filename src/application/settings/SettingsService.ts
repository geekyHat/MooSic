import type { Locale } from '@/core/i18n';
import { ObservableStore } from '../ObservableStore';
export interface SettingsSnapshot {locale:Locale;theme:string;enabled:string[];config:Record<string,Record<string,unknown>>}
export interface SettingsRepository {load():Partial<SettingsSnapshot>;save(value:SettingsSnapshot):void}
export type ConfigSchema=Record<string,{type?:string;min?:number;max?:number;ui?:string}>
export function validateConfig(schema:ConfigSchema,key:string,value:unknown){
 const spec=schema[key];if(!spec)throw new Error(`Unknown configuration: ${key}`)
 if(spec.type==='boolean'&&typeof value!=='boolean'||spec.type==='string'&&typeof value!=='string')throw new Error(`Invalid configuration: ${key}`)
 if(spec.type==='integer'||spec.type==='number'){
  if(typeof value!=='number'||!Number.isFinite(value)||(spec.type==='integer'&&!Number.isInteger(value))||spec.min!==undefined&&value<spec.min||spec.max!==undefined&&value>spec.max)throw new Error(`Invalid configuration: ${key}`)
 }
 if(!['boolean','string','integer','number'].includes(spec.type??''))throw new Error(`Unsupported configuration: ${key}`)
}
export class SettingsService extends ObservableStore<SettingsSnapshot>{
 private repository:SettingsRepository|undefined
 constructor(repository?:SettingsRepository){super({locale:'it',theme:'theme-default',enabled:[],config:{}});this.repository=repository}
 load(){return this.repository?.load()??{}}
 update(value:Partial<SettingsSnapshot>){this.publish({...this.getSnapshot(),...value})}
 save(value:SettingsSnapshot){this.repository?.save(value);this.publish(value)}
}
