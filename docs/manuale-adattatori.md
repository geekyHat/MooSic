# MusicMaestro — Manuale Plugin e Adattatori

Applicazione: **0.1.0** · API plugin: **1** · Aggiornato: **2026-11-01**

[English](manual-adapters.md) · [Architettura](ARCHITECTURE.md) · [Test](TESTING.md)

Questa guida descrive l’API implementata. I contratti in [types.ts](../src/core/plugin/types.ts) e [context.ts](../src/core/plugin/context.ts) sono il riferimento per estendere l’app. Installazione, riconoscimento, backup e sincronizzazione sono servizi applicativi, non plugin intercambiabili.

## 1. Core e plugin

I moduli integrati sono importati e registrati in [bootstrap.ts](../src/app/bootstrap.ts). Le categorie sono `instrument`, `parser`, `renderer`, `transport`, `coach`, `theme`, `content` e `storage`. Strumento, transport, coach, tema e storage ammettono un solo modulo attivo per categoria; più parser, renderer e fonti di contenuto possono coesistere.

Esistono il contratto coach e un modulo ukulele riservato, ma non rappresentano funzionalità complete di microfono/strumento supportate. Non esistono un installer di plugin esterni né un ambiente isolato per eseguirli.

## 2. Struttura di un plugin

Creare `plugin.json`, un `index.ts` con esportazione default e i file di supporto sotto la categoria appropriata in `src/`. Usare l’interfaccia plugin corrispondente ed esporre il payload della categoria. Preferire utilità di dominio e contesto alle dipendenze dall’implementazione di un altro plugin.

## 3. Manifest

I campi richiesti dal modello sono `id`, `type`, `name: {en, it}`, `version` e `apiVersion`. Gli ID devono essere unici e in kebab-case. A runtime vengono richiesti nome inglese, versione non vuota e API compatibile. Descrizione, permessi, dipendenze e configurazione sono facoltativi.

La configurazione fornisce `defaults` e `schema`: se entrambi esistono, ogni chiave dello schema deve avere un valore iniziale. Il campo `entry` non è richiesto: bootstrap importa esplicitamente i moduli. Vedere la [validazione del manifest](../src/core/plugin/manifest.ts).

## 4. Ciclo di vita

`setup(ctx)`, `onEnable(ctx)` e `onDisable(ctx)` possono restituire `void` oppure `Promise<void>`. Setup viene eseguito alla prima attivazione di un modulo disabilitato. [PluginLifecycleService](../src/application/plugins/PluginLifecycleService.ts) serializza le transizioni e registra gli errori. Cambiare strumento o transport mette in pausa la riproduzione; cambiare una categoria a selezione singola disattiva il modulo precedente.

Alla disattivazione rilasciare timer, listener e risorse audio. I temi seguono un percorso dedicato di caricamento dei token. La gestione degli errori non isola il codice non fidato.

## 5. Contesto

| API | Funzione |
|---|---|
| `ctx.manifest` | Manifest del plugin che riceve il contesto |
| `ctx.score.get()` / `ctx.score.set(piece)` | Spartito corrente |
| `ctx.instrument()` | Strumento attivo, oppure `null` |
| `ctx.scheduler` | Orologio di riproduzione |
| `ctx.registerParser(parser)` | Registra un parser appartenente al plugin |
| `ctx.ui.notify(level, text)` | Notifica `info`, `ok` oppure `error` |
| `ctx.ui.registerPanel(panel)` | Registra una definizione di pannello; l’integrazione nella shell è separata |
| `ctx.storage` | `get`, `set`, `remove` asincroni sul backend corrente |
| `ctx.i18n.t(key, vars)` / `ctx.events` | Traduzioni e bus eventi del core |
| `ctx.config()` / `ctx.configSet(key, value)` | Legge la configurazione unita / aggiorna un valore |

Le chiavi storage non sono isolate automaticamente per plugin. Aggiungere un prefisso, per esempio `my-plugin:last-position`. I repository di brani, OLGA e backup sono separati dal backend storage dei plugin. La shell corrente non monta automaticamente i pannelli registrati come pagine personalizzate.

### 5.1 Scheduler

Lo [scheduler](../src/core/scheduler/index.ts) conserva API di riproduzione, pausa, seek, fattore tempo e lettura del tempo. Gli eventi sono `frame`, `beat`, `schedule-window`, `end` e `sync`; le subscription restituiscono la funzione di rimozione. Pratica usa l’autoscroll sul tempo trascorso, indipendente dall’orologio audio. Non espone karaoke né comandi di riproduzione musicale/TAB; restano le anteprime e l’infrastruttura dell’editor.

