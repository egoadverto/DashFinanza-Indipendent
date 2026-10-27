import { useQuery } from '@tanstack/react-query'
import { supabase, unwrap } from '../lib/supabase'
import type { TransazioneGrezza, PrezzoGrezzo } from '../lib/andamento'
import type { VTerMedio } from '../types/domain'

export const DASHBOARD_QUERY_KEY = ['dashboard'] as const

export interface DashboardData {
  transazioni: TransazioneGrezza[]
  prezzi: PrezzoGrezzo[]
  terMedio: VTerMedio | null
}

const DIMENSIONE_PAGINA = 1000

// La tabella prezzi cresce di centinaia di righe per titolo (storico
// mensile da anni): il limite di default di PostgREST (1000 righe) la
// tronca silenziosamente, va paginata.
async function fetchTuttiIPrezzi() {
  const risultato: { titolo_id: string; data: string; prezzo: number }[] = []
  let pagina = 0
  while (true) {
    const { data, error } = await supabase
      .from('prezzi')
      .select('titolo_id, data, prezzo')
      .range(pagina * DIMENSIONE_PAGINA, (pagina + 1) * DIMENSIONE_PAGINA - 1)
    if (error) throw new Error(error.message)
    risultato.push(...data)
    if (data.length < DIMENSIONE_PAGINA) break
    pagina++
  }
  return risultato
}

async function fetchDashboardData(): Promise<DashboardData> {
  const [nodi, transazioniGrezze, prezziGrezzi, terMedio] = await Promise.all([
    supabase.from('nodi').select('id, titolo_id').eq('tipo', 'titolo').then(unwrap),
    supabase.from('transazioni').select('data, tipo, quantita, importo, commissioni, nodo_id').then(unwrap),
    fetchTuttiIPrezzi(),
    supabase.from('v_ter_medio').select('*').maybeSingle().then(unwrap),
  ])

  const titoloIdPerNodo = new Map(nodi.map((n) => [n.id, n.titolo_id as string]))

  const transazioni: TransazioneGrezza[] = transazioniGrezze
    .filter((t) => titoloIdPerNodo.has(t.nodo_id))
    .map((t) => ({
      data: t.data,
      tipo: t.tipo as TransazioneGrezza['tipo'],
      quantita: t.quantita,
      importo: t.importo,
      commissioni: t.commissioni,
      titoloId: titoloIdPerNodo.get(t.nodo_id)!,
    }))

  const prezzi: PrezzoGrezzo[] = prezziGrezzi.map((p) => ({
    titoloId: p.titolo_id,
    data: p.data,
    prezzo: p.prezzo,
  }))

  return { transazioni, prezzi, terMedio }
}

export function useDashboardData() {
  return useQuery({ queryKey: DASHBOARD_QUERY_KEY, queryFn: fetchDashboardData })
}
