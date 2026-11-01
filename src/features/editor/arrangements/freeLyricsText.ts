export const freeLyricsText = {
  en: {
    source:'Song text with inline chords', preview:'Song sheet preview', chord:'Chord to insert', insert:'Insert chord at cursor', export:'Export ChordPro',
    help:'Write complete lines and verses. Place [C] before a letter, even inside a word: Ri[Am]cordo. Use {c:Verse 1} for a section and blank lines to separate verses.',
    timing:'Line timing (musical beats)', start:'Start beat', end:'End beat', line:'Line',
    hint:'New lines start with four beats; adjust their duration and word timing to the song. Chord positions do not set their musical timing. Export contains text/chords, not word timing.',
    syntax:'Check chord brackets and section syntax; the draft is kept.', invalid:'Check line intervals, word timing and chord positions. Beats must be ordered, within the song limit, and not overlap.',
    convert:'Free song sheet', convertHint:'Switch to lines and verses, preserving the current chords, lyrics and beat timing.',
  },
  it: {
    source:'Testo della canzone con accordi inline', preview:'Anteprima del foglio', chord:'Accordo da inserire', insert:'Inserisci accordo al cursore', export:'Esporta ChordPro',
    help:'Scrivi righe e strofe complete. Inserisci [C] prima di una lettera, anche dentro una parola: Ri[Am]cordo. Usa {c:Strofa 1} per una sezione e righe vuote per separare le strofe.',
    timing:'Durata delle righe (beat musicali)', start:'Beat iniziale', end:'Beat finale', line:'Riga',
    hint:'Le nuove righe partono da quattro beat: adatta durata e timing delle parole al canto. La posizione di un accordo non ne determina il tempo musicale. L’esportazione contiene testo/accordi, non i timing.',
    syntax:'Controlla parentesi degli accordi e sintassi delle sezioni: la bozza è conservata.', invalid:'Controlla intervalli delle righe, timing delle parole e posizioni degli accordi. I beat devono essere ordinati, entro il limite del brano e senza sovrapposizioni.',
    convert:'Foglio libero della canzone', convertHint:'Passa a righe e strofe conservando accordi, testo e timing attuali.',
  },
} as const
