# Bilancino – diario alimentare

Web app installabile (PWA), gratuita e senza account, per tracciare quello che mangi.

- **Diario**: calorie, proteine, carboidrati, grassi e altri nutrienti a scelta, divisi per pasto. Puoi andare avanti e indietro tra i giorni e copiare un pasto da ieri o da qualsiasi altro giorno.
- **Pasti preferiti**: salvi un pasto con la stellina (es. la colazione tipo) e lo riaggiungi con un tocco, scegliendo quali voci tenere.
- **Alimenti e ricette** (dalla barra in basso): libreria in ordine alfabetico per creare e modificare alimenti, ricette e pasti preferiti senza passare dall'inserimento nel diario.
- **Alimenti personali**: valori per 100 g o 100 ml, kcal calcolate in automatico o copiate dall'etichetta, porzioni con nome (es. "1 vasetto = 170 g"), etichette, nutrienti personalizzati (calcio, caffeina…).
- **Ricette**: ingredienti, numero di porzioni e peso da cotto, così puoi registrarle a porzioni o a grammi.
- **Piano pasti settimanale**: distribuisci ricette, pasti preferiti e alimenti sui giorni della settimana, poi li registri nel diario con un tocco.
- **Lista della spesa automatica**: somma gli ingredienti di quello che hai pianificato e toglie quello che hai già in casa; in più gli alimenti ricorrenti della dispensa e voci libere.
- **Dispensa** (scheda di Alimenti): gli alimenti che compri spesso, per reparto e frequenza, con la quantità che hai in casa.
- **Obiettivi**: calorie e macro fissi oppure diversi per giorno della settimana (es. allenamento/riposo), peso obiettivo con stima dei tempi.
- **Dispendio reale (TDEE adattivo)**: dalle calorie registrate e dall'andamento del peso calcola quante calorie bruci davvero e propone di correggere gli obiettivi (avviso settimanale nel Diario).
- **Progressi** (1 settimana, 1, 3, 6 mesi, 1 anno): grafico del peso con media mobile a 7 giorni; torta della ripartizione dei macro (oggi, media 7 giorni, 30 giorni o di sempre) confrontata con gli obiettivi; barre delle calorie divise per macro con le tacche degli obiettivi; misure corporee.
- **Personalizza**: pasti (nomi e ordine), nutrienti visibili, elementi della schermata Diario, tema chiaro (predefinito) o scuro, backup ed esportazione CSV.

I dati restano **solo sul telefono** di chi usa l'app (nel browser). Non c'è un server: ognuno ha i suoi dati.

---

## Pubblicarla gratis con GitHub Pages

1. Crea un nuovo repository su GitHub (es. `bilancino`). Può essere pubblico (GitHub Pages gratuito richiede un repository pubblico con un account Free).
2. Carica **il contenuto di questa cartella** nella radice del repository, cioè `index.html`, `manifest.webmanifest`, `sw.js` e le cartelle `css/`, `js/` e `icons/`.
   - Dal sito: *Add file → Upload files*, trascina tutto, poi *Commit changes*.
   - Oppure da terminale:
     ```bash
     git init
     git add .
     git commit -m "Bilancino"
     git branch -M main
     git remote add origin https://github.com/TUO-UTENTE/bilancino.git
     git push -u origin main
     ```
3. Nel repository vai su **Settings → Pages**. In *Build and deployment* scegli *Source: Deploy from a branch*, branch `main`, cartella `/ (root)`, poi *Save*.
4. Dopo un minuto circa l'app è online su `https://TUO-UTENTE.github.io/bilancino/`. Quel link è quello da mandare agli amici.

> La PWA funziona solo via `https://` (GitHub Pages va benissimo). Se apri `index.html` dal disco l'app funziona, ma non si installa e non va offline.

## Installarla sul telefono

- **Android (Chrome)**: apri il link, poi menu ⋮ → *Installa app* (oppure *Aggiungi a schermata Home*).
- **iPhone (Safari)**: apri il link, tocca *Condividi* → *Aggiungi alla schermata Home*.

Dopo la prima apertura funziona anche offline.

## Aggiornare l'app

Quando modifichi i file e li ricarichi su GitHub, apri `sw.js` e aumenta il numero di versione:

```js
const VERSION = 'bilancino-v4';
```

Al secondo avvio i telefoni scaricheranno la nuova versione. I dati degli utenti non vengono toccati.

## Backup dei dati

I dati vivono nel browser del telefono. Se si cancellano i dati di Chrome/Safari, o se si cambia telefono, vanno persi. Su iPhone, Safari può anche cancellarli se l'app non viene aperta per molte settimane. Ogni tanto conviene fare **Personalizza → Esporta backup**. Il file `.json` si reimporta con *Importa backup*.

## Struttura

```
PRD.md                documento di prodotto e architettura (per persone e agenti AI)
index.html            pagina unica
css/style.css         stile (tema chiaro e scuro)
js/app.js             tutta la logica, senza librerie e senza build
sw.js                 service worker (funzionamento offline)
manifest.webmanifest  nome, icone e colori dell'app installata
icons/                icone
```

Gli "alimenti di esempio" hanno valori indicativi: conviene sempre controllare l'etichetta del prodotto che si compra.
