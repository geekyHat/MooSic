import type { EventBus } from '../events'
import { I18n } from '../i18n'
import type { Scheduler } from '../scheduler'
import type { Piece } from '../score-model/types'
import type {
Instrument,
Panel,
Parser,
PluginManifest,
StorageBackend,
} from './types'

/**
 * The surface a plugin has on the app (manual §5). Versioned via `apiVersion`
 * in the manifest; built once per app session and shared by all plugins.
 */
export interface PluginContext {
  /** The manifest of the plugin receiving this context. */
  manifest: PluginManifest
  score: {
    get(): Piece | null
    set(p: Piece): void
  }
  scheduler: Scheduler
  /** The active instrument (null if none enabled). */
  instrument(): Instrument | null
  ui: {
    registerPanel(p: Panel): void
    notify(level: 'info' | 'ok' | 'error', text: string): void
  }
  registerParser(parser: Parser): void
  /** Namespaced per plugin id. */
  storage: StorageBackend
  i18n: I18n
  events: EventBus
  /** This plugin's config (manifest defaults + user overrides). */
  config(): Record<string, unknown>
  configSet(key: string, value: unknown): void
}

/** Implementation backed by the AppCore. */
export interface CoreBackedContext extends PluginContext {
  __core: import('./context-impl').AppCore
}
