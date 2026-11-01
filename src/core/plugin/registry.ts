import { validateManifest } from './manifest'
import type { PluginModule,PluginType } from './types'

export type PluginStatus = 'disabled' | 'loaded' | 'enabled' | 'error'

export interface RegisteredPlugin {
  mod: PluginModule
  status: PluginStatus
  error?: string
}

/**
 * Registry + validation (manual §4).
 * Lifecycle transitions are driven by AppCore, which owns the PluginContext;
 * this class owns registration, lookup and status.
 */
export class PluginRegistry {
  private map = new Map<string, RegisteredPlugin>()

  /** Register a built-in (or external, later) plugin module. Returns the id. */
  register(mod: PluginModule): string {
    const errors = validateManifest(mod.manifest, [...this.map.keys()])
    this.map.set(mod.manifest.id, {
      mod,
      status: errors.length ? 'error' : 'disabled',
      error: errors.length ? errors.join('; ') : undefined,
    })
    return mod.manifest.id
  }

  get(id: string): RegisteredPlugin | undefined {
    return this.map.get(id)
  }

  list(type?: PluginType): RegisteredPlugin[] {
    const all = [...this.map.values()]
    return type ? all.filter((r) => r.mod.manifest.type === type) : all
  }

  setEnabled(id: string): void {
    const r = this.map.get(id)
    if (r) r.status = 'enabled'
  }

  setLoaded(id: string): void {
    const r = this.map.get(id)
    if (r) r.status = 'loaded'
  }

  setError(id: string, error: string): void {
    const r = this.map.get(id)
    if (r) {
      r.status = 'error'
      r.error = error
    }
  }
}
