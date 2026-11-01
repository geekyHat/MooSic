import type { Page } from '@playwright/test'
import { deflateSync } from 'node:zlib'

/** Original invented lyrics; no third-party song or document content. */
export const scanLines = ['Title: Morning Study','Artist: Scan Reader','','[C]Morning light across the sea','[Am]A quiet song for you and me']
export const correctedScan = scanLines.join('\n')

export async function scanImage(page: Page, lines = scanLines) {
  return page.evaluate(lines => {
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=900
    const ctx=canvas.getContext('2d')!
    ctx.fillStyle='white';ctx.fillRect(0,0,1200,900);ctx.fillStyle='black';ctx.font='36px monospace'
    lines.forEach((line,index)=>ctx.fillText(line,60,90+index*80))
    const rgba=ctx.getImageData(0,0,1200,900).data,rgb=new Uint8Array(1200*900*3)
    for(let pixel=0;pixel<1200*900;pixel++)rgb.set(rgba.subarray(pixel*4,pixel*4+3),pixel*3)
    let binary=''
    for(let offset=0;offset<rgb.length;offset+=8192)binary+=String.fromCharCode(...rgb.subarray(offset,offset+8192))
    return {png:canvas.toDataURL('image/png').split(',')[1],rgb:btoa(binary)}
  },lines)
}

function buildPdf(objects: Buffer[]) {
  let output=Buffer.from('%PDF-1.4\n')
  const offsets=[0]
  objects.forEach((object,index)=>{
    offsets.push(output.length)
    output=Buffer.concat([output,Buffer.from(`${index+1} 0 obj\n`),object,Buffer.from('\nendobj\n')])
  })
  const xref=output.length
  return Buffer.concat([output,Buffer.from(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)])
}
function stream(content: Buffer, extra = '') {return Buffer.concat([Buffer.from(`<< /Length ${content.length} ${extra} >>\nstream\n`),content,Buffer.from('\nendstream')])}

export function textPdf(pages: string[][] = [scanLines]) {
  const objects=[Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),Buffer.from(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_,index)=>`${4+index*2} 0 R`).join(' ')}] >>`),Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>')]
  for(const [index,lines] of pages.entries()) {
    objects.push(Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5+index*2} 0 R >>`))
    objects.push(stream(Buffer.from(lines.map((line,row)=>`BT /F1 15 Tf 40 ${740-row*35} Td (${line.replace(/[\\()]/g,'\\$&')}) Tj ET`).join('\n'))))
  }
  return buildPdf(objects)
}
export function imagePdf(rgb: string) {
  return buildPdf([
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),Buffer.from('<< /Type /Pages /Count 1 /Kids [3 0 R] >>'),
    Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 450] /Resources << /XObject << /Photo 5 0 R >> >> /Contents 4 0 R >>'),
    stream(Buffer.from('q 600 0 0 450 0 0 cm /Photo Do Q')),
    stream(deflateSync(Buffer.from(rgb,'base64')),'/Type /XObject /Subtype /Image /Width 1200 /Height 900 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode'),
  ])
}
