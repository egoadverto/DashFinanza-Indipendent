# DashFinanza

App di monitoraggio investimenti, pensata per un utente singolo.
Traccia portafogli, TAG e titoli in un albero, confronta il peso reale
di ciascuno con l'obiettivo che gli hai dato e dice quanto versare su
cosa per avvicinarti — senza mai proporre vendite. Quantità, prezzo
medio di carico, pesi e rendimenti non si inseriscono mai a mano: si
ricalcolano sempre dalle transazioni e dai prezzi.

Cinque schermate: **Dashboard**, **Posizioni**, **Transazioni**,
**Analisi**, **Impostazioni**. Interamente in italiano.

Stack: React 19, Vite, TypeScript, Tailwind CSS 4, Supabase (database e
autenticazione), Netlify (pubblicazione).

## Installazione

Questa è la versione indipendente e distribuibile: per usarla con i tuoi
dati serve un tuo progetto Supabase e un tuo sito, separati da quelli di
chiunque altro. La guida completa — passo per passo dal pannello, oppure
delegata a un'AI con gli accessi giusti — è in
[`installazione-indipendente.md`](installazione-indipendente.md).

## Come si usa

Una volta installata, la guida a tutte e cinque le schermate è in
[`manuale.md`](manuale.md).

## Licenza

[AGPLv3](LICENSE).
