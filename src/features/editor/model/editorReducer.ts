import type { UserSong } from '@/domain/songs/types';
export interface SongDraft {saved:UserSong;draft:UserSong;error:string|null}
export type EditorCommand={type:'edit';song:UserSong}|{type:'saved';song:UserSong}|{type:'cancel'}|{type:'error';error:string}
export const initialDraft=(song:UserSong):SongDraft=>({saved:song,draft:song,error:null})
export const isDirty=(state:SongDraft)=>JSON.stringify(state.saved)!==JSON.stringify(state.draft)
export function editorReducer(state:SongDraft,command:EditorCommand):SongDraft{
 switch(command.type){case 'edit':return {...state,draft:command.song};case 'saved':return initialDraft(command.song);case 'cancel':return {...state,draft:state.saved,error:null};case 'error':return {...state,error:command.error}}
}
