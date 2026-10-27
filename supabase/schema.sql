-- =====================================================================
-- DashFinanza — Schema della base dati
-- Da eseguire nell'SQL Editor di Supabase, su un progetto nuovo e vuoto.
-- Riflette lo stato reale del database in produzione al 2026-09-21
-- (rigenerato dalle migrazioni applicate — vedi SETUP.md per la procedura
-- completa di installazione, comprese Edge Function, cron e utente).
-- =====================================================================
--
-- PRINCIPI
--
-- 1. Si salva solo ciò che l'utente inserisce. Quantità possedute,
--    prezzo medio di carico, valore, pesi e rendimenti NON sono
--    memorizzati: si ricalcolano dalle transazioni e dai prezzi.
--
-- 2. Ogni tabella è protetta da RLS e legata all'utente.
--
-- 3. L'albero usa il riferimento al genitore. Spostare un ramo è
--    cambiare un valore.
--
-- 4. L'app traccia COSA possiedi, non DOVE è depositato. Non esiste
--    nessun livello per intermediari, exchange o wallet.
--
-- 5. Di una transazione si registrano IMPORTO e QUANTITÀ, che sono
--    i dati che leggi nell'estratto. Il prezzo unitario è calcolato.
--
-- 6. Le commissioni entrano nel costo di carico in acquisto e si
--    sottraggono dal ricavo in vendita: contate due volte, come
--    accade nella realtà.
--
-- =====================================================================


-- =====================================================================
-- 1. PROVIDER DI PREZZO
-- =====================================================================

create table provider_prezzi (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  nome              text not null,
  codice            text not null,          -- 'justetf' | 'coingecko' | 'twelvedata' | 'manuale'
  chiave_api        text,
  attivo            boolean not null default true,
  priorita          smallint not null default 1,   -- 1 = principale, 2 = riserva
  frequenza         text not null default 'giornaliera',
  ultimo_ok         timestamptz,
  ultimo_errore     text,
  creato_il         timestamptz not null default now(),
  aggiornato_il     timestamptz not null default now()
);

create index on provider_prezzi (user_id);


-- =====================================================================
-- 2. TITOLI — anagrafica degli strumenti
-- =====================================================================

create table titoli (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  nome              text not null,
  isin              text,                   -- nullo per le cripto
  categoria         text not null default 'etf'
                    check (categoria in ('etf','etc','fondo_pensione','cripto','altro')),
  valuta            text not null default 'EUR',
  ter               numeric(6,4),           -- nullo dove non applicabile (cripto)
  borsa             text,
  provider_id       uuid references provider_prezzi(id) on delete set null,
  simbolo_provider  text,                   -- ISIN per justETF, 'bitcoin' per CoinGecko, 'SWDA.MI' per Twelve Data
  note              text,
  creato_il         timestamptz not null default now(),
  aggiornato_il     timestamptz not null default now(),

  unique (user_id, isin),
  constraint isin_o_simbolo check (isin is not null or simbolo_provider is not null)
);

create index on titoli (user_id);
create index on titoli (provider_id);


-- =====================================================================
-- 3. PREZZI — storico delle quotazioni
-- =====================================================================
-- Otto decimali: servono alle cripto, non danno fastidio agli ETF.

create table prezzi (
  id                bigserial primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  titolo_id         uuid not null references titoli(id) on delete cascade,
  data              date not null,
  prezzo            numeric(24,8) not null check (prezzo >= 0),
  fonte             text not null default 'manuale',
  creato_il         timestamptz not null default now(),

  unique (titolo_id, data)
);

create index on prezzi (titolo_id, data desc);
create index on prezzi (user_id);


-- =====================================================================
-- 4. DEFINIZIONI DEI TAG
-- =====================================================================

create table tag_definizioni (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  nome               text not null,
  modo_target        text not null check (modo_target in ('stabilito','calcolato')),
  target_percentuale numeric(7,4),
  note               text,
  creato_il          timestamptz not null default now(),
  aggiornato_il      timestamptz not null default now(),

  unique (user_id, nome),
  constraint target_coerente check (
    (modo_target = 'stabilito' and target_percentuale is not null) or
    (modo_target = 'calcolato' and target_percentuale is null)
  )
);


-- =====================================================================
-- 5. NODI — l'albero
-- =====================================================================

