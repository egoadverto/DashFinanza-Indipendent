import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { TREE_QUERY_KEY } from './useTree'
import { POSIZIONI_CHIUSE_QUERY_KEY } from './usePosizioniChiuse'
import type { TablesUpdate } from '../types/database'

export function useUpdateNodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: TablesUpdate<'nodi'> }) => {
      const { error } = await supabase.from('nodi').update(changes).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: POSIZIONI_CHIUSE_QUERY_KEY })
    },
  })
}
