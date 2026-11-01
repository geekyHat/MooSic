/** Spatial text fragments from a PDF; coordinates grow rightwards/downwards. */
export interface ScanTextFragment { text: string; x: number; y: number; width: number; height: number }

/** Rebuild visual lines instead of joining PDF text objects in their internal order. */
export function layoutScanText(fragments: ScanTextFragment[]): string {
  const rows: { y: number; height: number; items: ScanTextFragment[] }[] = []
  for (const item of fragments.filter(item => item.text.trim() && [item.x, item.y, item.width, item.height].every(Number.isFinite)).sort((a,b) => a.y-b.y || a.x-b.x)) {
    const row = rows.find(row => Math.abs(row.y-item.y) <= Math.max(2, Math.min(row.height,item.height)*0.35))
    if (row) row.items.push(item)
    else rows.push({y:item.y,height:Math.max(1,item.height),items:[item]})
  }
  return rows.map((row,index) => {
    const items = row.items.sort((a,b) => a.x-b.x)
    let text = '', end = items[0].x
    const characterWidth = Math.max(1, ...items.map(item => item.width / Math.max(1,item.text.length)).filter(width => width > 0))
    for (const item of items) {
      const gap = item.x-end
      if (text && gap > characterWidth*0.25) text += ' '.repeat(Math.min(120,Math.max(1,Math.round(gap/characterWidth))))
      text += item.text
      end = item.x+item.width
    }
    const previous = rows[index-1]
    return (previous && row.y-previous.y > Math.max(previous.height,row.height)*2 ? '\n' : '') + text.trimEnd()
  }).join('\n')
}

/** No chord guessing: OCR corrections use the same explicit [Am] syntax as other imports. */
export function normalizeScanText(text: string): string {
  return text.replace(/\r\n?/g,'\n').replace(/\f/g,'\n\n').replace(/[\x00-\x08\x0b\x0e-\x1f]/g,'').replace(/\u00a0/g,' ').trim()
}
