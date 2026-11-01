import type { Piece } from '../score-model/types'
import { barOfTime } from '../score-model/utils'

export interface BeatInfo {
  beat: number
  bar: number
  beatInBar: number
  /** Piece-time (seconds). */
  time: number
}

export interface ScheduleWindow {
  /** Piece-times covered by the audio lookahead horizon. */
  from: number
  to: number
  /** Convert a piece-time inside the window to an absolute AudioContext time. */
  toAudioTime(t: number): number
}

type EventMap = {
  /** Fired ~40/s while playing, with the current piece-time. */
  frame: (t: number) => void
  /** Fired when the playhead passes a beat. */
  beat: (b: BeatInfo) => void
  /** Fired every tick with the audio horizon window (for precise audio scheduling). */
  'schedule-window': (w: ScheduleWindow) => void
  /** Fired when playback reaches the end (auto-pause). */
  end: () => void
  /** Fired after play()/seek() so renderers can resync. */
  sync: (t: number) => void
}

const TICK_MS = 25
const AHEAD_S = 0.15

/**
 * The single playback clock (manual §5.1).
 * Look-ahead scheduling: a JS timer runs every 25ms and everything audible
 * (metronome clicks etc.) is scheduled on the Web Audio clock up to 150ms
 * ahead, so timing is sample-accurate and drift-free.
 */
export class Scheduler {
  private piece_: Piece | null = null
  private actx: AudioContext | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private playing = false
  private playRequest = 0
  /** AudioContext time corresponding to `startPiece`. */
  private startAudio = 0
  /** Piece-time at the start of the current play segment. */
  private startPiece = 0
  private rate_ = 1
  private pausedAt = 0
  private loop: { from: number; to: number } | null = null
  private lastBeatK = -1
  private subs: { [K in keyof EventMap]: Set<EventMap[K]> } = {
    frame: new Set(),
    beat: new Set(),
    'schedule-window': new Set(),
    end: new Set(),
    sync: new Set(),
  }

  on<K extends keyof EventMap>(event: K, cb: EventMap[K]): () => void {
    this.subs[event].add(cb)
    return () => this.off(event, cb)
  }

  off<K extends keyof EventMap>(event: K, cb: EventMap[K]): void {
    this.subs[event].delete(cb)
  }

  private emit<K extends keyof EventMap>(event: K, ...args: Parameters<EventMap[K]>): void {
    for (const cb of [...this.subs[event]]) {
      try {
        ;(cb as (...a: unknown[]) => void)(...args)
      } catch (e) {
        console.error(`[scheduler] handler for "${event}" threw:`, e)
      }
    }
  }

  /** The shared AudioContext (created on first play). */
  get audioContext(): AudioContext | null {
    return this.actx
  }

  get isPlaying(): boolean {
    return this.playing
  }

  get piece(): Piece | null {
    return this.piece_
  }

  get tempoFactor(): number {
    return this.rate_
  }

  get currentLoop(): { from: number; to: number } | null {
    return this.loop
  }

  setPiece(p: Piece): void {
    this.piece_ = p
    this.pause()
    this.pausedAt = 0
  }

  setLoop(loop: { from: number; to: number } | null): void {
    this.loop = loop && loop.from < loop.to ? loop : null
  }

  setTempoFactor(f: number): void {
    const clamped = Number.isFinite(f) ? Math.min(2, Math.max(0.25, f)) : this.rate_
    if (clamped === this.rate_) return
    const t = this.currentTime
    this.rate_ = clamped
    if (this.playing && this.actx) {
      // Preserve current position across the rate change.
      this.startPiece = t
      this.startAudio = this.actx.currentTime
      this.lastBeatK = Math.floor(t / this.beatLength) - 1
    }
  }

  get beatLength(): number {
    return this.piece ? this.piece.secondsPerBeat : 0.5
  }

  get currentTime(): number {
    if (!this.piece) return 0
    if (this.playing && this.actx) {
      const t = this.startPiece + (this.actx.currentTime - this.startAudio) * this.tempoFactor
      return Math.max(this.startPiece, Math.min(t, this.piece.duration))
    }
    return this.pausedAt
  }

