import type { OlgaService } from '@/application/olga/OlgaService'
import type { ScanReader } from '@/application/scan/ScanReader'
import type { PwaService } from '@/application/pwa/PwaService'
import type { BackupService } from '@/application/backup/BackupService'
import type { PeerSyncService } from '@/application/sync/PeerSyncService'
import { buildCatalog } from '@/application/library/buildCatalog'
import { LibraryService } from '@/application/library/LibraryService'
import { artistLinks } from '@/domain/songs/artists'
import { NotificationStore,type Notification } from '@/application/notifications/NotificationStore'
import { PlaybackController } from '@/application/playback/PlaybackController'
import { PluginLifecycleService } from '@/application/plugins/PluginLifecycleService'
import { SettingsService,validateConfig } from '@/application/settings/SettingsService'
import type { SongService } from '@/application/songs/SongService'
import { EventBus } from '../events'
import { I18n,type Locale } from '../i18n'
import { Scheduler } from '../scheduler'
import type { Piece } from '../score-model/types'
import { validatePiece } from '../score-model/utils'
import { applyThemeCSS } from '../theme/themeLoader'
import type { PluginContext } from './context'
import { PluginRegistry } from './registry'
import type {
ArrangementKind,
ContentArtist,
ContentSong,
ContentVersion,
Instrument,
InstrumentPlugin,
Panel,
Parser,
PluginManifest,
PluginModule,
RendererPlugin,
SongMeta,
StorageBackend,
ThemePlugin,
TransportPlugin
} from './types'

export type { Notification } from '@/application/notifications/NotificationStore'

export interface ArrangementItem {
  kind: ArrangementKind
  piece: Piece
}

export interface SongItem {
  meta: SongMeta
  arrangements: ArrangementItem[]
}

/**
 * The non-plugin kernel (manual §1): loader, score model access, clock,
 * shell glue. Everything musical lives in plugins.
 */
export class AppCore {
  scheduler = new Scheduler()
  registry = new PluginRegistry()
  events = new EventBus()
  i18n: I18n
  score: Piece | null = null
  panels: Panel[] = []
  readonly olga?:OlgaService
  readonly scan?:ScanReader
  readonly pwa?:PwaService
  readonly backup?:BackupService
  readonly sync?:PeerSyncService
  private documentRequest=0
  private songService?:SongService
  get songs():SongService {if(!this.songService)throw new Error('SongService must be injected by bootstrap');return this.songService}
  readonly settings:SettingsService
  readonly library = new LibraryService()
  readonly notificationStore = new NotificationStore()
  readonly pluginLifecycle: PluginLifecycleService
  readonly playback = new PlaybackController(this.scheduler, () => {
    const tp = this.activeTransport
    return tp ? { start: () => tp.transport.start(this.ctxFor(tp.manifest)), stop: () => tp.transport.stop() } : null
  })
  get notifications(): readonly Notification[] { return this.notificationStore.getSnapshot() }
  parsers: Parser[] = []
  enabled = new Set<string>()
  /** Per-plugin config overrides (user-set values). */
  get pluginConfig(){return this.settings.getSnapshot().config}
  set pluginConfig(config:Record<string,Record<string,unknown>>){this.settings.update({config})}
  get locale(){return this.settings.getSnapshot().locale}
  set locale(locale:Locale){this.settings.update({locale})}
  /** Bumped whenever the plugin set changes (drives library reload etc.). */
  pluginVersion = 0
  /** Loaded library: artists with their songs and versions. */
  artists: ContentArtist[] = []
  /** Currently opened song (library card selected). */
  currentSongId: string | null = null
  /** Active version within the current song. */
  currentVersionId: string | null = null
  /** Active arrangement kind within the current version. */
  currentArrangement: ArrangementKind = 'tabs'

  private listeners = new Set<() => void>()
  private memoryStorage = new Map<string, unknown>()
  private registeredParsers = new Map<string, Map<string, Parser>>()

