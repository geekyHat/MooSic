import type { PluginType } from '@/core/plugin/types';
export const TYPE_LABELS: Record<PluginType, { en: string; it: string }> = {
  instrument: { en: 'Instruments', it: 'Strumenti' },
  parser: { en: 'Parsers (formats)', it: 'Parser (formati)' },
  renderer: { en: 'Renderers', it: 'Renderer' },
  transport: { en: 'Transports', it: 'Transport' },
  coach: { en: 'Coaches', it: 'Coach' },
  theme: { en: 'Themes', it: 'Temi' },
  content: { en: 'Content', it: 'Contenuto' },
  storage: { en: 'Storage', it: 'Storage' },
}

