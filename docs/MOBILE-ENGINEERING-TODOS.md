# Mobile song reading and tuner engineering todos

Recorded: 2026-11-19. Status: engineering implementation completed; automated verification recorded below. Physical-device release checks remain open.

User-reported problems:

1. Imported songs require horizontal scrolling on mobile.
2. The tuner supports guitar only; it must support guitar and ukulele.
3. Opening the tuner should give it the full screen on mobile.

The baseline findings below describe source inspection before implementation, not a reproduction on the user’s phone. Completed tasks are checked; physical-device checks are tracked separately at the end.

## MOB-01 — Make imported songs readable without horizontal scrolling

Priority: P1. Outcome: the default mobile reading view fits the available width, preserves musical meaning, and scrolls vertically.

### Current implementation and likely causes

- `src/features/practice/PracticePage.tsx`: `OlgaDocument` renders the entire source inside a `<pre>` with `whiteSpace: 'pre'`, `tabSize: 8`, and `overflow-x-auto`. Long imported lines deliberately remain wider than the reader.
- The same file gives the tab/notation renderer body `overflow-x-auto`.
- `src/renderers/tab/index.ts`: bars wrap into rows, but a dense single bar can exceed the available width. Its SVG has a fixed pixel width; a comment explicitly describes horizontal scrolling as the fallback.
- `src/features/practice/hooks/useScoreRenderer.ts` already observes container width and rerenders; build on that lifecycle rather than adding competing resize listeners.
- `src/shared/ui/ChordLyricsLine.tsx` and `src/features/practice/components/ChordSheet.tsx` provide existing structured lyrics paths. Their wrapping and chord anchors need regression coverage alongside raw OLGA documents.
- `tests/responsive.spec.ts` checks document/main overflow, but a nested scrolling `<pre>` can pass those assertions while still requiring sideways scrolling. Existing import tests mostly check import controls rather than long imported reading content.

### Engineering tasks

- [x] **MOB-01.1: Capture failing cases through the actual import flow.** Include an OLGA ZIP with long prose, inline ChordPro chords, chord-over-lyric lines, and ASCII TAB; a directly imported ChordPro song; and an ABC score with dense notation. Reopen persisted imports after reload. Record which reader and element overflow for each fixture.
- [x] **MOB-01.2: Introduce a presentation-only responsive document layout.** Keep stored source bytes, source offsets, export content, and import deduplication unchanged. Derive display blocks with stable source ranges for prose, inline chords, aligned chord/lyric pairs, and TAB. Preserve headings, blank lines, and source order.
- [x] **MOB-01.3: Reflow text and chord/lyric content.** Wrap prose and inline chords at natural boundaries. For aligned chord/lyric pairs, derive chord anchors and wrap them together so a chord stays attached to its intended lyric position. Handle tabs, long unbroken words, Unicode, chord-only lines, and multiple chords at the same anchor. Use the existing chord parsing/transposition helpers; avoid inventing chords from ordinary headings or text.
- [x] **MOB-01.4: Reflow ASCII TAB as a synchronized block.** Wrap all string rows at the same source column, preferably at a shared bar boundary; repeat string labels and visibly mark continuations. For a bar wider than the viewport, split at safe token boundaries without separating multi-digit frets, slides, hammer-ons, or other connected notation. Keep annotations attached to the appropriate segment. Define and test conservative handling of irregular blocks instead of applying arbitrary line wrapping to each string independently.
- [x] **MOB-01.5: Fit generated TAB and notation.** Measure usable content width after padding, and make renderer layout use it consistently. Handle a dense single bar with readable continuation segments rather than a minimum width larger than the viewport. For notation, evaluate line/system breaking with the installed renderer. Preserve event mappings and renderer cleanup when resizing. Do not achieve fitting by shrinking music to unreadable sizes.
- [x] **MOB-01.6: Audit surrounding layout.** Make title/artist metadata, arrangement/display selectors, transpose controls, chord diagrams, and toolbars wrap within the reader. Apply `min-width: 0` where flex/grid children need it. Keep comfortable text sizing and touch targets. Do not conceal missing content with a blanket `overflow-x: hidden` fix.
- [x] **MOB-01.7: Preserve reading interactions.** Verify transpose, chord diagrams, vertical autoscroll, orientation changes, navigation scroll restoration, and returning to the song after visiting the tuner. Continue using the intended vertical scroll container; avoid nested vertical readers that break autoscroll.
- [x] **MOB-01.8: Update reader copy and regression tests.** Replace the promise that all OLGA text retains its original visual layout when the responsive view is active. If an optional original-layout view is retained, label it explicitly and keep responsive reading as the mobile default. Original layout must not be required to access omitted music.

