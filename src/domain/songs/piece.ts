import { validateArrangement } from './validation'
/**
 * Build a Score-Model Piece from a user arrangement.
 *
 * User songs bypass the ABC file+parser flow (see ContentPlugin.buildPiece):
 * the editor data (notes / chords / lyrics) is mapped directly to the score
 * model, so a placed tab note keeps its exact (string, fret) via the
 * NoteEvent.string / .fret hints (the tab renderer honours them).
 *
 * Time model (4/4 fixed for v1): one beat = one quarter note =
 * 60/tempo seconds. A bar is beatsPerBar beats.
 */
import type { ChordEvent,LyricLine,LyricLayoutRow,NoteEvent,Piece } from '@/domain/score/types'
import type { UserArrangement,UserSong } from './types'

/**
 * Tab grid rows, top (highest) to bottom (lowest) — matches the tab
 * renderer's line order (line 0 = top = string 6 = 'e').
 * string = instrument string id (1 = lowest 'E', 6 = highest 'e').
 */
import { GUITAR_GRID } from '../music/stringPositions'
export { GUITAR_GRID,midiToName } from '../music/stringPositions'

export function buildUserPiece(song: UserSong, arr: UserArrangement): Piece {
  const errors=validateArrangement(arr)
  if(errors.length)throw new Error('Invalid arrangement: '+errors.join('; '))
  const tempo = arr.tempo > 0 ? arr.tempo : 100
  const spb = 60 / tempo
  const beatsPerBar = arr.beatsPerBar || 4
  const barLength = beatsPerBar * spb
  const bars = Math.max(1, arr.bars || 1)

  const notes: NoteEvent[] = []
  const chords: ChordEvent[] = []
  const lyrics: LyricLine[] = []
  const lyricLayout: LyricLayoutRow[] = []
  let seq = 0

  if (arr.kind === 'tabs') {
    for (const tn of arr.tabNotes ?? []) {
      if (tn.beat < 0 || tn.beat >= bars * beatsPerBar) continue
      const g = GUITAR_GRID[tn.row]
      if (!g) continue
      notes.push({
        id: `${seq++}`,
        time: tn.beat * spb,
        duration: spb,
        pitchMidi: g.midi + tn.fret,
        string: g.string,
        fret: tn.fret,
        bar: Math.floor(tn.beat / beatsPerBar) + 1,
      })
    }
  } else if (arr.kind === 'lyrics' && arr.lyricSheet) {
    for (const row of arr.lyricSheet.rows) {
      if (row.kind !== 'line') { lyricLayout.push(row); continue }
      lyricLayout.push({kind: 'line', id: row.id, index: lyrics.length})
      lyrics.push({
        text: row.text,
        time: row.startBeat * spb,
        endTime: row.endBeat * spb,
        bar: Math.floor(row.startBeat / beatsPerBar) + 1,
        anchors: row.chords,
        timingApproximate: row.timingApproximate,
        tokens: row.tokens?.map(token => ({...token, startBeat: row.startBeat + token.startBeat, endBeat: row.startBeat + token.endBeat})),
      })
      for (const chord of row.chords) chords.push({name: chord.name, time: (row.startBeat + (chord.beat ?? 0)) * spb})
    }
    chords.sort((a, b) => a.time - b.time)
  } else if (arr.kind === 'lyrics') {
    // Rhythm scaffold (one quarter note per beat, neutral C4) + chords + lyrics.
    ;(arr.chordBars ?? []).forEach((cb, barIdx) => {
      if (barIdx >= bars) return
      const barStart = barIdx * beatsPerBar
      if (cb.chord.trim()) chords.push({ time: barStart * spb, name: cb.chord.trim() })
      for (let b = 0; b < beatsPerBar; b++) {
        notes.push({
          id: `${seq++}`,
          time: (barStart + b) * spb,
          duration: spb,
          pitchMidi: 60,
          bar: barIdx + 1,
        })
      }
      if (cb.lyric.trim()) {
        lyrics.push({
          time: barStart * spb,
          endTime: (barStart + beatsPerBar) * spb,
          text: cb.lyric.trim(),
          timingApproximate: cb.timingApproximate,
          tokens: cb.tokens?.map(token => ({...token, startBeat: barStart + token.startBeat, endBeat: barStart + token.endBeat})),
          bar: barIdx + 1,
        })
      }
    })
  } else {
    // Standard notation.
    for (const n of arr.sheetNotes ?? []) {
      if (n.beat < 0 || n.beat >= bars * beatsPerBar) continue
      notes.push({
        id: `${seq++}`,
        time: n.beat * spb,
        duration: n.durBeats * spb,
        pitchMidi: n.midi,
        bar: Math.floor(n.beat / beatsPerBar) + 1,
      })
    }
  }

  return {
    id: `user-${song.id}-${arr.id}`,
    title: song.name || 'Untitled',
    source: arr.source,
    composer: song.artist.trim() || undefined,
    instrumentId: 'guitar',
    tempo,
    timeSignature: { numerator: beatsPerBar, denominator: 4 },
    secondsPerBeat: spb,
    barLength,
    bars,
    duration: bars * barLength,
    notes: notes.sort((a, b) => a.time - b.time || a.pitchMidi - b.pitchMidi),
    chords: chords.length > 0 ? chords : undefined,
    lyrics: lyrics.length > 0 ? lyrics : undefined,
    lyricLayout: lyricLayout.length ? lyricLayout : undefined,
    difficulty: song.genre.trim() || undefined,
    tags: song.genre.trim() ? [song.genre.trim()] : undefined,
  }
}
