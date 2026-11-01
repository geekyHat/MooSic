import type { ComponentType } from 'react'
import type { NoteEvent,Piece } from '../score-model/types'

/** The core API version. Bumped on breaking changes (see manual §11). */
export const API_VERSION = 1

export type PluginType =
  | 'instrument'
  | 'parser'
  | 'renderer'
  | 'transport'
  | 'coach'
  | 'theme'
  | 'content'
  | 'storage'

export const PLUGIN_TYPES: PluginType[] = [
  'instrument',
  'parser',
  'renderer',
  'transport',
  'coach',
  'theme',
  'content',
  'storage',
]

/** Types where at most one plugin can be active. */
export const SINGLE_ACTIVE_TYPES: PluginType[] = [
  'instrument',
  'transport',
  'coach',
  'theme',
  'storage',
]

export interface PluginManifest {
  id: string
  type: PluginType
  name: { en: string; it: string }
  description?: string
  version: string
  apiVersion: number
  permissions?: string[]
  dependsOn?: string[]
  config?: {
    defaults?: Record<string, unknown>
    schema?: Record<string, { type?: string; min?: number; max?: number; ui?: string }>
  }
}

/** Minimal object a plugin module must export. */
export interface PluginModule {
  manifest: PluginManifest
  setup?(ctx: import('./context').PluginContext): void | Promise<void>
  onEnable?(ctx: import('./context').PluginContext): void | Promise<void>
  onDisable?(ctx: import('./context').PluginContext): void | Promise<void>
}

export interface Panel {
  id: string
  title: { en: string; it: string }
  icon?: string
  component: ComponentType<Record<string, unknown>>
}

export interface Parser {
  id: string
  formats: string[]
  detect(content: string): boolean
  parse(content: string): Promise<Piece>
}

export interface ParseError extends Error {
  line?: number
}

export interface Position {
  fret: number
  string: number
}

export interface Instrument {
  id: string
  name: { en: string; it: string }
  strings: {
    id: number
    label: string
    openMidi: number
    noteName: string
  }[]
  fretCount: number
  /** Positions sorted by fingering preference (best first). [] = out of range. */
  noteToPositions(midi: number): Position[]
  capabilities?: {notes:boolean;chords:boolean;diagrams:boolean}
  /** Frets ordered by string ID, lowest ID first; null = muted. */
  chordLibrary?: Record<string, { strings: (number | 0 | null)[]; baseFret?: number }>
  /** Optional alternate voicings, ordered by preference; same string order as chordLibrary. */
  chordVoicings?: Record<string, { strings: (number | null)[]; baseFret?: number }[]>
  renderHints: {
    lines: number
    /** Top line first. */
    lineLabels: string[]
    showFrets: boolean
  }
  /** Default: open strings. */
  tunerTargets?: { midi: number; label: string }[]
}

export interface RendererHandle {
  /** Called by the app (~40/s while playing, and on seek/play). */
  update(t: number, active: NoteEvent[]): void
  seek(t: number): void
  resize?(): void
  destroy?(): void
}

export interface Renderer {
  id: string
  label: { en: string; it: string }
  render(piece: Piece, instrument: Instrument, target: HTMLElement): RendererHandle
}

export interface Transport {
  id: string
  label: { en: string; it: string }
  start(ctx: import('./context').PluginContext): void | Promise<void>
  stop(): void
}

export interface Coach {
  id: string
  label: { en: string; it: string }
  kind: 'standalone' | 'guided'
  start(ctx: import('./context').PluginContext): Promise<void>
  stop(): void
}

export interface StorageBackend {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
  remove(key: string): Promise<void>
}

/** Category payloads — each plugin module also exposes its payload under this key. */
export interface InstrumentPlugin extends PluginModule {
  instrument: Instrument
}
export interface ParserPlugin extends PluginModule {
  parser: Parser
}
export interface RendererPlugin extends PluginModule {
  renderer: Renderer
}
export interface TransportPlugin extends PluginModule {
  transport: Transport
}
export interface CoachPlugin extends PluginModule {
  coach: Coach
}
export interface ThemePlugin extends PluginModule {
  /** Raw CSS custom properties (tokens.css). */
  tokens: string
}

/** How an arrangement file is meant to be used. */
export type ArrangementKind = 'tabs' | 'lyrics' | 'sheet'

export interface ArtistMeta {
  id: string
  name: string
  country?: string
}

export interface SongMeta {
  id: string
  title: string
  composer?: string
  /** Genre for catalog filtering (e.g. \"folk\", \"classical\", \"pop\"). */
  genre?: string
  difficulty?: string
  tags?: string[]
}

// --- Raw types (as provided by content plugins) ---

export interface RawArrangement {
  kind: ArrangementKind
  file: string
}

export interface RawContentVersion {
  id: string
  name: string
  arrangements: RawArrangement[]
}

export interface RawContentSong {
  meta: SongMeta
  versions: RawContentVersion[]
}

export interface RawContentArtist {
  meta: ArtistMeta
  songs: RawContentSong[]
}

// --- Rich types (processed by the core) ---

export interface ArrangementItem {
  kind: ArrangementKind
  piece: Piece
}

export interface ContentVersion {
  id: string
  name: string
  arrangements: ArrangementItem[]
}

export interface ContentSong {
  meta: SongMeta
  versions: ContentVersion[]
}

export interface ContentArtist {
  meta: ArtistMeta
  songs: ContentSong[]
}

export interface ContentPlugin extends PluginModule {
  /** Catalog: raw artists, each with their raw songs and versions. */
  artists(): Promise<RawContentArtist[]>
  /** Raw content of an arrangement file. */
  file(name: string): string | undefined
  /**
   * Optional: build a Piece directly from an arrangement, bypassing the
   * file+parser flow (used by the user-editor plugin). Return null to fall
   * through to the file+parser flow.
   */
  buildPiece?(arrFile: string): Piece | null | Promise<Piece | null>
}

export interface StoragePlugin extends PluginModule {
  storage: StorageBackend
}