### Acceptance criteria and verification

- At 320, 360, 375, 390, and 430 CSS-pixel portrait widths, every fixture is readable from beginning to end without horizontal panning in the default view. Also check 667×375 landscape, 768px tablet, and 1280px desktop.
- Assert `scrollWidth <= clientWidth + 1` on the document, `main`, the song reader, and relevant nested content containers. Inspect content bounds and screenshots too: clipping or hidden overflow must not make these assertions pass falsely.
- Lyrics remain complete and in order; chords remain attached to the correct text; TAB strings and timing columns stay aligned across continuations; no fret token or notation event disappears.
- Verify English/Italian, both themes, increased text size, rotation, and a long song while autoscrolling. Larger text may add vertical scrolling without losing controls or content.
- Persisted source and exported source match their pre-layout values. Existing imported libraries work without reimporting.
- Extend `tests/olga.spec.ts`, `tests/import.spec.ts`, `tests/lyric-sheet.spec.ts`, `tests/responsive.spec.ts`, and appropriate renderer/unit tests. Add representative visual fixtures to `tests/visual/lyrics.spec.ts` or a dedicated imported-reader visual suite; review changed baselines.

## TUN-01 — Support guitar and ukulele in the tuner

Priority: P1. Outcome: a visible instrument selector offers working guitar and ukulele tuning in automatic and manual modes.

### Current implementation and integration traps

- `src/domain/music/tuner.ts` hardcodes `GUITAR_STRINGS`, `GuitarString`, `closestGuitarString`, and a guitar-only automatic target tracker.
- `src/features/tuner/useTuner.ts` resolves manual targets and automatic feedback against that list.
- `src/features/tuner/TunerPage.tsx` hardcodes guitar copy, tuning labels, and manual fallback string 6.
- `src/features/tuner/InstrumentStrings.tsx` (formerly `GuitarStrings.tsx`) assumes six strings and a six-button arrangement.
- Existing instrument plugins expose `strings` and `tunerTargets` in `src/core/plugin/types.ts`, but the tuner is currently passed only `locale` from `src/app/App.tsx`.
- `src/instruments/ukulele/index.ts` currently defines its fourth string as **G3 / MIDI 55**, despite naming the instrument `gCEA`. This is a low-G target; it must not silently become the standard high-G tuner preset.
- Guitar plugin IDs run from 1 = low E to 6 = high E, whereas tuner display numbers run from 6 = low E to 1 = high E. An adapter must map these explicitly rather than treating IDs and conventional string numbers as interchangeable.

### Engineering tasks

- [x] **TUN-01.1: Define typed tuning presets and a clear source of truth.** Represent preset ID, localized name, physical string order, stable string identity, display number, note/octave, and reference pitch. Derive frequency consistently from MIDI with A4 = 440 Hz, or retain one canonical frequency table. Generalize nearest-target selection and the tracker to accept the active preset. Reuse plugin metadata through a validated adapter where appropriate without importing UI/plugin state into the pitch detector.
- [x] **TUN-01.2: Provide guitar standard and ukulele high-G presets.** Use re-entrant standard ukulele (high G). Offer only Guitar and Ukulele as requested; do not expose a Low-G tuner option. Keep existing stored-song pitch mappings separate from tuner presets.

  | Preset | Physical string order, conventional numbers | Target frequencies at A4 = 440 Hz |
  | --- | --- | --- |
  | Guitar standard | 6 E2, 5 A2, 4 D3, 3 G3, 2 B3, 1 E4 | 82.41, 110.00, 146.83, 196.00, 246.94, 329.63 Hz |
  | Ukulele standard | 4 G4, 3 C4, 2 E4, 1 A4 | 392.00, 261.63, 329.63, 440.00 Hz |

