import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { TRANSAZIONI_QUERY_KEY } from './useTransazioni'
import { TREE_QUERY_KEY } from './useTree'
import { POSIZIONI_CHIUSE_QUERY_KEY } from './usePosizioniChiuse'
import type { TablesUpdate } from '../types/database'

export function useUpdateTransazione() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: TablesUpdate<'transazioni'> }) => {
      const { error } = await supabase.from('transazioni').update(changes).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSAZIONI_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: TREE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: POSIZIONI_CHIUSE_QUERY_KEY })
    },
  })
}
