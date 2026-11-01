/** Recorded pitches actually shipped in public/sounds/guitar. Other notes use
 * the closest recording transposed by an exact equal-tempered semitone ratio. */
const SAMPLES = [40, 43, 45, 47, 48, 50, 52, 55, 56, 57, 59, 60, 62, 64, 65, 66, 67, 69, 71, 72, 76, 79, 81]

export function nearestSample(midi: number): number {
  return SAMPLES.reduce((best, n) => Math.abs(n - midi) < Math.abs(best - midi) ? n : best)
}

export { chordPitches } from '@/domain/music/chords'
