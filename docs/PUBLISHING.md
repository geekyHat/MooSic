# Pubblicare la copia pulita / Publish the clean copy

La copia pubblica contiene il sorgente corrente e un solo commit iniziale su `main`. Non include la cartella `.git` del progetto di sviluppo, appunti interni, report locali, dipendenze o build generate. Nessun repository remoto è configurato automaticamente.

The public copy contains the current source and one initial commit on `main`. It does not inherit development history, internal notes, local reports, dependencies or generated builds. No remote repository is configured automatically.

## 1. Repository nuovo e vuoto / New empty repository

Su GitHub creare un repository vuoto, senza README, licenza o `.gitignore` iniziali. Mantenere privato il vecchio repository di sviluppo. Usare una nuova destinazione permette di pubblicare solo la storia della copia pulita, senza dover sovrascrivere la cronologia remota esistente.

Create an empty GitHub repository without an initial README, license or `.gitignore`. Keep the previous development repository private. A new destination publishes only the clean history and does not require overwriting an existing remote history.

## 2. Collegamento e push / Connect and push

Aprire un terminale nella **copia pubblica**, non nel repository di sviluppo. Sostituire `ACCOUNT` e `REPOSITORY` con i valori del nuovo repository:

Open a terminal in the **public copy**, then replace `ACCOUNT` and `REPOSITORY`:

```sh
git remote add origin https://github.com/ACCOUNT/REPOSITORY.git
git push -u origin main
```

La copia ha già il commit iniziale: non occorre importare branch, tag o commit del repository precedente. I file personali ignorati non devono essere aggiunti con `git add -f`.

The initial commit is already present. Do not import branches, tags or commits from the old repository. Do not force-add ignored personal files.

## 3. GitHub Pages

Nel nuovo repository scegliere **Settings → Pages → Build and deployment → Source: GitHub Actions**. Il workflow **Publish MusicMaestro** viene eseguito su push a `main`; si può avviare anche da **Actions → Publish MusicMaestro → Run workflow** dopo la configurazione di Pages. La disponibilità di Pages dipende dal tipo di repository e dal piano GitHub.

Select **Settings → Pages → Build and deployment → Source: GitHub Actions**. The **Publish MusicMaestro** workflow runs on `main` pushes and can also be started manually from Actions after Pages is configured. Pages availability depends on repository visibility and the GitHub plan.

Il deployment pubblica soltanto `dist/`, dopo controlli e test. Aprire l’indirizzo mostrato dal deployment riuscito. Per un repository di progetto il formato standard è `https://ACCOUNT.github.io/REPOSITORY/`; un dominio personalizzato può cambiarlo. Il workflow ricava automaticamente la sottocartella dai metadati Pages.

Only `dist/` is deployed after validation. Open the URL shown by the successful deployment. A project repository normally uses `https://ACCOUNT.github.io/REPOSITORY/`; custom domains may differ. The workflow derives the subdirectory automatically from Pages metadata.

## 4. Prova su telefono / Phone check

Aprire il sito HTTPS sul PC e creare il QR di collegamento da Impostazioni. Sul telefono il QR carica l’app e il percorso di installazione. Attendere la disponibilità offline e seguire la conferma del browser o le istruzioni iPhone/iPad. Poi completare lo scambio dei due codici sulla stessa LAN. [Guida completa](PEER-SYNC.md).

Open the HTTPS site on the PC and create a pairing QR in Settings. The phone opens the app and its installation flow. Wait for offline readiness, follow browser confirmation or iPhone/iPad instructions, then finish pairing on the same LAN. [Full guide](PEER-SYNC.md).

`localhost` sul PC non è un indirizzo di installazione per il telefono. Librerie salvate su origini diverse restano separate: usare backup o sincronizzazione per trasferire i contenuti.

PC localhost is not a phone installation address. Libraries on different origins remain separate; use backup or synchronization to move content.

[GitHub Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
