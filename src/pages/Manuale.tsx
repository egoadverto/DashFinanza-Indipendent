import type { ReactNode } from 'react'

const SEZIONI = [
  { id: 'regole', titolo: 'Due regole che valgono ovunque' },
  { id: 'modello', titolo: 'Il modello dati, in breve' },
  { id: 'dashboard', titolo: 'Dashboard' },
  { id: 'posizioni', titolo: 'Posizioni' },
  { id: 'transazioni', titolo: 'Transazioni' },
  { id: 'analisi', titolo: 'Analisi' },
  { id: 'impostazioni', titolo: 'Impostazioni' },
]

function Sezione({ id, children }: { id: string; children: ReactNode }) {
  const titolo = SEZIONI.find((s) => s.id === id)?.titolo
  return (
    <section id={id} className="scroll-mt-4 rounded-[12px] border border-border bg-surface px-[26px] py-6">
      <div className="mb-4 text-base font-semibold">{titolo}</div>
      <div className="flex max-w-[75ch] flex-col gap-3 text-sm leading-relaxed text-text-secondary [&_b]:font-semibold [&_b]:text-text">
        {children}
      </div>
    </section>
  )
}

function Sottotitolo({ children }: { children: ReactNode }) {
  return <div className="mt-2 text-sm font-semibold text-text">{children}</div>
}

