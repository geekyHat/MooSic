import { useEffect, useState, type RefObject } from 'react'

/** Scroll the supplied reading container using elapsed time, independently of audio. */
export function useAutoscroll(container: RefObject<HTMLElement | null>) {
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(20)

  useEffect(() => {
    const target = container.current
    if (!running || !target) return
    let frame = 0
    let previous: number | undefined
    // Keep sub-pixel progress even on browsers that round scrollTop.
    let position = target.scrollTop
    const oldBehavior = target.style.scrollBehavior
    target.style.scrollBehavior = 'auto'
    const pause = () => setRunning(false)
    const manualTouch = (event: TouchEvent) => {
      if (event.target instanceof Element && event.target.closest('button,input,select,textarea,label,a')) return
      pause()
    }
    const manualScroll = () => { if (Math.abs(target.scrollTop - position) > 1) pause() }
    const visibility = () => { if (document.hidden) pause() }
    const keyboard = (event: KeyboardEvent) => {
      const element = event.target
      if (element instanceof Element && element.closest('input,select,textarea,button,a,[contenteditable="true"]')) return
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) pause()
    }
    const tick = (now: number) => {
      if (document.hidden) { pause(); return }
      const maximum = Math.max(0, target.scrollHeight - target.clientHeight)
      if (previous !== undefined) position += speed * (now - previous) / 1000
      previous = now
      position = Math.min(position, maximum)
      target.scrollTop = position
      if (position >= maximum) { pause(); return }
      frame = requestAnimationFrame(tick)
    }
    target.addEventListener('wheel', pause, { passive: true })
    target.addEventListener('touchstart', manualTouch, { passive: true })
    target.addEventListener('keydown', keyboard)
    target.addEventListener('scroll', manualScroll, { passive: true })
    document.addEventListener('visibilitychange', visibility)
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      target.style.scrollBehavior = oldBehavior
      target.removeEventListener('wheel', pause)
      target.removeEventListener('touchstart', manualTouch)
      target.removeEventListener('keydown', keyboard)
      target.removeEventListener('scroll', manualScroll)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [container, running, speed])

  const restart = () => {
    setRunning(false)
    container.current?.scrollTo({ top: 0, behavior: 'instant' })
  }
  return { running, speed, setSpeed, restart, toggle: () => setRunning(value => !value) }
}