create table nodi (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  parent_id          uuid references nodi(id) on delete cascade,
  tipo               text not null check (tipo in ('portafoglio','tag','titolo')),
  ordine             integer not null default 0,

  -- Il figlio scelto come riferimento per il ribilanciamento di questo
  -- gruppo (i suoi fratelli si confrontano con l'obiettivo calcolato sul
  -- suo valore, non con l'obiettivo dichiarato). Facoltativo, uno per nodo.
  riferimento_id     uuid references nodi(id) on delete set null,

  nome               text,                                     -- solo portafoglio
  tag_definizione_id uuid references tag_definizioni(id) on delete restrict,  -- solo tag
  titolo_id          uuid references titoli(id) on delete restrict,           -- solo titolo

  stato              text default 'attiva'
                     check (stato in ('attiva','congelata','chiusa')),

  -- Fatto esplicito, indipendente dall'importo sotto (che resta solo
  -- informativo): un titolo con fa_parte_pac = false è una posizione una
  -- tantum, esclusa da scarto, riferimento e ribilanciamento.
  fa_parte_pac       boolean not null default true,
  pac_importo        numeric(12,2),
  pac_mesi           smallint[],           -- scritto a schema ma non ancora usato dall'app
  pac_dinamizzazione numeric(5,2),

  modo_target        text check (modo_target in ('stabilito','calcolato')),
  target_valore      numeric(18,4),
  target_unita       text check (target_unita in ('percentuale','euro')),

  note               text,
  creato_il          timestamptz not null default now(),
  aggiornato_il      timestamptz not null default now(),

  constraint campi_per_tipo check (
    (tipo = 'portafoglio' and nome is not null
                          and tag_definizione_id is null and titolo_id is null) or
    (tipo = 'tag'         and tag_definizione_id is not null and titolo_id is null) or
    (tipo = 'titolo'      and titolo_id is not null and tag_definizione_id is null)
  )
);

create index on nodi (user_id);
create index on nodi (parent_id);
create index on nodi (titolo_id);
create index on nodi (tag_definizione_id);


-- =====================================================================
-- 6. TRANSAZIONI
-- =====================================================================
-- Si registrano IMPORTO e QUANTITÀ. Il prezzo unitario è calcolato.
--
-- Tre tipi:
--   acquisto  — importo speso, quantità ricevuta
--   vendita   — importo incassato, quantità ceduta
--   apertura  — posizione preesistente senza storico. L'importo può
--               essere NULLO quando il costo di carico non è noto:
--               in quel caso la posizione mostra il valore ma non il
--               rendimento, che sarebbe falso.

create table transazioni (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  nodo_id            uuid not null references nodi(id) on delete cascade,
  data               date not null,
  tipo               text not null check (tipo in ('acquisto','vendita','apertura')),

  quantita           numeric(24,8) not null check (quantita > 0),
  importo            numeric(18,2),          -- nullo solo su 'apertura' senza costo noto
  commissioni        numeric(12,2) not null default 0,

  origine            text check (origine in ('ricorrente','manuale')),
  origine_versamento text check (origine_versamento in ('tfr','lavoratore','datore')),

  note               text,
  creato_il          timestamptz not null default now(),
  aggiornato_il      timestamptz not null default now(),

  -- prezzo unitario: calcolato, mai inserito
  prezzo_unitario    numeric(24,8) generated always as
                     (case when importo is not null and quantita > 0
                           then importo / quantita end) stored,

  constraint importo_obbligatorio check (
    tipo = 'apertura' or importo is not null
  )
);

create index on transazioni (nodo_id, data);
create index on transazioni (user_id, data desc);


-- =====================================================================
-- 7. BENCHMARK
-- =====================================================================

create table benchmark (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  nome              text not null,
  isin              text,             -- per recuperare lo storico da justETF
  colore            text not null default '#94A3B8',
  ordine            integer not null default 0,
  creato_il         timestamptz not null default now()
);

create index on benchmark (user_id);

create table benchmark_valori (
  id                bigserial primary key,
  benchmark_id      uuid not null references benchmark(id) on delete cascade,
  data              date not null,
  valore            numeric(18,6) not null,
  unique (benchmark_id, data)
);


-- =====================================================================
-- 8. IMPOSTAZIONI
-- =====================================================================

create table impostazioni (
  user_id                       uuid primary key references auth.users(id) on delete cascade,
  liquidita                     numeric(14,2) not null default 0,
  tolleranza_punti              numeric(5,2)  not null default 5.0,
  importo_minimo                numeric(12,2) not null default 10.00,
  dinamizzazione_default        numeric(5,2)  not null default 5.0,
  soglia_revisione              numeric(14,2) not null default 10000.00,
  periodo_grafici                text    not null default 'dall_inizio',
  privacy_all_apertura          boolean not null default false,
  ribilancio_solo_flussi        boolean not null default true,  -- scritto a schema, non più usato dall'app
  dashboard_allocazione_nodo_id uuid references nodi(id) on delete set null,
  aggiornato_il                 timestamptz not null default now()
);


