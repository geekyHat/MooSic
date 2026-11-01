import type { Instrument } from '@/core/plugin/types'
import type { Piece } from '@/domain/score/types'
import type { Translate } from '../model'
export function PieceSummary({piece,instrument,locale,t}:{piece:Piece;instrument:Instrument;locale:'it'|'en';t:Translate}){
 return <div className="mm-piece-title mb-3 min-w-0"><h2 className="m-0 text-[22px]">{piece.title}</h2><p className="text-sm text-muted">{piece.composer??''} · {piece.timeSignature.numerator}/{piece.timeSignature.denominator} · {piece.bars} {t('practice.bar').toLowerCase()} · {piece.tempo} BPM · {instrument.name[locale]}</p>
   {piece.source&&['tab','chordpro'].includes(piece.source.format)&&<>
     {piece.source.format==='tab'&&<p className="my-2 text-sm text-muted">{locale==='it'?'Ritmo TAB approssimativo: un beat per attacco. Tecniche e indicazioni complete sono nel file originale.':'Approximate TAB rhythm: one beat per onset. Full techniques and instructions are in the original file.'}</p>}
     <details className="my-2 min-w-0"><summary className="cursor-pointer text-sm">{locale==='it'?'File originale importato':'Original imported file'}</summary><pre className="mt-2 max-h-64 max-w-full overflow-auto rounded-lg border border-line p-3 text-xs">{piece.source.text}</pre></details>
   </>}
 </div>
}