  /** Unlock/create the audio clock before transports prepare their first notes. */
  async prepareAudio(): Promise<void> {
    if (!this.actx) this.actx = new AudioContext()
    const context=this.actx
    if (context.state === 'suspended') await context.resume()
  }

  async play(from?: number): Promise<void> {
    if (!this.piece_) return
    if (this.playing) this.pause()
    const request = ++this.playRequest
    const p = this.piece_
    await this.prepareAudio()
    if (request !== this.playRequest || this.piece_ !== p) return
    const requested = from ?? this.pausedAt
    const inLoop = this.loop && (requested < this.loop.from || requested >= this.loop.to) ? this.loop.from : requested
    const start = Math.max(0, Math.min(inLoop, p.duration))
    if (start >= p.duration - 0.01) return
    const audioContext=this.actx
    if(!audioContext)return
    this.startPiece = start
    this.startAudio = audioContext.currentTime + 0.05
    this.lastBeatK = Math.floor(start / this.beatLength) - 1
    this.playing = true
    this.emit('sync', this.currentTime)
    this.emit('schedule-window', this.window())
    this.timer = setInterval(() => this.tick(), TICK_MS)
  }

  pause(): void {
    this.playRequest++
    if (this.playing) this.pausedAt = this.currentTime
    this.playing = false
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  seek(t: number): void {
    if (!this.piece_) return
    this.pausedAt = Math.max(0, Math.min(t, this.piece_.duration))
    this.lastBeatK = Math.floor(this.pausedAt / this.beatLength) - 1
    if (this.playing && this.actx) {
      this.startPiece = this.pausedAt
      this.startAudio = this.actx.currentTime + 0.05
      this.emit('sync', this.pausedAt)
      this.emit('schedule-window', this.window())
    } else {
      this.emit('sync', this.pausedAt)
    }
  }

  private window(): ScheduleWindow {
    const p = this.piece_!
    const actx = this.actx!
    const to = this.startPiece + ((actx.currentTime + AHEAD_S - this.startAudio) * this.rate_)
    return {
      from: this.currentTime,
      to: Math.min(to, p.duration, this.loop ? this.loop.to - 1e-7 : Infinity),
      toAudioTime: (t: number) => this.startAudio + (t - this.startPiece) / this.rate_,
    }
  }

  private tick(): void {
    if (!this.playing || !this.actx || !this.piece_) return
    const p = this.piece_
    const t = this.currentTime

    // Loop / end handling.
    if (this.loop && t >= this.loop.to) {
      this.startPiece = this.loop.from
      // The timer can observe the boundary late; do not add another fixed
      // 50 ms on every iteration. Keep the loop's audio origin continuous.
      this.startAudio = this.actx.currentTime
      this.lastBeatK = Math.floor(this.loop.from / this.beatLength) - 1
      this.emit('sync', this.loop.from)
    } else if (t >= p.duration) {
      this.pause()
      this.emit('end')
      return
    }

    this.emit('schedule-window', this.window())

    // Beats.
    const beatLen = p.secondsPerBeat
    const beatsPerBar = p.timeSignature.numerator
    const winTo = Math.min(this.startPiece + ((this.actx.currentTime + AHEAD_S - this.startAudio) * this.rate_), p.duration)
    const nowT = this.currentTime
    while (true) {
      const k = this.lastBeatK + 1
      const beatTime = k * beatLen
      if (beatTime > nowT) break
      this.lastBeatK = k
      if (beatTime < nowT - 0.25) continue // advance even when skipping a throttled tick
      if (beatTime <= winTo + beatLen) {
        this.emit('beat', {
          beat: k + 1,
          bar: barOfTime(p, beatTime),
          beatInBar: (k % beatsPerBar) + 1,
          time: beatTime,
        })
      }
      this.lastBeatK = k
    }

    this.emit('frame', this.currentTime)
  }
}
