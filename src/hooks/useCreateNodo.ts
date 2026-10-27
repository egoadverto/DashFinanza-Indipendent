import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, getUserId } from '../lib/supabase'
import { TREE_QUERY_KEY } from './useTree'
import type { TablesInsert } from '../types/database'

type NuovoNodo = Omit<TablesInsert<'nodi'>, 'user_id'>

export function useCreateNodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (nodo: NuovoNodo) => {
      const userId = await getUserId()

      const { error } = await supabase.from('nodi').insert({ ...nodo, user_id: userId })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREE_QUERY_KEY })
    },
  })
}
