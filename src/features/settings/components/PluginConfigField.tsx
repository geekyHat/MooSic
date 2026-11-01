import type { ConfigSchema } from '@/application/settings/SettingsService';
import { fieldStyle } from '@/shared/ui/styles';
import { useId } from 'react';
export function PluginConfigField({name,pluginName,spec,value,onChange}:{name:string;pluginName:string;spec:ConfigSchema[string];value:unknown;onChange:(v:unknown)=>void}){
 const id=useId();const label=`${pluginName}: ${name}`
 if(spec.type==='boolean')return <label htmlFor={id}><input id={id} aria-label={label} type="checkbox" checked={value===true} onChange={e=>onChange(e.target.checked)}/>{name}</label>
 if(spec.type==='integer'||spec.type==='number')return <label htmlFor={id} className="flex flex-wrap items-center gap-1.5">{name}:<input id={id} aria-label={label} type={spec.type==='integer'&&spec.min!==undefined&&spec.max!==undefined?'range':'number'} className={fieldStyle} min={spec.min} max={spec.max} step={spec.type==='integer'?1:'any'} value={typeof value==='number'?value:spec.min??0} onChange={e=>onChange(Number(e.target.value))}/><b>{String(value??'')}</b></label>
 if(spec.type==='string')return <label htmlFor={id}>{name}:<input id={id} aria-label={label} className={fieldStyle} value={typeof value==='string'?value:''} onChange={e=>onChange(e.target.value)}/></label>
 return <span>{name}: —</span>
}
