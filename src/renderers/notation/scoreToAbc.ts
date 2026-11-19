import type { Piece } from '@/core/score-model/types'

const PITCHES = ['=C', '^C', '=D', '^D', '=E', '=F', '^F', '=G', '^G', '=A', '^A', '=B']

function pitch(midi: number): string {
  const name = PITCHES[midi % 12]
  const octave = Math.floor(midi / 12) - 5
  return octave > 0
    ? name.toLowerCase() + "'".repeat(octave - 1)
    : name + ','.repeat(-octave)
}

function duration(beats: number): string {
  let numerator = Math.round(beats * 960)
  let denominator = 960
  let a = numerator
  let b = denominator
  while (b) { [a, b] = [b, a % b] }
  numerator /= a
  denominator /= a
  return denominator === 1 ? String(numerator) : `${numerator}/${denominator}`
}

/** Adapt direct Score Model pieces (editor) to abcjs, including rests and polyphony.
 * Original ABC remains authoritative for imported pieces. Split at bar/note
 * boundaries and tie held pitches so durations and the highlight stay aligned.
 */
export function scoreToAbc(piece: Piece, maxTokensPerLine = Infinity): string {
  const clean = (s: string) => s.replace(/[\r\n]/g, ' ')
  const lines = [
    'X:1', `T:${clean(piece.title)}`, `C:${clean(piece.composer ?? '')}`,
    `M:${piece.timeSignature.numerator}/${piece.timeSignature.denominator}`,
    'L:1/4', `Q:1/4=${piece.tempo}`, 'K:C',
  ]
  const bars: string[] = []
  for (let bar = 0; bar < piece.bars; bar++) {
    const from = bar * piece.barLength
    const to = Math.min(piece.duration, from + piece.barLength)
    const notes = piece.notes.filter(n => n.time < to && n.time + n.duration > from)
    const points = Array.from(new Set([from, to, ...notes.flatMap(n => [n.time, n.time + n.duration]).filter(t => t > from && t < to)])).sort((a, b) => a - b)
    const tokens: string[] = []
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i]
      const end = points[i + 1]
      if (end - start < 1e-6) continue
      const active = notes.filter(n => n.time <= start + 1e-6 && n.time + n.duration > start + 1e-6)
      const len = duration((end - start) / piece.secondsPerBeat)
      const pitches = Array.from(new Set(active.map(n => n.pitchMidi))).sort((a, b) => a - b)
      const symbols = pitches.map(midi => pitch(midi) + (active.some(n => n.pitchMidi === midi && n.time + n.duration > end + 1e-6) ? '-' : ''))
      tokens.push(symbols.length === 0 ? `z${len}` : symbols.length === 1 && !symbols[0].endsWith('-') ? `${symbols[0]}${len}` : `[${symbols.join('')}]${len}`)
    }
    const systems = Array.from({ length: Math.ceil(tokens.length / maxTokensPerLine) || 1 }, (_, index) => Number.isFinite(maxTokensPerLine) ? tokens.slice(index * maxTokensPerLine, (index + 1) * maxTokensPerLine).join(' ') : tokens.join(' '))
    bars.push(systems.join('\n') + ' |')
  }
  lines.push(...(Number.isFinite(maxTokensPerLine) ? bars : Array.from({ length: Math.ceil(bars.length / 4) }, (_, i) => bars.slice(i * 4, i * 4 + 4).join(' '))))
  return lines.join('\n')
}
