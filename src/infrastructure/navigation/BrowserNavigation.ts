import { formatLocation, parseLocation, type AppLocation } from '@/domain/navigation/location'

interface HistoryMark {version:1;index:number;hash:string;scrollTop:number}
interface NavigationEntry {route:AppLocation;index:number;scrollTop:number;revision:number;restore:boolean;action:'push'|'replace'|'pop'}
interface Blocker {isDirty:()=>boolean;request:(action:()=>void,onCancel?:()=>void)=>void}
function mark(value:unknown):HistoryMark|null {
  if(!value || typeof value!=='object' || !('mmNavigation' in value))return null
  const data=value.mmNavigation
  if(!data || typeof data!=='object' || !('version' in data) || data.version!==1 || !('index' in data) || !Number.isSafeInteger(data.index) || Number(data.index)<0 || !('hash' in data) || typeof data.hash!=='string' || !('scrollTop' in data) || typeof data.scrollTop!=='number' || !Number.isFinite(data.scrollTop))return null
  return data as HistoryMark
}

/** Browser adapter: restores a blocked traversal before asking about unsaved work. */
export class BrowserNavigation {
  private listeners = new Set<()=>void>()
  private current: NavigationEntry
  private snapshot: NavigationEntry
  private phase: 'idle' | 'restoring' | 'blocked' | 'replaying' = 'idle'
  private pending: {entry:NavigationEntry;delta:number} | null = null
  private scrollTimer: ReturnType<typeof setTimeout> | null = null
  private scrollPositions = new Map<number,number>()
  private browser: Window
  private blocker: Blocker
  constructor(browser: Window, blocker: Blocker) {
    this.browser=browser;this.blocker=blocker
    const saved=mark(browser.history.state)
    this.current={route:parseLocation(browser.location.hash),index:saved?.index??0,scrollTop:saved?.scrollTop??0,revision:0,restore:true,action:'pop'}
    this.snapshot=this.current
  }
  getSnapshot = () => this.snapshot
  subscribe = (listener:()=>void) => {this.listeners.add(listener);return ()=>{this.listeners.delete(listener)}}
  start() {
    // Bootstrap/lazy loading may finish after an address-bar hash change.
    const actual=parseLocation(this.browser.location.hash)
    if(formatLocation(actual)!==formatLocation(this.current.route))this.publish({...this.current,route:actual,revision:this.snapshot.revision+1})
    this.write('replace')
    const previous=this.browser.history.scrollRestoration
    this.browser.history.scrollRestoration='manual'
    this.browser.addEventListener('popstate',this.pop)
    return () => {this.browser.removeEventListener('popstate',this.pop);this.browser.history.scrollRestoration=previous;if(this.scrollTimer)clearTimeout(this.scrollTimer);this.scrollTimer=null}
  }
  private write(mode:'push'|'replace') {
    const hash=formatLocation(this.current.route)
    const state={...this.browser.history.state,mmNavigation:{version:1,index:this.current.index,hash,scrollTop:this.current.scrollTop}}
    this.browser.history[mode==='push'?'pushState':'replaceState'](state,'',hash)
  }
  private publish(entry: NavigationEntry) {
    this.current=entry;this.snapshot=entry
    for(const listener of this.listeners)listener()
  }
  captureScroll = (scrollTop:number) => {
    if(this.phase!=='idle' || !Number.isFinite(scrollTop))return
    this.current={...this.current,scrollTop:Math.max(0,scrollTop)}
    this.scrollPositions.set(this.current.index,this.current.scrollTop)
    // Continuous autoscroll must not flood the browser's History API (notably Safari).
    if(!this.scrollTimer)this.scrollTimer=setTimeout(()=>{this.scrollTimer=null;if(this.phase==='idle')this.write('replace')},1000)
  }
  navigate = (route:AppLocation,options:{replace?:boolean;preserveScroll?:boolean}={}) => {
    if(this.phase!=='idle' || formatLocation(route)===formatLocation(this.current.route))return
    if(this.scrollTimer)clearTimeout(this.scrollTimer);this.scrollTimer=null
    this.write('replace')
    const entry:NavigationEntry={route,index:this.current.index+(options.replace?0:1),scrollTop:options.preserveScroll?this.current.scrollTop:0,revision:this.snapshot.revision+1,restore:!!options.preserveScroll,action:options.replace?'replace':'push'}
    this.current=entry;this.write(options.replace?'replace':'push');this.publish(entry)
    this.scrollPositions.set(entry.index,entry.scrollTop)
  }
  back = () => {
    if (this.phase !== 'idle') return
    if (this.current.index > 0) this.browser.history.back()
    else this.navigate({ ...this.current.route, view: 'library' }, { replace: true })
  }
  private pop = () => {
    const saved=mark(this.browser.history.state)
    const index=saved?.index??this.current.index+1
    const target: NavigationEntry={route:parseLocation(this.browser.location.hash),index,scrollTop:this.scrollPositions.get(index)??saved?.scrollTop??0,revision:this.snapshot.revision+1,restore:true,action:'pop'}
    if(this.phase==='restoring') {
      if(target.index!==this.current.index){this.browser.history.go(this.current.index-target.index);return}
      const pending=this.pending!
      this.phase='blocked'
      this.blocker.request(()=>{this.phase='replaying';this.browser.history.go(-pending.delta)},()=>{this.phase='idle';this.pending=null})
      return
    }
    if(this.phase==='blocked') {
      // Repeated Back/Forward while the confirmation is open must keep the draft's URL.
      const delta=this.current.index-target.index
      if(delta){this.phase='restoring';this.browser.history.go(delta)}
      return
    }
    if(this.phase==='replaying') {this.phase='idle';this.pending=null;this.publish(target);return}
    const delta=this.current.index-target.index
    if(delta && this.blocker.isDirty()) {
      this.pending={entry:target,delta};this.phase='restoring';this.browser.history.go(delta)
      return
    }
    this.publish(target)
    if(!saved)this.write('replace')
  }
}
