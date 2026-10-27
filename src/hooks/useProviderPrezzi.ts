import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ProviderPrezzo } from '../types/domain'

export const PROVIDER_PREZZI_QUERY_KEY = ['provider_prezzi'] as const

export function useProviderPrezzi() {
  return useQuery({
    queryKey: PROVIDER_PREZZI_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('provider_prezzi').select('*').order('priorita')
      if (error) throw new Error(error.message)
      return data as ProviderPrezzo[]
    },
  })
}
