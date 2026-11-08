/** Standard guitar tuning, ordered from the thickest string to the thinnest. */
export const GUITAR_STRINGS = [
  { number: 6, note: 'E', octave: 2, solfege: 'Mi', frequency: 82.406889 },
  { number: 5, note: 'A', octave: 2, solfege: 'La', frequency: 110 },
  { number: 4, note: 'D', octave: 3, solfege: 'Re', frequency: 146.832384 },
  { number: 3, note: 'G', octave: 3, solfege: 'Sol', frequency: 195.997718 },
  { number: 2, note: 'B', octave: 3, solfege: 'Si', frequency: 246.941651 },
  { number: 1, note: 'E', octave: 4, solfege: 'Mi', frequency: 329.627557 },
] as const
export type GuitarString = typeof GUITAR_STRINGS[number]
export type TuningDirection = 'low' | 'high' | 'tuned'
export const TUNING_TOLERANCE = 10
export const TUNER_RANGE = 250
export const centsBetween = (frequency: number, target: number) => 1200 * Math.log2(frequency / target)
/** A small exit margin prevents flickering at the edge of the green zone. */
export const tuningDirection = (cents: number, previous: TuningDirection | null = null): TuningDirection => Math.abs(cents) <= (previous === 'tuned' ? 14 : TUNING_TOLERANCE) ? 'tuned' : cents < 0 ? 'low' : 'high'
export function closestGuitarString(frequency: number): GuitarString {
  return GUITAR_STRINGS.reduce((best, string) => Math.abs(centsBetween(frequency, string.frequency)) < Math.abs(centsBetween(frequency, best.frequency)) ? string : best)
}

/** Prefer the existing string until another is decisively closer (40 cents
 * beyond the midpoint), so tuning near a boundary cannot alternate targets.
 */
export class AutomaticStringTracker {
  private target: GuitarString | null = null
  update(frequency: number | null): GuitarString | null {
    if (frequency === null) return this.target = null
    const nearest = closestGuitarString(frequency)
    if (!this.target || Math.abs(centsBetween(frequency, this.target.frequency)) - Math.abs(centsBetween(frequency, nearest.frequency)) > 80) this.target = nearest
    return this.target
  }
}

/** YIN cumulative mean normalized difference, with parabolic period refinement.
 * Reuses scratch buffers and downsamples to ~12 kHz to keep microphone analysis
 * inexpensive on phones. Aperiodic sound and quiet input yield no pitch.
 */
export function createPitchDetector(sampleRate: number, frameSize = 4096) {
  const stride = Math.max(1, Math.floor(sampleRate / 12000))
  const rate = sampleRate / stride
  const samples = new Float32Array(Math.floor(frameSize / stride))
  const windowSize = Math.floor(samples.length / 2)
  const maxLag = Math.min(windowSize - 1, Math.ceil(rate / 50) + 1)
  const minLag = Math.max(2, Math.floor(rate / 1000))
  const difference = new Float32Array(maxLag + 1)
  return (input: Float32Array): { frequency: number | null; level: number } => {
    if (input.length < frameSize) return { frequency: null, level: 0 }
    let mean = 0, energy = 0
    for (let i = 0; i < samples.length; i++) {
      let value = 0
      for (let j = 0; j < stride; j++) value += input[i * stride + j]
      samples[i] = value / stride
      mean += samples[i]
    }
    mean /= samples.length
    for (let i = 0; i < samples.length; i++) { samples[i] -= mean; energy += samples[i] ** 2 }
    const level = Math.sqrt(energy / samples.length)
    if (!Number.isFinite(level) || level < 0.004) return { frequency: null, level: Number.isFinite(level) ? level : 0 }
    let sum = 0
    difference[0] = 1
    for (let lag = 1; lag <= maxLag; lag++) {
      let value = 0
      for (let i = 0; i < windowSize; i++) value += (samples[i] - samples[i + lag]) ** 2
      sum += value
      difference[lag] = sum > 0 ? value * lag / sum : 1
    }
    for (let lag = minLag; lag < maxLag; lag++) {
      if (difference[lag] >= 0.15) continue
      while (lag + 1 <= maxLag && difference[lag + 1] < difference[lag]) lag++
      if (lag >= maxLag) break
      const left = difference[lag - 1], center = difference[lag], right = difference[lag + 1]
      const curvature = left - 2 * center + right
      const period = lag + (curvature ? (left - right) / (2 * curvature) : 0)
      const frequency = rate / period
      return { frequency: frequency >= 50 && frequency <= 1000 ? frequency : null, level }
    }
    return { frequency: null, level }
  }
}

/** Median + time-based exponential smoothing in cents. Isolated attacks and
 * octave errors hold the last reading; three consistent frames confirm a real
 * change without gliding through unrelated notes. See docs/TUNER.md for sources.
 */
export class PitchSmoother {
  private history: number[] = []
  private pending: number[] = []
  private lastAccepted = -Infinity
  private lastTime = 0
  private pitch: number | null = null
  update(frequency: number | null, time: number): number | null {
    // Rejected frames must not make the next accepted frame jump faster.
    const elapsed = Math.max(0, Math.min(100, time - this.lastTime))
    this.lastTime = time
    if (time - this.lastAccepted > 450) { this.history = []; this.pitch = null }
    if (frequency === null || !Number.isFinite(frequency) || frequency <= 0) {
      this.pending = []
      return this.value()
    }
    const pitch = 1200 * Math.log2(frequency)
    const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
    if (this.pitch === null || Math.abs(pitch - median(this.history)) > 80) {
      if (this.pending.length && Math.abs(pitch - median(this.pending)) > 45) this.pending = []
      this.pending.push(pitch)
      if (this.pending.length < 3) return this.value()
      this.pitch = median(this.pending)
      this.history = [...this.pending]
    } else {
      this.history.push(pitch)
      if (this.history.length > 5) this.history.shift()
      this.pitch += (median(this.history) - this.pitch) * (1 - Math.exp(-elapsed / 260))
    }
    this.pending = []
    this.lastAccepted = time
    return this.value()
  }
  private value() { return this.pitch === null ? null : 2 ** (this.pitch / 1200) }
}
