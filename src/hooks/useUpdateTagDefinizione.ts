import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { TAG_DEFINIZIONI_QUERY_KEY } from './useTagDefinizioni'
import { TREE_QUERY_KEY } from './useTree'
import type { TablesUpdate } from '../types/database'

export function useUpdateTagDefinizione() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: TablesUpdate<'tag_definizioni'> }) => {
      const { error } = await supabase.from('tag_definizioni').update(changes).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAG_DEFINIZIONI_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: TREE_QUERY_KEY })
    },
  })
}
