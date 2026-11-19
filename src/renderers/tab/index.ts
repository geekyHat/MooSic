import type {
Instrument,
Renderer,
RendererHandle,
RendererPlugin,
} from '@/core/plugin/types'
import type { NoteEvent,Piece } from '@/core/score-model/types'
import { barOfTime } from '@/core/score-model/utils'
import manifest from './plugin.json'

const SVG_NS = 'http://www.w3.org/2000/svg'
const LINE_SPACING = 32
const BAR_WIDTH = 150
const MARGIN_L = 44
const TOP_PAD = 18
const LINE_GAP = 34

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v))
  return el
}

/**
 * Tablature renderer (manual §6.3): custom SVG over the Score Model.
 * Note positions come from the active instrument plugin (noteToPositions).
 */
export function renderTabs(
  piece: Piece,
  instrument: Instrument,
  target: HTMLElement,
): RendererHandle {
  target.innerHTML = ''
  const hints = instrument.renderHints
  const nLines = hints.lines

  // Bar width scales with the tightest real note spacing so the note
  // circles never overlap. A 4/4 bar of quarters stays ~118px; a 9/8 bar
  // of eighths (min gap = 1/9 of the bar) widens to fit.
  const notesByBar = new Map<number, NoteEvent[]>()
  for (const n of piece.notes) {
    const arr = notesByBar.get(n.bar) ?? []
    arr.push(n)
    notesByBar.set(n.bar, arr)
  }
  let minGap = 1 // fraction of barLength; 1 = one note fills the bar
  for (const arr of notesByBar.values()) {
    const times = arr.map((n) => n.time).sort((a, b) => a - b)
    for (let i = 1; i < times.length; i++) {
      const g = (times[i] - times[i - 1]) / piece.barLength
      if (g > 0 && g < minGap) minGap = g
    }
  }
  const MIN_PX_GAP = 32 // 26px circle + 6px clearance
  const naturalBarW = Math.max(BAR_WIDTH, Math.ceil(34 + MIN_PX_GAP / minGap))
  const style = getComputedStyle(target)
  const containerW = Math.max(100, (target.clientWidth || 320) - parseFloat(style.paddingLeft || '0') - parseFloat(style.paddingRight || '0'))
  const available = Math.max(48, containerW - MARGIN_L - 12)
  // Continue dense bars across systems, keeping note spacing and font size.
  const partsPerBar = Math.max(1, Math.ceil((naturalBarW - 34) / (available - 34)))
  const barW = 34 + (naturalBarW - 34) / partsPerBar
  const barsPerLine = Math.max(1, Math.floor((containerW - MARGIN_L - 12) / barW))
  const nRows = Math.max(1, Math.ceil(piece.bars * partsPerBar / barsPerLine))
  const rowH = nLines * LINE_SPACING + 8
  const width = MARGIN_L + barsPerLine * barW + 8
  const height = TOP_PAD + nRows * (rowH + LINE_GAP)

  // Fixed text/note sizes; additional systems fit dense music vertically.
  const svg = svgEl('svg', {
    width: width,
    height: height,
    style: 'display:block; font-family: ui-monospace, monospace;',
  })
  target.appendChild(svg)

  const noteEls = new Map<string, SVGGElement>()
  const barX: number[] = [] // x offset per bar (global)
  const barRow: number[] = [] // row per bar

  // Rows: line groups + bar lines + labels
  for (let row = 0; row < nRows; row++) {
    const yTop = TOP_PAD + row * (rowH + LINE_GAP)
    for (let l = 0; l < nLines; l++) {
      const y = yTop + l * LINE_SPACING
      svg.appendChild(
        svgEl('line', {
          x1: MARGIN_L - 6,
          x2: width - 4,
          y1: y,
          y2: y,
          stroke: 'var(--mm-tab-line)',
          'stroke-width': 1.4,
        }),
      )
    }
    // Line labels (left), top line = last string (highest pitch)
    for (let l = 0; l < nLines; l++) {
      const label = hints.lineLabels[l] ?? ''
      const t = svgEl('text', {
        x: MARGIN_L - 16,
        y: yTop + l * LINE_SPACING + 5,
        'font-size': 16,
        'font-weight': 600,
        'text-anchor': 'end',
        fill: 'var(--mm-muted)',
      })
      t.textContent = label
      svg.appendChild(t)
    }
  }

  // Bar lines + numbers + notes
  for (let slot = 0; slot < piece.bars * partsPerBar; slot++) {
    const bar = Math.floor(slot / partsPerBar), part = slot % partsPerBar
    const row = Math.floor(slot / barsPerLine)
    const col = slot % barsPerLine
    const x = MARGIN_L + col * barW
    const yTop = TOP_PAD + row * (rowH + LINE_GAP)
    const yBot = yTop + (nLines - 1) * LINE_SPACING
    barX.push(x)
    barRow.push(row)

    if (slot > 0) {
      svg.appendChild(
        svgEl('line', {
          x1: x - 14,
          x2: x - 14,
          y1: yTop - 4,
          y2: yBot + 4,
          stroke: 'var(--mm-tab-line)',
          'stroke-width': 1.6,
        }),
      )
    }
    const num = svgEl('text', {
      x: x - 8,
      y: yBot + 18,
      'font-size': 13,
      'text-anchor': 'end',
      fill: 'var(--mm-muted)',
    })
    num.textContent = `${bar + 1}${part ? '↳' : ''}`
    svg.appendChild(num)

    // Notes of this bar
    const barStart = bar * piece.barLength
    for (const n of piece.notes) {
      if (n.bar !== bar + 1) continue
      const fraction = Math.min(.999999, Math.max(0, (n.time - barStart) / piece.barLength))
      if (Math.floor(fraction * partsPerBar) !== part) continue
      // Prefer the note's own fingering (user-placed tab) over the pitch-derived one.
      const positions =
        piece.instrumentId === instrument.id && n.string != null && n.fret != null
          ? [{ string: n.string, fret: n.fret }]
          : instrument.noteToPositions(n.pitchMidi)
      const fx = 14 + ((fraction * partsPerBar - part) * (barW - 34))
      const cx = x + fx
      const g = svgEl('g')
      if (positions.length === 0) {
        g.appendChild(
          svgEl('text', {
            x: cx,
            y: yTop + 10,
            'font-size': 11,
            'text-anchor': 'middle',
            fill: 'var(--mm-warn)',
          }),
        )
        const t = g.lastChild as SVGTextElement
        t.textContent = '?'
      } else {
        const pos = positions[0]
        // line index: string id 1 (lowest) = bottom line
        const lineIdx = nLines - pos.string
        const cy = yTop + lineIdx * LINE_SPACING
        g.appendChild(
          svgEl('circle', {
            cx,
            cy,
            r: 13,
            fill: 'var(--mm-panel)',
            stroke: 'var(--mm-tab-ink)',
            'stroke-width': 1.8,
            class: 'mm-tab-note-circle',
          }),
        )
        const t = svgEl('text', {
          x: cx,
          y: cy + 5,
          'font-size': 15,
          'font-weight': 600,
          'text-anchor': 'middle',
          fill: 'var(--mm-tab-ink)',
          class: 'mm-tab-note-text',
        })
        t.textContent = String(pos.fret)
        g.appendChild(t)
      }
      noteEls.set(n.id, g)
      svg.appendChild(g)
    }
  }

  // Playhead
  const playhead = svgEl('line', {
    x1: 0,
    x2: 0,
    y1: 0,
    y2: 0,
    stroke: 'var(--mm-note-active)',
    'stroke-width': 2,
    opacity: 0,
  })
  svg.appendChild(playhead)

  function update(t: number, active: NoteEvent[]): void {
    playhead.setAttribute('opacity', '0.9')
    const activeIds = new Set(active.map((n) => n.id))
    for (const [id, g] of noteEls) {
      g.classList.toggle('mm-tab-note-active', activeIds.has(id))
    }
    const bar = Math.min(piece.bars - 1, Math.max(0, barOfTime(piece, t) - 1))
    const frac = Math.min(.999999, Math.max(0, (t - bar * piece.barLength) / piece.barLength))
    const part = Math.floor(frac * partsPerBar), slot = bar * partsPerBar + part
    const row = barRow[slot]
    const yTop = TOP_PAD + row * (rowH + LINE_GAP)
    const px = barX[slot] + 14 + (frac * partsPerBar - part) * (barW - 34)
    playhead.setAttribute('x1', String(px))
    playhead.setAttribute('x2', String(px))
    playhead.setAttribute('y1', String(yTop - 6))
    playhead.setAttribute('y2', String(yTop + (nLines - 1) * LINE_SPACING + 6))
  }

  return {
    update,
    seek: (t: number) => update(t, []),
    destroy:()=>{target.replaceChildren();noteEls.clear()},
  }
}

const plugin: RendererPlugin = {
  manifest: manifest as RendererPlugin['manifest'],
  renderer: {
    id: 'tab',
    label: { en: 'Tabs', it: 'Tablatura' },
    render: renderTabs,
  } satisfies Renderer,
}

export default plugin
