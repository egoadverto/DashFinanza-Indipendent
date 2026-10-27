import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, getUserId } from '../lib/supabase'
import { TAG_DEFINIZIONI_QUERY_KEY } from './useTagDefinizioni'
import { TREE_QUERY_KEY } from './useTree'
import type { TablesInsert } from '../types/database'

type NuovaTagDefinizione = Omit<TablesInsert<'tag_definizioni'>, 'user_id'>

export function useCreateTagDefinizione() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (definizione: NuovaTagDefinizione) => {
      const userId = await getUserId()

      const { data, error } = await supabase
        .from('tag_definizioni')
        .insert({ ...definizione, user_id: userId })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAG_DEFINIZIONI_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: TREE_QUERY_KEY })
    },
  })
}
