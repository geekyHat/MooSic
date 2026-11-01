import { API_VERSION,PLUGIN_TYPES,type PluginManifest } from './types'

/**
 * Validate a plugin manifest (manual §3).
 * @param manifest the manifest to check
 * @param existingIds ids already registered (uniqueness check)
 */
export function validateManifest(
  manifest: PluginManifest,
  existingIds: string[] = [],
): string[] {
  const errors: string[] = []
  if (!manifest || typeof manifest !== 'object') return ['manifest is not an object']
  if (!manifest.id || !/^[a-z0-9][a-z0-9-]*$/.test(manifest.id)) {
    errors.push('invalid id (kebab-case required)')
  } else if (existingIds.includes(manifest.id)) {
    errors.push(`duplicate id "${manifest.id}"`)
  }
  if (!PLUGIN_TYPES.includes(manifest.type)) {
    errors.push(`unknown type "${String(manifest.type)}"`)
  }
  if (!manifest.name || !manifest.name.en) {
    errors.push('missing name.en')
  }
  if (!manifest.version) errors.push('missing version')
  if (
    typeof manifest.apiVersion !== 'number' ||
    (manifest.apiVersion !== API_VERSION && manifest.apiVersion !== API_VERSION - 1)
  ) {
    errors.push(
      `apiVersion ${manifest.apiVersion} incompatible (core is ${API_VERSION}, accepts ${API_VERSION} or ${API_VERSION - 1})`,
    )
  }
  if (
    manifest.config?.schema &&
    manifest.config.defaults &&
    Object.keys(manifest.config.schema).some(
      (k) => !(k in (manifest.config!.defaults ?? {})),
    )
  ) {
    errors.push('config.schema has keys missing from config.defaults')
  }
  return errors
}