- [x] **TUN-01.3: Add an accessible instrument selector.** Offer Guitar and Ukulele directly in the tuner, including on mobile. Default to guitar on first use and remember the last explicit tuner choice using the existing settings approach. Validate restored values. Keep this preference separate from the practice instrument so selecting ukulele to tune does not reinterpret an open guitar arrangement.
- [x] **TUN-01.4: Make preset switching atomic.** On a switch, reset manual selection to automatic and clear the prior target, cents/direction, smoothing history, and target hysteresis. A string number shared by two instruments must not preserve the old target. While listening, reuse the current microphone session and acquire a fresh reading for the new preset; do not create duplicate streams, contexts, or animation loops. Cover switching during a pending permission request too.
- [x] **TUN-01.5: Generalize the instrument view.** Replace or refactor `GuitarStrings` into a preset-driven component with four or six strings, correct physical ordering, readable labels, and selected/tuned states. High-G ukulele is not ordered from lowest to highest pitch; remove that assumption from captions and layout. Preserve keyboard selection and provide at least 44×44 CSS-pixel mobile hit areas.
- [x] **TUN-01.6: Generalize tuner text in both locales.** Update the title, standard-tuning subtitle, string labels, manual default, illustration accessible name, microphone guidance, and troubleshooting references. Remove guitar-specific low/high-E labels from ukulele mode.
- [x] **TUN-01.7: Preserve pitch behavior.** Retain the current ±250-cent display, ±10-cent tuned threshold / ±14-cent exit hysteresis, smoothing, quiet-input handling, and microphone lifecycle. Confirm that preset changes do not introduce octave errors or selection flicker. Keep analysis local with zero-gain microphone output.

### Acceptance criteria and verification

- Guitar displays six selectable strings; ukulele displays four. Each preset's automatic mode selects the correct string for every open-string target, and manual mode holds the chosen target when other pitches are played.
- High-G ukulele G4 resolves to string 4 and C4 to string 3 even though physical order is not ascending pitch.
- Switching presets while idle, listening, requesting permission, or showing an error never displays a target from the previous preset. Switching back leaves a usable selector and valid automatic state.
- Extend `tests/unit/tuner.test.ts` across all presets at 44.1/48/96 kHz, detuning above/below target, noise/harmonics, target boundaries, and preset resets. Retain existing guitar regressions.
- Extend `tests/tuner.spec.ts` with synthetic microphone input for all ukulele strings, instrument selection, persistence, manual/automatic transitions, selector accessibility, and stream/context counts during switching.
- Perform listening checks with an actual guitar and ukulele on Android Chrome and iOS Safari; synthesized input alone does not establish real microphone performance.
- Update `docs/TUNER.md` and `docs/TESTING.md` to describe supported presets and verification coverage.

## TUN-02 — Open the tuner as a fullscreen mobile view

Priority: P1. Outcome: selecting Tuner immediately opens a focused view filling the available mobile viewport, with a clear exit and usable primary controls.

Planning assumption: “fullscreen” means an app view occupying the available browser viewport, including when opened by route or reload. Hiding browser chrome through the native Fullscreen API is an optional enhancement, not a prerequisite for the mobile experience. Opening the view does not itself start the microphone.

### Current implementation

- `src/app/App.tsx` renders the tuner below `AppHeader`, inside the same padded, scrolling `main` as other pages.
- `src/features/tuner/tuner.css` changes the card to one column below 700px but does not give the tuner a dedicated viewport layout. Its mobile instrument neck alone is 320px high, with controls, headings, and help adding more height.
- The app's `max-narrow` breakpoint is 720px, while tuner CSS uses 700px; define a shared mobile rule and cover the boundary.
- Existing tuner layout tests use a 1000px-tall viewport and assert horizontal fit. They do not verify fullscreen occupancy or that essential controls fit on shorter phones.

