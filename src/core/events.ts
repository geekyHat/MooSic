type Handler = (...args: never[]) => void

/** Minimal typed-ish pub/sub bus used across the core and by plugins. */
export class EventBus {
  private subs = new Map<string, Set<Handler>>()

  on(event: string, cb: Handler): () => void {
    let set = this.subs.get(event)
    if (!set) {
      set = new Set()
      this.subs.set(event, set)
    }
    set.add(cb)
    return () => this.off(event, cb)
  }

  off(event: string, cb: Handler): void {
    this.subs.get(event)?.delete(cb)
  }

  emit(event: string, ...args: unknown[]): void {
    const set = this.subs.get(event)
    if (!set) return
    for (const cb of [...set]) {
      try {
        ;(cb as (...a: unknown[]) => void)(...args)
      } catch (e) {
        // A broken subscriber must never break the emitter (plugin safety rule).
        console.error(`[events] handler for "${event}" threw:`, e)
      }
    }
  }
}
