import type { BackupService, BackupOptions } from './BackupService'
/** Keep ZIP processing outside the initial application bundle. */
export class LazyBackupService implements BackupService {
  busy=false
  private service:Promise<BackupService>|null=null
  private load:()=>Promise<BackupService>
  constructor(load:()=>Promise<BackupService>){this.load=load}
  private async run<T>(action:(service:BackupService)=>Promise<T>){
    if(this.busy)throw new Error('Backup already running')
    this.busy=true
    try{return await action(await (this.service??=this.load().catch(error=>{this.service=null;throw error})))}finally{this.busy=false}
  }
  export=(options:BackupOptions)=>this.run(service=>service.export(options))
  prepare=(file:File,options:BackupOptions)=>this.run(service=>service.prepare(file,options))
  restore=(token:string,preferences:boolean,options:BackupOptions)=>this.run(service=>service.restore(token,preferences,options))
  discard=()=>{void this.service?.then(service=>service.discard()).catch(()=>{})}
}