### Engineering tasks

- [x] **TUN-02.1: Add a route-aware mobile tuner shell.** Use the existing tuner route as the state source. Remove the normal header/navigation and main padding from the mobile tuner layout, and render a compact tuner header with instrument selection and an explicit Back/Close control. Avoid a second independent fullscreen state that can disagree with browser history. Keep desktop layout usable.
- [x] **TUN-02.2: Fill the dynamic viewport safely.** Use a viewport-height layout with a fallback and safe-area padding for cutouts/home indicators. Account for browser toolbar expansion/collapse, installed PWA mode, rotation, and short landscape viewports. Scope shell changes to the tuner and restore ordinary layout on exit.
- [x] **TUN-02.3: Prioritize the tuning interaction.** Keep current note, tuning direction, cents meter, start/stop, instrument selection, and exit visible together at ordinary phone sizes. Use compact string controls and reduce decorative neck space when height is limited. Put extended help in an accessible expandable area; allow vertical scrolling for errors, help, and enlarged text without obscuring stop or exit. Prevent horizontal overflow and competing page scroll containers.
- [x] **TUN-02.4: Integrate navigation and focus.** Back/Close returns to the prior app location with the song/arrangement and reading position restored; direct entry to `/#/tuner` has a Library fallback. Browser Back/Forward must remain consistent. Move focus to the tuner heading on entry and restore it to a meaningful origin on exit. Hidden app navigation must not remain keyboard-focusable. Prefer a dedicated route view; if an overlay is chosen, implement dialog focus/inert behavior explicitly.
- [x] **TUN-02.5: Preserve microphone lifecycle.** Entry stays idle until the user taps Start. Stop/Cancel, leaving the tuner, page hiding, and unmount release capture, audio contexts, timers, and animation frames. If permission resolves after exit, immediately release the late stream. Resizing or rotating within the tuner must not create a new capture session or permission prompt.
- [x] **TUN-02.6: Treat native fullscreen as optional.** If a browser-fullscreen action is added, trigger it from a user gesture, feature-detect it, handle rejection and `fullscreenchange`, and remain usable in the viewport layout when unavailable. Define native-fullscreen exit separately from leaving the tuner route; never trap the user or start listening as a side effect.
- [x] **TUN-02.7: Make all states usable.** Verify idle, permission pending, listening, silent input, muted input, permission denied, and audio-start failure layouts for both instruments and locales. Keep status text and retry actions visible, focus indicators clear, and updates understandable without relying on color alone.

### Acceptance criteria and verification

- At 320×568, 375×667, 390×844, and 430×932, opening Tuner from navigation, directly by URL, or after reload fills the available mobile viewport with no normal app header or surrounding card gutter. At default text size, core tuning controls and exit are visible without scrolling; supplementary help may scroll.
- At 667×375 landscape and enlarged text, all functions remain reachable with vertical scrolling if necessary, without clipping or horizontal panning. Check both sides of the chosen mobile breakpoint and desktop at 1280×800.
- Back/Close and browser history return to the correct screen; song selection and scroll position survive the round trip. Direct entry always has a working exit. Focus never lands in hidden navigation.
- Entering the view makes zero microphone requests. Leaving while active stops every track and closes the context. A late permission grant after leaving does not resume listening. Instrument switching and rotation do not duplicate sessions.
- Extend `tests/tuner.spec.ts`, `tests/history.spec.ts`, `tests/responsive.spec.ts`, and `tests/accessibility.spec.ts`; add targeted fullscreen screenshots for short portrait and landscape layouts.
- Check installed offline PWA entry in `tests/pwa/offline.spec.ts`, including the new instrument selector. Verify dynamic toolbar/safe-area behavior on physical Android and iOS devices.

## Delivery order and completion gate

