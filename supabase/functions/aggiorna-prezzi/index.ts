// Aggiorna i prezzi dei titoli con ISIN usando l'endpoint interno di
// justETF (non è un'API dichiarata: se smette di rispondere, va sostituita
// — vedi CLAUDE.md, "Decisioni ancora aperte"). Per ogni titolo salva la
// quotazione di oggi (per il valore corrente) e un punto per ogni mese
// dello storico disponibile (per il grafico di andamento), con upsert
// idempotente su (titolo_id, data).
//
// Chiamata sia da pg_cron (server, nessuna origine) sia da fetch() nel
// browser (bottone "Aggiorna adesso" in Impostazioni): senza gestire
// esplicitamente il preflight CORS e senza intestazioni CORS sulla risposta,
// il browser blocca la chiamata con un generico "Failed to fetch" anche se
// la funzione ha eseguito l'aggiornamento con successo.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const USER_AGENT = 'DashFinanza/1.0 (app personale di monitoraggio investimenti)'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SerieVoce {
  date: string
  value: { raw: number }
}

interface RispostaJustEtf {
  latestQuote: { raw: number }
  latestQuoteDate: string
  series: SerieVoce[]
}

async function fetchGiustEtf(isin: string): Promise<RispostaJustEtf> {
  const url = new URL(`https://www.justetf.com/api/etfs/${isin}/performance-chart`)
  url.search = new URLSearchParams({
    locale: 'en',
    valuesType: 'MARKET_VALUE',
    reduceData: 'true',
    includeDividends: 'false',
    features: 'DIVIDENDS',
    currency: 'EUR',
  }).toString()

  const risposta = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!risposta.ok) throw new Error(`justETF ha risposto ${risposta.status} per ${isin}`)
  return risposta.json()
}

// Un punto per mese: l'ultima quotazione disponibile di ciascun mese.
function puntiMensili(series: SerieVoce[]): SerieVoce[] {
  const perMese = new Map<string, SerieVoce>()
  for (const voce of series) {
    perMese.set(voce.date.slice(0, 7), voce)
  }
  return [...perMese.values()]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: titoliGrezzi, error: erroreTitoli } = await supabase
    .from('titoli')
    .select('id, isin, user_id, provider_prezzi(attivo)')
    .not('isin', 'is', null)
  if (erroreTitoli) return new Response(erroreTitoli.message, { status: 500, headers: CORS_HEADERS })

  // Un titolo senza provider collegato viene comunque aggiornato (compatibilità);
  // uno con provider disattivato viene saltato.
  const titoli = (titoliGrezzi ?? []).filter((t) => t.provider_prezzi === null || t.provider_prezzi?.attivo !== false)

  const { data: provider } = await supabase.from('provider_prezzi').select('id').eq('codice', 'justetf').maybeSingle()

  const risultati: { isin: string; ok: boolean; errore?: string }[] = []

  for (const titolo of titoli ?? []) {
    try {
      const dati = await fetchGiustEtf(titolo.isin!)

      // Mappa per data: evita righe duplicate nello stesso upsert se il
      // punto mensile e la quotazione di oggi cadono sullo stesso giorno.
      const perData = new Map(puntiMensili(dati.series).map((v) => [v.date, v.value.raw]))
      perData.set(dati.latestQuoteDate, dati.latestQuote.raw)

      const righe = [...perData].map(([data, prezzo]) => ({
        titolo_id: titolo.id,
        user_id: titolo.user_id,
        data,
        prezzo,
        fonte: 'justetf',
      }))

      const { error } = await supabase.from('prezzi').upsert(righe, { onConflict: 'titolo_id,data' })
      if (error) throw new Error(error.message)

      risultati.push({ isin: titolo.isin!, ok: true })
    } catch (e) {
      risultati.push({ isin: titolo.isin!, ok: false, errore: String(e) })
    }
    // Una pausa tra le richieste: non è un'API dichiarata, meglio non martellarla.
    await new Promise((r) => setTimeout(r, 300))
  }

  if (provider) {
    const errori = risultati.filter((r) => !r.ok).map((r) => `${r.isin}: ${r.errore}`)
    await supabase
      .from('provider_prezzi')
      .update({
        ...(errori.length === 0 ? { ultimo_ok: new Date().toISOString() } : {}),
        ultimo_errore: errori.length ? errori.join('; ') : null,
      })
      .eq('id', provider.id)
  }

  return new Response(JSON.stringify({ risultati }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
})
