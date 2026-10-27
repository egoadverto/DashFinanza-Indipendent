// Aggiorna i prezzi dei titoli cripto usando l'API pubblica di CoinGecko
// (nessuna chiave richiesta sul piano gratuito). Per ogni titolo con
// categoria 'cripto' e un ID CoinGecko in simbolo_provider, salva un punto
// al mese (per il grafico di andamento) upsert idempotente su
// (titolo_id, data). Chiamata dal bottone "Aggiorna adesso" della card
// CoinGecko in Impostazioni, stesso schema di aggiorna-prezzi per justETF.
//
// Limite del piano gratuito: solo gli ultimi 365 giorni di storico sono
// disponibili (oltre risponde 401) — molto meno dei decenni di storico che
// justETF dà per gli ETF. Vedi CLAUDE.md, "Decisioni ancora aperte".
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RispostaCoinGecko {
  prices: [number, number][]
}

async function fetchCoinGecko(id: string): Promise<RispostaCoinGecko> {
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=eur&days=365`
  const risposta = await fetch(url)
  if (!risposta.ok) throw new Error(`CoinGecko ha risposto ${risposta.status} per ${id}`)
  return risposta.json()
}

// Un punto per mese: l'ultima quotazione disponibile di ciascun mese.
function puntiMensili(prices: [number, number][]): { data: string; prezzo: number }[] {
  const perMese = new Map<string, { data: string; prezzo: number }>()
  for (const [ts, prezzo] of prices) {
    const data = new Date(ts).toISOString().slice(0, 10)
    perMese.set(data.slice(0, 7), { data, prezzo })
  }
  return [...perMese.values()]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: titoliGrezzi, error: erroreTitoli } = await supabase
    .from('titoli')
    .select('id, simbolo_provider, user_id, provider_prezzi(attivo)')
    .eq('categoria', 'cripto')
    .not('simbolo_provider', 'is', null)
  if (erroreTitoli) return new Response(erroreTitoli.message, { status: 500, headers: CORS_HEADERS })

  const titoli = (titoliGrezzi ?? []).filter((t) => t.provider_prezzi === null || t.provider_prezzi?.attivo !== false)

  const { data: provider } = await supabase.from('provider_prezzi').select('id').eq('codice', 'coingecko').maybeSingle()

  const risultati: { id: string; ok: boolean; errore?: string }[] = []

  for (const titolo of titoli) {
    try {
      const dati = await fetchCoinGecko(titolo.simbolo_provider!)
      const righe = puntiMensili(dati.prices).map((p) => ({
        titolo_id: titolo.id,
        user_id: titolo.user_id,
        data: p.data,
        prezzo: p.prezzo,
        fonte: 'coingecko',
      }))

      const { error } = await supabase.from('prezzi').upsert(righe, { onConflict: 'titolo_id,data' })
      if (error) throw new Error(error.message)

      risultati.push({ id: titolo.simbolo_provider!, ok: true })
    } catch (e) {
      risultati.push({ id: titolo.simbolo_provider!, ok: false, errore: String(e) })
    }
    // Il piano gratuito di CoinGecko ha un limite di richieste al minuto piuttosto basso.
    await new Promise((r) => setTimeout(r, 1500))
  }

  if (provider) {
    const errori = risultati.filter((r) => !r.ok).map((r) => `${r.id}: ${r.errore}`)
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
