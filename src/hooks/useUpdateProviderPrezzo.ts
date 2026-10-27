import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { PROVIDER_PREZZI_QUERY_KEY } from './useProviderPrezzi'
import type { TablesUpdate } from '../types/database'

export function useUpdateProviderPrezzo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: TablesUpdate<'provider_prezzi'> }) => {
      const { error } = await supabase.from('provider_prezzi').update(changes).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDER_PREZZI_QUERY_KEY })
    },
  })
}
