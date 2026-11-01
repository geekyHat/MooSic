# MooSic — Plugin and Adapter Manual

Application: **0.1.0** · Plugin API: **1** · Updated: **2026-11-01**

[Italian](manuale-adattatori.md) · [Architecture](ARCHITECTURE.md) · [Testing](TESTING.md)

This guide describes the implemented API. The contracts in [types.ts](../src/core/plugin/types.ts) and [context.ts](../src/core/plugin/context.ts) are the reference for extension code. Installation, recognition, backups and device sync are application services rather than interchangeable plugins.

## 1. Core and plugins

Built-in modules are imported and registered in [bootstrap.ts](../src/app/bootstrap.ts). Categories are `instrument`, `parser`, `renderer`, `transport`, `coach`, `theme`, `content` and `storage`. Instrument, transport, coach, theme and storage allow one active module per category; multiple parsers, renderers and content sources can coexist.

The coach contract and a reserved ukulele module exist, but neither is a complete supported microphone/instrument feature. There is no external plugin installer or sandbox.

## 2. Plugin layout

Place `plugin.json`, a default-exporting `index.ts` and support files under the appropriate category in `src/`. Use the corresponding plugin interface and expose its category payload. Prefer domain utilities and the context over importing another plugin's implementation.

## 3. Manifest

Required typed fields are `id`, `type`, `name: {en, it}`, `version` and `apiVersion`. IDs must be unique and kebab-case. Runtime validation requires an English name, a nonempty version and a compatible API version. Optional fields include description, permissions, dependencies and configuration.

Configuration supplies `defaults` and `schema`; if both exist, every schema key needs a default. No `entry` field is required: bootstrap imports modules explicitly. See [manifest validation](../src/core/plugin/manifest.ts).

## 4. Lifecycle

`setup(ctx)`, `onEnable(ctx)` and `onDisable(ctx)` may all return `void` or `Promise<void>`. Setup runs on the first enable of a disabled module. [PluginLifecycleService](../src/application/plugins/PluginLifecycleService.ts) serializes transitions and records failures. Switching instrument or transport pauses playback; switching a single-active category disables its previous module.

Release timers, listeners and audio resources on disable. Themes use a separate token-loading path. Error handling does not isolate untrusted code.

## 5. Context

| API | Purpose |
|---|---|
| `ctx.manifest` | Receiving plugin's manifest |
| `ctx.score.get()` / `ctx.score.set(piece)` | Current score |
| `ctx.instrument()` | Active instrument, or `null` |
| `ctx.scheduler` | Playback clock |
| `ctx.registerParser(parser)` | Register a parser owned by the plugin |
| `ctx.ui.notify(level, text)` | `info`, `ok` or `error` notification |
| `ctx.ui.registerPanel(panel)` | Register a panel definition; shell integration is separate |
| `ctx.storage` | Async `get`, `set`, `remove` on the current backend |
| `ctx.i18n.t(key, vars)` / `ctx.events` | Translations and core event bus |
| `ctx.config()` / `ctx.configSet(key, value)` | Read merged configuration / update a value |

Storage keys are not automatically isolated per plugin. Prefix your keys, for example `my-plugin:last-position`. Song, OLGA and backup repositories are separate from the plugin storage backend. Registered panels are not automatically mounted as arbitrary pages by the current shell.

### 5.1 Scheduler

The [scheduler](../src/core/scheduler/index.ts) retains play, pause, seek, tempo-factor and time APIs. Events are `frame`, `beat`, `schedule-window`, `end` and `sync`; subscriptions return cleanup functions. Practice uses elapsed-time autoscroll independently of this audio clock. It does not expose karaoke or music/TAB playback controls; existing editor previews and playback infrastructure remain.

## 6. Category payloads

| Category | Payload |
|---|---|
| instrument | `instrument: Instrument` |
| parser | `parser: Parser` |
| renderer | `renderer: Renderer` |
| transport | `transport: Transport` |
| coach | `coach: Coach` |
| theme | `tokens: string` |
| content | `artists()`, `file()`, optional `buildPiece()` |
| storage | `storage: StorageBackend` |

### 6.1 Instruments and chord positions

An instrument declares strings, MIDI tuning, fret count, `noteToPositions()` and render hints. Out-of-range notes return `[]`. String IDs and visual line order are distinct: guitar ID 1 is low E, while the top TAB line is high e.

`capabilities` can declare notes, chords and diagrams. `chordLibrary` supplies preferred shapes and `chordVoicings` ordered alternatives, with optional `baseFret`. Fret arrays follow ascending string ID; `null` means muted and `0` open. The shared practice UI handles looping position selection and chord transposition. See the [guitar adapter](../src/instruments/guitar/index.ts) and [chord catalogue](../src/instruments/guitar/chordLibrary.ts).

### 6.2 Parsers, scores and content

Parsers expose `id`, `formats`, `detect(content)` and async `parse(content)`. Return a valid [Piece](../src/domain/score/types.ts), including timing, duration and bar fields. Preserve source text and character-based chord anchors separately from musical timing.

A content module may return a Piece directly from `buildPiece()`; `null` falls through to file-plus-parser loading. Bundled ABC/ChordPro, user songs and OLGA have distinct adapters. OLGA retains original document layout. MusicXML importing is not implemented.

### 6.3 Renderers, audio and themes

`Renderer.render(piece, instrument, target)` receives an HTMLElement and returns a handle with `update(time, activeNotes)`, `seek(time)` and optional `resize()` / `destroy()`. Release renderer resources in `destroy()`.

Transports expose `start(ctx)` and `stop()`. Coaches expose async `start(ctx)`, `stop()` and a `standalone` or `guided` kind; these contracts do not imply a shipped tuner or microphone coach.

A theme exports its manifest and raw CSS `tokens`. Use existing `--mm-*` variables and shared UI tokens. See the [default theme](../src/themes/default/index.ts).

## 7. Adding a built-in module

Create the module and typed payload, register it in bootstrap, and add its ID to defaults only if it should start enabled. Add meaningful tests for enable, use, disable and re-enable behavior.

## 8. Configuration

Settings renders boolean, number, integer and string fields from schemas. Use `ctx.config()` and `ctx.configSet()`. Device preferences are not merged by sync; restoring them from backup is a separate explicit choice.

## 9. Installation, offline and sync

These are services in `src/application/` with browser adapters in `src/infrastructure/`. They need no separate plugin packages. See [device pairing and first installation](PEER-SYNC.md) and the README for offline and backup usage.

## 10. Permissions and external code

`permissions` is descriptive metadata in this build. There is no external loader, permission sandbox or enforced network/DOM denylist. QR camera access is requested by the corresponding application feature after a user action. A manifest's permission list does not make third-party code safe.

## 11. Compatibility

`API_VERSION` is 1; the manifest validator accepts 1 and the previous integer, 0. It does not translate old implementations automatically. Plugin versions and the application package version are separate. Update source contracts and documentation together when changing APIs.

## 12. Verification

Run `npm run quality` and relevant tests. Check resource cleanup, parser ownership, configuration persistence, keyboard/touch support and existing library behavior. [Testing](TESTING.md) covers browsers, offline operation and visual baselines.
