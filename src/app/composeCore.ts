import type { OlgaService } from '@/application/olga/OlgaService'
import type { ScanReader } from '@/application/scan/ScanReader'
import type { PwaService } from '@/application/pwa/PwaService'
import type { BackupService } from '@/application/backup/BackupService'
import type { PeerSyncService } from '@/application/sync/PeerSyncService'
import type { SettingsService } from '@/application/settings/SettingsService'
import type { SongService } from '@/application/songs/SongService'
import { I18n,type Locale } from '@/core/i18n'
import { AppCore } from '@/core/plugin/context-impl'
import type { PluginModule } from '@/core/plugin/types'
export const DEFAULT_ENABLED=['instrument-guitar','theme-default','storage-local','parser-abc','renderer-tab','renderer-notation','transport-guitar','content-publicdomain','content-user','content-olga']
/** Testable composition: no UI, browser globals, plugin discovery or storage selection. */
export async function composeCore(plugins:PluginModule[],dependencies:{olga?:OlgaService;scan?:ScanReader;pwa?:PwaService;backup?:BackupService;sync?:PeerSyncService;songs:SongService;settings:SettingsService;language:string;defaults?:string[]}):Promise<AppCore>{
 const core=new AppCore(dependencies)
 for(const plugin of plugins)core.registry.register(plugin)
 const saved=core.settings.load()
 const locale:Locale=saved.locale==='en'||saved.locale==='it'?saved.locale:dependencies.language.toLowerCase().startsWith('it')?'it':'en'
 core.locale=locale;core.i18n=new I18n(locale)
 if(saved.config)core.pluginConfig=saved.config
 const wanted=saved.enabled??dependencies.defaults??DEFAULT_ENABLED
 for(const id of wanted)if(core.registry.get(id))await core.enablePlugin(id)
 // Older saved plugin lists may predate the editor's catalog integration.
 if(dependencies.songs.list().length && core.registry.get('content-user'))await core.enablePlugin('content-user')
 if(dependencies.olga?.entries.length&&core.registry.get('content-olga'))await core.enablePlugin('content-olga')
 for(const [missing,id] of [[!core.instrument,'instrument-guitar'],[!core.activeTransport,'transport-guitar'],[!core.activeTheme,'theme-default']] as const)if(missing&&core.registry.get(id))await core.enablePlugin(id)
 return core
}
