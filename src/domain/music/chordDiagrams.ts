import { chordSymbolKey } from './chordSymbol'
import { transposeChord, transposeFingering } from './transpose'

export interface ChordFingering {
  /** Lowest string first. Numbers are absolute frets; zero = open, null = muted. */
  strings: (number | null)[]
  /** Optional first fret displayed in the diagram. */
  baseFret?: number
}

/** ChordPro define: frets are relative to base-fret, while open strings stay open. */
export function chordDefinitions(source: string): ReadonlyMap<string, ChordFingering> {
  const definitions = new Map<string, ChordFingering>()
  let inTab = false
  for (const line of source.split('\n')) {
    if (/^\s*\{(?:start_of_tab|sot)\}\s*$/i.test(line)) { inTab = true; continue }
    if (/^\s*\{(?:end_of_tab|eot)\}\s*$/i.test(line)) { inTab = false; continue }
    if (inTab) continue
    const match = /^\s*\{define(?:\s*:\s*|\s+)([^\s{}]+)\s+([^{}]*)\}\s*$/i.exec(line)
    if (!match) continue
    const key = chordSymbolKey(match[1])
    if (!key) continue
    const fields = match[2].trim().split(/\s+/)
    const baseIndex = fields.findIndex(field => /^base[-_]fret$/i.test(field))
    const base = baseIndex < 0 ? '1' : fields[baseIndex + 1]
    if (!base || !/^\d+$/.test(base)) continue
    const baseFret = Number(base)
    if (baseFret < 1 || baseFret > 36) continue
    const fretsIndex = fields.findIndex(field => /^frets$/i.test(field))
    if (fretsIndex < 0) continue
    const positions: string[] = []
    for (const field of fields.slice(fretsIndex + 1)) {
      if (!/^(?:\d+|x|n|-1|-)$/i.test(field)) break
      positions.push(field)
    }
    if (!positions.length || positions.length > 12) continue
    const strings = positions.map(position => {
      if (/^(?:x|n|-1|-)$/i.test(position)) return null
      const fret = Number(position)
      return fret === 0 ? 0 : fret + baseFret - 1
    })
    if (strings.some(fret => fret !== null && (!Number.isInteger(fret) || fret > 36))) continue
    definitions.set(key, { strings, baseFret })
  }
  return definitions
}

function compatible(shape: ChordFingering | undefined, stringCount: number): shape is ChordFingering {
  return !!shape && shape.strings.length === stringCount
    && shape.strings.some(fret => fret !== null)
    && shape.strings.every(fret => fret === null || Number.isInteger(fret) && fret >= 0 && fret <= 36)
    && (shape.baseFret === undefined || Number.isInteger(shape.baseFret) && shape.baseFret >= 1 && shape.baseFret <= 36)
    && (shape.baseFret === undefined || shape.strings.every(fret => fret === null || fret === 0 || fret >= shape.baseFret!))
}

/** A document's explicit voicing takes precedence over the instrument's catalogue. */
export function chordFingering(name: string, library: Record<string, ChordFingering> | undefined, definitions: ReadonlyMap<string, ChordFingering> | undefined, stringCount: number, preferLibrary = false): ChordFingering | undefined {
  const key = chordSymbolKey(name)
  if (!key) return undefined
  const defined = definitions?.get(key)
  if (!preferLibrary && compatible(defined, stringCount)) return defined
  if (library && Object.hasOwn(library, name) && compatible(library[name], stringCount)) return library[name]
  for (const [alias, shape] of Object.entries(library ?? {})) {
    if (chordSymbolKey(alias) === key && compatible(shape, stringCount)) return shape
  }
  if (compatible(defined, stringCount)) return defined
  return undefined
}

/** All playable, distinct positions, preserving the document/catalogue preference. */
export function chordFingerings(name: string, options: {
  library?: Record<string, ChordFingering>
  voicings?: Record<string, ChordFingering[]>
  definitions?: ReadonlyMap<string, ChordFingering>
  stringCount: number
  maxFret: number
  preferLibrary?: boolean
}): ChordFingering[] {
  const key = chordSymbolKey(name)
  if (!key) return []
  const catalogue: ChordFingering[] = []
  if (options.library && Object.hasOwn(options.library, name)) catalogue.push(options.library[name])
  for (const [alias, shape] of Object.entries(options.library ?? {})) {
    if (alias !== name && chordSymbolKey(alias) === key) catalogue.push(shape)
  }
  if (options.voicings && Object.hasOwn(options.voicings, name)) catalogue.push(...options.voicings[name])
  for (const [alias, shapes] of Object.entries(options.voicings ?? {})) {
    if (alias !== name && chordSymbolKey(alias) === key) catalogue.push(...shapes)
  }
  const defined = options.definitions?.get(key)
  const candidates = options.preferLibrary ? [...catalogue, defined] : [defined, ...catalogue]
  const seen = new Set<string>()
  return candidates.filter((shape): shape is ChordFingering => {
    if (!compatible(shape, options.stringCount) || shape.strings.some(fret => fret !== null && fret > options.maxFret)) return false
    const identity = JSON.stringify(shape.strings)
    if (seen.has(identity)) return false
    seen.add(identity)
    return true
  })
}

/** For a transposed view, custom shapes are fallbacks after easier catalogue shapes. */
export function transposeDefinitions(names: readonly string[], definitions: ReadonlyMap<string, ChordFingering> | undefined, semitones: number, maxFret: number): ReadonlyMap<string, ChordFingering> | undefined {
  if (!definitions || semitones === 0) return definitions
  const shifted = new Map<string, ChordFingering>()
  for (const name of names) {
    const key = chordSymbolKey(name), targetKey = chordSymbolKey(transposeChord(name, semitones))
    if (!key || !targetKey) continue
    const shape = definitions.get(key)
    const moved = shape ? transposeFingering(shape, semitones, maxFret) : undefined
    if (moved) shifted.set(targetKey, moved)
  }
  return shifted
}
