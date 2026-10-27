import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { PROVIDER_PREZZI_QUERY_KEY } from './useProviderPrezzi'

export function useDeleteProviderPrezzo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('provider_prezzi').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDER_PREZZI_QUERY_KEY })
    },
  })
}
