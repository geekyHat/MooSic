export interface NoteEvent {
  id: string
  /** Seconds from piece start. */
  time: number
  /** Seconds. */
  duration: number
  pitchMidi: number
  /** Optional fingering hint (1 = lowest string). */
  string?: number
  /** Optional fret hint (0 = open). */
  fret?: number
  /** True if part of a chord (several notes sharing the same start time). */
  isChord?: boolean
  /** 1-based bar number. */
  bar: number
}

export interface ChordEvent {
  /** Seconds from piece start when the chord starts sounding. */
  time: number
  /** Chord symbol, e.g. "Am", "C7". */
  name: string
}

export interface LyricLine {
  /** Seconds: when the line starts. */
  time: number
  /** Seconds: when the line ends. */
  endTime: number
  /** Full line text (words joined). */
  text: string
  /** 1-based bar the line belongs to. */
  bar: number
  /** Absolute beat offsets, shared with imported/editor timing. */
  tokens?: { joinNext?:boolean; text: string; startBeat: number; endBeat: number }[]
  timingApproximate?: boolean
  /** Exact visual anchors in text; never inferred from elapsed time. */
  anchors?: {name: string; offset: number; beat?: number}[]
}

export type LyricLayoutRow = {kind: 'line'; id: string; index: number}
  | {kind: 'section'; id: string; title: string}
  | {kind: 'spacer'; id: string}

export interface Piece {
  id: string
  title: string
  composer?: string
  /** Which instrument plugin this piece is written for. */
  instrumentId: string
  /** Quarter-note BPM (display value). */
  tempo: number
  timeSignature: { numerator: number; denominator: number }
  /** Seconds per one "beat unit" note (the denominator's note value). */
  secondsPerBeat: number
  /** Seconds per full bar. */
  barLength: number
  bars: number
  duration: number
  notes: NoteEvent[]
  /** Chord symbols over time, if the source had them (e.g. inline "Am" in ABC). */
  chords?: ChordEvent[]
  /** Lyric lines aligned to the music, if the source had them (w: field in ABC). */
  lyrics?: LyricLine[]
  /** Editorial rows, independent from bar grouping and musical timing. */
  lyricLayout?: LyricLayoutRow[]
  /** Original source, if the parser kept it (e.g. ABC text). */
  source?: { format: string; text: string }
  document?: {instrument:string;path:string;format:string}
  difficulty?: string
  tags?: string[]
}