1. Capture imported-reader failures (MOB-01.1) and agree on responsive handling for each source block type.
2. Implement and verify MOB-01 without mutating imported source.
3. Define tuner presets and resolve the existing ukulele low-G labeling/mapping (TUN-01.1–01.2), then complete instrument selection and pitch tests.
4. Complete TUN-02 using the final four-/six-string UI; validate combined instrument switching, fullscreen navigation, and capture cleanup.
5. Run focused suites during each change, then the repository's required quality/browser/PWA checks for the finished implementation. Review visual changes and record physical-device results and any remaining failures before closing the tickets.

Completion requires all three user-visible outcomes. Passing document-level overflow checks alone does not close MOB-01, displaying ukulele labels without correct pitch targets does not close TUN-01, and merely enlarging the existing card does not close TUN-02.


## Implementation and verification record

- Responsive OLGA reading derives wrapping text, anchored chord/lyric pairs and synchronized TAB continuations without rewriting source. Original layout is optional. Nested overflow checks and per-string source reconstruction protect against clipped content or lost frets.
- Generated dense TAB continues across systems at the original note/font size. Generated notation can break within a measure while preserving parsed notes, ties, timing and barlines. Original ABC uses width-aware measure/system wrapping; its musical instructions remain authoritative.
- Standard guitar, standard ukulele are selectable independently of the practice instrument. Preset changes retain one microphone session and clear prior analysis. The practice ukulele plugin’s existing low-G pitch mapping is now named explicitly.
- The mobile tuner route fills the available viewport without native fullscreen permission, with compact controls, expandable help, safe-area padding and Back/history integration.
- Regression coverage includes actual imports and reload, source preservation, transposition, 200% text/zoom, themes/locales, rotation, dense rendering, tuner permission races, microphone cleanup, reading-position restoration and cold-offline PWA entry. New visual references are included for Chromium, Firefox and WebKit.

### Remaining release checks requiring physical devices

- [ ] Listen to every guitar and standard ukulele string through a real microphone on Android Chrome and iOS Safari.
- [ ] Verify browser-toolbar expansion/collapse, notches/home indicators, permission prompts, backgrounding, rotation and installed-PWA presentation on physical phones.

No physical-device or listening result is claimed by the automated suites.


### Automated verification completed on 2026-11-19

- `npm run quality`: TypeScript, lint, architecture, **132 unit tests**, production build and bundle budgets passed.
- Full Chromium browser run exercised 195 cases. Three cases affected during concurrent development/server reloads passed on a clean rerun of their complete suites (14/14); the other 192 passed in the full run. Focused imported-reader verification passed again after the final TAB parsing change (3/3).
- Mobile geometry and 44×44 minimum string-button targets passed at seven viewport sizes on Chromium, Firefox and WebKit (21/21). Firefox imported-reader cases passed; WebKit’s long reader case passed after enforcing identical measurement/rendering fonts.
- Cold-offline PWA launch with ukulele selection/persistence passed. Final offline integrity verified 42 application files and 204 recognition files.
- Pinned visual references cover 21 scenarios across Chromium, Firefox and WebKit, including 12 new mobile references. The visual negative control detected the intentional pixel regression; lint/architecture/unit/bundle negative controls also passed.


### Tuner UI follow-up

Replaced the native instrument dropdown with inline Guitar/Ukulele buttons. This keeps selection within the
tuner instead of relying on native popup placement in mobile browser emulation.
Restored the neck/string illustration on mobile, with four or six strings,
manual targets alongside the neck and a compact height on short phones.

Follow-up verification: 33 layout/keyboard/accessibility cases across Chromium,
Firefox and WebKit passed, including 320×568 and iPhone-SE-sized viewports.
Nine updated tuner visual references passed comparison; synthetic-audio and
preset-switching tests passed, as did the cold-offline PWA test, TypeScript,
lint, architecture, production build, bundle and offline-integrity checks.

User simplification: Low G was removed from the tuner. Only Guitar and Ukulele
(standard G4 C4 E4 A4) remain; legacy Low-G tuner preferences migrate to Ukulele.

Removal verification: 14 tuner unit tests, 26 tuner browser tests (including
legacy preference migration), 9 visual comparisons, TypeScript/build, bundle
budgets and offline-integrity checks passed.
