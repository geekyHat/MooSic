# Trasferire la libreria fra dispositivi

## Trasferimento con LocalSend (consigliato)

LocalSend trasferisce file sulla rete locale senza account o server esterni. Deve essere installato separatamente sui due dispositivi; MooSic prepara e importa il file della libreria. Il collegamento non richiede la videocamera del PC.

1. Installare [LocalSend dal sito ufficiale](https://localsend.org/download) su PC e telefono/tablet. Collegarli alla stessa rete Wi-Fi/LAN; il PC può usare Ethernet. Aprire la copia di MooSic che contiene la libreria e salvare le bozze.
2. In **Impostazioni → Trasferisci con LocalSend** premere **Prepara file della libreria**. La preparazione non apre automaticamente condivisioni né invia dati.
3. Premere **Salva file per LocalSend**. In LocalSend scegliere **Invia**, selezionare lo ZIP `MooSic-library-AAAA-MM-GG.zip` appena salvato, scegliere il dispositivo destinatario e accettare la ricezione su quel dispositivo. Se disponibile, **Condividi…** apre invece il menu del sistema: scegliere LocalSend. Il supporto dipende dal browser e dal tipo/dimensione del file; il download resta sempre disponibile.
4. Sul destinatario aprire MooSic → **Impostazioni → Importa libreria ricevuta**, selezionare lo ZIP ricevuto, controllare l’anteprima e premere **Unisci alla libreria**. Le preferenze restano locali salvo selezione esplicita. Terminare con **Riapri l’app**.
5. Per riportare le modifiche al primo dispositivo, ripetere in senso inverso. È uno scambio manuale di istantanee: le eliminazioni non vengono propagate e versioni diverse sono conservate separatamente.

Il file usa lo stesso formato del backup completo: brani salvati, TAB, arrangiamenti, alias, originali testuali e documenti OLGA. Foto/PDF originali e bozze non salvate sono esclusi. L’anteprima non modifica la libreria; l’unione conserva i contenuti presenti e salta i duplicati identici. Il repertorio iniziale arriva con gli aggiornamenti dell’app. Preparare nuovamente il file dopo ulteriori modifiche: il file pronto in memoria rappresenta il momento della preparazione.

MooSic non può installare LocalSend, forzarlo come destinazione del menu di condivisione né confermare che il destinatario abbia ricevuto o importato il file. Chiudere il menu di condivisione lascia il file disponibile; se la condivisione fallisce, usare il download. I file pronti restano in memoria finché vengono chiusi, sostituiti o si lascia la pagina. Il trasferimento LocalSend è cifrato, mentre lo ZIP salvato non è cifrato. [Protocollo e piattaforme LocalSend](https://github.com/localsend/localsend).

Se il destinatario non compare, verificare che LocalSend sia aperto sui due dispositivi, che la rete non sia una rete ospiti isolata e che firewall/VPN consentano il traffico locale. MooSic può importare anche un backup trasferito via USB. LocalSend non legge né sincronizza direttamente i database del browser.

## Collegamento WebRTC avanzato con due codici

Il vecchio percorso è chiuso per impostazione iniziale sotto **Impostazioni → Avanzate: vecchio collegamento con due codici**. Aprirlo esplicitamente solo per usare WebRTC. Il normale trasferimento LocalSend non richiede QR. Un vecchio invito può essere eliminato con **Usa LocalSend invece del QR**: vengono rimossi il codice in memoria, gli inviti salvati e il parametro dal link corrente, senza modificare la libreria. Nell’app già installata gli inviti non aprono automaticamente il pannello avanzato.


La soluzione scelta usa un canale dati WebRTC cifrato e due codici di abbinamento. Non richiede Syncthing, account, servizi di segnalazione, STUN o TURN. L’app rimane distribuibile come sito statico. I dispositivi devono essere sulla stessa rete Wi-Fi/LAN e il router deve consentire il traffico fra loro; reti ospiti isolate o connessioni mobili separate possono impedire il collegamento.

### Uso del collegamento WebRTC

1. Aprire **Impostazioni → Sincronizza con un altro dispositivo** su PC e telefono/tablet. Tenere entrambe le app aperte e in primo piano. Salvare prima le bozze musicali.
2. Sul primo dispositivo premere **Crea codice di collegamento**. Sul secondo aprire il link o inquadrare il QR. Se l’app è già aperta, si può usare **Leggi QR con fotocamera**, **Apri immagine QR**, oppure incollare il codice/link e premere **Usa codice ricevuto**.
3. Il secondo dispositivo genera un **codice di risposta**. Riportarlo sul primo: incollarlo, far leggere il QR alla sua fotocamera, oppure salvare il QR e aprirne l’immagine sul PC.
4. Confrontare le otto cifre/caratteri del **codice di verifica** nei due schermi. Premere **I codici coincidono — conferma** su entrambi soltanto quando coincidono.
5. L’app scambia e verifica le due librerie. L’anteprima indica quanti brani e documenti OLGA sono arrivati. Fino a questo momento non viene modificata nessuna libreria.
6. Su ciascun dispositivo premere **Unisci la libreria ricevuta**. Al termine scegliere **Riapri l’app**. L’unione viene confermata separatamente su ogni dispositivo.

## Primo accesso dal QR e installazione

Il QR della versione pubblicata contiene un link HTTPS che carica l’app sul telefono anche al primo accesso. La schermata **Porta la tua libreria su questo dispositivo** viene mostrata prima delle normali Impostazioni. Il service worker prepara automaticamente la lettura offline; gli strumenti foto/PDF restano un download facoltativo.

- Su browser che espongono la richiesta nativa, premere **Installa MooSic** e confermare nel dialogo del browser. Non viene aperta una richiesta di installazione senza un clic; accettare il prompt non viene presentato come prova dell’installazione prima dell’evento del browser.
- Su iPhone/iPad seguire **Condividi → Aggiungi alla schermata Home** e aprire la nuova icona. Se il lettore QR apre un browser interno, aprire il link in Safari. Su altri browser è disponibile la guida al relativo menu di installazione.
- L’invito viene conservato per il suo tempo residuo, al massimo dieci minuti. Un avvio dall’icona all’indirizzo iniziale lo recupera e apre le Impostazioni quando la nuova finestra condivide l’archiviazione della stessa origine. Il pannello QR resta chiuso finché si sceglie il collegamento avanzato.
- **Copia invito per riprendere** conserva il link negli appunti con un gesto esplicito. Su iOS Safari e l’app installata possono avere archivi separati: in quel caso incollare l’invito in **Impostazioni → Sincronizza con un altro dispositivo**, oppure leggere il QR dall’interno dell’app installata. Il campo selezionabile resta disponibile se l’accesso agli appunti viene negato.
- Si può scegliere **Continua nel browser** senza installare. Il trasferimento richiede comunque confronto del codice e conferma su entrambi i dispositivi, poi l’unione esplicita della libreria.

Il PC deve mantenere aperta l’offerta durante l’installazione. Se i codici scadono, generarne di nuovi. L’app non può rilevare ogni installazione né forzare l’apertura della PWA su tutte le piattaforme. Nessun manifest personalizzato contiene l’invito e nessun cookie lo invia al sito. [Installazione guidata e consenso: MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt); [isolamento degli archivi e rilevamento: web.dev](https://web.dev/learn/pwa/detection).

**Per il primo accesso il sito statico deve essere pubblicato e raggiungibile dal telefono tramite HTTPS.** Un repository GitHub privato o un’app aperta soltanto sul PC non costituiscono un indirizzo di installazione pubblico. Il collegamento WebRTC rimane senza server di sincronizzazione.

Gli indirizzi `localhost` e `127.0.0.1` funzionano solo sul dispositivo che li ospita. In quel caso il QR contiene il codice puro: sul telefono aprire la propria copia HTTPS dell’app e leggere quel QR dall’interno dell’app o incollare il codice. Il collegamento può avvenire anche fra copie dell’app servite da origini diverse, purché le versioni del protocollo siano compatibili.

## Cosa viene unito

Sono inclusi tutti i brani salvati nell’editor, TAB, arrangiamenti, fogli liberi, alias degli artisti, testi originali importati, metadati e documenti OLGA. Le copie identiche vengono saltate. I contenuti diversi con titoli o ID uguali sono conservati come copie numerate con nuovi ID, senza sovrascrivere il lavoro presente.

Questo è uno **scambio manuale di istantanee con unione**, non una replica continua: anche una modifica eseguita su un solo dispositivo viene conservata come variante quando sull’altro resta la vecchia versione. Non vengono propagate le eliminazioni; non ci sono risoluzioni automatiche basate sull’orologio. Una sincronizzazione ripetuta senza nuove modifiche non crea altre copie. Preferenze del dispositivo, bozze non salvate, foto/PDF originali, cache e stato dell’installazione restano locali. Il repertorio statico iniziale arriva con gli aggiornamenti dell’app.

Se un dispositivo conferma l’unione e l’altro annulla, il primo conserva l’unione già eseguita: non viene simulata una transazione distribuita. Si può riabbinare e ripetere lo scambio senza duplicare i contenuti già presenti.

## Confini e protezioni

- I codici contengono descrizioni e credenziali temporanee della connessione, senza testi musicali. Scadono dopo dieci minuti. Sono nel frammento `#` del link e non nella query HTTP. Un’offerta ricevuta e validata è conservata nella sessione e nel localStorage della stessa origine per riprendere il primo collegamento dopo l’installazione. Scadenza e validità vengono ricontrollate al recupero; i record scaduti o non validi vengono eliminati. Utilizzo, annullamento o creazione di un altro collegamento rimuovono l’invito memorizzato. Le risposte non vengono conservate perché richiedono la connessione originale del primo dispositivo.
- La risposta è vincolata all’offerta con un hash. Il codice di verifica deriva da entrambe le descrizioni. È sempre richiesta la conferma su entrambi gli schermi prima di leggere e inviare il backup locale.
- La cifratura del canale dati è fornita da DTLS in WebRTC. Non viene proposta una cifratura proprietaria. [Riferimento MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels).
- I trasferimenti sono suddivisi in blocchi da 16 KiB, con controllo della coda e limiti di dimensione. Un riscontro di ricezione evita di chiudere il canale prima che l’altro dispositivo abbia ricevuto l’intero file.
- Il file ricevuto deve superare SHA-256, struttura ZIP, CRC, hash dei singoli testi e validazione del formato di backup. Il ripristino riusa unione, lock, journal, rollback e recupero del backup esistente.
- Annullamento, disconnessione o errore durante il trasferimento non importano contenuti parziali. Dopo la ricezione integrale e la verifica è possibile confermare l’unione anche se l’altro dispositivo ha chiuso.
- Navigazione, aggiornamenti PWA e comandi di backup tengono conto del collegamento attivo. Le librerie non vengono inviate a GitHub o a un servizio terzo. La fotocamera viene richiesta solo con il comando esplicito e viene fermata dopo la lettura o la chiusura.

Il browser deve supportare WebRTC e funzionare su HTTPS o localhost. Senza server non è garantito attraversare NAT, firewall o reti isolate. La soluzione non sincronizza in background quando il sistema sospende la PWA. Il fatto che il repository GitHub sia privato non modifica la protezione del trasferimento: l’accesso al sito di installazione resta una questione di pubblicazione dell’app.

## Perché non Syncthing nella PWA

Syncthing sincronizza file/cartelle attraverso applicazioni esterne. Il browser conserva i dati dell’app in localStorage/IndexedDB e non offre una cartella del database da sincronizzare in sicurezza. [Documentazione Syncthing](https://docs.syncthing.net/users/faq.html). Sincronizzare i file interni del profilo browser non è il metodo di importazione della libreria. Se si desidera comunque usare Syncthing esternamente, si può trasportare il backup esportato e aprirlo nell’app, con un flusso diverso da questo abbinamento diretto.

## Moduli

`application/sync` espone contratto, stato e caricamento differito; `infrastructure/sync` gestisce codici e trasporto WebRTC; `LibraryTransfer` e `libraryTransfer.ts` preparano l’interfaccia LocalSend, il download e il controllo delle capacità di condivisione. `BackupSettings` riusa il servizio di backup per esportazione, anteprima e unione; la preparazione del file e il clic di condivisione sono separati per conservare l’attivazione richiesta dal browser. Gli altri componenti nelle Impostazioni gestiscono due codici, QR, fotocamera, consenso e anteprima. L’applicazione e il ripristino restano indipendenti dal trasporto. La creazione dei QR e il decoder delle immagini sono distribuiti con la build e disponibili nella cache offline.
