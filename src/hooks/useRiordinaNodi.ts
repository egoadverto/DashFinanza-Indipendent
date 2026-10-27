import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { TREE_QUERY_KEY } from './useTree'

export function useRiordinaNodi() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (aggiornamenti: { id: string; ordine: number }[]) => {
      const risultati = await Promise.all(
        aggiornamenti.map(({ id, ordine }) => supabase.from('nodi').update({ ordine }).eq('id', id)),
      )
      const errore = risultati.find((r) => r.error)?.error
      if (errore) throw new Error(errore.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREE_QUERY_KEY })
    },
  })
}
