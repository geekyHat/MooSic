export interface BackupPreview {token:string;createdAt:string;songs:number;documents:number;hasPreferences:boolean}
export interface BackupProgress {completed:number;total:number;phase:'export'|'verify'|'restore'}
export interface RestoreResult {songsAdded:number;songsSkipped:number;documentsAdded:number;documentsSkipped:number}
export interface BackupSummary {createdAt:string;songs:number;documents:number}
export interface BackupOptions {summary?:(value:BackupSummary)=>void;signal:AbortSignal;progress:(value:BackupProgress)=>void}
export interface BackupService {
  readonly busy:boolean
  export:(options:BackupOptions)=>Promise<Blob>
  prepare:(file:File,options:BackupOptions)=>Promise<BackupPreview>
  restore:(token:string,preferences:boolean,options:BackupOptions)=>Promise<RestoreResult>
  discard:()=>void
}