-- =====================================================================
-- VISTE DI CALCOLO
-- =====================================================================

-- Discendenza: per ogni nodo, tutti i suoi discendenti (incluso sé).
create or replace view v_discendenza as
with recursive d as (
  select id as antenato_id, id as discendente_id, 0 as livello
  from nodi
  union all
  select d.antenato_id, n.id, d.livello + 1
  from nodi n
  join d on n.parent_id = d.discendente_id
)
select * from d;


-- Posizione di ogni nodo titolo.
--
-- costo_medio  : media ponderata di acquisti e aperture, commissioni incluse.
--                Resta invariato dopo una vendita (costo medio ponderato).
-- costo_noto   : falso se anche una sola apertura è priva di importo.
--                Quando è falso, l'app NON mostra il rendimento.
-- versato_netto: quanto è realmente uscito di tasca, al netto dei realizzi.
create or replace view v_posizioni as
select
  n.id       as nodo_id,
  n.user_id,
  n.titolo_id,

  coalesce(sum(case when t.tipo in ('acquisto','apertura') then  t.quantita
                    when t.tipo = 'vendita'                then -t.quantita end), 0)
    as quantita,

  bool_and(case when t.tipo in ('acquisto','apertura') then t.importo is not null
                else true end)
    as costo_noto,

  case when sum(case when t.tipo in ('acquisto','apertura') then t.quantita end) > 0
            and bool_and(case when t.tipo in ('acquisto','apertura')
                              then t.importo is not null else true end)
       then sum(case when t.tipo in ('acquisto','apertura')
                     then t.importo + t.commissioni end)
          / sum(case when t.tipo in ('acquisto','apertura') then t.quantita end)
  end
    as costo_medio,

  coalesce(sum(case when t.tipo in ('acquisto','apertura')
                    then  coalesce(t.importo, 0) + t.commissioni
                    when t.tipo = 'vendita'
                    then -(t.importo - t.commissioni) end), 0)
    as versato_netto,

  count(t.id)          as n_operazioni,
  min(t.data)          as prima_operazione,
  max(t.data)          as ultima_operazione
from nodi n
left join transazioni t on t.nodo_id = n.id
where n.tipo = 'titolo'
group by n.id, n.user_id, n.titolo_id;


-- Ultimo prezzo disponibile per titolo.
create or replace view v_ultimo_prezzo as
select distinct on (titolo_id) titolo_id, data, prezzo
from prezzi
order by titolo_id, data desc;


-- Risultato realizzato sulle vendite, con le commissioni sottratte
-- dal ricavo e il costo medio del momento come base.
create or replace view v_realizzato as
select
  t.nodo_id,
  sum((t.importo - t.commissioni) - (t.quantita * p.costo_medio)) as realizzato
from transazioni t
join v_posizioni p on p.nodo_id = t.nodo_id
where t.tipo = 'vendita' and p.costo_medio is not null
group by t.nodo_id;


-- Valore di ogni nodo: per i titoli quantità per ultimo prezzo,
-- per i contenitori la somma dei discendenti. Le posizioni chiuse
-- sono escluse.
create or replace view v_nodo_valore as
select
  d.antenato_id                              as nodo_id,
  sum(coalesce(p.quantita * up.prezzo, 0))   as valore,
  sum(coalesce(p.versato_netto, 0))          as versato,
  bool_and(coalesce(p.costo_noto, true))     as rendimento_calcolabile
from v_discendenza d
join nodi n                  on n.id = d.discendente_id
                             and n.tipo = 'titolo'
                             and n.stato <> 'chiusa'
left join v_posizioni p      on p.nodo_id = n.id
left join v_ultimo_prezzo up on up.titolo_id = n.titolo_id
group by d.antenato_id;


-- Costo medio ponderato del portafoglio (TER).
-- Le categorie prive di TER — cripto in primis — sono ESCLUSE dal
-- calcolo, non contate come zero: contarle abbasserebbe la media.
create or replace view v_ter_medio as
select
  n.user_id,
  sum(p.quantita * up.prezzo * ti.ter) / nullif(sum(p.quantita * up.prezzo), 0) as ter_medio,
  sum(p.quantita * up.prezzo * ti.ter / 100.0)                                  as costo_annuo
from nodi n
join titoli ti               on ti.id = n.titolo_id
join v_posizioni p           on p.nodo_id = n.id
left join v_ultimo_prezzo up on up.titolo_id = n.titolo_id
where n.tipo = 'titolo' and n.stato <> 'chiusa' and ti.ter is not null
group by n.user_id;


