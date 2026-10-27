# DashFinanza — Installazione su un progetto Supabase indipendente

Serve a far nascere un secondo progetto Supabase e un secondo sito,
indipendenti dall'originale. Due modi per arrivarci, stesso risultato:

- **Versione manuale**: tutti i passaggi da pannello (Supabase, Netlify,
  GitHub) e blocchi di testo da incollare così come sono — non serve
  saper programmare.
- **Versione automatica**: lo stesso lavoro fatto da un'AI con accesso
  reale a Supabase, Netlify e GitHub — è così che è nata la prima
  installazione di questa app, non a mano dal pannello.

---

# Versione manuale

## 0. Cosa serve prima di iniziare

- Un account Supabase (gratuito, su `supabase.com`), creato con la tua
  email — così il progetto resta tuo.
- Un account Netlify (gratuito, su `netlify.com`).
- Un account GitHub, per avere una copia propria del codice a cui Netlify
  si collega.

---

## 1. Copiare il codice su GitHub

Su `github.com`, dalla pagina del repository di DashFinanza, bottone
**Fork** con il tuo account: crea una copia identica del codice sotto il
tuo account GitHub. Da qui in avanti lavori su quella copia, non
sull'originale — modifiche fatte in un posto non toccano l'altro.

---

## 2. Creare il nuovo progetto Supabase

Dalla dashboard Supabase, **New project**. Nome libero (es. "dashfinanza"),
password del database generata automatica (non serve ricordarla, non è
quella con cui si accede all'app), regione a piacere — `eu-central-1`
(Francoforte) se in Italia/Europa, per la stessa latenza che ha l'originale.

Quando il progetto è pronto (un paio di minuti), annota due valori da
**Project Settings → API**:

- **Project URL** (es. `https://xxxxxxxxxxxx.supabase.co`)
- **anon / public key** (una chiave lunga che inizia con `eyJ...` o
  `sb_publishable_...`)

Serviranno più avanti. Non sono segreti (finiscono comunque nel codice del
browser), ma vanno usati esattamente per questo progetto, non per quello
originale.

---

## 3. Applicare lo schema del database

Dal pannello Supabase, **SQL Editor → New query**. Apri il file
`supabase/schema.sql` (nella cartella del progetto appena scaricato/clonato),
copialo per intero e incollalo lì. **Run**.

Se non dà errori, ha creato tutte le tabelle, le viste e le regole di
sicurezza (RLS) — lo stesso identico schema dell'app originale, verificato
contro il database reale il 2026-09-21 (non contro un file potenzialmente
vecchio: se in futuro lo schema originale cambia, questo file va
riesportato di nuovo, non basta fidarsi che sia rimasto uguale).

---

## 4. Disattivare la registrazione pubblica

**Authentication → Sign In / Providers**: disattiva "Allow new users to
sign up". Senza questo, chiunque trovi l'URL del sito potrebbe crearsi un
account da solo.

---

## 5. Creare l'utente

**Authentication → Users → Add user**: la tua email e password. Sarà
l'unico account che potrà accedere a questa installazione (niente
registrazione, come nell'originale).

Dopo averlo creato, **copia il suo UUID** (la colonna "UID" nella lista
utenti, qualcosa come `a1b2c3d4-...`): serve nel passo successivo.

---

## 6. Collegare i provider dei prezzi

Torna in **SQL Editor**, incolla (sostituendo `<UUID_UTENTE>` con l'UUID
copiato al passo 5) e **Run**:

```sql
insert into provider_prezzi (user_id, nome, codice, attivo, priorita, frequenza)
values
  ('<UUID_UTENTE>', 'justETF', 'justetf', true, 1, 'giornaliera'),
  ('<UUID_UTENTE>', 'CoinGecko', 'coingecko', true, 1, 'giornaliera');
```

Questo crea le due righe che l'app si aspetta di trovare in Impostazioni →
Dati e account. Se non hai (e non prevedi di avere) posizioni cripto, la
riga CoinGecko non fa danno restando lì inutilizzata — si può anche
omettere.

---

## 7. Creare le tre Edge Function

Le tre funzioni che aggiornano i prezzi vivono nel codice come file pronti,
in `supabase/functions/`:

- `supabase/functions/aggiorna-prezzi/index.ts`
- `supabase/functions/cerca-benchmark/index.ts`
- `supabase/functions/aggiorna-prezzi-cripto/index.ts`

Dal pannello Supabase, **Edge Functions → Deploy a new function**, per
ciascuna delle tre:

1. Come nome metti **esattamente** lo stesso nome della cartella (es.
   `aggiorna-prezzi`) — l'app li chiama per nome, un nome diverso li rende
   irraggiungibili.
2. Incolla per intero il contenuto del file `index.ts` corrispondente.
3. Deploy.

Ripeti per tutte e tre. Non serve altro codice: le funzioni non hanno
dipendenze da installare a parte, e leggono `SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY` da variabili che Supabase imposta da solo su
ogni Edge Function del progetto.

---

## 8. Pianificare l'aggiornamento giornaliero dei prezzi

Torna in **SQL Editor**. Sostituisci `<URL_PROGETTO>` con la Project URL
annotata al passo 2 e `<ANON_KEY>` con la anon key dello stesso passo,
poi **Run**:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'aggiorna-prezzi-giornaliero',
  '0 6 * * *',
  $$
  select net.http_post(
    url := '<URL_PROGETTO>/functions/v1/aggiorna-prezzi',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <ANON_KEY>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Aggiorna i prezzi ETF ogni giorno alle 6:00 UTC, come nell'originale. I
prezzi cripto (CoinGecko) non hanno un cron: si aggiornano solo a mano dal
bottone "Aggiorna adesso" in Impostazioni — stesso comportamento
dell'originale.

---

## 9. Configurare l'app con il nuovo progetto

Nella cartella della copia del codice (quella clonata dal fork del punto
1), crea un file `.env.local`:

```
VITE_SUPABASE_URL=<URL_PROGETTO>
VITE_SUPABASE_ANON_KEY=<ANON_KEY>
```

Stessi due valori del passo 2, del **nuovo** progetto — non quelli
dell'originale. Questo file serve solo per provare l'app in locale
(`npm install` poi `npm run dev`); per il sito pubblico servono le
variabili d'ambiente di Netlify, passo successivo.

> Nota su "Connessione dati" in Impostazioni: quel pannello (URL + chiave
> salvati nel browser) serve a *ripuntare* un'app già funzionante e già
> collegata verso un altro progetto Supabase — non aiuta per un'
> installazione nuova, perché per arrivarci bisogna prima aver fatto
> login, e senza le variabili d'ambiente qui sopra l'app non parte
> nemmeno fino alla schermata di login.

---

## 10. Pubblicare su Netlify

Dalla dashboard Netlify, **Add new site → Import an existing project**,
scegli il fork GitHub creato al passo 1.

- Build command: `npm run build`
- Publish directory: `dist`
- **Site configuration → Environment variables**: aggiungi
  `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` con gli stessi valori del
  passo 9. Netlify non legge `.env.local`.

Deploy. Il sito nasce con un indirizzo automatico tipo
`nome-a-caso-123.netlify.app` (rinominabile da **Site configuration →
General → Site details → Change site name**).

Infine, su Supabase, **Authentication → URL Configuration**: aggiungi
l'indirizzo del nuovo sito Netlify agli URL consentiti.

---

## 11. Prova finale

Apri il sito Netlify, accedi con l'email e la password create al passo 5.
L'albero in Posizioni sarà vuoto (è un progetto Supabase nuovo, nessun
dato): da lì inizi a costruire il tuo, con "+ Aggiungi" o importando un
CSV di un broker compatibile da Transazioni.

In Impostazioni → Dati e account, verificare che i provider justETF (e
CoinGecko, se collegato) risultino presenti e che "Aggiorna adesso" non
dia errore anche senza titoli — a quel punto tutta la parte infrastrutturale
è a posto.

---

# Versione automatica (con un'AI)

Stesso risultato della versione manuale sopra, ma fatto da un'AI con
accesso reale a Supabase, Netlify e GitHub, invece che a mano dal
pannello.

Serve una sessione di un'AI agentica (es. Claude Code, su claude.ai/code
o da terminale) con questi tre collegamenti già attivi:

