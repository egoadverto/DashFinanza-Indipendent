import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, getUserId } from '../lib/supabase'
import { PROVIDER_PREZZI_QUERY_KEY } from './useProviderPrezzi'
import type { TablesInsert } from '../types/database'

type NuovoProvider = Omit<TablesInsert<'provider_prezzi'>, 'user_id'>

export function useCreateProviderPrezzo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (provider: NuovoProvider) => {
      const userId = await getUserId()

      const { error } = await supabase.from('provider_prezzi').insert({ ...provider, user_id: userId })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDER_PREZZI_QUERY_KEY })
    },
  })
}
