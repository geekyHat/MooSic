# MooSic — icone app e favicon

Testa della mucca con cuffie, senza scritta, su fondo chiaro opaco. Il fondo chiaro mantiene il simbolo scuro visibile anche nelle interfacce scure. Le icone sono raster; non sono file vettoriali.

## Integrazione in MooSic

Le icone di `web/` sono già copiate in `public/icons/` e collegate da `index.html` con il percorso base di Vite, compatibile con GitHub Pages sotto `/MooSic/`. Il manifest effettivo viene generato da `scripts/pwa.mjs`: `web/site.webmanifest` e `web/head.html` sono esempi del pacchetto, non configurazioni caricate dall’app. Non vengono dichiarate icone maskable perché il pacchetto non fornisce una variante con margini certificati per quel ritaglio. L’archivio originale qui conservato, inclusi i formati desktop, non viene scaricato nella cache offline. Il logo completo nell’intestazione è `public/Logo/MooSicLogo.png`.

## App desktop

- `app/moosic-16.png` fino a `app/moosic-1024.png`: PNG quadrati nelle dimensioni 16, 24, 32, 48, 64, 128, 256, 512 e 1024 pixel.
- `app/MooSic.ico`: icona Windows con risoluzioni 16, 24, 32, 48, 64, 128 e 256 pixel.
- `app/MooSic.icns`: icona macOS con risoluzioni fino a 1024 pixel.
- Su Linux puoi usare `app/moosic-256.png` o `app/moosic-512.png` per il launcher.

## Browser e web app

Copia il contenuto di `web/` in una cartella pubblica servita all'indirizzo `/icons/` (per esempio `public/icons/`). Inserisci il contenuto di `web/head.html` nel `<head>` della pagina. Se usi un percorso diverso, aggiorna anche i percorsi in `site.webmanifest`.

- `favicon.ico`: contiene 16, 32 e 48 pixel.
- PNG favicon: 16, 32 e 48 pixel.
- `apple-touch-icon.png`: 180 pixel.
- `icon-192.png` e `icon-512.png`: icone per manifest web.
- `site.webmanifest`: configurazione delle icone; adattala al progetto per le altre funzioni PWA.

La cartella Next.js App Router può usare direttamente `favicon.ico` come `app/favicon.ico`; in questo caso lascia a Next.js la gestione del relativo link.

Dopo la sostituzione del favicon può essere necessario ricaricare la pagina svuotando la cache.
