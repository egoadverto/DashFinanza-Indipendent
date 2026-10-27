# Manuale — DashFinanza

Guida all'uso dell'app, schermata per schermata. Per installarla vedi
`installazione-indipendente.md`; questo file parla di cosa fare una volta
che è già in piedi e hai fatto login.

---

## Prima di tutto: due regole che valgono ovunque

**Tutto ciò che inserisci si può sempre modificare e cancellare.** Nodi,
TAG, titoli, target, transazioni, liquidità, benchmark, provider, note:
nessuna schermata mostra un dato tuo in sola lettura.

**Quantità, prezzo medio, valore, pesi e rendimenti non si inseriscono mai
a mano.** Si ricalcolano sempre dalle transazioni e dai prezzi. Se un
numero non torna, il modo per correggerlo è sistemare la transazione che
lo genera, non il numero stesso.

---

## Il modello dati, in breve

L'app organizza tutto in un albero con tre tipi di nodo:

- **Portafoglio** — un contenitore, può contenere altri portafogli, TAG
  o titoli.
- **TAG** — una definizione riutilizzabile con una regola di target, che
  contiene solo titoli. Lo stesso TAG (es. "Azionario USA") può comparire
  in più portafogli con titoli diversi; cambiando la definizione, la
  regola cambia ovunque il TAG compaia.
- **Titolo** — la foglia: un ETF, un ETC, un fondo pensione, una cripto.

Ogni nodo dichiara il suo obiettivo (target) in uno di due modi:

- **"Lo stabilisco io"** — scrivi tu la percentuale, distribuita in parti
  uguali tra i figli. Se aggiungi o togli un figlio, l'app chiede
  conferma prima di ridistribuire.
- **"Lo calcolo dai titoli"** — nessun target proprio: il nodo mostra
  semplicemente la somma dei figli.

I fratelli (figli dello stesso nodo) usano sempre la stessa unità per il
target: percentuale di capitale, oppure importo di PAC in euro.

### Stati di un titolo

- **Attiva** — normale.
- **Congelata** — ha ancora capitale investito ma non viene più
  alimentata: niente PAC, target a zero, ma resta nell'albero e continua
  a contribuire al valore del nodo padre.
- **Chiusa** — quantità a zero, a prescindere da come era prima.
  Scompare dall'albero e ricompare nella sezione "Posizioni chiuse" in
  fondo a Posizioni, col risultato realizzato.

### Transazioni

Si registrano **importo e quantità**, esattamente quello che leggi
nell'estratto del broker — il prezzo unitario è calcolato dividendo uno
per l'altro. Le commissioni entrano nel costo di carico quando compri e
si sottraggono dal ricavo quando vendi.

Tre tipi:
- **Acquisto** — importo speso, quantità ricevuta.
- **Vendita** — importo incassato, quantità ceduta.
- **Apertura** — registra una posizione che possedevi già, senza
  storico. Se non conosci il costo di carico originale, lascia vuoto
  l'importo: l'app non mostrerà il rendimento per quel titolo (mai uno
  zero o un +100% inventati, solo un trattino con spiegazione).

---

## Dashboard

La prima schermata dopo il login. In alto, quattro numeri sempre
visibili: capitale versato, valore attuale, rendimento, e il capitale
totale (investito più la liquidità non investita).

Due schede spiegano il rendimento in due modi diversi — un'icona ⓘ
accanto al nome richiama cosa significano:
- **TWR** (Time-Weighted Return) — il rendimento della gestione, a
  prescindere da quando hai versato.
- **XIRR** — il rendimento effettivo tenendo conto di quando e quanto
  hai versato nel tempo.

Poi: il grafico **"Andamento del portafoglio"** (con selettore di
periodo), il riquadro **"Allocazione"** (anelli concentrici sul nodo che
scegli), il pannello **"Da controllare"** (gli scarti rispetto
all'obiettivo che superano la soglia impostata in Impostazioni, e un
avviso se il capitale supera la soglia di revisione), **"Confronto
benchmark"** (se ne hai aggiunto almeno uno) e la tabella **"Versamenti
mensili"**.

L'interruttore privacy in alto nella barra laterale maschera tutti i
valori in euro, per guardare la schermata senza mostrare cifre a chi è
vicino.

---

## Posizioni

Il cuore dell'app: qui organizzi i tuoi portafogli, TAG e titoli, e vedi
quanto manca per avvicinarti ai tuoi obiettivi.

