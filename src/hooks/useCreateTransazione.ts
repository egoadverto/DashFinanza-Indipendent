import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, getUserId } from '../lib/supabase'
import { TRANSAZIONI_QUERY_KEY } from './useTransazioni'
import { TREE_QUERY_KEY } from './useTree'
import { POSIZIONI_CHIUSE_QUERY_KEY } from './usePosizioniChiuse'
import type { TablesInsert } from '../types/database'

type NuovaTransazione = Omit<TablesInsert<'transazioni'>, 'user_id'>

export function useCreateTransazione() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (transazione: NuovaTransazione) => {
      const userId = await getUserId()

      const { error } = await supabase.from('transazioni').insert({ ...transazione, user_id: userId })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSAZIONI_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: TREE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: POSIZIONI_CHIUSE_QUERY_KEY })
    },
  })
}
