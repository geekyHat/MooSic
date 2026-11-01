import type { AppCore } from '@/core/plugin/context-impl'
import { makeId } from '@/domain/songs/ids'
import { type UserArrangement,type UserArrKind } from '@/domain/songs/types'
import { useDirtyGuard } from '@/shared/navigation/NavigationGuard'
import { useState } from 'react'
import {legacyToLyricSheet} from '@/domain/songs/lyricSheet'
import {FreeLyricsEditor} from '../arrangements/FreeLyricsEditor'
import {freeLyricsText} from '../arrangements/freeLyricsText'
import { ChordLyricsEditor } from '../arrangements/ChordLyricsEditor'
import { NotationEditor } from '../arrangements/NotationEditor'
import { TabEditor } from '../arrangements/TabEditor'
import { IntroOutroEditor } from '../arrangements/IntroOutroEditor'
import { useArrangementDraft } from '../hooks/useArrangementDraft'
import { composeArrangements } from '../model/arrangementValidation'
import { BTN_GHOST,BTN_PRIMARY,CARD,INPUT,KIND_KEY,KINDS } from '../model/presentation'
import { EditorBlock } from './EditorSection'
export function ArrangementComposer({core,arrangements,editing,onSave,onCancel}:{core:AppCore;arrangements:UserArrangement[];editing:UserArrangement|null;onSave:(added:UserArrangement[])=>boolean|Promise<boolean>;onCancel:()=>void}){const t=core.t;
  const {selectedKinds,setSelectedKinds,tempo,setTempo,bars,setBars,tabNotes,setTabNotes,chordBars,setChordBars,lyricSheet,setLyricSheet,sheetNotes,setSheetNotes,introTabs,setIntroTabs,outroTabs,setOutroTabs,dirty}=useArrangementDraft(editing)
  const maxBars=lyricSheet&&selectedKinds.length===1&&selectedKinds[0]==='lyrics'?256:32
  const [timingValid,setTimingValid]=useState(true)
  useDirtyGuard(dirty)
  const [editingKind,setEditingKind]=useState<UserArrKind|null>(editing?.kind??null)
  const presentKinds = new Set(arrangements.map((a) => a.kind))

  function toggleKind(k: UserArrKind) {
    if (presentKinds.has(k) && editingKind !== k) return
    if(k==='lyrics'&&selectedKinds.includes(k)&&!timingValid){core.notify('error',core.locale==='it'?'Correggi gli errori del testo/timing, oppure usa Annulla prima di chiudere questo editor.':'Fix the lyric/timing errors, or use Cancel before closing this editor.');return}
    if(k!=='lyrics'&&bars>32){core.notify('error',core.locale==='it'?'Le griglie supportano al massimo 32 battute. Riduci prima il foglio.':'Grids support at most 32 bars. Shorten the sheet first.');return}
    setSelectedKinds((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))
  }

  async function addArrangements() {
    if(!timingValid){core.notify('error',t('lyrics.timing'));return}
    if (selectedKinds.length === 0) {
      core.notify('error', t('editor.selectKind'))
      return
    }
    for (const k of selectedKinds) {
      const empty =
        (k === 'tabs' && tabNotes.length === 0) ||
        (k === 'sheet' && sheetNotes.length === 0) ||
        (k === 'lyrics' && !lyricSheet &&
          !Array.from({ length: bars }, (_, i) => chordBars[i] ?? { chord: '', lyric: '' }).some(
            (b) => b.chord.trim() || b.lyric.trim(),
          ))
      if (empty) {
        core.notify('error', t('editor.needContent', { kind: t(KIND_KEY[k]) }))
        return
      }
    }
    let added:UserArrangement[]
    try{added=composeArrangements({kinds:selectedKinds,tempo,bars,tabNotes,sheetNotes,chordBars,lyricSheet,introTabs,outroTabs},kind=>editing?.kind===kind?editing.name:t(KIND_KEY[kind]),kind=>editing?.kind===kind?editing.id:makeId('arr'))}
    catch(e){core.notify('error',String(e));return}
    if (editing?.source) added=added.map(arrangement=>arrangement.kind===editing.kind?{...arrangement,source:editing.source}:arrangement)
    if (!await onSave(added)) return
    setSelectedKinds([])
    setEditingKind(null)
    setTabNotes([])
    setChordBars([])
    setSheetNotes([])
    setLyricSheet(undefined)
    setIntroTabs([])
    setOutroTabs([])
    core.notify('ok', t('editor.added', { n: added.length }))
  }

  function addRow() {
    setBars(prev => {
      const next = prev + 1
      if (next > maxBars) {
        core.notify('error', core.locale === 'it' ? 'Max 32 battute' : 'Max 32 bars')
        return prev
      }
      return next
    })
    setChordBars(prev => [...prev, { chord: '', lyric: '' }])
  }

 return (<>      {/* Add arrangement */}
      <div className={`${CARD} mb-4`}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          {t('editor.addTitle')}
        </h3>

        {/* Type selection */}
        <div className="mb-3 flex flex-wrap gap-2">
          {KINDS.map((k) => {
            const present = presentKinds.has(k) && editingKind !== k
            const on = selectedKinds.includes(k)
            return (
              <button
                key={k}
                type="button"
                disabled={present}
                onClick={() => toggleKind(k)}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed ${
                  present
                    ? 'border-line bg-accent/15 text-accent'
                    : on
                      ? 'border-accent bg-accent/20 font-semibold text-accent'
                      : 'border-line bg-transparent text-ink hover:bg-accent/10'
                }`}
                style={present ? { opacity: 0.75 } : undefined}
              >
                {present ? '✓ ' : on ? '☑ ' : '☐ '}
                {t(KIND_KEY[k])}
              </button>
            )
          })}
        </div>

        {selectedKinds.length > 0 && (
          <div className="space-y-4">
            {/* Shared: tempo + bars */}
            <div className="flex flex-wrap items-end gap-4">
              <label className="block">
                <span className="mb-1 block text-xs text-muted">{t('editor.tempo')}</span>
                <input
                  type="number"
                  min={40}
                  max={240}
                  className={`${INPUT} w-24`}
                  value={tempo}
                  onChange={(e) => setTempo(Number(e.target.value))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted">{t('editor.bars')}</span>
                <input
                  type="number"
                  min={1}
                  max={maxBars}
                  className={`${INPUT} w-24`}
                  value={bars}
                  onChange={(e) => {
                    const next=Number(e.target.value)
                    if(!Number.isInteger(next)||next<1||next>maxBars)return
                    if(lyricSheet?.rows.some(row=>row.kind==='line'&&row.endBeat>next*4)){core.notify('error',core.locale==='it'?'Riduci prima gli intervalli musicali delle righe nel foglio.':'Shorten the line beat intervals in the sheet first.');return}
                    const outside=tabNotes.some(n=>n.beat>=next*4)||sheetNotes.some(n=>n.beat+n.durBeats>next*4)||chordBars.slice(next).some(b=>b&&(b.chord||b.lyric))
                    if(outside&&!window.confirm(core.locale==='it'?'Rimuovere il contenuto oltre la nuova fine?':'Remove content beyond the new end?'))return
                    setTabNotes(notes=>notes.filter(n=>n.beat<next*4));setSheetNotes(notes=>notes.filter(n=>n.beat+n.durBeats<=next*4));setChordBars(rows=>rows.slice(0,next));setBars(next)
                  }}
                />
              </label>
            </div>

            {selectedKinds.includes('tabs') && (
              <EditorBlock title={t(KIND_KEY.tabs)} count={tabNotes.length} t={t}>
                <TabEditor value={tabNotes} onChange={setTabNotes} bars={bars} beatsPerBar={4} t={t} />
              </EditorBlock>
            )}
            {selectedKinds.includes('lyrics') && (
              <EditorBlock title={t(KIND_KEY.lyrics)} count={chordBars.filter((c) => c).length} t={t}>
                {lyricSheet?<FreeLyricsEditor value={lyricSheet} locale={core.locale} maxBeats={maxBars*4} t={t} onValidityChange={setTimingValid} onChange={sheet=>{
                  setLyricSheet(sheet)
                  const needed=Math.ceil(Math.max(0,...sheet.rows.map(row=>row.kind==='line'?row.endBeat:0))/4)
                  if(needed>bars&&needed<=maxBars)setBars(needed)
                }}/>:<>
                  <button type="button" className={`${BTN_GHOST} mb-2`} onClick={()=>{if(!timingValid){core.notify('error',t('lyrics.timing'));return}setLyricSheet(legacyToLyricSheet(chordBars,bars));setTimingValid(true)}}>{freeLyricsText[core.locale].convert}</button>
                  <p className="mb-3 text-sm text-muted">{freeLyricsText[core.locale].convertHint}</p>
                  <ChordLyricsEditor locale={core.locale} value={chordBars} onChange={setChordBars} onValidityChange={setTimingValid} bars={bars} t={t} />
                </>}
                {/* Intro/Outro tabs */}
                {selectedKinds.includes('lyrics') && (
                  <div className="mt-3 rounded-lg border border-accent bg-accent/5 p-3">
                    <span className="mb-3 block text-xs font-semibold text-accent">{t('editor.tabs')}</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted">{t('editor.intro')}</span>
                          <span className="text-xs text-muted">{introTabs.length} {t('editor.notesCount', { n: introTabs.length })}</span>
                        </div>
                        <IntroOutroEditor value={introTabs} onChange={setIntroTabs} label="" t={t} />
                        {introTabs.length > 0 && (
                          <button type="button" className="mt-2 text-xs text-bad hover:text-bold" onClick={() => setIntroTabs([])}>
                            {t('editor.remove')}
                          </button>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted">{t('editor.outro')}</span>
                          <span className="text-xs text-muted">{outroTabs.length} {t('editor.notesCount', { n: outroTabs.length })}</span>
                        </div>
                        <IntroOutroEditor value={outroTabs} onChange={setOutroTabs} label="" t={t} />
                        {outroTabs.length > 0 && (
                          <button type="button" className="mt-2 text-xs text-bad hover:text-bold" onClick={() => setOutroTabs([])}>
                            {t('editor.remove')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </EditorBlock>
            )}
            {selectedKinds.includes('sheet') && (
              <EditorBlock title={t(KIND_KEY.sheet)} count={sheetNotes.length} t={t}>
                <NotationEditor value={sheetNotes} onChange={setSheetNotes} bars={bars} beatsPerBar={4} t={t} />
              </EditorBlock>
            )}

            <button className={BTN_GHOST} onClick={addRow}>
              + {t('editor.addRow')}
            </button>
            <button className={BTN_GHOST} onClick={onCancel}>{t('editor.cancel')}</button>
            <button className={BTN_PRIMARY} onClick={addArrangements}>
              + {t('editor.add')}
            </button>
            <p className="text-xs text-muted">
              {t('editor.arrangementSaveHint')}
            </p>
          </div>
        )}
      </div>

</>)
}
