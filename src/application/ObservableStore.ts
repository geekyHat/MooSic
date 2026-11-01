function immutable<T>(value:T,seen=new WeakSet<object>()):T{
 if(value&&typeof value==='object'&&!seen.has(value)&&(Array.isArray(value)||Object.getPrototypeOf(value)===Object.prototype)){
  seen.add(value);for(const item of Object.values(value))immutable(item,seen);Object.freeze(value)
 }
 return value
}
/** Snapshot identity changes only when a new value is published. */
export class ObservableStore<T> {
 private value:T
 private listeners=new Set<()=>void>()
 constructor(initial:T){this.value=immutable(initial)}
 getSnapshot=()=>this.value
 subscribe=(cb:()=>void)=>{this.listeners.add(cb);return ()=>{this.listeners.delete(cb)}}
 protected publish(value:T){if(Object.is(value,this.value))return;this.value=immutable(value);for(const cb of [...this.listeners])cb()}
}
