export interface PwaSnapshot {
  supported:boolean;installed:boolean;canInstall:boolean;coreReady:boolean;ocrReady:boolean;updateReady:boolean;updating:boolean
  appVersion:string;appBuild:string;availableVersion:string;availableBuild:string;reloadRequired:boolean;updated:boolean;checking:boolean
  downloading:boolean;completed:number;total:number;ocrBytes:number;version:string;error:string;persistent:boolean|null
}
export interface PwaService {
  getSnapshot:()=>PwaSnapshot
  subscribe:(listener:()=>void)=>()=>void
  start:(canUpdate:()=>boolean)=>()=>void
  install:()=>Promise<void>
  prepareOffline:()=>Promise<void>
  checkUpdate:()=>Promise<void>
  applyUpdate:()=>Promise<void>
  protectStorage:()=>Promise<void>
}
