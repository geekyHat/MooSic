export const MAX_SCAN_BYTES = 25 * 1024 * 1024
export const MAX_SCAN_PAGES = 12
export type ScanLanguage = 'eng' | 'ita'
export interface ScanProgress { phase: 'opening' | 'rendering' | 'loading' | 'recognizing'; page: number; pages: number; progress: number }
export interface ScanPage { text: string; preview: string; method: 'text' | 'ocr' }
export interface ScanResult { pages: ScanPage[]; text: string }
export interface ScanOptions {
  language: ScanLanguage
  rotation: 0 | 90 | 180 | 270
  forceOcr: boolean
  signal: AbortSignal
  onProgress: (progress: ScanProgress) => void
}
/** Replaceable boundary: the library UI never depends on a particular OCR/PDF engine. */
export interface ScanReader { read(file: File, options: ScanOptions): Promise<ScanResult> }
export class ScanError extends Error {
  readonly code: 'format' | 'size' | 'pages' | 'image' | 'password' | 'empty' | 'recognition' | 'timeout'
  constructor(code: ScanError['code']) { super(`Scan: ${code}`); this.code=code }
}
export function scanFileKind(file: Pick<File, 'name' | 'type' | 'size'>): 'pdf' | 'image' {
  if (!file.size || file.size > MAX_SCAN_BYTES) throw new ScanError('size')
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf'
  if (/^image\/(?:jpeg|png|webp)$/.test(file.type) || /\.(?:jpe?g|png|webp)$/i.test(file.name)) return 'image'
  throw new ScanError('format')
}