  private registerParserForPlugin(owner: string, parser: Parser): void {
    const registrations = this.registeredParsers.get(owner) ?? new Map<string, Parser>()
    registrations.set(parser.id, parser)
    this.registeredParsers.set(owner, registrations)
    this.refreshParsers()
  }

  private refreshParsers(): void {
    const active = new Map<string, Parser>()
    for (const [owner, registrations] of this.registeredParsers) {
      if (!this.enabled.has(owner)) continue
      for (const [id, parser] of registrations) if (!active.has(id)) active.set(id, parser)
    }
    this.parsers = [...active.values()]
  }

  constructor(dependencies?:{olga?:OlgaService;scan?:ScanReader;pwa?:PwaService;backup?:BackupService;sync?:PeerSyncService;songs?:SongService;settings?:SettingsService}) {
    this.olga=dependencies?.olga
    this.scan=dependencies?.scan
    this.pwa=dependencies?.pwa
    this.backup=dependencies?.backup
    this.sync=dependencies?.sync
    this.olga?.onCatalog(()=>{void (async()=>{if(this.registry.get('content-olga'))await this.enablePlugin('content-olga');await this.reloadLibrary()})().catch(error=>this.notify('error',String(error)))})
    this.songService=dependencies?.songs
    this.settings=dependencies?.settings??new SettingsService()
    this.i18n = new I18n('it')
    this.pluginLifecycle = new PluginLifecycleService({
      registry: this.registry,
      enabled: this.enabled,
      playback: this.playback,
      contextFor: manifest => this.ctxFor(manifest),
      persist: () => this.persist(),
      changed: () => this.changed(),
      refreshParsers: () => this.refreshParsers(),
      applyTheme: tokens => applyThemeCSS(tokens),
      pluginSetChanged: () => { this.pluginVersion++ },
    })
    this.notificationStore.subscribe(() => this.changed(false))
    this.library.subscribe(() => {
      const snapshot = this.library.getSnapshot()
      if (snapshot.status !== 'loading') {
        this.artists = snapshot.artists
        this.reconcileSelection()
      }
      this.changed()
    })
    this.songService?.subscribe(() => { void this.refreshUserLibrary() })
  }

  // ---------- React glue ----------

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private revision = 0
  getSnapshot = (): number => this.revision

  private changed(shell = true): void {
    if(shell)this.revision++
    for (const cb of [...this.listeners]) cb()
  }

  // ---------- Persistence ----------

  persist(): void {
    try {this.settings.save({locale:this.locale,theme:this.activeTheme?.manifest.id??'theme-default',enabled:[...this.enabled],config:this.pluginConfig})}
    catch(e){this.notify('error',`Settings could not be saved: ${String(e)}`)}
  }

  // ---------- Storage backend (from the active storage plugin) ----------

  get activeStorageBackend(): StorageBackend {
    for (const r of this.registry.list('storage')) {
      if (this.enabled.has(r.mod.manifest.id)) {
        return (r.mod as unknown as { storage: StorageBackend }).storage
      }
    }
    return {
      get: async (k) => this.memoryStorage.get(k),
      set: async (k, v) => void this.memoryStorage.set(k, v),
      remove: async (k) => void this.memoryStorage.delete(k),
    }
  }

  // ---------- Active plugin accessors ----------

  get instrument(): Instrument | null {
    for (const r of this.registry.list('instrument')) {
      if (this.enabled.has(r.mod.manifest.id)) {
        return (r.mod as unknown as InstrumentPlugin).instrument
      }
    }
    return null
  }

  get activeTheme(): ThemePlugin | null {
    for (const r of this.registry.list('theme')) {
      if (this.enabled.has(r.mod.manifest.id)) return r.mod as unknown as ThemePlugin
    }
    return null
  }

  get activeTransport(): TransportPlugin | null {
    for (const r of this.registry.list('transport')) {
      if (this.enabled.has(r.mod.manifest.id)) return r.mod as unknown as TransportPlugin
    }
    return null
  }

