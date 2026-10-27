import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Transazione } from '../types/domain'

export const TRANSAZIONI_QUERY_KEY = ['transazioni'] as const

export function useTransazioni() {
  return useQuery({
    queryKey: TRANSAZIONI_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('transazioni').select('*').order('data', { ascending: false })
      if (error) throw new Error(error.message)
      return data as Transazione[]
    },
  })
}
