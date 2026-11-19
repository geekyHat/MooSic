# Guitar and ukulele tuner: presets, stability and references

The original display used ±50 cents, immediately reselected the closest string, and discarded its pitch history after one jump over 80 cents. A noisy attack or octave estimate could blank the reading and move the target while the player was adjusting a peg.

The revised tuner uses:

- A ±250-cent meter, with the actual signed deviation still shown numerically outside that range.
- A green threshold of ±10 cents, leaving green beyond ±14 cents to avoid boundary flicker.
- YIN detection over 50–1000 Hz, a quiet-input gate and an approximately 85–93 ms window at the tested 44.1/48/96 kHz sample rates.
- Three consistent estimates to acquire a pitch or accept a large change. An isolated jump holds the last accepted reading rather than clearing it. Missing or consistently invalid input expires after 450 ms.
- A five-sample median followed by time-based exponential smoothing in logarithmic pitch (260 ms time constant), so peg movements remain continuous without blending separate strings.
- Automatic target hysteresis: another string must be at least 80 cents closer before it replaces the current target. Manual selection fixes the target regardless of detected pitch.
- A simple guitar-neck illustration with six strings, a nut and frets, without the realistic headstock details.

## Instruments and mobile layout

The tuner has independent, validated presets for standard six-string guitar and
re-entrant standard ukulele (G4 C4 E4 A4), both
referenced to A4 = 440 Hz. Conventional physical string numbers are separate
from instrument-plugin IDs. The practice ukulele plugin remains low-G and now
labels that tuning explicitly; tuner selection does not reinterpret songs.

The last explicit preset is stored under `mm:tuner-preset`. Changing presets
resets manual selection, smoothing, automatic-target history and displayed
feedback, while retaining the existing microphone session. Permission requests
use the latest selected preset when granted. Invalid saved presets fall back to
guitar, and unavailable browser storage does not prevent tuning.

At widths up to 720 CSS pixels, the tuner route fills the dynamic viewport,
hides the normal app header, and accounts for safe-area insets. Only inline Guitar/Ukulele buttons are offered; there is no tuning submenu.
A previously saved Low-G tuner choice migrates to standard ukulele and is persisted
as `ukulele`. A responsive neck illustration keeps
its four or six strings visible and selectable alongside the primary controls in portrait. Short landscape layouts
and enlarged text can scroll vertically; help is expandable. Back restores the
previous application history entry and reading position, with a Library fallback
for a direct entry. Browser fullscreen permission is not required. Opening the
route remains idle until an explicit microphone-start tap.

## Android microphone input

Microphone permission does not guarantee a usable waveform. The input gate is
0.0005 RMS (about −66 dBFS), allowing quiet, unprocessed phone input while YIN
still rejects non-periodic noise. The level indicator uses a square-root scale
so quiet input remains visible. After three seconds without useful signal the
tuner shows guidance; a muted media track is reported separately. Input can
recover without restarting the tuner.

The audio graph ends in a permanently zero-gain output to keep rendering active
on mobile audio backends without playing the microphone through the speakers.
Audio is resumed during the initial tap and again after microphone acquisition.
If that second resume stalls for three seconds, the input is released and a
retry is offered. This timeout starts only after capture is granted; it does not
limit the time available to answer the permission prompt. Stop, navigation and
page hiding release the stream and any pending audio-start timer.

On Android, check the device-wide **Microphone access** privacy switch, the
browser's Android app permission and the site's microphone permission. Installed
PWAs also require permission. Bluetooth headsets may change which microphone is
used. These checks are available in the tuner's expandable help.

The mobile rendering path is a compatibility measure; desktop browser tests
cannot establish which device-specific condition caused a real phone to return
silence. Verify the published version on a physical phone after updating.

## Open-source research

Inspected on 2026-11-08. Star counts are approximate popularity signals, not evidence of measurement accuracy.

| Project | Stars observed | Code inspected and relevant idea |
| --- | ---: | --- |
| [Google Guitar Tuner](https://github.com/googlearchive/guitar-tuner) (archived, Apache-2.0) | 855 | [Audio processor](https://github.com/googlearchive/guitar-tuner/blob/35bdc95a2388742e8e56c3c20c390b64797c7c97/src/elements/audio-processor/audio-processor.js) limits reassessment of the string around changes in input level; [tuning instructions](https://github.com/googlearchive/guitar-tuner/blob/35bdc95a2388742e8e56c3c20c390b64797c7c97/src/elements/tuning-instructions/tuning-instructions.js) smooth the displayed frequency. |
| [Tuner](https://github.com/thetwom/Tuner) (GPL-3.0, now on Codeberg) | 305 | [OutlierRemovingSmoother](https://github.com/thetwom/Tuner/blob/0b946a227f62f7cbf72c0e8fdd444bb6e88de2ac/app/src/main/java/de/moekadu/tuner/notedetection/OutlierRemovingSmoother.kt) distinguishes outliers from a new stable pitch; [TargetNoteAutoDetection](https://github.com/thetwom/Tuner/blob/0b946a227f62f7cbf72c0e8fdd444bb6e88de2ac/app/src/main/java/de/moekadu/tuner/notedetection/TargetNoteAutoDetection.kt) uses hysteresis to avoid target oscillation. |
| [PitchDetect](https://github.com/cwilso/PitchDetect) (MIT) | 1.4k | [Pitch detection](https://github.com/cwilso/PitchDetect/blob/13cb49e51dde5e52464d354410216cb4c2e87a7e/js/pitchdetect.js): microphone waveform, signal-strength gate, correlation and sub-sample interpolation. Its README explicitly notes limitations with strong harmonics. |

These are conceptual references. No source code or assets were copied or vendored, and no dependency was added. MooSic retains its YIN implementation and implements its own temporal filtering and target selection. The old Polymer/Web Audio APIs in the archived example are not used.

## Verification and limits

Unit tests cover every guitar and ukulele preset at 44.1/48/96 kHz, including physical high-G ordering and detuning. They also cover multiple sample rates, expanded frequency range, damped harmonic signals with noise/DC offset, octave spikes, jitter, slow tuning sweeps, real note changes, target boundaries, silence and green-state hysteresis. Browser tests exercise a real Web Audio analyzer with synthesized input, the expanded meter and microphone lifecycle. Physical guitar/ukulele/microphone tests remain necessary to assess room noise, device processing and mobile behavior; multiple simultaneous strings are not supported.