  get enabledRenderers(): RendererPlugin[] {
    return this.registry
      .list('renderer')
      .filter((r) => this.enabled.has(r.mod.manifest.id))
      .map((r) => r.mod as unknown as RendererPlugin)
  }

  get enabledParserIds(): string[] {
    return this.registry
      .list('parser')
      .filter((r) => this.enabled.has(r.mod.manifest.id))
      .map((r) => r.mod.manifest.id)
  }

  /** All enabled content plugins. */
  get enabledContentPlugins(): PluginModule[] {
    return this.registry
      .list('content')
      .filter((r) => this.enabled.has(r.mod.manifest.id))
      .map((r) => r.mod)
  }

  // ---------- Plugin lifecycle (manual §4) ----------

  ctxFor(manifest: PluginManifest): PluginContext {
    const core = this
    return {
      manifest,
      score: {
        get: () => core.score,
        set: (p) => core.setPiece(p),
      },
      scheduler: core.scheduler,
      instrument: () => core.instrument,
      ui: {
        registerPanel: (p: Panel) => {
          core.panels = [...core.panels.filter((x) => x.id !== p.id), p]
          core.changed()
        },
        notify: (level, text) => core.notify(level, text),
      },
      registerParser: (parser: Parser) => {
        core.registerParserForPlugin(manifest.id, parser)
      },
      storage: {get:key=>core.activeStorageBackend.get(key),set:(key,value)=>core.activeStorageBackend.set(key,value),remove:key=>core.activeStorageBackend.remove(key)},
      i18n: core.i18n,
      events: core.events,
      config: () => ({
        ...(manifest.config?.defaults ?? {}),
        ...(core.pluginConfig[manifest.id] ?? {}),
      }),
      configSet: (key: string, value: unknown) => core.setConfig(manifest.id, key, value),
    }
  }

  enablePlugin(id: string): Promise<void> { return this.pluginLifecycle.enablePlugin(id) }
  disablePlugin(id: string): Promise<void> { return this.pluginLifecycle.disablePlugin(id) }
  isPluginEnabled(id: string): boolean { return this.pluginLifecycle.isPluginEnabled(id) }

  // ---------- Settings ----------

  setLocale(locale: Locale): void {
    this.locale = locale
    this.i18n.setLocale(locale)
    this.persist()
    this.changed()
  }

  setConfig(pluginId: string, key: string, value: unknown): void {
    validateConfig(this.registry.get(pluginId)?.mod.manifest.config?.schema??{},key,value)
    this.pluginConfig = {
      ...this.pluginConfig,
      [pluginId]: { ...(this.pluginConfig[pluginId] ?? {}), [key]: value },
    }
    this.persist()
    this.changed()
  }

  notify(level: 'info' | 'ok' | 'error', text: string): void {
    const id = this.notificationStore.notify(level, text)
    setTimeout(() => this.notificationStore.dismiss(id), 4000)
  }

  // ---------- Score ----------

  setPiece(p: Piece): void {
    const errors = validatePiece(p)
    if (errors.length) {
      console.error('[core] invalid piece', p.id, errors)
      this.notify('error', `Invalid piece "${p.title}": ${errors[0]}`)
      return
    }
    this.documentRequest++
    this.playback.reset()
    this.score = p
    this.scheduler.setPiece(p)
    this.changed()
  }

  // ---------- Library ----------

  get currentSong(): ContentSong | null {
    for (const artist of this.artists) {
      const song = artist.songs.find((s) => s.meta.id === this.currentSongId)
      if (song) return song
    }
    return null
  }

  get currentVersion(): ContentVersion | null {
    const song = this.currentSong
    if (!song) return null
    return song.versions.find((v) => v.id === this.currentVersionId) ?? song.versions[0]
  }

  get currentArrangementItem(): ArrangementItem | null {
    const version = this.currentVersion
    if (!version || version.arrangements.length === 0) return null
    return (
      version.arrangements.find((a) => a.kind === this.currentArrangement) ??
      version.arrangements[0]
    )
  }

