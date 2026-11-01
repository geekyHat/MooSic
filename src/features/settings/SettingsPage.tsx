import type { AppCore } from '@/core/plugin/context-impl'
import { PLUGIN_TYPES } from '@/core/plugin/types'
import { Select } from '@/shared/ui/Field'
import { PluginRow } from './components/PluginRow'
import { TYPE_LABELS } from './components/labels'
import { PwaSettings } from './components/PwaSettings'
import { BackupSettings } from './components/BackupSettings'
import { PeerSyncSettings } from './components/PeerSyncSettings'
import { SyncInstallWelcome } from './components/SyncInstallWelcome'
export function SettingsView({core}:{core:AppCore}){
 return <div>{core.sync&&core.pwa&&<SyncInstallWelcome core={core}/>}<section className="mm-settings-section mb-5"><h2 className="mb-2 text-lg">{core.t('settings.language')}</h2><Select label={core.t('settings.language')} value={core.locale} onChange={e=>core.setLocale(e.target.value as 'it'|'en')}><option value="it">Italiano</option><option value="en">English</option></Select></section>{core.pwa&&<PwaSettings core={core}/>}{core.sync&&<PeerSyncSettings core={core}/>}{core.backup&&<BackupSettings core={core}/>}<section className="mm-settings-section"><h2 className="mb-2 text-lg">{core.t('settings.plugins')}</h2>{PLUGIN_TYPES.map(type=>{const plugins=core.registry.list(type);if(!plugins.length&&type!=='coach')return null;return <section key={type} className="mm-settings-section mb-5"><h3 className="mb-2 text-lg">{TYPE_LABELS[type][core.locale]}</h3>{plugins.length?plugins.map(record=><PluginRow key={record.mod.manifest.id} core={core} record={record}/>):<p>—</p>}</section>})}<p className="text-sm text-muted">{core.t('plugin.externals')}</p></section></div>
}
