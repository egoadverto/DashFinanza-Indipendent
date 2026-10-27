import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { TAG_DEFINIZIONI_QUERY_KEY } from './useTagDefinizioni'
import { TREE_QUERY_KEY } from './useTree'

export function useDeleteTagDefinizione() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tag_definizioni').delete().eq('id', id)
      if (error) {
        if (error.code === '23503') {
          throw new Error('Il TAG è ancora usato in almeno un portafoglio: rimuovilo da lì prima di eliminare la definizione.')
        }
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAG_DEFINIZIONI_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: TREE_QUERY_KEY })
    },
  })
}
