# Pubblicare MooSic / Publish MooSic

Il repository pubblico è [geekyHat/MooSic](https://github.com/geekyHat/MooSic), con remoto Git `https://github.com/geekyHat/MooSic.git`. La copia pubblica parte da una storia nuova su `main`, senza ereditare appunti interni, report locali o cronologia del progetto di sviluppo.

The public repository is [geekyHat/MooSic](https://github.com/geekyHat/MooSic), with Git remote `https://github.com/geekyHat/MooSic.git`. The public copy starts with fresh history on `main`, without internal notes, local reports or development history.

## 1. Destinazione pubblica / Public destination

Usare il nuovo repository **MooSic** per la copia pulita e mantenere privato il vecchio repository di sviluppo. Se GitHub contiene già un README o altri commit iniziali, integrare quella storia prima del push; non sovrascriverla con un push forzato.

Use the new **MooSic** repository for the clean copy and keep the previous development repository private. If GitHub already has a README or other initial commits, reconcile that history before pushing; do not overwrite it with a force push.

## 2. Collegamento e push / Connect and push

Aprire un terminale nella **copia pubblica**, verificare il remoto `origin`, salvare le modifiche e caricare `main`:

Open a terminal in the **public copy**, check `origin`, commit the changes and push `main`:

```sh
git remote -v
git status --short
git add .
git commit -m "Brand MooSic for public release"
git push -u origin main
```

`origin` deve indicare `https://github.com/geekyHat/MooSic.git`. In una copia senza remoto usare `git remote add origin https://github.com/geekyHat/MooSic.git`. Non importare branch, tag o commit del repository precedente. I file personali ignorati non devono essere aggiunti con `git add -f`. Per una copia già aggiornata e committata basta il push.

`origin` must point to `https://github.com/geekyHat/MooSic.git`. If no remote is configured, run `git remote add origin https://github.com/geekyHat/MooSic.git`. Do not import branches, tags or commits from the old repository or force-add ignored personal files. If all changes are already committed, only the push is needed.

## 3. GitHub Pages

Nel nuovo repository scegliere **Settings → Pages → Build and deployment → Source: GitHub Actions**. Il workflow **Publish MooSic** viene eseguito su push a `main`; si può avviare anche da **Actions → Publish MooSic → Run workflow** dopo la configurazione di Pages. La disponibilità di Pages dipende dal tipo di repository e dal piano GitHub.

Select **Settings → Pages → Build and deployment → Source: GitHub Actions**. The **Publish MooSic** workflow runs on `main` pushes and can also be started manually from Actions after Pages is configured. Pages availability depends on repository visibility and the GitHub plan.

Il deployment pubblica soltanto `dist/`, dopo controlli e test. Con la configurazione predefinita l’indirizzo sarà **https://geekyhat.github.io/MooSic/**. Verificare l’URL mostrato dal deployment riuscito; un dominio personalizzato può cambiarlo. Il workflow ricava automaticamente la sottocartella dai metadati Pages. Questa guida non conferma che il sito sia già pubblicato.

Only `dist/` is deployed after validation. The default URL will be **https://geekyhat.github.io/MooSic/**. Verify the URL shown by a successful deployment; a custom domain may change it. The workflow derives the subdirectory automatically from Pages metadata. This guide does not confirm that the site is already live.

## 4. Prova su telefono / Phone check

Aprire il sito HTTPS sul PC e creare il QR di collegamento da Impostazioni. Sul telefono il QR carica l’app e il percorso di installazione. Attendere la disponibilità offline e seguire la conferma del browser o le istruzioni iPhone/iPad. Poi completare lo scambio dei due codici sulla stessa LAN. [Guida completa](PEER-SYNC.md).

Open the HTTPS site on the PC and create a pairing QR in Settings. The phone opens the app and its installation flow. Wait for offline readiness, follow browser confirmation or iPhone/iPad instructions, then finish pairing on the same LAN. [Full guide](PEER-SYNC.md).

`localhost` sul PC non è un indirizzo di installazione per il telefono. Librerie salvate su origini diverse restano separate: usare backup o sincronizzazione per trasferire i contenuti.

PC localhost is not a phone installation address. Libraries on different origins remain separate; use backup or synchronization to move content.

[GitHub Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
