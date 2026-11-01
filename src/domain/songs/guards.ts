export function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
export const finiteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
export const integer = (value: unknown, low: number, high: number): value is number =>
  finiteNumber(value) && Number.isInteger(value) && value >= low && value <= high
