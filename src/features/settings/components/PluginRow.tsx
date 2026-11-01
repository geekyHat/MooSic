import type { AppCore } from '@/core/plugin/context-impl'
import type { RegisteredPlugin } from '@/core/plugin/registry'
import { Button } from '@/shared/ui/Button'
import { Badge,InlineError } from '@/shared/ui/Panel'
import { useState } from 'react'
import { PluginConfigField } from './PluginConfigField'
export function PluginRow({core,record:r}:{core:AppCore;record:RegisteredPlugin}){
 const [pending,setPending]=useState(false),[error,setError]=useState('')
 const m=r.mod.manifest,enabled=core.isPluginEnabled(m.id),label=enabled?core.t('plugin.enabled'):core.t('plugin.disabled')
 const config={...m.config?.defaults,...core.pluginConfig[m.id]}
 async function toggle(){setPending(true);setError('');try{await(enabled?core.disablePlugin(m.id):core.enablePlugin(m.id))}catch(e){setError(String(e))}finally{setPending(false)}}
 return <div className="mm-plugin-row flex items-start gap-3 border-b border-line py-3"><div className="mm-plugin-info min-w-0 flex-1"><div className="font-semibold">{m.name[core.locale]} <Badge>v{m.version}</Badge></div>{m.description&&<p className="text-sm text-muted">{m.description}</p>}{(r.error||error)&&<InlineError>{r.error||error}</InlineError>}{m.config?.schema&&<div className="mm-config mt-2 flex flex-wrap gap-3 text-sm text-muted">{Object.entries(m.config.schema).map(([key,spec])=><PluginConfigField key={key} name={key} pluginName={m.name[core.locale]} spec={spec} value={config[key]} onChange={value=>{try{core.setConfig(m.id,key,value);setError('')}catch(e){setError(String(e))}}}/>)}</div>}</div><Button pending={pending} aria-pressed={enabled} aria-label={`${m.name[core.locale]}: ${label}`} onClick={()=>void toggle()}>{label}</Button></div>
}