## 6. Payload delle categorie

| Categoria | Payload |
|---|---|
| instrument | `instrument: Instrument` |
| parser | `parser: Parser` |
| renderer | `renderer: Renderer` |
| transport | `transport: Transport` |
| coach | `coach: Coach` |
| theme | `tokens: string` |
| content | `artists()`, `file()`, `buildPiece()` facoltativo |
| storage | `storage: StorageBackend` |

### 6.1 Strumenti e posizioni degli accordi

Uno strumento definisce corde, accordatura MIDI, tasti, `noteToPositions()` e indicazioni di rendering. Le note fuori intervallo restituiscono `[]`. ID e ordine visivo delle corde sono distinti: nella chitarra ID 1 è il Mi grave, mentre la riga superiore della TAB è il Mi acuto.

`capabilities` può dichiarare note, accordi e diagrammi. `chordLibrary` fornisce le posizioni preferite e `chordVoicings` alternative ordinate, con `baseFret` facoltativo. Gli array seguono gli ID delle corde crescenti: `null` significa corda muta, `0` corda a vuoto. La UI condivisa gestisce selezione ciclica e trasposizione. Vedere [adattatore chitarra](../src/instruments/guitar/index.ts) e [catalogo accordi](../src/instruments/guitar/chordLibrary.ts).

### 6.2 Parser, spartiti e contenuti

I parser espongono `id`, `formats`, `detect(content)` e `parse(content)` asincrono. Restituire un [Piece](../src/domain/score/types.ts) valido, con campi di timing, durata e battuta. Conservare sorgente e ancore degli accordi basate sui caratteri separatamente dal tempo musicale.

Un modulo di contenuto può restituire direttamente un Piece da `buildPiece()`; `null` seleziona il percorso file più parser. ABC/ChordPro del repertorio iniziale, brani utente e OLGA usano adattatori distinti. OLGA mantiene il layout originale. L’importazione MusicXML non è implementata.

### 6.3 Renderer, audio e temi

`Renderer.render(piece, instrument, target)` riceve un HTMLElement e restituisce un handle con `update(time, activeNotes)`, `seek(time)` e `resize()` / `destroy()` facoltativi. Rilasciare le risorse in `destroy()`.

I transport espongono `start(ctx)` e `stop()`. I coach espongono `start(ctx)` asincrono, `stop()` e tipo `standalone` oppure `guided`: questi contratti non implicano un accordatore o coach con microfono incluso.

Un tema esporta manifest e stringa CSS `tokens`. Usare le variabili `--mm-*` e i token UI condivisi. Vedere il [tema predefinito](../src/themes/default/index.ts).

## 7. Aggiungere un modulo integrato

Creare modulo e payload tipizzato, registrarli in bootstrap e aggiungere l’ID ai default solo se deve partire attivo. Aggiungere test significativi per attivazione, uso, disattivazione e riattivazione.

## 8. Configurazione

Impostazioni genera campi booleani, numerici, interi e stringhe dagli schemi. Usare `ctx.config()` e `ctx.configSet()`. La sincronizzazione non unisce le preferenze del dispositivo; ripristinarle dal backup è una scelta esplicita distinta.

## 9. Installazione, offline e sync

Queste funzioni sono servizi in `src/application/`, con adattatori browser in `src/infrastructure/`. Non richiedono pacchetti plugin separati. Vedere [collegamento e prima installazione](PEER-SYNC.md) e il README per offline e backup.

## 10. Permessi e codice esterno

`permissions` è un metadato descrittivo in questa build. Non esistono un loader esterno, un sandbox dei permessi o divieti rete/DOM applicati dal loader. La fotocamera per il QR viene richiesta dalla relativa funzione dopo un’azione dell’utente. L’elenco dei permessi nel manifest non rende sicuro codice esterno.

## 11. Compatibilità

`API_VERSION` è 1; la validazione accetta 1 e l’intero precedente, 0. Non converte automaticamente vecchie implementazioni. Versione del plugin e versione del pacchetto applicazione sono distinte. Aggiornare insieme contratti e documentazione quando cambia l’API.

## 12. Verifica

Eseguire `npm run quality` e i test pertinenti. Controllare rilascio delle risorse, appartenenza dei parser, persistenza della configurazione, tastiera/touch e comportamento della libreria. La [guida ai test](TESTING.md) copre browser, offline e baseline visive.
