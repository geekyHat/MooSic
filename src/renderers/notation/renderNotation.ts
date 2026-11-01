import type {
Instrument,
RendererHandle
} from '@/core/plugin/types'
import type { NoteEvent,Piece } from '@/core/score-model/types'
import tunebook from 'abcjs/src/api/abc_tunebook.js'
import renderAbc from 'abcjs/src/api/abc_tunebook_svg.js'
import { scoreToAbc } from './scoreToAbc'

/**
 * Standard-notation renderer (manual §6.3).
 *
 * Uses abcjs renderAbc on the original ABC source. Note: abcjs 6.x
 * `renderAbc` is SYNCHRONOUS — it returns the tune array directly (the
 * Promise typing in the .d.ts is wrong for 6.7.x).
 *
 * Karaoke highlight: abcjs 6.x has no onDrawNote hook, so rendered note
 * elements are matched to model notes by `startChar` — the character offset
 * of the note in the ABC text, shared by the parsed elements (parseOnly)
 * and the rendered elements (tune.getSelectableArray()). For each model
 * note start time we keep the SVG elements to highlight, then highlight the
 * latest start ≤ t.
 */

interface ParsedElement {
  el_type?: string
  type?: string
  duration?: number
  pitches?: unknown[]
  rest?: { type?: string }
  startChar?: number
}

function isBarline(el: ParsedElement): boolean {
  if (el.el_type === 'bar') return true
  const t = el.type ?? ''
  return t.startsWith('bar') || t.startsWith('repeat')
}

interface SelectableNote {
  absEl?: {
    type?: string
    abcelem?: { startChar?: number }
  }
  svgEl: SVGElement
}

export function renderNotation(
  piece: Piece,
  _instrument: Instrument,
  target: HTMLElement,
): RendererHandle {
  target.innerHTML = ''


  const host = document.createElement('div')
  host.style.width = '100%'
  target.appendChild(host)

  const abcText = piece.source?.format === 'abc' ? piece.source.text : scoreToAbc(piece)
  const qpm = piece.tempo
  const wholeNoteSeconds = 240 / qpm

  // note start time (piece seconds) -> SVG elements to highlight.
  const byTime = new Map<number, SVGElement[]>()
  const sortedKeys: number[] = []
  let ready = false

  try {
    const result = renderAbc(host, abcText, {
      responsive: 'resize',
      scale: 1,
    }) as unknown as Array<{
      getSelectableArray?: () => SelectableNote[]
    }> | { getSelectableArray?: () => SelectableNote[] }
    const tune = Array.isArray(result) ? result[0] : result
    if (!tune?.getSelectableArray) throw new Error('no getSelectableArray')

    // startChar -> rendered SVG elements.
    const byChar = new Map<number, SVGElement[]>()
    for (const s of tune.getSelectableArray()) {
      if (s.absEl?.type !== 'note') continue
      const sc = s.absEl.abcelem?.startChar
      if (typeof sc !== 'number') continue
      const arr = byChar.get(sc) ?? []
      if (!arr.includes(s.svgEl)) arr.push(s.svgEl)
      byChar.set(sc, arr)
    }

    // Walk the parsed voice in order to map startChar -> seconds.
    const parsed = tunebook.parseOnly(abcText) as unknown as Array<{
      lines?: { staff?: { voices?: ParsedElement[][] }[] }[]
    }>
    const tune0 = Array.isArray(parsed) ? parsed[0] : (parsed as unknown as {
      lines?: { staff?: { voices?: ParsedElement[][] }[] }[]
    })
    let t = 0
    for (const line of tune0?.lines ?? []) {
      for (const staff of line.staff ?? []) {
        const voice = (staff.voices ?? [])[0]
        if (!voice) continue
        for (const el of voice) {
          if (isBarline(el)) continue
          const dur = typeof el.duration === 'number' ? el.duration : 0
          if (el.pitches && el.pitches.length > 0) {
            if (typeof el.startChar === 'number') {
              const els = byChar.get(el.startChar)
              if (els && !byTime.has(t)) {
                byTime.set(t, els)
                sortedKeys.push(t)
              }
            }
          }
          t += dur * wholeNoteSeconds
        }
      }
    }
    sortedKeys.sort((a, b) => a - b)
    ready = true
  } catch (e) {
    console.error('[notation] render failed:', e)
    host.innerHTML = ''
    const div = document.createElement('div')
    div.className = 'mm-renderer-empty'
    div.textContent = '—'
    host.appendChild(div)
  }

  let currentIndex = -1

  function setHighlight(idx: number): void {
    if (currentIndex >= 0 && currentIndex !== idx) {
      const prev = byTime.get(sortedKeys[currentIndex])
      if (prev) for (const el of prev) el.classList.remove('mm-notation-active')
    }
    currentIndex = idx
    if (idx >= 0) {
      const els = byTime.get(sortedKeys[idx])
      if (els) for (const el of els) el.classList.add('mm-notation-active')
    }
  }

  function update(t: number, _active: NoteEvent[]): void {
    if (!ready || sortedKeys.length === 0) return
    // Latest start time ≤ t.
    let lo = 0
    let hi = sortedKeys.length - 1
    let found = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (sortedKeys[mid] <= t + 1e-6) {
        found = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    if (found !== currentIndex) setHighlight(found)
  }

  return {
    update,
    seek: (t: number) => update(t, []),
    destroy: () => {
      host.innerHTML = ''
    },
  }
}

