export interface LyricToken { joinNext?:boolean; text: string; startBeat: number; endBeat: number }
export type UserArrKind = 'tabs' | 'lyrics' | 'sheet'

/** One note on the tab grid: row (0 = top string 'e'), beat, fret. */
export interface UserTabNote {
  row: number
  beat: number
  fret: number
}

/** One bar of a chords+lyrics arrangement. */
export interface UserChordBar {
  chord: string
  lyric: string
  /** Local beat offsets within this bar; gaps are musical rests. */
  tokens?: LyricToken[]
  timingApproximate?: boolean
}

/** Visual UTF-16 offset in the lyric text, independent from musical timing. */
export interface LyricChordAnchor {
  name: string
  offset: number
  /** Optional local beat. An omitted beat is not inferred from character count. */
  beat?: number
}
export interface UserLyricLine {
  kind: 'line'
  id: string
  text: string
  chords: LyricChordAnchor[]
  /** Absolute musical beat interval; a line may span several bars. */
  startBeat: number
  endBeat: number
  /** Local beat offsets within the line, not character positions. */
  tokens?: LyricToken[]
  timingApproximate?: boolean
}
export type UserLyricRow = UserLyricLine
  | { kind: 'section'; id: string; title: string }
  | { kind: 'spacer'; id: string }
export interface UserLyricSheet { version: 1; rows: UserLyricRow[] }

/** One note in the standard-notation editor. */
export interface UserSheetNote {
  beat: number
  midi: number
  durBeats: number
}

interface ArrangementBase {
  source?: {format: 'tab' | 'chordpro'; text: string}
  id: string
  name: string
  tempo: number
  bars: number
  beatsPerBar: number
}
/** Intro/outro tab notes (before first bar / after last bar). */
export interface UserArrangementIntroOutro {
  introTabs?: UserTabNote[]
  outroTabs?: UserTabNote[]
}
export type UserArrangement = ArrangementBase & (
  | { kind: 'tabs'; tabNotes: UserTabNote[]; chordBars?: never; sheetNotes?: never }
  | { kind: 'lyrics'; chordBars: UserChordBar[]; lyricSheet?: UserLyricSheet; tabNotes?: never; sheetNotes?: never } & UserArrangementIntroOutro
  | { kind: 'sheet'; sheetNotes: UserSheetNote[]; tabNotes?: never; chordBars?: never }
)

export interface UserSong {
  /** Alternate artist names explicitly confirmed during import/merge. */
  artistAliases?: string[]
  id: string
  name: string
  artist: string
  genre: string
  createdAt: number
  arrangements: UserArrangement[]
}
