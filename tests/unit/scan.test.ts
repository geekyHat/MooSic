import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_SCAN_BYTES, ScanError, scanFileKind } from '../../src/application/scan/ScanReader.ts'
import { layoutScanText, normalizeScanText } from '../../src/domain/songs/scanText.ts'
import { parseSongFile } from '../../src/domain/songs/importSong.ts'

test('scan accepts supported camera/file types and enforces the file bound before reading', () => {
  for (const [name,type,expected] of [['scan.JPG','','image'],['capture','image/jpeg','image'],['song','application/pdf','pdf'],['song.pdf','','pdf'],['song.webp','image/webp','image']]) {
    assert.equal(scanFileKind({name,type,size:100}),expected)
  }
  for (const [name,type,size,code] of [['song.heic','image/heic',100,'format'],['script.svg','image/svg+xml',100,'format'],['song.pdf','application/pdf',0,'size'],['song.jpg','image/jpeg',MAX_SCAN_BYTES+1,'size']] as const) {
    assert.throws(()=>scanFileKind({name,type,size}),(error: unknown)=>error instanceof ScanError && error.code===code)
  }
})

test('PDF fragments are ordered visually, with spaces between words and separated stanzas', () => {
  const fragment = (text:string,x:number,y:number,width=text.length*6,height=12) => ({text,x,y,width,height})
  const items = [fragment('sea',48,60),fragment('[Am]',0,12),fragment('light',48,30),fragment('Morning',0,30),fragment('The',0,60)]
  const copy = structuredClone(items)
  assert.equal(layoutScanText(items),'[Am]\nMorning light\n\nThe     sea')
  assert.deepEqual(items,copy)
  assert.equal(layoutScanText([fragment('ignore',NaN,1)]),'')
})

test('OCR text keeps explicit chords and whitespace without guessing unbracketed musical words', () => {
  const text = normalizeScanText('\u0000  Title: Scan\r\nArtist: Reader\r\n\r\n[C/G]Morning\u00a0light\fAm    F\r\nA day in May\u0007  ')
  assert.equal(text,'Title: Scan\nArtist: Reader\n\n[C/G]Morning light\n\nAm    F\nA day in May')
  const imported = parseSongFile('scan.cho',text)
  const sheet = imported.song.arrangements[0]
  assert.equal(sheet.kind,'lyrics')
  assert.equal(sheet.source?.text,text)
  if (sheet.kind==='lyrics') assert.deepEqual(sheet.lyricSheet?.rows.filter(row=>row.kind==='line').map(row=>({text:row.text,chords:row.chords.map(chord=>chord.name)})),[
    {text:'Morning light',chords:['C/G']},{text:'Am    F',chords:[]},{text:'A day in May',chords:[]},
  ])
})
