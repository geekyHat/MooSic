# MooSic

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/icons/icon-192.png" />
  <img src="public/Logo/MooSicLogo.png" alt="MooSic — a cow wearing headphones" width="160" />
</picture>

A local-first browser app for practising guitar, with a filterable library, tablature, standard notation and a song editor. No account or application backend is required.

Application version: **0.1.0** · Documentation updated: **2026-11-02**.

[GitHub repository](https://github.com/geekyHat/MooSic) · [Italian guide](LEGGIMI.md) · [Architecture](docs/ARCHITECTURE.md) · [Testing](docs/TESTING.md) · [Device sync](docs/PEER-SYNC.md)

## Support MooSic

I work in IT and develop MooSic in my spare time. If you enjoy the app, [buy me a coffee](https://buymeacoffee.com/scalcagnotm): your support helps me dedicate more time to improving it. Thank you!

## Available now

- Installable PWA with offline reading, optional offline photo/PDF tools, coordinated updates, full local backup/restore and automatic GitHub Pages deployment. [Setup](#install-offline-updates-and-full-backup).
- Public-domain catalog and locally saved songs; title/composer/genre filters.
- Browser **Back/Forward** restores app pages and library selections, including filters, letters, pagination and scroll position. Songs with one version and one available arrangement open directly in practice; multiple choices retain the version/arrangement picker.
- Artist-first creation with existing/similar-name suggestions, shared artist cards across catalog and local songs, and an Edit in editor action in the library. Exact artist matches ignore case, accents and repeated spaces; similar names require explicit selection.
- Local TAB/ChordPro file imports with editable preview, explicit artist matching, remembered aliases, numbered title conflicts, identical-copy detection and a Merge artists action. Imported source files remain available in practice.
- **Photo/PDF scanning:** import printed lyrics from a JPG, PNG, WebP or PDF, or use **Take photo** on a supported phone. Recognition runs locally with English/Italian options, photo rotation, PDF page previews and an editable text review before the normal import confirmation. [Usage and limits](#scan-a-photo-or-pdf).
- Tabs, notation and chords/lyrics arrangements with **audio-independent autoscroll**: start/pause, adjustable scroll speed and back to top. Karaoke and practice playback controls have been removed.
- Autoscroll also works on existing OLGA documents. Explicit `[Am]` / `[C/G]` chord markers are recognized and listed with available instrument diagrams; unbracketed chord rows remain original text.
- **Transpose chords:** use −/+ in semitone steps (two steps = one whole tone), with live chord diagrams and an original-chords reset. Available for recognized OLGA markers and editor chord/lyric sheets; slash bass notes move with their chord. Transposition changes the reading view without saving over the source. Numeric TAB and standard notation remain original.
- **Alternate chord positions:** hover or focus a diagram to reveal its position count and looping previous/next arrows; keyboard ←/→ also works. Touch devices always show the controls. Each chord keeps its own selection, including recognized OLGA chords and transposed sheets. Available positions depend on the instrument catalogue; unsupported diagrams are shown explicitly.
- **Free song sheets** with sections, complete lines, blank lines and chord-only lines. Inline chords can be anchored before, inside or after words independently of BPM.
- Existing beat and word timing remains editable and stored for compatibility; the reading view does not use it for highlighting or scrolling.
- Explicit saves, dirty-draft navigation protection, multi-tab conflict handling and recovery/export of earlier local data.
- IT/EN, light/dark themes, keyboard navigation and mobile layouts.

## Run

Use a current Node.js 24 LTS or newer and npm.

```bash
npm ci --include=dev
npm run dev
```

```bash
npm run build
npm run preview
```

The static build is in `dist/`; these commands do not deploy anything.

## Starter repertoire and device sync

The bundled repertoire contains ten studies: Ode to Joy, Für Elise, Greensleeves, Bella Ciao, Amazing Grace, Auld Lang Syne, Frère Jacques, Twinkle, Twinkle, Little Star, Petzold’s Minuet in G and Bach’s Bourrée BWV 996. The last two are melody-only theme studies in TAB/notation; four ChordPro sheets supply simple chord/lyric accompaniments. [Sources and scope](src/content/publicdomain/SOURCES.md). Personal editor songs are separate from shipped content; installing the PWA does not reset an existing library for the same browser origin.

**Settings → Transfer with LocalSend** is the recommended manual transfer path. Install [LocalSend](https://localsend.org/download) on both devices, connect them to the same Wi-Fi/LAN and choose **Prepare library file** in MooSic. Use **Share…** where the browser supports sharing that ZIP, choosing LocalSend in the system menu; otherwise **Save file for LocalSend** and send it from LocalSend. On the destination choose **Import received library**, select the received ZIP, review the preview, then **Merge into library → Reopen app**. Existing content is preserved and identical copies are skipped. Repeat in reverse to bring changes back. LocalSend is a separate app; MooSic cannot install it, choose it in the share menu or confirm delivery. This is not background sync. [Steps and troubleshooting](docs/PEER-SYNC.md#trasferimento-con-localsend-consigliato).

**Advanced alternative: Settings → Sync with another device** exchanges two pairing codes via link, QR, camera, QR image or copy/paste. Compare the verification code and confirm on both devices. WebRTC transfers the libraries directly over an encrypted connection on the same Wi-Fi/LAN, without an account, signaling server, STUN or TURN. Received files are verified before an explicit merge. Songs, TAB, arrangements and OLGA documents are included; identical copies are skipped and different versions are retained as numbered copies. This is manual snapshot exchange: deletions and device preferences are not replicated. [Instructions, privacy and network limits](docs/PEER-SYNC.md).

**First QR access:** a phone without the app opens a welcome screen with installation, automatic offline preparation and a way to resume pairing. Supporting browsers show an **Install MooSic** button that opens their confirmation dialog; iPhone/iPad users get Home Screen instructions. A validated offer is retained until its ten-minute expiry, so launching the new app icon resumes pairing when storage is shared. Copy/paste and scanning inside the installed app cover platforms with isolated storage. The QR must use the published HTTPS URL; localhost is not a remote installation address. [First-install flow and browser limits](docs/PEER-SYNC.md#primo-accesso-dal-qr-e-installazione).

## Install, offline, updates and full backup

Open the HTTPS production URL, then **Settings → Install MooSic**, or the browser’s install menu. On iPhone/iPad use Safari’s **Share → Add to Home Screen**. Installation support depends on the browser; a native prompt is shown only when offered by the browser. No account or application server is needed: GitHub Pages serves the app files, and each user imports their own libraries locally. Do not open `dist/index.html` as a `file://` URL.

Wait for **Library and reading ready offline** in Settings before disconnecting. All application pages, diagrams, transpose, autoscroll, editing and local file/OLGA imports are cached. **Download offline photo/PDF tools** additionally prepares English/Italian OCR and PDF fonts/decoders (about 20 MB). A cold launch works without visiting every page first. Failed pack downloads can be retried; they are never labelled ready until complete. Development mode deliberately has no service worker. Editor audio samples are outside the offline pack.

The app checks for new releases on startup, returning online and periodically while open. Downloaded releases wait for **Install update**. Save/discard drafts and finish imports in every open app tab first; the update coordinates those tabs before reloading them. An update changes application caches, preserving local songs, OLGA texts, settings and downloaded recognition tools. **Protect data on this device** requests persistent storage; the browser may refuse. Clearing site data still removes the library, so keep backups elsewhere.

**Settings → Download full backup** exports a local ZIP containing all editor songs/arrangements, artist aliases, original imported texts, OLGA documents and preferences. **Open backup** verifies the complete file and shows counts before **Merge into library**. Nothing is written during the preview. Identical copies are skipped; distinct content with conflicting names/IDs receives new names/IDs. Preference restoration is optional and initially unchecked. Reopen the app when the success screen appears. Original camera photos/PDFs and unsaved drafts are not stored in backups; preserve those originals separately. ZIP backups are not encrypted at rest. MooSic does not upload them; LocalSend encrypts the local transfer when used. The same backup format is used by the LocalSend transfer flow.

The versioned backup format has CRC and source SHA-256 checks. Bounds: 256 MB ZIP, 532 MB expanded including a 20 MB manifest, 60,000 OLGA documents (2 MB each), 10,000 editor songs, subject to available device storage. Failed restores roll back the final writes; an interrupted restore is recovered before loading the library at the next launch. The legacy editor recovery export remains available for malformed historical data.

### Automatic GitHub Pages publication

The workflow [pages.yml](.github/workflows/pages.yml) runs validation, library/sync/backup/history tests, real offline/update tests and a production build on pushes to `main` (or manual dispatch), then publishes **only `dist/`**. It derives the root/subdirectory URL from Pages metadata. Imported libraries and backups never enter the deployment. To activate it:

1. Push the clean public copy to `main` in [geekyHat/MooSic](https://github.com/geekyHat/MooSic), keeping the development repository private.
2. In the repository, choose **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Open the URL from the **Publish MooSic** deployment. Later pushes update that same installation URL.

The public repository is [geekyHat/MooSic](https://github.com/geekyHat/MooSic). Follow the [publication guide](docs/PUBLISHING.md) to push the clean copy and enable Pages. With the default Pages configuration the installation URL will be **https://geekyhat.github.io/MooSic/** after a successful deployment; this does not confirm that the site is already live. Keep the production origin stable: localhost, Pages and a custom domain have separate local storage. Export/import a full backup to move data between them. See [GitHub’s workflow requirements](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

For another static HTTPS host, serve the complete `dist/` directory including `sw.js`, `manifest.webmanifest`, icons, `assets/` and `scan-assets/`. Build a subdirectory deployment with `MM_BASE_PATH='/MooSic/' npm run build`. Avoid long HTTP caching for `index.html` and `sw.js`; immutable hashed assets can be cached. Hash navigation needs no server rewrite.

```bash
npm run check:offline   # after build: verify every precache file and digest
npm run test:pwa        # builds two fixtures and tests the real worker under /MooSic/
```

## Free lyrics editor

Open Editor, create/edit a song, choose Chords + lyrics and **Free song sheet**. The explicit grid conversion preserves the existing chords, words, rests and word timing. Example original text:

```text
{c:Verse 1}
[C]Ri[Am]cordo il mare[G]
Una luce nella sera

{c:Chorus}
[Dm] [G]
```

Insert chords at the actual textarea cursor or type `[chord]`. Set line start/end beats and word timing separately. A line may span several bars; new lines initially get four beats, not an inferred vocal alignment. Save composition with Add; Save details affects only song metadata. Invalid syntax/timing keeps the draft; fix it or explicitly Cancel before hiding the editor.

Grids support up to 32 bars; free sheets up to 256, in 4/4. The supported ChordPro subset includes inline chords, section comments/selected aliases, blank lines and escaped literal brackets. Text export does not contain proprietary IDs or word timing. This is not a complete ChordPro implementation or an automatic Ultimate Guitar importer.

## Alphabetical library

The library opens with artists grouped alphabetically. Use **Artists**, **Songs**, **TAB**, **Chords** or **Sheet music** to choose an index. **Songs** lists titles across all artists; format views show songs with a matching arrangement and expose only that arrangement type when opened. Artist names in song lists also open that artist's repertoire.

The **A–Z** index selects a letter directly, even beyond the first page; **All** restores the full list. Accented letters share their base-letter group, numbers use **0–9**, and other initials use **#**. Artists and song titles use natural alphabetic sorting, including numeric variants such as `(2)` before `(10)`. Each artist's songs are sorted the same way. Search/composer/genre filters combine with the selected letter and view. Lists render 48 results at a time with **Show more**; returning from a song restores the selected letter.

**Open** goes straight to practice when the current index offers one version with one arrangement. In a format-specific index, that decision uses only the arrangements in the selected format. Songs with multiple versions/arrangements keep the chooser; metadata-only songs keep their details view.

Browser **Back/Forward** follows artists, song choices, practice arrangements/display tabs, editor selections and settings. It restores the library's search, filters, letters, expanded page and scroll position. Search typing updates the current entry instead of adding a step per character. Hash URLs also reopen the same view after reload and work on a static host. Missing local songs show an unavailable state; URLs contain identifiers and browse options, never musical documents or editor drafts. Unsaved editor and text/photo import drafts retain their confirmation on browser navigation. At the first app entry, Back can leave the app normally.

## Import files

Use **Library → Import files** to choose up to 25 UTF-8 `.tab`, `.cho`, `.chordpro`, `.chopro`, `.chord`, `.crd` or `.pro` files (100 KB each). Enter missing title/artist information and resolve any artist suggestions before confirming. Similar names require a choice; exact names share one artist. Under that artist, different content with an occupied title becomes `Title (1)`, `Title (2)`, etc.; an identical imported copy is skipped. Batches use one local storage write and retain the preview on failure.

**Add files** supports multiple selection and successive additions to the same queue without losing edits; the 25-file limit applies to the whole queue. A counter identifies incomplete/reviewable files, and a shared artist field can fill only the missing artist names. Performer tags, credited/known subtitles, filename patterns such as `Artist - Song` / `Song - Artist`, and internal titles help populate the fields. Explicit performer metadata takes precedence over songwriter credits. Uncertain ordering or conflicting credits require confirmation, with an option to swap artist and title; missing information must be supplied before saving.

ASCII TAB supports standard six-string tuning, frets 0–24 and end-of-block `xN` repeats, up to 32 generated bars. One beat per onset is provisional: techniques and precise rhythm remain in the original source. ChordPro supports metadata, inline chords, sections/comments, chorus repeats and TAB blocks. Lyrics initially use four beats per line (up to 256 musical lines), in 4/4 at 40–240 BPM. Unsupported presentation directives are listed in the preview; unsupported transpositions, delegated music sections and multi-song books are rejected instead of dropping their music.

**Merge artists** combines existing local name variants after an explicit choice, preserving every song/ID and numbering conflicting titles. The included Beethoven pieces now use consistent composer metadata. See the [downloaded official test fixtures](tests/fixtures/imports/README.md) and run `npm run test:browser -- tests/import.spec.ts`.

Imports stay on the current device. A phone/tablet can access a local server on the same LAN (`npm run dev -- --host 0.0.0.0`); each browser/origin has its own library. Install the production PWA as described below. To merge libraries between devices, use Settings → Transfer with LocalSend; see [the transfer guide](docs/PEER-SYNC.md). There is no cloud or background sync.

## Scan a photo or PDF

Open **Library → Scan photo / PDF**. Choose one song as a photo/PDF, or tap **Take photo** on a supported phone to use its rear camera. Desktop browsers can offer a file picker instead. Keep the page straight, sharp and well lit. Supported files: JPG, PNG, WebP and PDF, up to 25 MB; PDFs may contain up to 12 pages of the same song. Convert HEIC photos to JPG first.

Select English or Italian before reading. PDFs use their text layer when it contains meaningful text, otherwise OCR reads the rendered page. Enable **Use OCR for every PDF page** for mixed documents where only a heading is selectable text. A sideways photo can be corrected with **Photo rotation → Read again**. Reading can be stopped and retried.

Compare the page preview with **Recognized text**, correcting any mistakes. Explicit `[Am]` / `[C/G]` markers enable diagrams, alternate positions and transpose; unbracketed chord rows remain text. Use **Review import**, check the title and artist, then confirm. Artist matching, duplicate detection and title numbering use the existing importer. The song opens in practice and remains editable after saving.

Recognition processes the document on the device using [Tesseract.js](https://github.com/naptha/tesseract.js) and [PDF.js](https://github.com/mozilla/pdf.js). Their pinned worker/code/language assets are served by the app itself and loaded on demand, without a recognition service or runtime CDN. For offline recognition, download the photo/PDF tools in Settings first. Only the corrected text is saved; retain the original photo/PDF separately.

This reads printed text, not musical notation: handwriting, staff notes, TAB fingering numbers, complex columns and precise rhythm may need manual transcription. Review chord spelling and placement before playing.

## Import a local OLGA ZIP

1. Open **Library → import olga archive** and select a lawfully obtained local `OLGA Archive.zip`, without extracting it.
2. Wait for ZIP verification and the document count. Review similar or generic artist names; choose the existing artist's exact name to associate the songs with that artist. Confirm separate names explicitly, or use **Keep remaining names separate and confirm** after checking the suggestions.
3. Choose **Import into library**. New material is added without replacing existing songs. Under one artist, matching titles with different original text receive `(1)`, `(2)`, etc.; identical original documents are skipped. Import the same archive again to add material from an updated copy without duplicating unchanged documents.
4. Browse the artist and song, then open its arrangement in Practice. The original document is displayed with its spacing, TAB, chord positions, instructions and notices. These archival documents are readable, including bass/acoustic/classical material, but have no automatic playback or editor conversion. Use the genre filter to select the archive's instrument labels.

The importer recognises the archive's `main` / `main N`, `chordpro`, `bass`, `acoustic`, `classical`, `cowpie` and `praise_songs` collections, including dated update folders. Collection/letter directories are not artists. Supported text extensions are `.crd`, `.tab`, `.btab`, `.chopro`, `.chordpro`, `.pro`, `.cho`, `.lyr`, `.num` and `.txt`; nested packed copies, programs, MIDI and resource documentation are excluded. `.crd` is retained as original text because many OLGA files use chords above lyrics rather than ChordPro syntax. UTF-8 and legacy Windows-1252 text are read. Performer headers and directory names help identify artists; transcriber email headers are not singer credits. Ambiguous metadata may still need human correction.

ZIPs are limited to 256 MB, 60,000 entries, 2 MB per musical document and 512 MB of declared expanded musical text. ZIP64, split/encrypted archives, unsupported compression, unsafe paths and failed CRC checks are rejected. Files are processed in batches; the prior catalog remains intact if validation, cancellation or storage fails. Other tabs serialize final OLGA commits when the browser supports Web Locks.

OLGA uses a separate **IndexedDB** database (`musicmaestro-olga`), with an index separate from the document texts. Editor songs remain in localStorage. Storage quota and eviction depend on the browser/device; keep the source ZIP as a recovery copy. Clearing site data deletes this library. The older editor recovery export covers only editor data; the full backup in Settings includes OLGA. Search results are shown in batches of 48 to keep a large catalog usable. The installed PWA reads this library offline; devices remain independent.

### Rights and source provenance

The app does not bundle or automatically download OLGA archives. Import only material you are entitled to use, keep original credits and notices, and retain your own archive backup. The software’s MIT license does not grant rights to imported songs or arrangements.

Optional full-archive production check, after building:

```bash
MM_OLGA_ARCHIVE='/path/to/OLGA Archive.zip' npm run test:browser -- --config playwright.olga.config.ts
```

## Code structure

```text
src/app/             composition root, providers, shell, lazy pages
src/domain/          score/song/music types, pure validation/conversion
src/application/     songs, catalog, settings, notifications, playback services
src/infrastructure/  local persistence, migrations, recovery
src/features/        library / editor / practice / settings
src/shared/          UI primitives, hooks, navigation guard
```

The domain has no React, DOM or storage dependencies. Feature pages compose smaller components; services own persistence and asynchronous playback. Instrument/parser/renderer/transport/content/theme plugin IDs and contracts remain stable. Compatibility re-exports remain where callers still use them, without duplicate implementations.

See the [architecture guide](docs/ARCHITECTURE.md). Plugin contracts: [English manual](docs/manual-adapters.md), [Italian manual](docs/manuale-adattatori.md).

## Verify

See [Testing](docs/TESTING.md) for reproducible checks of offline operation, updates, backups and device pairing.

```bash
npm run quality          # types, lint, architecture, unit, build, bundle budget
npm run check:gates      # intentional negative controls
npm test                 # Chromium functional E2E
MM_BROWSERS=chromium,firefox npm test
npm run test:production  # run after building
```

Install browser binaries with `npx playwright install chromium firefox webkit`. Local Chromium can fall back to `/usr/bin/chromium` or `CHROMIUM_PATH`; CI uses the Playwright binaries.

Visual baselines are pinned to `mcr.microsoft.com/playwright:v1.64.1-noble`. In that environment run `npm run test:visual`, `npm run check:visual-gate`, then `npm run test:visual` again. Do not regenerate references merely to hide a failure. See [Testing](docs/TESTING.md) for headless audio requirements; WebKit on Linux is not a test of Safari/iOS devices.

The GitHub workflow stores screenshots, traces and bundle reports. Automated checks do not certify accessibility, perceived musical quality or real-device behaviour.

## Data, recovery and limits

Editor songs live in localStorage for the current browser origin (`mm:user-songs`); settings and recovery copies use separate keys. Changing origin/port/browser or clearing site data can make that library unavailable. Export recovery data before deleting it. Recovery is not cloud backup and cannot repair an uninterpretable record automatically. No analytics or repertoire upload service is included.

Use original, public-domain or authorised repertoire. Coach/microphone pitch detection, MusicXML import, cloud sync and automatic vocal alignment are **not implemented**. Ukulele remains reserved. Chord parsing/diagrams do not cover every possible symbol; unavailable diagrams are shown explicitly.

## License

MIT — [LICENSE.md](LICENSE.md).