function Elenco({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1.5 pl-5">{children}</ul>
}

export default function Manuale() {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-lg font-semibold">Manuale</div>

      <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {SEZIONI.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="text-primary hover:underline">
            {s.titolo}
          </a>
        ))}
      </nav>

      <Sezione id="regole">
        <p>
          <b>Tutto ciò che inserisci si può sempre modificare e cancellare.</b> Nodi, TAG, titoli, target, transazioni,
          liquidità, benchmark, provider, note: nessuna schermata mostra un dato tuo in sola lettura.
        </p>
        <p>
          <b>Quantità, prezzo medio, valore, pesi e rendimenti non si inseriscono mai a mano.</b> Si ricalcolano sempre
          dalle transazioni e dai prezzi. Se un numero non torna, il modo per correggerlo è sistemare la transazione che
          lo genera, non il numero stesso.
        </p>
      </Sezione>

      <Sezione id="modello">
        <p>L'app organizza tutto in un albero con tre tipi di nodo:</p>
        <Elenco>
          <li>
            <b>Portafoglio</b> — un contenitore, può contenere altri portafogli, TAG o titoli.
          </li>
          <li>
            <b>TAG</b> — una definizione riutilizzabile con una regola di target, che contiene solo titoli. Lo stesso
            TAG (es. "Azionario USA") può comparire in più portafogli con titoli diversi; cambiando la definizione, la
            regola cambia ovunque il TAG compaia.
          </li>
          <li>
            <b>Titolo</b> — la foglia: un ETF, un ETC, un fondo pensione, una cripto.
          </li>
        </Elenco>
        <p>Ogni nodo dichiara il suo obiettivo (target) in uno di due modi:</p>
        <Elenco>
          <li>
            <b>"Lo stabilisco io"</b> — scrivi tu la percentuale, distribuita in parti uguali tra i figli. Se aggiungi o
            togli un figlio, l'app chiede conferma prima di ridistribuire.
          </li>
          <li>
            <b>"Lo calcolo dai titoli"</b> — nessun target proprio: il nodo mostra semplicemente la somma dei figli.
          </li>
        </Elenco>
        <p>
          I fratelli (figli dello stesso nodo) usano sempre la stessa unità per il target: percentuale di capitale,
          oppure importo di PAC in euro.
        </p>

        <Sottotitolo>Stati di un titolo</Sottotitolo>
        <Elenco>
          <li>
            <b>Attiva</b> — normale.
          </li>
          <li>
            <b>Congelata</b> — ha ancora capitale investito ma non viene più alimentata: niente PAC, target a zero, ma
            resta nell'albero e continua a contribuire al valore del nodo padre.
          </li>
          <li>
            <b>Chiusa</b> — quantità a zero, a prescindere da come era prima. Scompare dall'albero e ricompare nella
            sezione "Posizioni chiuse" in fondo a Posizioni, col risultato realizzato.
          </li>
        </Elenco>

        <Sottotitolo>Transazioni</Sottotitolo>
        <p>
          Si registrano <b>importo e quantità</b>, esattamente quello che leggi nell'estratto del broker — il prezzo
          unitario è calcolato dividendo uno per l'altro. Le commissioni entrano nel costo di carico quando compri e si
          sottraggono dal ricavo quando vendi.
        </p>
        <p>Tre tipi:</p>
        <Elenco>
          <li>
            <b>Acquisto</b> — importo speso, quantità ricevuta.
          </li>
          <li>
            <b>Vendita</b> — importo incassato, quantità ceduta.
          </li>
          <li>
            <b>Apertura</b> — registra una posizione che possedevi già, senza storico. Se non conosci il costo di carico
            originale, lascia vuoto l'importo: l'app non mostrerà il rendimento per quel titolo (mai uno zero o un +100%
            inventati, solo un trattino con spiegazione).
          </li>
        </Elenco>
      </Sezione>

      <Sezione id="dashboard">
        <p>
          La prima schermata dopo il login. In alto, quattro numeri sempre visibili: capitale versato, valore attuale,
          rendimento, e il capitale totale (investito più la liquidità non investita).
        </p>
        <p>Due schede spiegano il rendimento in due modi diversi — un'icona ⓘ accanto al nome richiama cosa significano:</p>
        <Elenco>
          <li>
            <b>TWR</b> (Time-Weighted Return) — il rendimento della gestione, a prescindere da quando hai versato.
          </li>
          <li>
            <b>XIRR</b> — il rendimento effettivo tenendo conto di quando e quanto hai versato nel tempo.
          </li>
        </Elenco>
        <p>
          Poi: il grafico <b>"Andamento del portafoglio"</b> (con selettore di periodo), il riquadro <b>"Allocazione"</b>{' '}
          (anelli concentrici sul nodo che scegli), il pannello <b>"Da controllare"</b> (gli scarti rispetto
          all'obiettivo che superano la soglia impostata in Impostazioni, e un avviso se il capitale supera la soglia di
          revisione), <b>"Confronto benchmark"</b> (se ne hai aggiunto almeno uno) e la tabella{' '}
          <b>"Versamenti mensili"</b>.
        </p>
        <p>
          L'icona a forma di occhio nella barra in alto (a destra, accanto alle tue iniziali) maschera tutti i valori in
          euro, per guardare la schermata senza mostrare cifre a chi è vicino.
        </p>
      </Sezione>

      <Sezione id="posizioni">
        <p>
          Il cuore dell'app: qui organizzi i tuoi portafogli, TAG e titoli, e vedi quanto manca per avvicinarti ai tuoi
          obiettivi.
        </p>
        <p>
          <b>La tabella ad albero.</b> Ogni riga è un nodo. Le colonne principali: Peso (quanto pesa il nodo sul suo
          gruppo), Obiettivo, <b>Scarto</b> (quanti punti ed euro manca per arrivare all'obiettivo — mai un invito a
          vendere, solo a versare), e altre facoltative sceglibili dal bottone "Colonne" (l'ordine delle colonne si
          trascina dall'intestazione).
        </p>
        <p>
          <b>Riferimento.</b> Da un portafoglio o un TAG puoi scegliere uno dei suoi figli come "riferimento": in quel
          caso lo Scarto degli altri fratelli si misura rispetto a quanto manca al riferimento per arrivare al proprio
          obiettivo, non rispetto all'obiettivo dichiarato del genitore — utile se preferisci inseguire "il più indietro
          del gruppo" invece di un target fisso in cui non credi più. Si imposta dal pannello di dettaglio del nodo
          (clicca la riga), col controllo "Questo nodo è il riferimento del suo gruppo".
        </p>
        <p>
          <b>Aggiungere.</b> Il bottone "+ Aggiungi" crea un portafoglio, un TAG o un titolo nel punto dell'albero dove ti
          trovi. Un titolo nuovo può essere ETF, ETC, Fondo pensione, Cripto o Altro — la categoria decide quali campi
          servono (le cripto, per dire, non hanno target né PAC né TER).
        </p>
        <p>
          <b>Il menù a tre punti</b> su ogni riga permette di modificare, duplicare (copia solo la configurazione del
          nodo, non figli né transazioni — un duplicato riparte sempre vuoto) o eliminare.
        </p>
        <p>
          <b>PAC.</b> Ogni titolo ha un sì/no esplicito "fa parte di un PAC": solo i titoli con sì entrano nel calcolo di
          Scarto e Riferimento, e solo loro possono essere scelti come riferimento. Un titolo congelato o cripto non può
          avere sì, per definizione.
        </p>
        <p>
          <b>Ricerca e filtri.</b> In alto, cerca per nome o ISIN, filtra per stato (Tutte/Attive/Congelate), espandi o
          comprimi l'intero albero in un colpo.
        </p>
        <p>
          <b>Posizioni chiuse.</b> In fondo alla pagina, una sezione richiudibile con le posizioni vendute del tutto:
          Titolo, ISIN, periodo, versato, ricavo, risultato in euro e in percentuale.
        </p>
        <p>
          <b>Gestisci TAG.</b> Un pannello laterale con tutte le definizioni di TAG esistenti, dove ogni TAG è usato (in
          quanti portafogli, su quanti titoli), e la possibilità di modificarle o eliminarle (un TAG ancora usato non si
          può eliminare).
        </p>
      </Sezione>

      <Sezione id="transazioni">
        <p>L'elenco di tutti gli acquisti, vendite e aperture, più recenti in cima. Da qui:</p>
        <Elenco>
          <li>
            <b>"+ Aggiungi transazione"</b> — registra un movimento su un titolo esistente: data, tipo, quantità,
            importo, commissioni, e un'origine (Ricorrente o Manuale — sparisce per le aperture).
          </li>
          <li>
            <b>"Importa CSV"</b> — carica l'estratto del tuo broker (oggi riconosce il formato Scalable Capital). Un ISIN
            mai visto crea il titolo al volo; una transazione già presente viene saltata in silenzio, quindi puoi
            ricaricare lo stesso file più volte senza duplicare nulla.
          </li>
          <li>Dal menù a tre punti di ogni riga: modifica o elimina.</li>
        </Elenco>
      </Sezione>

      <Sezione id="analisi">
        <p>Due viste, selezionabili in alto:</p>
        <Elenco>
          <li>
            <b>Composizione</b> — un pannello di anelli per ogni "vista" che scegli (per portafoglio, per TAG, per
            titolo, per categoria, per stato), con un picker che decide quali vedere contemporaneamente.
          </li>
          <li>
            <b>Costi</b> — il costo medio ponderato (TER) e il costo annuo in euro, confrontati con un riferimento fisso
            dello 0,35%, più la tabella dei titoli con TER noto ordinata dal più caro. Le cripto sono escluse dal calcolo
            (non contate come zero: non abbasserebbero la media correttamente).
          </li>
        </Elenco>
      </Sezione>

      <Sezione id="impostazioni">
        <p>Tre sezioni, tutte sulla stessa pagina:</p>
        <p>
          <b>Generali</b> — periodo predefinito dei grafici, se la privacy parte attiva all'apertura dell'app.
        </p>
        <p>
          <b>Allocazione</b> — tolleranza di scostamento (quanti punti di Scarto prima che una riga venga segnalata in
          "Da controllare"), importo minimo, dinamizzazione di default, soglia di revisione del capitale totale.
        </p>
        <p>
          <b>Dati e account</b> — una card per ogni provider di prezzi collegato (oggi justETF per ETF/ETC/fondi pensione,
          CoinGecko per le cripto): stato dell'ultimo aggiornamento, bottone "Aggiorna adesso" per forzarlo, e un
          interruttore per disattivarlo temporaneamente. Più una sezione "Connessione dati" (per collegare l'app a un
          progetto Supabase diverso dal tuo — serve solo in casi particolari, non per il primo utilizzo) e i dati del tuo
          account.
        </p>
      </Sezione>
    </div>
  )
}
