import { useState } from 'react'

export function useTranspose() {
  const [semitones, setSemitones] = useState(0)
  return {
    semitones,
    down: () => setSemitones(value => Math.max(-11, value - 1)),
    up: () => setSemitones(value => Math.min(11, value + 1)),
    reset: () => setSemitones(0),
  }
}
