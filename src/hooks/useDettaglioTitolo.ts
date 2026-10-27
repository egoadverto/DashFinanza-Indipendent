import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface PuntoPrezzo {
  data: string
  prezzo: number
}

export interface TransazioneTitolo {
  id: string
  data: string
  tipo: string
  quantita: number
  importo: number | null
  prezzoUnitario: number | null
}

export interface DettaglioTitolo {
  prezzi: PuntoPrezzo[]
  transazioni: TransazioneTitolo[]
}

async function fetchDettaglioTitolo(titoloId: string, nodoId: string): Promise<DettaglioTitolo> {
  const [prezziRes, transazioniRes] = await Promise.all([
    supabase.from('prezzi').select('data, prezzo').eq('titolo_id', titoloId).order('data'),
    supabase
      .from('transazioni')
      .select('id, data, tipo, quantita, importo, prezzo_unitario')
      .eq('nodo_id', nodoId)
      .order('data', { ascending: false }),
  ])
  if (prezziRes.error) throw new Error(prezziRes.error.message)
  if (transazioniRes.error) throw new Error(transazioniRes.error.message)
  return {
    prezzi: prezziRes.data,
    transazioni: transazioniRes.data.map((t) => ({
      id: t.id,
      data: t.data,
      tipo: t.tipo,
      quantita: t.quantita,
      importo: t.importo,
      prezzoUnitario: t.prezzo_unitario,
    })),
  }
}

export function useDettaglioTitolo(titoloId: string | null, nodoId: string | null) {
  return useQuery({
    queryKey: ['dettaglio-titolo', titoloId, nodoId],
    queryFn: () => fetchDettaglioTitolo(titoloId!, nodoId!),
    enabled: titoloId !== null && nodoId !== null,
  })
}
