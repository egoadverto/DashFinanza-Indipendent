// Recupera lo storico di un benchmark dato il suo ISIN, riusando lo stesso
// endpoint interno di justETF già usato per i prezzi dei titoli (vedi
// aggiorna-prezzi). Chiamata una volta, quando l'utente aggiunge un
// benchmark: non è pianificata, coerente con l'app che non programma nulla.
// Usa il JWT dell'utente (non il service role): l'RLS su benchmark_valori
// verifica già che il benchmark appartenga a chi chiama.
//
// Chiamata da fetch() nel browser (origine diversa da *.supabase.co): serve
// gestire esplicitamente il preflight CORS, altrimenti il controllo
// sull'Authorization (assente nella richiesta OPTIONS) risponde 401 senza
// intestazioni CORS e il browser blocca tutto con un generico "Failed to fetch".
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
  series: SerieVoce[]
}

async function fetchGiustEtf(isin: string): Promise<RispostaJustEtf> {
  const url = new URL(`https://www.justetf.com/api/etfs/${encodeURIComponent(isin)}/performance-chart`)
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

  const authorization = req.headers.get('Authorization')
  if (!authorization) return new Response('Non autenticato', { status: 401, headers: CORS_HEADERS })

  let benchmarkId: string | undefined, isin: string | undefined
  try {
    ;({ benchmarkId, isin } = await req.json())
  } catch {
    return new Response('Corpo della richiesta non valido', { status: 400, headers: CORS_HEADERS })
  }
  if (!benchmarkId || !isin) return new Response('benchmarkId e isin sono richiesti', { status: 400, headers: CORS_HEADERS })
  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) return new Response('ISIN non valido', { status: 400, headers: CORS_HEADERS })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  })

  // La select rispetta l'RLS: se il benchmark non è dell'utente del token, non lo trova.
  const { data: benchmark, error: erroreBenchmark } = await supabase
    .from('benchmark')
    .select('id')
    .eq('id', benchmarkId)
    .maybeSingle()
  if (erroreBenchmark) return new Response(erroreBenchmark.message, { status: 500, headers: CORS_HEADERS })
  if (!benchmark) return new Response('Benchmark non trovato', { status: 404, headers: CORS_HEADERS })

  try {
    const dati = await fetchGiustEtf(isin)
    const righe = puntiMensili(dati.series).map((v) => ({
      benchmark_id: benchmarkId,
      data: v.date,
      valore: v.value.raw,
    }))

    if (righe.length === 0) return new Response('Nessuno storico trovato per questo ISIN', { status: 404, headers: CORS_HEADERS })

    const { error } = await supabase.from('benchmark_valori').upsert(righe, { onConflict: 'benchmark_id,data' })
    if (error) throw new Error(error.message)

    return new Response(JSON.stringify({ ok: true, punti: righe.length }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(String(e), { status: 502, headers: CORS_HEADERS })
  }
})
