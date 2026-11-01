import type { StoragePlugin } from '@/core/plugin/types'
import manifest from './plugin.json'

const PREFIX = 'mm:'

const plugin: StoragePlugin = {
  manifest: manifest as StoragePlugin['manifest'],
  storage: {
    async get(key: string): Promise<unknown> {
      try {
        const raw = localStorage.getItem(PREFIX + key)
        return raw === null ? null : JSON.parse(raw)
      } catch {
        return null
      }
    },
    async set(key: string, value: unknown): Promise<void> {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    },
    async remove(key: string): Promise<void> {
      localStorage.removeItem(PREFIX + key)
    },
  },
}

export default plugin
