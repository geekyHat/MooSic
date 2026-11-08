# MooSic

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/icons/icon-192.png" />
  <img src="public/Logo/MooSicLogo.png" alt="MooSic — una mucca con le cuffie" width="160" />
</picture>

App locale per studiare la chitarra nel browser, con catalogo, tablature, notazione standard ed editor di canzoni. Non richiede account o backend applicativo.

Versione applicazione: **1.1.1** · Documentazione aggiornata: **2026-11-08**.

[Repository GitHub](https://github.com/geekyHat/MooSic) · [English](README.md) · [Architettura](docs/ARCHITECTURE.md) · [Test](docs/TESTING.md) · [Sincronizzazione](docs/PEER-SYNC.md)

## Sostieni MooSic

Lavoro in IT e sviluppo MooSic nel tempo libero. Se l’app ti è utile, puoi [offrirmi un caffè](https://buymeacoffee.com/scalcagnotm): il tuo sostegno mi aiuta a dedicare più tempo al suo miglioramento. Grazie!

## Funzionalità disponibili

- PWA installabile, lettura offline, strumenti foto/PDF offline facoltativi, aggiornamenti coordinati, backup/ripristino completo e pubblicazione automatica su GitHub Pages. [Configurazione](#installazione-offline-e-aggiornamenti).
- Libreria filtrabile per titolo, compositore e genere; contenuti pubblici e brani salvati dall'utente.
- **Accordatore per chitarra:** aprire **Accordatore → Tocca per accordare** e consentire l’accesso al microfono. Pizzicare una corda a vuoto alla volta: l’indicatore segnala se alzare o abbassare la nota e diventa verde entro ±10 cent, con scala di ±250 cent e stabilizzazione della lettura e della corda automatica. Accordatura standard E2–A2–D3–G3–B3–E4, riconoscimento automatico oppure selezione manuale su un disegno essenziale del manico con sei corde e tasti. Se una corda è molto scordata, selezionarla manualmente. L’audio resta sul dispositivo, senza registrazioni o invii; l’ascolto si ferma uscendo dalla pagina o portando l’app in background. Servono HTTPS (oppure localhost) e un browser compatibile con il microfono.
- **Indietro/Avanti del browser** ripristinano pagine e selezioni della libreria, inclusi filtri, lettere, paginazione e posizione di scorrimento. I brani con una sola versione e un solo arrangiamento disponibile si aprono direttamente in Pratica; con più possibilità rimane la schermata di scelta.
- **Scansione foto/PDF:** importa testi stampati da JPG, PNG, WebP o PDF, oppure usa **Scatta foto** su un telefono compatibile. Riconoscimento locale in italiano/inglese, rotazione delle foto, anteprima delle pagine PDF e testo correggibile prima della conferma. [Uso e limiti](#scansionare-una-foto-o-un-pdf).
- Arrangiamenti Tabs, Spartito e Accordi + testo con **autoscroll indipendente dall’audio**: avvio/pausa, velocità regolabile e ritorno all’inizio. Rimossi karaoke e comandi di riproduzione dalla vista di pratica.
- Autoscroll disponibile anche sui documenti OLGA già importati. Gli accordi espliciti `[Am]` / `[C/G]` vengono riconosciuti e riepilogati con i diagrammi disponibili; le righe senza parentesi restano testo originale.
- **Trasponi accordi:** i pulsanti −/+ spostano gli accordi di un semitono (due passi = un tono), aggiornano i diagrammi e permettono di ripristinare l’originale. Funziona sui marcatori OLGA riconosciuti e sui fogli accordi/testo dell’editor, compreso il basso degli slash chord. La modifica riguarda la vista di lettura e non sovrascrive i dati; TAB numeriche e notazione standard restano originali.
- **Posizioni alternative degli accordi:** passando il mouse o portando il focus su un diagramma compaiono contatore e frecce cicliche; funzionano anche i tasti ←/→. Sui dispositivi touch i comandi sono sempre visibili. La scelta è indipendente per ogni accordo, anche nei documenti OLGA riconosciuti e nei fogli trasposti. Le posizioni disponibili dipendono dal catalogo dello strumento; i diagrammi non supportati sono indicati esplicitamente.
- **Foglio libero** con sezioni/strofe, righe complete, righe vuote e soli accordi. Gli accordi si possono ancorare prima, dentro o dopo una parola, senza dipendere dal BPM.
- Timing di battute e parole conservato e modificabile per compatibilità; la vista di lettura non lo usa per evidenziazione o scorrimento.
- Bozze protette dall'uscita, salvataggio esplicito, controllo dei conflitti fra schede e percorso di recupero/esportazione della copia locale precedente.
- Temi chiaro/scuro, interfaccia IT/EN, navigazione da tastiera e layout mobile.

## Avvio

Usare Node.js 24 LTS aggiornato o superiore e npm.

```bash
npm ci --include=dev
npm run dev
```

Per distribuire una build statica:

```bash
npm run build
npm run preview
```

`dist/` contiene il risultato. Nessun deploy viene eseguito da questi comandi.

## Repertorio iniziale e dati personali

Il repertorio iniziale contiene dieci studi: Ode to Joy, Für Elise, Greensleeves, Bella Ciao, Amazing Grace, Auld Lang Syne, Frère Jacques, Twinkle, Twinkle, Little Star, Minuetto in Sol BWV Anh. 114 di Petzold e Bourrée BWV 996 di Bach. Gli ultimi due sono studi del tema melodico in TAB/notazione; quattro fogli ChordPro forniscono accompagnamenti semplici con accordi e testo. [Fonti e perimetro](src/content/publicdomain/SOURCES.md).

I brani dell’editor sono separati dal repertorio distribuito. L’installazione non azzera una libreria già presente nello stesso browser/origine.

## Sincronizzare PC e telefono senza server

Il percorso consigliato è **Impostazioni → Trasferisci con LocalSend**. Installare [LocalSend](https://localsend.org/download) sui due dispositivi e collegarli alla stessa rete Wi-Fi/LAN. In MooSic scegliere **Prepara file della libreria**, poi **Condividi…** e LocalSend nel menu del sistema, se il browser supporta la condivisione dello ZIP. Altrimenti usare **Salva file per LocalSend** e inviarlo da LocalSend. Sul destinatario scegliere **Importa libreria ricevuta**, selezionare lo ZIP, controllare l’anteprima e premere **Unisci alla libreria → Riapri l’app**. I contenuti presenti restano e le copie identiche sono saltate. Per riportare le modifiche ripetere in senso inverso. LocalSend è un’app separata: MooSic non la installa, non la seleziona nel menu e non rileva la ricezione. Non è una sincronizzazione in background. [Procedura e problemi comuni](docs/PEER-SYNC.md#trasferimento-con-localsend-consigliato).

**Alternativa avanzata:** in **Impostazioni → Avanzate: vecchio collegamento con due codici → Sincronizza con un altro dispositivo** creare un codice sul primo dispositivo, riportare il codice di risposta dal secondo e confrontare il codice di verifica. Dopo la conferma su entrambi, le librerie vengono scambiate attraverso WebRTC cifrato e verificate prima dell’unione. Funziona sulla stessa rete Wi-Fi/LAN senza server di abbinamento. Sono disponibili link, QR, fotocamera, immagine QR e copia/incolla.

Brani, TAB, arrangiamenti e documenti OLGA vengono uniti senza cancellare i contenuti presenti; le versioni diverse restano come copie numerate. È uno scambio manuale: eliminazioni e preferenze non vengono propagate. [Procedura completa e limiti](docs/PEER-SYNC.md).

**Vecchi inviti QR:** sul telefono senza app compare una schermata di benvenuto con installazione, preparazione automatica offline e **Usa LocalSend invece del QR**, che elimina l’invito precedente. Il vecchio collegamento è chiuso sotto **Avanzate: vecchio collegamento con due codici** e richiede una scelta esplicita per aprirlo. Nei browser compatibili **Installa MooSic** apre la conferma nativa; su iPhone/iPad compaiono i passaggi per aggiungere l’app alla schermata Home. L’offerta validata resta disponibile fino alla sua scadenza, al massimo dieci minuti: aprendo la nuova icona l’invito resta disponibile quando l’archivio è condiviso, senza aprire automaticamente i controlli QR avanzati. Se Safari e l’app usano archivi separati, **Copia invito per riprendere** permette di incollarlo nell’app installata; resta anche la lettura del QR dall’app. Serve l’indirizzo HTTPS pubblicato: localhost sul PC non è un indirizzo di installazione per il telefono. [Flusso e limiti dei browser](docs/PEER-SYNC.md#primo-accesso-dal-qr-e-installazione).

## Installazione, offline e aggiornamenti

Aprire l’indirizzo HTTPS dell’app pubblicata, poi **Impostazioni → Installa MooSic**, oppure usare il comando di installazione del browser. Su iPhone/iPad usare Safari: **Condividi → Aggiungi alla schermata Home**. Il pulsante si attiva quando il browser offre l’installazione. Non occorre un account né un server applicativo: GitHub Pages distribuisce i file, poi ogni utente importa le proprie librerie sul dispositivo. Non aprire `dist/index.html` con `file://`.

Prima di scollegarsi attendere **Libreria e lettura pronte offline** nelle Impostazioni. Vengono preparate tutte le pagine, diagrammi, trasposizione, autoscroll, editor e importazioni locali, senza doverle aprire una per una. **Scarica strumenti foto/PDF offline** prepara anche OCR italiano/inglese, font e decoder PDF (circa 20 MB). Un download incompleto si può riprovare; lo stato pronto compare soltanto dopo la verifica. Il server di sviluppo non registra un service worker. I campioni audio dell’editor non fanno parte del pacchetto offline.

**Versioni riconoscibili:** nelle Impostazioni compaiono versione e build della pagina in uso, oltre alla versione/build disponibile. GitHub Pages assegna `major.minor.N`: major/minor derivano da `package.json` e N è il numero di esecuzione del workflow di pubblicazione, mai inferiore alla patch di base. Una pubblicazione successiva aumenta la patch; una riesecuzione mantiene lo stesso numero. La build locale usa la versione del pacchetto; `npm run version:patch` incrementa la base senza creare tag Git. Il messaggio di aggiornamento completato compare soltanto quando è stata ricaricata la release prevista e il worker che controlla la pagina conferma la stessa versione/build.

La ricerca degli aggiornamenti avviene all’avvio, al ritorno online e periodicamente mentre l’app è aperta. L’attivazione ha un limite di recupero di 20 secondi: se si blocca, la pagina viene sbloccata e permette di riprovare. Il recupero funziona anche quando manca l’evento di cambio del worker. Se una vecchia installazione è già ferma sulla sua schermata di aggiornamento, chiudere e riaprire l’app una volta, poi riprovare dalle Impostazioni; non cancellare i dati del sito. Una nuova versione scaricata aspetta **Installa aggiornamento**: salvare o annullare le bozze e terminare le importazioni in tutte le schede dell’app. L’aggiornamento coordina le schede prima di ricaricarle; conserva brani, documenti OLGA, preferenze e strumenti di riconoscimento già scaricati.

**Proteggi dati sul dispositivo** richiede al browser l’archiviazione persistente. La concessione non è garantita e non impedisce la cancellazione manuale dei dati: mantenere un backup fuori dal dispositivo.

## Backup completo e trasferimento fra dispositivi

Il trasferimento LocalSend mostra il numero effettivo di brani e documenti OLGA nello ZIP e usa nomi con data, ora e suffisso casuale per distinguere più esportazioni. Se la libreria musicale è vuota, il percorso di trasferimento lo segnala invece di produrre uno ZIP ambiguo: verificare browser e indirizzo/origine corretti. I normali backup di sole preferenze restano possibili. Anteprima e risultato mostrano anche il totale complessivo: **0 brani dell’editor + 28.455 documenti OLGA significa 28.455 elementi**, non un archivio vuoto. Se tutti gli elementi sono già presenti viene indicato esplicitamente. Dopo l’unione viene aggiornata anche la libreria in memoria; riaprendo l’app si applicano le eventuali preferenze ripristinate.

In **Impostazioni → Scarica backup completo** si ottiene uno ZIP locale con canzoni/arrangiamenti dell’editor, alias degli artisti, testi originali importati, documenti OLGA e preferenze. Non vengono incluse bozze non salvate né foto/PDF originali: conservare separatamente questi ultimi. Il backup non è cifrato e non viene inviato a nessun servizio.

Per ripristinare, scegliere **Apri backup** e attendere la verifica integrale. L’anteprima mostra data e conteggi senza modificare la libreria. **Unisci alla libreria** aggiunge i contenuti, salta le copie identiche e assegna numeri/nuovi ID ai conflitti senza cancellare i brani presenti. **Ripristina anche le preferenze** è facoltativo e inizialmente disattivato. Alla conferma finale premere **Riapri l’app**. Trasferire manualmente lo ZIP su un altro dispositivo per caricarvi la propria libreria.

Il formato ha una versione, controlli CRC e SHA-256 dei testi. Limiti: ZIP 256 MB, 532 MB espansi compreso il manifest da 20 MB, 60.000 documenti OLGA (2 MB ciascuno), 10.000 brani dell’editor; resta necessario spazio libero sul dispositivo. Un errore di salvataggio annulla le modifiche finali. Se l’app si interrompe durante il ripristino, il diario di recupero viene controllato prima di caricare la libreria al prossimo avvio. Il vecchio percorso di recupero dell’editor rimane disponibile per dati storici non interpretabili.

## Pubblicazione automatica su GitHub Pages

Il workflow [pages.yml](.github/workflows/pages.yml) verifica tipi, architettura, unit test, backup/navigazione, offline e aggiornamenti reali; poi crea e pubblica **soltanto `dist/`** a ogni push su `main`, oppure con avvio manuale. Il percorso del repository viene ricavato dai metadati Pages. Librerie e backup dell’utente restano fuori dalla distribuzione.

Per attivarlo:

1. Caricare la copia pubblica pulita sul ramo `main` di [geekyHat/MooSic](https://github.com/geekyHat/MooSic), mantenendo privato il repository di sviluppo.
2. Nel repository selezionare **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Aprire l’URL del deployment **Publish MooSic**. I push successivi aggiorneranno lo stesso indirizzo.

Il repository pubblico è [geekyHat/MooSic](https://github.com/geekyHat/MooSic). La [guida alla pubblicazione](docs/PUBLISHING.md) spiega come caricare la copia pulita e attivare Pages. Con la configurazione predefinita di Pages l’indirizzo di installazione sarà **https://geekyhat.github.io/MooSic/** dopo il deployment riuscito; questo non conferma che il sito sia già online. Mantenere stabile l’indirizzo di produzione. Localhost, Pages e un dominio personalizzato hanno dati locali distinti: per trasferirli usare il backup completo. [Requisiti ufficiali del workflow Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Per un altro hosting statico HTTPS distribuire tutto `dist/`, inclusi `sw.js`, manifest, icone, `assets/` e `scan-assets/`. Per una sottocartella: `MM_BASE_PATH='/MooSic/' npm run build`. Evitare cache HTTP lunghe per `index.html` e `sw.js`; gli asset con hash possono essere immutabili. La navigazione con hash non richiede riscritture lato server.

```bash
npm run check:offline   # dopo la build: verifica file e hash della cache
npm run test:pwa        # crea due build e prova offline/aggiornamenti sotto /MooSic/
```

## Navigazione alfabetica della libreria

La libreria si apre con gli artisti raggruppati in ordine alfabetico. I menu **Artisti**, **Canzoni**, **TAB**, **Accordi** e **Spartiti** cambiano l’indice: **Canzoni** mostra i titoli di tutti gli artisti; le viste per formato mostrano i brani che hanno un arrangiamento del tipo scelto e, aprendo il brano, propongono soltanto quel tipo. Il nome dell’artista nell’elenco globale delle canzoni permette di aprire il suo repertorio.

L’indice **A–Z** seleziona direttamente una lettera anche oltre la prima pagina; **Tutti** ripristina l’elenco completo. Gli accenti vengono raggruppati con la lettera base, i numeri in **0–9**, le altre iniziali in **#**. Anche le canzoni di ogni artista sono alfabetiche, con ordinamento naturale delle varianti: `(2)` precede `(10)`. Ricerca, compositore, genere, vista e lettera selezionata si combinano. Gli elenchi mostrano 48 risultati per volta con **Mostra altri**; tornando da una canzone si ritrova la lettera selezionata.

**Apri** passa direttamente a Pratica quando l’indice corrente offre una sola versione con un solo arrangiamento. Negli indici per formato si considerano soltanto gli arrangiamenti del formato selezionato. Con più versioni/arrangiamenti rimane la scelta; i brani con soli metadati mantengono la vista dei dettagli.

**Indietro/Avanti del browser** seguono artisti, scelta del brano, arrangiamenti e schede di Pratica, selezioni nell’editor e impostazioni. Tornando alla libreria vengono ripristinati ricerca, filtri, lettere, pagina ampliata e posizione di scorrimento. La digitazione nella ricerca aggiorna la voce corrente, senza creare un passo per carattere. Gli URL con hash riaprono la stessa vista dopo un refresh e funzionano anche su hosting statico. Un brano locale mancante mostra un messaggio dedicato; negli URL compaiono identificativi e opzioni della libreria, mai documenti musicali o bozze dell’editor. La navigazione del browser mantiene la conferma per bozze non salvate nell’editor e nelle importazioni di testo/foto. Dalla prima voce dell’app, Indietro può uscire normalmente.

## Importare TAB e ChordPro

In **Libreria → Importa file**, selezionare uno o più file locali (fino a 25, massimo 100 KB ciascuno). Sono accettati `.tab`, `.cho`, `.chordpro`, `.chopro`, `.chord`, `.crd` e `.pro` di testo in UTF-8. Nessun file viene inviato a un servizio esterno.

Il pulsante **Aggiungi file** permette di selezionare più file insieme (su PC con Ctrl/Cmd o Maiusc) oppure aggiungerli in più passaggi alla stessa coda, conservando le correzioni già inserite. Il contatore mostra quanti file sono selezionati, da completare o da verificare; il limite di 25 vale per l’intera coda. Per più brani senza artista, usare **Artista per i file senza artista → Applica ai file senza artista**: i campi già compilati vengono conservati.

Il cantante/gruppo viene cercato nelle informazioni interne (`artist`, `performer`, `singer`, `cantante` e intestazioni testuali equivalenti), nei sottotitoli con crediti riconoscibili, nel nome del file e nel titolo interno. Nomi come `Artista - Canzone` o `Canzone - Artista`, anche con underscore e numero di traccia, vengono confrontati con gli artisti già noti. Un interprete esplicito ha precedenza sui crediti dell’autore/compositore. Quando l’ordine artista/titolo è incerto o i crediti interni sono discordanti, **Conferma artista e titolo** oppure **Inverti artista e titolo** risolvono il dubbio prima del salvataggio. Se l’artista non è ricavabile, viene richiesto esplicitamente.

Prima della conferma si possono correggere titolo e artista. Nomi uguali, anche con maiuscole, accenti o spazi diversi, riusano la stessa scheda. Per nomi incompleti o simili (per esempio “Beetoven” e “L. van Beethoven”) viene chiesto se si tratta dello stesso artista. La scelta affermativa viene ricordata insieme ai brani salvati; scegliere “artista diverso” mantiene due nomi distinti. Titolo e artista sono obbligatori nell’importazione.

Sotto lo stesso artista, un titolo già occupato con contenuto diverso diventa `Titolo (1)`, `Titolo (2)` e così via. Una copia identica già importata viene saltata. L’anteprima mostra il risultato; i file validi del gruppo vengono scritti insieme, senza sovrascrivere i brani esistenti. Se un file non è valido, rimuoverlo dall’anteprima prima di confermare gli altri. Un errore di spazio conserva la selezione per riprovare.

Le TAB supportate sono blocchi ASCII di sei corde in accordatura standard, tasti 0–24, fino a 32 battute generate. Attacchi simultanei e tasti a due cifre vengono conservati; le ripetizioni `xN` a fine blocco sono espanse. Il ritmo è inizialmente un beat per attacco: tecniche, pause e durate dettagliate vanno verificate sul **File originale importato**, disponibile anche in Pratica. Non sono supportati i formati binari Guitar Pro/Power Tab.

ChordPro importa metadati, accordi in linea, sezioni, commenti, ritornelli ripetuti e blocchi TAB. Ogni riga musicale riceve inizialmente quattro beat, marcati come approssimativi; non viene ricostruito automaticamente il timing del canto. Sono supportati 4/4 e BPM 40–240, fino a 256 righe musicali. Impostazioni di presentazione o altri metadati non applicati sono elencati come avvisi e restano nel file originale. Trasposizioni e sezioni delegate non supportate (per esempio ABC/LilyPond) fanno rifiutare il file; i canzonieri con più brani vanno separati.

**Unisci artisti**, sempre in Libreria, permette di correggere nomi duplicati già salvati. Si sceglie l’artista locale da unire e il nome da conservare: tutti i brani e gli ID rimangono presenti, con numerazione dei titoli in conflitto. I due brani inclusi di Beethoven ora mostrano lo stesso nome in libreria e in Pratica.

L’importazione usa solo il dispositivo corrente: PC, telefono e tablet hanno librerie locali separate. Per aprire il server locale da un dispositivo sulla stessa rete si può usare `npm run dev -- --host 0.0.0.0` e visitare l’indirizzo del PC con la porta mostrata da Vite. Per installare la PWA usare la build HTTPS descritta sotto; per unire le librerie fra dispositivi usare Impostazioni → Trasferisci con LocalSend sulla stessa rete Wi-Fi/LAN, come nella [guida](docs/PEER-SYNC.md). Mantenere lo stesso indirizzo/origine per ritrovare i dati locali.

I test includono [file scaricati dal progetto ufficiale ChordPro](tests/fixtures/imports/README.md), con provenienza e hash, più TAB e casi di conflitto. Eseguire `npm run test:browser -- tests/import.spec.ts` per la verifica del percorso completo.

## Scansionare una foto o un PDF

Aprire **Libreria → Scansiona foto / PDF**. Scegliere una foto o un PDF di una sola canzone, oppure usare **Scatta foto** su un telefono compatibile per la fotocamera posteriore. Sul PC il browser può proporre un normale selettore di file. Inquadrare il foglio diritto, nitido e ben illuminato. Sono supportati JPG, PNG, WebP e PDF fino a 25 MB; massimo 12 pagine PDF della stessa canzone. Convertire prima le foto HEIC in JPG.

Scegliere italiano o inglese prima della lettura. Per i PDF viene usato il livello di testo quando contiene testo significativo; altrimenti si riconosce la pagina con OCR. **Usa OCR per ogni pagina PDF** serve nei documenti misti con solo il titolo selezionabile. Per una foto ruotata, impostare **Rotazione della foto → Leggi di nuovo**. La lettura si può interrompere e riprovare.

Confrontare l’anteprima con il **Testo riconosciuto** e correggere eventuali errori. I marcatori espliciti `[Am]` / `[C/G]` abilitano diagrammi, posizioni alternative e trasposizione; gli accordi senza parentesi restano testo. Premere **Verifica importazione**, controllare titolo e artista e confermare. Il salvataggio riusa riconoscimento degli artisti, controllo dei duplicati e numerazione dei titoli dell’importazione esistente. Il brano è poi disponibile in Pratica e nell’editor.

Il documento viene elaborato sul dispositivo con [Tesseract.js](https://github.com/naptha/tesseract.js) e [PDF.js](https://github.com/mozilla/pdf.js). Codice, worker e lingue sono distribuiti dal sito stesso e caricati quando servono, senza servizi di riconoscimento remoti o CDN durante l’uso. Per il riconoscimento senza rete scaricare prima gli strumenti foto/PDF nelle Impostazioni. Viene salvato soltanto il testo corretto: conservare separatamente foto e PDF originali.

Si riconosce il testo stampato, non la notazione musicale: scrittura a mano, note sul pentagramma, numeri delle TAB, colonne complesse e ritmo preciso possono richiedere trascrizione manuale. Controllare grafia e posizione degli accordi prima di suonare.

## Importare lo ZIP OLGA in locale

1. Aprire **Libreria → import olga archive** e scegliere una copia locale di `OLGA Archive.zip` che si ha diritto di utilizzare. Non occorre estrarla.
2. Attendere la verifica. Per i nomi di artisti simili o generici, scegliere il nome finale e confermare; per unirli a un artista già presente, usare esattamente il suo nome. Dopo aver controllato i suggerimenti, **Mantieni separati e conferma i nomi rimanenti** mantiene distinti gli altri artisti.
3. Premere **Importa nella libreria**. I brani esistenti rimangono: stesso artista e titolo con testo diverso riceve `(1)`, `(2)`, ecc.; documenti originali identici vengono saltati. Reimportare lo ZIP permette di aggiungere materiale nuovo senza duplicare quello invariato.
4. Aprire artista, brano e arrangiamento: in **Pratica** compare il documento originale, con spaziatura, TAB, accordi, istruzioni e avvisi sui diritti. Basso, chitarra acustica e classica restano leggibili senza forzarli nel modello a sei corde. Per questi documenti non sono disponibili riproduzione automatica o conversione nell’editor. Il filtro Genere consente di scegliere le etichette dello strumento.

Le raccolte `main` / `main N`, `chordpro`, `bass`, `acoustic`, `classical`, `cowpie`, `praise_songs` e le cartelle degli aggiornamenti storici vengono riconosciute senza creare artisti con il nome della raccolta. Si leggono `.crd`, `.tab`, `.btab`, `.chopro`, `.chordpro`, `.pro`, `.cho`, `.lyr`, `.num`, `.txt`; archivi annidati, programmi, MIDI e documentazione tecnica vengono esclusi. Le `.crd` OLGA spesso hanno accordi sopra il testo e vengono conservate come tali. Sono letti UTF-8 e Windows-1252. Le intestazioni dell’interprete aiutano a riconoscere l’artista; l’indirizzo email del trascrittore non viene usato come cantante. I metadati storici possono comunque richiedere correzione umana.

Limiti: ZIP 256 MB, 60.000 elementi, documento musicale 2 MB, testo musicale espanso dichiarato 512 MB. ZIP64, archivi suddivisi/cifrati, compressioni non supportate, percorsi non sicuri e CRC errati vengono rifiutati. Lettura e scrittura avvengono a blocchi; un errore o l’annullamento conserva il catalogo precedente. Quando disponibili, i Web Locks serializzano il salvataggio OLGA fra schede.

I documenti OLGA usano **IndexedDB** (`musicmaestro-olga`), separata dal localStorage dell’editor; il testo viene caricato soltanto aprendo il documento. Il browser decide quota e conservazione dello spazio: mantenere lo ZIP per poter reimportare. La cancellazione dei dati del sito elimina la libreria; il vecchio recupero dell’editor copre soltanto i suoi dati, mentre il backup completo nelle Impostazioni include OLGA. La libreria mostra 48 risultati per volta con **Mostra altri**. Ogni dispositivo/browser mantiene i propri dati; la PWA installata legge la libreria offline. La sincronizzazione manuale nelle Impostazioni permette di unire i contenuti fra dispositivi sulla stessa rete, senza cloud.

### Provenienza e diritti

L’app non include né scarica automaticamente archivi OLGA. Importare soltanto materiale che si ha diritto di utilizzare, mantenere crediti e avvisi originali e conservare una copia del proprio archivio. La licenza MIT del software non attribuisce diritti sui brani o sugli arrangiamenti importati.

Dopo `npm run build`, test facoltativo dell’archivio completo sulla build statica, con la propria copia locale e senza upload:

```bash
MM_OLGA_ARCHIVE='/percorso/OLGA Archive.zip' npm run test:browser -- --config playwright.olga.config.ts
```

## Creare un foglio di canzone

1. Aprire **Editor** e **Nuova canzone**. Partire dall’artista: scrivere il nome e scegliere uno dei suggerimenti per riusare un artista della libreria, oppure inserire un nuovo nome. I suggerimenti comprendono nomi simili; maiuscole, accenti e spazi ripetuti non creano schede duplicate. Inserire il titolo e premere **Crea**. Dalla libreria, **Modifica nell’editor** riapre un brano locale.
2. Selezionare **Accordi + testo** e **Foglio libero della canzone**. La conversione dalla griglia conserva testo, accordi e timing delle battute precedenti; non riscrive automaticamente i vecchi brani.
3. Scrivere righe complete con accordi fra parentesi quadre. Il pulsante di inserimento usa il cursore effettivo della textarea.

Esempio originale:

```text
{c:Strofa 1}
[C]Ri[Am]cordo il mare[G]
Una luce nella sera

{c:Ritornello}
[Dm] [G]
```

4. Nella sezione **Durata delle righe**, impostare beat iniziale/finale e timing delle parole. Una riga può attraversare più battute. Le righe nuove partono da quattro beat: è un'impostazione iniziale, non un'analisi automatica della canzone.
5. Salvare l’arrangiamento con **Salva**: il brano viene aggiornato in libreria e selezionato per **Pratica**. **Salva dettagli** salva soltanto i metadati; un brano senza arrangiamenti compare comunque in libreria, con un invito a completarlo nell’editor. Gli errori conservano la bozza. Per chiudere un editor con sintassi/timing non validi correggerli o usare esplicitamente Annulla.

Le griglie sono limitate a 32 battute; il foglio libero a 256, in 4/4. Il sottoinsieme ChordPro supportato comprende `[accordo]`, `{c:sezione}`, alcuni alias per sezioni e parentesi letterali con escape. L'esportazione testuale **non** include ID e timing proprietari. Non è un importatore completo di ChordPro né un import automatico da Ultimate Guitar.

## Dati e privacy

Le canzoni dell’editor restano nel `localStorage` dell'origine corrente (`mm:user-songs`); preferenze e copie di recupero usano chiavi separate. Cambiare browser, porta/origine o cancellare i dati del sito può rendere indisponibile la libreria locale: esportare la copia prima di cancellarla. Il recupero non equivale a backup cloud e un record non interpretabile rimane esportabile, non viene magicamente riparato.

Non sono presenti account, sincronizzazione cloud, analytics o invio del repertorio a un servizio esterno. Usare testi e arrangiamenti propri, di pubblico dominio o con autorizzazione.

All’avvio, se ci sono brani locali, il catalogo **Le mie canzoni (editor)** viene attivato anche quando manca nelle vecchie preferenze. Salvare dall’editor lo riattiva anche se era stato disabilitato nelle impostazioni. I brani esistenti vengono raggruppati per artista senza riscrivere i dati salvati.

## Verifiche

La [guida ai test](docs/TESTING.md) descrive le verifiche riproducibili di offline, aggiornamenti, backup e collegamento fra dispositivi.

```bash
# TypeScript, lint, confini/cicli, unit test, build e budget bundle
npm run quality
# Test dei gate con violazioni intenzionali temporanee
npm run check:gates
# Test browser funzionali (Chromium)
npm test
# Estensione a Firefox
MM_BROWSERS=chromium,firefox npm test
# Smoke della build di produzione, dopo la build
npm run test:production
```

Installare i browser necessari con `npx playwright install chromium firefox webkit`. Chromium di sistema è un fallback locale; `CHROMIUM_PATH` permette un percorso esplicito. In CI vengono usati i browser di Playwright. Su host con librerie WebKit mancanti usare il container ufficiale, senza installare pacchetti di sistema alla cieca.

I confronti visivi hanno una baseline fissata al container `mcr.microsoft.com/playwright:v1.64.1-noble`: usare `npm run test:visual`, `npm run check:visual-gate` e poi nuovamente `npm run test:visual` in quell'ambiente. Non aggiornare le baseline soltanto per far sparire un errore. Il workflow `.github/workflows/quality.yml` usa lo stesso ambiente e conserva screenshot, trace e report. La [guida ai test](docs/TESTING.md) descrive ambiente e requisiti audio; le verifiche automatiche non equivalgono a una certificazione di accessibilità.

## Struttura del codice

- `src/domain/`: dati musicali, accordi, validazione e conversione degli arrangiamenti; niente React, storage o DOM.
- `src/application/`: servizi di canzoni/catalogo, preferenze, notifiche e controllo della riproduzione.
- `src/infrastructure/`: persistenza locale, migrazione e recupero.
- `src/features/{library,editor,practice,settings}/`: pagine, componenti, hook e modelli delle singole funzioni.
- `src/shared/`: primitive UI, hook comuni e protezione della navigazione.
- `src/app/`: composizione dei servizi, provider, shell e caricamento differito delle pagine.
- Plugin di strumenti, parser, renderer, transport, contenuti e temi conservano i propri ID e contratti. I re-export ancora usati rimangono come compatibilità, non come implementazioni duplicate.

La [guida di architettura](docs/ARCHITECTURE.md) descrive la struttura corrente. I manuali [IT](docs/manuale-adattatori.md) / [EN](docs/manual-adapters.md) descrivono i contratti plugin implementati.

## Limiti e sviluppi futuri

Coach con microfono, rilevamento pitch, import MusicXML, cloud e riconoscimento automatico del timing del canto **non sono implementati**. L'ukulele resta riservato, non viene presentato come supporto completo. I diagrammi/audio non interpretano ogni simbolo di accordo possibile; per i diagrammi sconosciuti compare uno stato non disponibile.

L'ascolto musicale umano, gli screen reader e i dispositivi fisici restano verifiche manuali: gli automatismi controllano sorgenti audio, clock, geometria, immagini e semantica, non l'esperienza percepita.

## Licenza

MIT — [LICENSE.md](LICENSE.md).