**La tabella ad albero.** Ogni riga è un nodo. Le colonne principali:
Peso (quanto pesa il nodo sul suo gruppo), Obiettivo, **Scarto** (quanti
punti ed euro manca per arrivare all'obiettivo — mai un invito a
vendere, solo a versare), e altre facoltative scegliibili dal bottone
"Colonne" (l'ordine delle colonne si trascina dall'intestazione).

**Riferimento.** Da un portafoglio o un TAG puoi scegliere uno dei suoi
figli come "riferimento": in quel caso lo Scarto degli altri fratelli si
misura rispetto a quanto manca al riferimento per arrivare al proprio
obiettivo, non rispetto all'obiettivo dichiarato del genitore — utile se
preferisci inseguire "il più indietro del gruppo" invece di un target
fisso in cui non credi più. Si imposta dal pannello di dettaglio del
nodo (clicca la riga), col controllo "Questo nodo è il riferimento del
suo gruppo".

**Aggiungere.** Il bottone "+ Aggiungi" crea un portafoglio, un TAG o un
titolo nel punto dell'albero dove ti trovi. Un titolo nuovo può essere
ETF, ETC, Fondo pensione, Cripto o Altro — la categoria decide quali
campi servono (le cripto, per dire, non hanno target né PAC né TER).

**Il menù a tre punti** su ogni riga permette di modificare, duplicare
(copia solo la configurazione del nodo, non figli né transazioni — un
duplicato riparte sempre vuoto) o eliminare.

**PAC.** Ogni titolo ha un sì/no esplicito "fa parte di un PAC": solo i
titoli con sì entrano nel calcolo di Scarto e Riferimento, e solo loro
possono essere scelti come riferimento. Un titolo congelato o cripto non
può avere sì, per definizione.

**Ricerca e filtri.** In alto, cerca per nome o ISIN, filtra per stato
(Tutte/Attive/Congelate), espandi o comprimi l'intero albero in un
colpo.

**Posizioni chiuse.** In fondo alla pagina, una sezione richiudibile con
le posizioni vendute del tutto: Titolo, ISIN, periodo, versato, ricavo,
risultato in euro e in percentuale.

**Gestisci TAG.** Un pannello laterale con tutte le definizioni di TAG
esistenti, dove ogni TAG è usato (in quanti portafogli, su quanti
titoli), e la possibilità di modificarle o eliminarle (un TAG ancora
usato non si può eliminare).

---

## Transazioni

L'elenco di tutti gli acquisti, vendite e aperture, più recenti in
cima. Da qui:

- **"+ Aggiungi transazione"** — registra un movimento su un titolo
  esistente: data, tipo, quantità, importo, commissioni, e un'origine
  (Ricorrente o Manuale — sparisce per le aperture).
- **"Importa CSV"** — carica l'estratto del tuo broker (oggi riconosce
  il formato Scalable Capital). Un ISIN mai visto crea il titolo al
  volo; una transazione già presente viene saltata in silenzio, quindi
  puoi ricaricare lo stesso file più volte senza duplicare nulla.
- Dal menù a tre punti di ogni riga: modifica o elimina.

---

## Analisi

Due viste, selezionabili in alto:

- **Composizione** — un pannello di anelli per ogni "vista" che scegli
  (per portafoglio, per TAG, per titolo, per categoria, per stato), con
  un picker che decide quali vedere contemporaneamente.
- **Costi** — il costo medio ponderato (TER) e il costo annuo in euro,
  confrontati con un riferimento fisso dello 0,35%, più la tabella dei
  titoli con TER noto ordinata dal più caro. Le cripto sono escluse dal
  calcolo (non contate come zero: non abbasserebbero la media
  correttamente).

---

## Impostazioni

Tre sezioni, tutte sulla stessa pagina:

**Generali** — periodo predefinito dei grafici, se la privacy parte
attiva all'apertura dell'app.

**Allocazione** — tolleranza di scostamento (quanti punti di Scarto
prima che una riga venga segnalata in "Da controllare"), importo
minimo, dinamizzazione di default, soglia di revisione del capitale
totale.

**Dati e account** — una card per ogni provider di prezzi collegato
(oggi justETF per ETF/ETC/fondi pensione, CoinGecko per le cripto): stato
dell'ultimo aggiornamento, bottone "Aggiorna adesso" per forzarlo, e un
interruttore per disattivarlo temporaneamente. Più una sezione
"Connessione dati" (per collegare l'app a un progetto Supabase diverso
dal tuo — serve solo in casi particolari, non per il primo utilizzo) e
i dati del tuo account.
