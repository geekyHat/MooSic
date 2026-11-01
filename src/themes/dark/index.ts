import type { ThemePlugin } from '@/core/plugin/types'
import manifest from './plugin.json'
import tokens from './tokens.css?raw'

const theme: ThemePlugin = {
  manifest: manifest as ThemePlugin['manifest'],
  tokens,
}

export default theme