- **Supabase** (creare progetti, applicare SQL, pubblicare Edge Function)
- **Netlify** (creare siti, impostare variabili d'ambiente)
- **GitHub** (leggere questo repository, crearne una copia o un fork)

Senza questi tre, l'AI non può fare niente di diverso da leggerti a voce
alta la versione manuale — i collegamenti sono quello che le dà accesso
reale, non solo la capacità di scrivere testo.

## Due cose che devi decidere tu, non l'AI

1. **Email e password** dell'unico utente che potrà accedere alla nuova
   installazione. Non è una scelta tecnica: non lasciarla scegliere
   all'AI, dagliela tu nel prompt.
2. **Dove deve nascere**: se l'AI ha già un suo account Supabase/Netlify
   collegato alla sessione, userà quello; se invece deve operare sui tuoi
   account, servono comunque le credenziali di accesso a quelli (stesso
   prerequisito della versione manuale, punto 0).

## Il prompt

Copialo e completalo con email e password prima di darlo all'AI:

```
Crea un'installazione indipendente di DashFinanza, seguendo
supabase/schema.sql e supabase/functions/ di questo repository come
riferimento (non inventare struttura, usa esattamente quei file):

1. Crea un nuovo progetto Supabase (regione eu-central-1, nome libero).
2. Applica per intero supabase/schema.sql.
3. Disattiva la registrazione pubblica (Authentication → Providers →
   "Allow new users to sign up").
4. Crea un utente con email <EMAIL> e password <PASSWORD> — usa esattamente
   questi, non inventarne altri.
5. Inserisci in provider_prezzi due righe per quell'utente: justETF
   (codice 'justetf') e CoinGecko (codice 'coingecko'), entrambe attive.
6. Pubblica le tre Edge Function in supabase/functions/ (aggiorna-prezzi,
   cerca-benchmark, aggiorna-prezzi-cripto), stesso nome delle cartelle.
7. Pianifica un cron giornaliero alle 6:00 UTC che chiama aggiorna-prezzi
   (pg_cron + pg_net, vedi il passo 8 della versione manuale qui sopra per
   il dettaglio SQL se ti serve un riferimento).
8. Crea o aggiorna un repository GitHub con questo codice, un sito
   Netlify collegato (build command "npm run build", publish directory
   "dist"), con le variabili d'ambiente VITE_SUPABASE_URL e
   VITE_SUPABASE_ANON_KEY del progetto appena creato.
9. Aggiungi l'indirizzo del sito Netlify agli URL consentiti su Supabase
   (Authentication → URL Configuration).

Alla fine dimmi: l'URL del sito Netlify, l'URL e la anon key del progetto
Supabase, e se build/lint sono puliti.
```

## Prova finale

Quando l'AI ha finito, apri il sito Netlify e accedi con l'email e la
password che hai dato nel prompt — stessa verifica del punto 11 della
versione manuale. Se qualcosa non va, è più rapido chiederlo alla stessa
sessione che ha fatto l'installazione (ha il contesto di cosa ha
effettivamente creato) piuttosto che ricominciare da un'altra.