-- Le viste devono usare i permessi di chi le interroga, non del
-- creatore: senza questo, aggirano le policy RLS delle tabelle
-- sottostanti. NON RIMUOVERE.
alter view v_discendenza   set (security_invoker = true);
alter view v_posizioni     set (security_invoker = true);
alter view v_ultimo_prezzo set (security_invoker = true);
alter view v_realizzato    set (security_invoker = true);
alter view v_nodo_valore   set (security_invoker = true);
alter view v_ter_medio     set (security_invoker = true);


-- =====================================================================
-- SICUREZZA — Row Level Security
-- =====================================================================

alter table provider_prezzi   enable row level security;
alter table titoli            enable row level security;
alter table prezzi            enable row level security;
alter table tag_definizioni   enable row level security;
alter table nodi              enable row level security;
alter table transazioni       enable row level security;
alter table benchmark         enable row level security;
alter table benchmark_valori  enable row level security;
alter table impostazioni      enable row level security;

-- (select auth.uid()) invece di auth.uid() diretto: valutata una volta
-- sola per la query invece che per ogni riga.
create policy proprietario on provider_prezzi
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy proprietario on titoli
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy proprietario on prezzi
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy proprietario on tag_definizioni
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy proprietario on nodi
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy proprietario on transazioni
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy proprietario on benchmark
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy proprietario on impostazioni
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy proprietario on benchmark_valori
  for all to authenticated
  using (
    exists (select 1 from benchmark b
            where b.id = benchmark_valori.benchmark_id
              and b.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from benchmark b
            where b.id = benchmark_valori.benchmark_id
              and b.user_id = (select auth.uid()))
  );


-- =====================================================================
-- AGGIORNAMENTO AUTOMATICO DI aggiornato_il
-- =====================================================================

create or replace function tocca_aggiornato_il() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.aggiornato_il = now();
  return new;
end;
$$;

create trigger t_upd before update on titoli
  for each row execute function tocca_aggiornato_il();
create trigger t_upd before update on nodi
  for each row execute function tocca_aggiornato_il();
create trigger t_upd before update on transazioni
  for each row execute function tocca_aggiornato_il();
create trigger t_upd before update on tag_definizioni
  for each row execute function tocca_aggiornato_il();
create trigger t_upd before update on provider_prezzi
  for each row execute function tocca_aggiornato_il();
create trigger t_upd before update on impostazioni
  for each row execute function tocca_aggiornato_il();


-- =====================================================================
-- CHIUSURA AUTOMATICA DELLE POSIZIONI VENDUTE INTERAMENTE
-- =====================================================================
-- Quando le transazioni di un titolo azzerano la quantità netta, il nodo
-- passa automaticamente a stato 'chiusa' (sparisce dall'albero, ricompare
-- in "Posizioni chiuse") — a prescindere da come era prima (attiva o
-- congelata: una posizione congelata non ha capitale nullo per
-- definizione, quindi se arriva a zero deve chiudersi anche lei). Se
-- torna positiva (nuovo acquisto), riapre verso 'attiva'.
--
-- SECURITY DEFINER perché il trigger deve poter aggiornare 'nodi' anche
-- quando la RLS della sessione lo impedirebbe altrimenti nello stesso
-- statement; l'esecuzione diretta via RPC è revocata subito sotto perché
-- è una funzione trigger, non va chiamata a mano.
create or replace function public.aggiorna_stato_posizione()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  interessati uuid[];
  nid uuid;
  qta numeric;
  stato_corrente text;
begin
  if TG_OP = 'DELETE' then
    interessati := array[old.nodo_id];
  elsif TG_OP = 'UPDATE' then
    interessati := array[old.nodo_id, new.nodo_id];
  else
    interessati := array[new.nodo_id];
  end if;

  foreach nid in array interessati loop
    select coalesce(sum(case when tipo in ('acquisto','apertura') then quantita
                             when tipo = 'vendita' then -quantita end), 0)
      into qta
    from transazioni where nodo_id = nid;

    select stato into stato_corrente from nodi where id = nid;

    if qta <= 0 and stato_corrente in ('attiva', 'congelata') then
      update nodi set stato = 'chiusa' where id = nid;
    elsif qta > 0 and stato_corrente = 'chiusa' then
      update nodi set stato = 'attiva' where id = nid;
    end if;
  end loop;

  return coalesce(new, old);
end;
$function$;

drop trigger if exists t_aggiorna_stato_posizione on transazioni;
create trigger t_aggiorna_stato_posizione
after insert or update or delete on transazioni
for each row execute function aggiorna_stato_posizione();

revoke all on function public.aggiorna_stato_posizione() from public, anon, authenticated;
