import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { TREE_QUERY_KEY } from './useTree'
import { POSIZIONI_CHIUSE_QUERY_KEY } from './usePosizioniChiuse'

export function useDeleteNodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // on delete cascade in schema: elimina anche i discendenti e le loro transazioni.
      const { error } = await supabase.from('nodi').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: POSIZIONI_CHIUSE_QUERY_KEY })
    },
  })
}
