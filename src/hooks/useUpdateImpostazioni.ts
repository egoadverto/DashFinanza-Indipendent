import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, getUserId } from '../lib/supabase'
import { IMPOSTAZIONI_QUERY_KEY } from './useImpostazioni'
import type { TablesUpdate } from '../types/database'

export function useUpdateImpostazioni() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (changes: TablesUpdate<'impostazioni'>) => {
      const userId = await getUserId()

      const { error } = await supabase.from('impostazioni').update(changes).eq('user_id', userId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPOSTAZIONI_QUERY_KEY })
    },
  })
}
