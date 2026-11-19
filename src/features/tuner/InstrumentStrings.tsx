import type { TuningString } from '@/domain/music/tuner'

/** A simple guitar neck viewed from above, with selectable open strings. */
export function InstrumentStrings({ strings, guitar, active, selected, tuned, it, onSelect }: { strings: readonly TuningString[]; guitar: boolean; active: number | null; selected: number | null; tuned: boolean; it: boolean; onSelect: (number: number) => void }) {
  const half = strings.length / 2
  return <div className="mm-tuner-strings" role="group" aria-label={it ? 'Seleziona una corda' : 'Select a string'}>
    <div className="mm-tuner-strings-heading" aria-hidden="true">
      <span>{guitar ? it ? 'Le sei corde' : 'The six strings' : it ? 'Le quattro corde' : 'The four strings'}<small>{it ? 'Tocca la corda da accordare' : 'Select the string to tune'}</small></span>
    </div>
    <div className="mm-tuner-neck" data-strings={strings.length}>
      <svg className="mm-tuner-neck-drawing" viewBox="0 0 400 360" preserveAspectRatio="none" role="img" aria-label={guitar ? it ? 'Manico di chitarra con sei corde e tasti' : 'Guitar neck with six strings and frets' : it ? 'Manico di ukulele con quattro corde e tasti' : 'Ukulele neck with four strings and frets'}>
        <rect x="130" y="12" width="140" height="336" rx="7" fill="#443c30" stroke="#9b917b" strokeWidth="2"/>
        <rect x="130" y="24" width="140" height="8" rx="2" fill="#e0d7bc"/>
        {[88, 140, 186, 228, 266, 300].map(y => <path key={y} d={`M132 ${y} H268`} stroke="#aaa79b" strokeWidth="2"/>)}
        {[163, 247].map(y => <circle key={y} cx="200" cy={y} r="5" fill="#c7bda5"/>)}
        {strings.map((string, index) => <path key={string.number} d={`M${152 + index * (96 / (strings.length - 1))} 14 V346`} fill="none" stroke={active === string.number ? tuned ? '#55e6bb' : '#efc885' : '#c3c6bd'} strokeWidth={3.5 - index * .5} strokeLinecap="round"/>)}
      </svg>
    {strings.map((string, index) => <button key={string.number} type="button" className="mm-tuner-string"
      style={{ top: `${(0.5 + (index < half ? index : strings.length - 1 - index)) / half * 100}%`, left: index < half ? 0 : 'auto', right: index < half ? 'auto' : 0 }}
      data-active={active === string.number} data-tuned={active === string.number && tuned}
      aria-pressed={selected === string.number} onClick={() => onSelect(string.number)}>
      <span className="sr-only">{it ? 'Corda ' : 'String '}</span>
      <span className="mm-tuner-string-number">{string.number}</span>{' '}
      <span className="mm-tuner-string-note">{string.note}<small>{string.octave}</small></span>{' '}
      <span className="mm-tuner-string-solfege">{it ? string.solfege : guitar && string.number === 6 ? 'low' : guitar && string.number === 1 ? 'high' : '—'}</span>
    </button>)}
    </div>
  </div>
}
