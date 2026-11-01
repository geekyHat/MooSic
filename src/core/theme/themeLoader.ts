let styleEl: HTMLStyleElement | null = null

/**
 * Apply a theme: themes are pure CSS custom properties (manual §6.6).
 * Injected in a dedicated <style> so switching themes is instant and
 * doesn't require a reload.
 */
export function applyThemeCSS(tokens: string): void {
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'mm-theme'
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = tokens
}
