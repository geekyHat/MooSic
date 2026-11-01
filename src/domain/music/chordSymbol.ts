export interface ChordSymbol {
  name: string
  root: string
  suffix: string
  bass?: string
}
export interface InlineChord {
  start: number
  end: number
  symbol: ChordSymbol
}

/** Recognize explicit chord symbols without depending on an audio/diagram catalogue. */
export function parseChordSymbol(name: string): ChordSymbol | null {
  const match = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(name)
  if (!match) return null
  const suffix = match[2].replace(/^major/i, 'maj').replace(/^maj/i, 'maj').replace(/^minor/i, 'm').replace(/^min/i, 'm').replace(/^M(?=\d|$)/, 'maj')
  if (!/^(?:maj|min|m|M|dim|aug|ø|°|\+|-)?(?:2|4|5|6|7|9|11|13)?(?:(?:sus(?:2|4)?|add(?:2|4|6|9|11|13)|[#b](?:5|9|11|13)))*(?:\((?:[#b]?(?:2|4|5|6|7|9|11|13))(?:,[#b]?(?:2|4|5|6|7|9|11|13))*\))?$/.test(suffix)) return null
  return { name, root: match[1], suffix, ...(match[3] ? { bass: match[3] } : {}) }
}

/** Match spelling aliases without confusing major M7 with minor m7. */
export function chordSymbolKey(name: string): string | null {
  const chord = parseChordSymbol(name)
  if (!chord) return null
  const roots: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const pitch = (root: string) => (roots[root[0]] + (root[1] === '#' ? 1 : root[1] === 'b' ? -1 : 0) + 12) % 12
  return JSON.stringify([pitch(chord.root), chord.suffix === 'maj' ? '' : chord.suffix, chord.bass ? pitch(chord.bass) : null])
}

/** Read only [ChordPro] markers; raw chord rows and unknown text stay untouched. */
export function inlineChords(source: string): InlineChord[] {
  const chords: InlineChord[] = []
  let offset = 0, inTab = false
  for (const line of source.split('\n')) {
    if (/^\s*\{(?:start_of_tab|sot)\}\s*$/i.test(line)) inTab = true
    else if (/^\s*\{(?:end_of_tab|eot)\}\s*$/i.test(line)) inTab = false
    else if (!inTab && !/^\s*(?:\{|#)/.test(line)) {
      for (const match of line.matchAll(/\[([^\[\]\r\n]{1,32})\]/g)) {
        let escapes = 0
        for (let i = match.index - 1; i >= 0 && line[i] === '\\'; i--) escapes++
        if (escapes % 2) continue
        const symbol = parseChordSymbol(match[1])
        if (symbol) chords.push({ start: offset + match.index, end: offset + match.index + match[0].length, symbol })
      }
    }
    offset += line.length + 1
  }
  return chords
}
