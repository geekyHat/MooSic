import type { UserArrangement } from '../src/domain/songs/types';
// @ts-expect-error A tab arrangement cannot contain lyrics payload.
const incompatible:UserArrangement={id:'a',name:'A',tempo:100,bars:1,beatsPerBar:4,kind:'tabs',tabNotes:[],chordBars:[]}
// @ts-expect-error Lyrics require their own payload.
const missing:UserArrangement={id:'a',name:'A',tempo:100,bars:1,beatsPerBar:4,kind:'lyrics'}
void incompatible;void missing
