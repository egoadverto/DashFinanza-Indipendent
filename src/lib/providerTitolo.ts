import { supabase } from './supabase'
import type { CategoriaTitolo } from '../types/domain'

// Il provider che aggiorna i prezzi di un titolo: CoinGecko per le cripto,
// justETF per tutto il resto che ha un ISIN. Senza questo collegamento
// (`titoli.provider_id`) le Edge Function non sanno a quale provider
// appartiene il titolo, e l'interruttore attivo/spento in Impostazioni non
// ha alcun effetto su di lui.
export async function trovaProviderId(
  userId: string,
  categoria: CategoriaTitolo,
  isin: string | null,
): Promise<string | null> {
  const codice = categoria === 'cripto' ? 'coingecko' : isin ? 'justetf' : null
  if (!codice) return null

  const { data, error } = await supabase
    .from('provider_prezzi')
    .select('id')
    .eq('user_id', userId)
    .eq('codice', codice)
    .order('priorita')
    .limit(1)
  if (error) throw new Error(error.message)
  return data[0]?.id ?? null
}
