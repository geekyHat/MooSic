import type { UserArrangement,UserArrKind,UserChordBar,UserSheetNote,UserTabNote } from '@/domain/songs/types'
import { useRef,useState } from 'react'
export function useArrangementDraft(editing:UserArrangement|null){
 const [selectedKinds,setSelectedKinds]=useState<UserArrKind[]>(editing?[editing.kind]:[])
 const [tempo,setTempo]=useState(editing?.tempo??100),[bars,setBars]=useState(editing?.bars??4)
 const [tabNotes,setTabNotes]=useState<UserTabNote[]>(editing?.tabNotes??[])
 const [sheetNotes,setSheetNotes]=useState<UserSheetNote[]>(editing?.sheetNotes??[])
 const [chordBars,setChordBars]=useState<UserChordBar[]>(editing?.chordBars??[])
 const [lyricSheet,setLyricSheet]=useState(editing?.kind==='lyrics'?editing.lyricSheet:undefined)
 const [introTabs,setIntroTabs]=useState<UserTabNote[]>([])
 const [outroTabs,setOutroTabs]=useState<UserTabNote[]>([])
 const value=JSON.stringify({selectedKinds,tempo,bars,tabNotes,sheetNotes,chordBars,lyricSheet,introTabs,outroTabs})
 const initial=useRef(value)
 return {selectedKinds,setSelectedKinds,tempo,setTempo,bars,setBars,tabNotes,setTabNotes,sheetNotes,setSheetNotes,chordBars,setChordBars,lyricSheet,setLyricSheet,introTabs,setIntroTabs,outroTabs,setOutroTabs,dirty:value!==initial.current}
}
