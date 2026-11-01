import assert from 'node:assert/strict'
import {test} from 'node:test'
import {renderToStaticMarkup} from 'react-dom/server'
import {ChordLyricsLine} from '../../src/shared/ui/ChordLyricsLine.tsx'

test('static lyrics preserve original whitespace and Unicode without karaoke state',()=>{
 for(const text of ['one   two','🎵  mare']){
  const html=renderToStaticMarkup(<ChordLyricsLine text={text} anchors={[{name:'C',offset:0}]}/>)
  assert.equal(html.replace(/<[^>]*>/g,''),'C'+text)
  assert.ok(!html.includes('aria-current'))
 }
})
