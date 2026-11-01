# Architecture

MusicMaestro is a local-first React and TypeScript application, built with Vite. It runs as a static HTTPS site and an installable PWA. User libraries remain in the browser; no application backend or account is required.

## Module boundaries

| Directory | Responsibility |
|---|---|
| `src/domain/` | Musical data, chord symbols, scores, song formats, validation and pure conversions. No React, DOM or persistence dependencies. |
| `src/application/` | Observable services for songs, the library, settings, backup, synchronization, notifications and playback. Persistence and browser capabilities are accessed through contracts. |
| `src/infrastructure/` | Browser adapters: localStorage, IndexedDB, migrations, backup ZIP processing, WebRTC, OCR/PDF, service workers and history. |
| `src/features/` | Library, editor, practice and settings pages, with their components and hooks. |
| `src/shared/` | UI primitives, common hooks and navigation guards. |
| `src/app/` | Service composition, plugin registration, providers, shell and lazy page loading. |

`scripts/architecture.mjs` checks module boundaries and runtime import cycles. `src/core/plugin/types.ts` defines plugin contracts. Instruments, content, parsers, renderers, transports, storage and themes supply modules registered at bootstrap. The [English](manual-adapters.md) and [Italian](manuale-adattatori.md) adapter manuals describe the plugin model; implemented capabilities are listed in the README.

## Content and storage

- The shipped catalogue is static, with [documented sources](../src/content/publicdomain/SOURCES.md). It does not seed the personal editor database.
- Editor songs and arrangements use localStorage. Source text, chord anchors and musical timing remain distinct, so rendering and transposition do not overwrite imported text.
- OLGA metadata and original documents use IndexedDB. Original text is loaded when a document is opened.
- Backup restoration validates the complete archive before an explicit merge. Identical content is skipped and conflicting variants are preserved. A journal and IndexedDB receipt support recovery after interrupted writes.

## Installation and synchronization

The build generates a manifest, service worker and integrity inventory. Core pages and their lazy chunks are precached; OCR/PDF assets have a separate opt-in offline pack. Updates coordinate open tabs and wait for active drafts, imports, backups and synchronization.

Manual synchronization exchanges snapshots over an encrypted WebRTC data channel. Pairing uses two codes on the same LAN, without signaling, STUN or TURN servers. Both users confirm the verification code, then separately approve merging the received library. The sync transport reuses the backup service rather than writing directly to the library. See [the pairing and first-install guide](PEER-SYNC.md).

## Verification

See [Testing](TESTING.md) for local commands, browser requirements and visual baselines. Build and quality tools, automated tests, fixtures and visual reference images are part of the public source. Personal plans, historical reports and generated results are local ignored files.
