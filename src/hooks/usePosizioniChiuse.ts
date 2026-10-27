import { useQuery } from '@tanstack/react-query'
import { supabase, unwrap } from '../lib/supabase'

export const POSIZIONI_CHIUSE_QUERY_KEY = ['posizioni-chiuse'] as const

export interface PosizioneChiusa {
  nodoId: string
  nome: string
  isin: string | null
  primaOperazione: string | null
  ultimaOperazione: string | null
  versato: number
  ricavo: number
  risultatoEuro: number
  risultatoPct: number | null
}

export function usePosizioniChiuse() {
  return useQuery({
    queryKey: POSIZIONI_CHIUSE_QUERY_KEY,
    queryFn: async (): Promise<PosizioneChiusa[]> => {
      const nodi = await supabase.from('nodi').select('id, titolo_id').eq('tipo', 'titolo').eq('stato', 'chiusa').then(unwrap)
      if (nodi.length === 0) return []

      const nodoIds = nodi.map((n) => n.id)
      const titoloIds = [...new Set(nodi.map((n) => n.titolo_id).filter((id): id is string => id != null))]

      const [titoli, transazioni, realizzati] = await Promise.all([
        supabase.from('titoli').select('id, nome, isin').in('id', titoloIds).then(unwrap),
        supabase.from('transazioni').select('nodo_id, tipo, data, importo, commissioni').in('nodo_id', nodoIds).then(unwrap),
        supabase.from('v_realizzato').select('nodo_id, realizzato').in('nodo_id', nodoIds).then(unwrap),
      ])

      const titoloPerId = new Map(titoli.map((t) => [t.id, t]))
      const realizzatoPerNodo = new Map(realizzati.map((r) => [r.nodo_id as string, r.realizzato as number]))

      return nodi.map((n) => {
        const titolo = n.titolo_id ? titoloPerId.get(n.titolo_id) : undefined
        const txNodo = transazioni.filter((t) => t.nodo_id === n.id).sort((a, b) => a.data.localeCompare(b.data))

        const versato = txNodo
          .filter((t) => t.tipo === 'acquisto' || t.tipo === 'apertura')
          .reduce((s, t) => s + (t.importo ?? 0) + t.commissioni, 0)
        const ricavo = txNodo.filter((t) => t.tipo === 'vendita').reduce((s, t) => s + (t.importo ?? 0) - t.commissioni, 0)
        const risultatoEuro = realizzatoPerNodo.get(n.id) ?? ricavo - versato
        const risultatoPct = versato > 0 ? (risultatoEuro / versato) * 100 : null

        return {
          nodoId: n.id,
          nome: titolo?.nome ?? '—',
          isin: titolo?.isin ?? null,
          primaOperazione: txNodo[0]?.data ?? null,
          ultimaOperazione: txNodo[txNodo.length - 1]?.data ?? null,
          versato,
          ricavo,
          risultatoEuro,
          risultatoPct,
        }
      })
    },
  })
}
