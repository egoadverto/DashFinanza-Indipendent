import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase, getUserId } from '../lib/supabase'
import type { TablesInsert, TablesUpdate } from '../types/database'
import { TREE_QUERY_KEY } from './useTree'
import { POSIZIONI_CHIUSE_QUERY_KEY } from './usePosizioniChiuse'
import { TRANSAZIONI_QUERY_KEY } from './useTransazioni'
import { TAG_DEFINIZIONI_QUERY_KEY } from './useTagDefinizioni'
import { PROVIDER_PREZZI_QUERY_KEY } from './useProviderPrezzi'
import { BENCHMARK_QUERY_KEY } from './useBenchmark'

type Tabella = 'nodi' | 'transazioni' | 'tag_definizioni' | 'provider_prezzi' | 'benchmark'

function lancia(error: PostgrestError | null, messaggio?: (e: PostgrestError) => string | undefined) {
  if (error) throw new Error(messaggio?.(error) ?? error.message)
}

function useConInvalidazione<V>(fn: (v: V) => Promise<void>, chiavi: QueryKey[]) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => chiavi.forEach((queryKey) => queryClient.invalidateQueries({ queryKey })),
  })
}

function useElimina(tabella: Tabella, chiavi: QueryKey[], messaggio?: (e: PostgrestError) => string | undefined) {
  return useConInvalidazione(async (id: string) => {
    const { error } = await supabase.from(tabella).delete().eq('id', id)
    lancia(error, messaggio)
  }, chiavi)
}

function useModifica<T extends Tabella>(tabella: T, chiavi: QueryKey[]) {
  return useConInvalidazione(async ({ id, changes }: { id: string; changes: TablesUpdate<T> }) => {
    // ponytail: cast perché supabase-js non tipizza update() su una tabella generica
    const { error } = await supabase.from(tabella as Tabella).update(changes as never).eq('id', id)
    lancia(error)
  }, chiavi)
}

function useCrea<T extends Tabella>(tabella: T, chiavi: QueryKey[]) {
  return useConInvalidazione(async (riga: Omit<TablesInsert<T>, 'user_id'>) => {
    const userId = await getUserId()
    const { error } = await supabase.from(tabella as Tabella).insert({ ...riga, user_id: userId } as never)
    lancia(error)
  }, chiavi)
}

// Una transazione o un nodo cambiano quantità e stato (il trigger chiude o
// riapre la posizione): vanno rinfrescati albero e posizioni chiuse.
const ALBERO = [TREE_QUERY_KEY, POSIZIONI_CHIUSE_QUERY_KEY]
const TRANSAZIONI = [TRANSAZIONI_QUERY_KEY, ...ALBERO]
const TAG = [TAG_DEFINIZIONI_QUERY_KEY, TREE_QUERY_KEY]

export const useCreateNodo = () => useCrea('nodi', [TREE_QUERY_KEY])
export const useUpdateNodo = () => useModifica('nodi', ALBERO)
export const useDeleteNodo = () => useElimina('nodi', ALBERO) // on delete cascade: anche discendenti e transazioni

export const useCreateTransazione = () => useCrea('transazioni', TRANSAZIONI)
export const useUpdateTransazione = () => useModifica('transazioni', TRANSAZIONI)
export const useDeleteTransazione = () => useElimina('transazioni', TRANSAZIONI)

export const useUpdateTagDefinizione = () => useModifica('tag_definizioni', TAG)
export const useDeleteTagDefinizione = () =>
  useElimina('tag_definizioni', TAG, (e) =>
    e.code === '23503'
      ? 'Il TAG è ancora usato in almeno un portafoglio: rimuovilo da lì prima di eliminare la definizione.'
      : undefined,
  )

export const useCreateProviderPrezzo = () => useCrea('provider_prezzi', [PROVIDER_PREZZI_QUERY_KEY])
export const useUpdateProviderPrezzo = () => useModifica('provider_prezzi', [PROVIDER_PREZZI_QUERY_KEY])
export const useDeleteProviderPrezzo = () => useElimina('provider_prezzi', [PROVIDER_PREZZI_QUERY_KEY])

export const useDeleteBenchmark = () => useElimina('benchmark', [BENCHMARK_QUERY_KEY])
