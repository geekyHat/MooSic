import type { BackupPreview,RestoreResult } from '../backup/BackupService'
export type SyncPhase='idle'|'creating'|'offer'|'answer'|'connecting'|'verify'|'transfer'|'review'|'restoring'|'done'|'error'
export interface PeerSyncSnapshot {
 supported:boolean;phase:SyncPhase;incomingCode:string;outgoingCode:string;shareLink:string;comparison:string
 confirmed:boolean;peerConfirmed:boolean;sent:number;sendTotal:number;received:number;receiveTotal:number
 preview:BackupPreview|null;result:RestoreResult|null;error:string
}
export const initialSync=(supported:boolean,incomingCode=''):PeerSyncSnapshot=>({supported,phase:'idle',incomingCode,outgoingCode:'',shareLink:'',comparison:'',confirmed:false,peerConfirmed:false,sent:0,sendTotal:0,received:0,receiveTotal:0,preview:null,result:null,error:''})
export const activeSync=(phase:SyncPhase)=>!['idle','done','error'].includes(phase)
export interface PeerSyncService {
 readonly busy:boolean
 getSnapshot:()=>PeerSyncSnapshot
 subscribe:(listener:()=>void)=>()=>void
 createOffer:()=>Promise<void>
 acceptCode:(code:string)=>Promise<void>
 confirm:()=>Promise<void>
 restore:()=>Promise<void>
 cancel:()=>void
}