  /** Open a song's specific version and arrangement. */
  openSong(songId: string, versionId?: string, kind?: ArrangementKind): void {
    const song = this.artists.flatMap((a) => a.songs).find((s) => s.meta.id === songId)
    if (!song || song.versions.length === 0) return
    const version = song.versions.find(v => v.id === versionId) ?? song.versions[0]
    if (version.arrangements.length === 0) return
    this.currentSongId = songId
    this.currentVersionId = version.id
    const selected =
      kind && version.arrangements.some((a) => a.kind === kind)
        ? kind
        : version.arrangements[0].kind
    this.currentArrangement = selected
    const arr = version.arrangements.find((a) => a.kind === selected)
    if (arr) this.selectPiece(arr.piece)
    this.changed()
  }

  private selectPiece(piece:Piece):void {
    this.setPiece(piece)
    const request=this.documentRequest
    if(piece.source?.format==='olga-reference'&&this.olga){
      void this.olga.source(piece.source.text).then(text=>{
        if(request===this.documentRequest)this.setPiece({...piece,source:{format:'olga',text}})
      }).catch(error=>{
        if(request===this.documentRequest)this.setPiece({...piece,source:{format:'olga-error',text:String(error)}})
      })
    }
  }

  /** Switch the active version of the current song. */
  setVersion(versionId: string): void {
    const song = this.currentSong
    if (!song) return
    const version = song.versions.find((v) => v.id === versionId)
    if (!version) return
    this.currentVersionId = versionId
    this.currentArrangement = version.arrangements[0]?.kind ?? 'tabs'
    const arr = version.arrangements.find((a) => a.kind === this.currentArrangement)
    if (arr) this.selectPiece(arr.piece)
    this.changed()
  }

  /** Switch the active arrangement kind within the current version. */
  setArrangement(kind: ArrangementKind): void {
    const version = this.currentVersion
    if (!version) return
    const arr = version.arrangements.find((a) => a.kind === kind)
    if (!arr) return
    this.currentArrangement = kind
    this.scheduler.pause()
    this.stopTransport()
    this.selectPiece(arr.piece)
    this.changed()
  }

  /** Build the library: enabled content plugins × enabled parsers. */
  ensureLibrary(){return this.library.ensure(this.pluginVersion,()=>buildCatalog(this))}
  get artistLinks(){return artistLinks(this.songService?.list() ?? [])}

  async loadLibrary(): Promise<{ artists: ContentArtist[]; errors: string[] }> {
    const result = await this.library.reload(() => buildCatalog(this))
    return { artists: result.artists, errors: result.errors }
  }

  private reconcileSelection(): void {
    if (!this.currentSongId) return
    const arrangement = this.currentArrangementItem
    if (!arrangement) {
      this.playback.reset()
      this.currentSongId = null
      this.currentVersionId = null
      this.score = null
    } else if (this.score !== arrangement.piece && !(arrangement.piece.source?.format==='olga-reference'&&this.score?.id===arrangement.piece.id)) {
      this.selectPiece(arrangement.piece)
    }
  }

  /** Re-run the library build (used after the user saves or removes a song). */
  async reloadLibrary(): Promise<void> {
    await this.loadLibrary()
    // The library.subscribe listener already calls this.changed() after updating
    // this.artists from the snapshot. No need to call it again here.
  }

  /** Saving in the editor makes local repertoire available even with older settings. */
  async refreshUserLibrary(): Promise<void> {
    if (this.registry.get('content-user') && !this.isPluginEnabled('content-user')) {
      await this.enablePlugin('content-user')
    }
    await this.reloadLibrary()
  }

  // ---------- Transport ----------

  async startTransport(): Promise<void> {
    await this.playback.play(this.currentArrangement === 'lyrics')
  }
  stopTransport(): void { this.playback.pause() }

  t = (key: string, vars?: Record<string, string | number>): string =>
    this.i18n.t(key, vars)
}
