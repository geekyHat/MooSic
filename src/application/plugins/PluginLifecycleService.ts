import type { PlaybackController } from '@/application/playback/PlaybackController'
import { SINGLE_ACTIVE_TYPES, type Parser, type PluginManifest, type PluginModule, type PluginType, type ThemePlugin } from '@/core/plugin/types'

export type PluginStatus = 'disabled' | 'loaded' | 'enabled' | 'error'

export interface RegisteredPlugin {
  mod: PluginModule
  status: PluginStatus
  error?: string
}

export interface PluginRegistryPort {
  get(id: string): RegisteredPlugin | undefined
  list(type?: PluginType): RegisteredPlugin[]
  setEnabled(id: string): void
  setLoaded(id: string): void
  setError(id: string, error: string): void
}

type LifecycleContext = Parameters<NonNullable<PluginModule['setup']>>[0]

interface PluginLifecycleDependencies {
  registry: PluginRegistryPort
  enabled: Set<string>
  playback: PlaybackController
  contextFor: (manifest: PluginManifest) => LifecycleContext
  persist: () => void
  changed: () => void
  refreshParsers: () => void
  applyTheme: (tokens: string) => void
  pluginSetChanged: () => void
}

/** Owns plugin activation, deactivation, and single-active-type transitions. */
export class PluginLifecycleService {
  private lifecycleQueue: Promise<void> = Promise.resolve()

  private readonly dependencies: PluginLifecycleDependencies

  constructor(dependencies: PluginLifecycleDependencies) {
    this.dependencies = dependencies
  }

  enablePlugin(id: string): Promise<void> {
    return this.enqueue(() => this.enableNow(id))
  }

  disablePlugin(id: string): Promise<void> {
    return this.enqueue(() => this.disableNow(id))
  }

  isPluginEnabled(id: string): boolean {
    return this.dependencies.enabled.has(id)
  }

  private enqueue(action: () => Promise<void>): Promise<void> {
    const next = this.lifecycleQueue.then(action)
    this.lifecycleQueue = next.catch(() => {})
    return next
  }

  private async enableNow(id: string): Promise<void> {
    const { registry, enabled, playback, contextFor, persist, changed, refreshParsers, applyTheme, pluginSetChanged } = this.dependencies
    const registration = registry.get(id)
    if (!registration) return
    const manifest = registration.mod.manifest

    if (manifest.type === 'transport' || manifest.type === 'instrument') playback.pause()
    if (manifest.type === 'theme') {
      for (const other of registry.list('theme')) {
        if (other.mod.manifest.id !== id && enabled.has(other.mod.manifest.id)) {
          enabled.delete(other.mod.manifest.id)
          registry.setLoaded(other.mod.manifest.id)
        }
      }
      enabled.add(id)
      registry.setEnabled(id)
      applyTheme((registration.mod as unknown as ThemePlugin).tokens)
      persist()
      changed()
      return
    }

    try {
      if (registration.status === 'disabled') {
        await registration.mod.setup?.(contextFor(manifest))
        registry.setLoaded(id)
      }
      if (enabled.has(id)) return

      if (SINGLE_ACTIVE_TYPES.includes(manifest.type)) {
        for (const other of registry.list(manifest.type)) {
          const otherId = other.mod.manifest.id
          if (otherId === id || !enabled.has(otherId)) continue
          try {
            await other.mod.onDisable?.(contextFor(other.mod.manifest))
          } catch (error) {
            console.error(`[core] onDisable(${otherId}) failed:`, error)
          }
          enabled.delete(otherId)
          registry.setLoaded(otherId)
        }
      }

      await registration.mod.onEnable?.(contextFor(manifest))
      enabled.add(id)
      registry.setEnabled(id)
      if (manifest.type === 'parser') {
        const parser = (registration.mod as unknown as { parser?: Parser }).parser
        if (parser) contextFor(manifest).registerParser(parser)
      }
      refreshParsers()
      if (manifest.type === 'parser' || manifest.type === 'content') pluginSetChanged()
      persist()
      changed()
    } catch (error) {
      registry.setError(id, String(error))
      changed()
      console.error(`[core] enable(${id}) failed:`, error)
    }
  }

  private async disableNow(id: string): Promise<void> {
    const { registry, enabled, playback, contextFor, persist, changed, refreshParsers, applyTheme, pluginSetChanged } = this.dependencies
    const registration = registry.get(id)
    if (!registration || !enabled.has(id)) return
    const manifest = registration.mod.manifest

    if (manifest.type === 'transport' || manifest.type === 'instrument') playback.pause()
    try {
      await registration.mod.onDisable?.(contextFor(manifest))
    } catch (error) {
      console.error(`[core] onDisable(${id}) failed:`, error)
    }

    if (manifest.type === 'theme') {
      const fallback = registry.list('theme').find((theme) => theme.mod.manifest.id !== id)
      enabled.delete(id)
      if (fallback) {
        enabled.add(fallback.mod.manifest.id)
        registry.setEnabled(fallback.mod.manifest.id)
        applyTheme((fallback.mod as unknown as ThemePlugin).tokens)
      } else {
        applyTheme('')
      }
    } else {
      enabled.delete(id)
      registry.setLoaded(id)
    }

    refreshParsers()
    if (manifest.type === 'parser' || manifest.type === 'content') pluginSetChanged()
    persist()
    changed()
  }
}
