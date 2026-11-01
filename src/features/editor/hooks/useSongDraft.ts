import type { UserSong } from '@/domain/songs/types'
import { useReducer } from 'react'
import { editorReducer,initialDraft,isDirty } from '../model/editorReducer'
export function useSongDraft(song:UserSong){
 const [state,dispatch]=useReducer(editorReducer,song,initialDraft)
 return {song:state.draft,saved:state.saved,dirty:isDirty(state),error:state.error,setSong:(song:UserSong)=>dispatch({type:'edit',song}),markSaved:(song:UserSong)=>dispatch({type:'saved',song}),cancel:()=>dispatch({type:'cancel'}),fail:(error:string)=>dispatch({type:'error',error})}
}
