import { ObservableStore } from '../ObservableStore';
export interface Notification {id:number;level:'info'|'ok'|'error';text:string}
export class NotificationStore extends ObservableStore<readonly Notification[]>{
 private sequence=0
 constructor(){super([])}
 notify(level:Notification['level'],text:string){const id=++this.sequence;this.publish([...this.getSnapshot(),{id,level,text}]);return id}
 dismiss(id:number){this.publish(this.getSnapshot().filter(n=>n.id!==id))}
}
