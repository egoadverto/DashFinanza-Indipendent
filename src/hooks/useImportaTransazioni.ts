import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, getUserId } from '../lib/supabase'
import { TRANSAZIONI_QUERY_KEY } from './useTransazioni'
import { TREE_QUERY_KEY } from './useTree'
import { POSIZIONI_CHIUSE_QUERY_KEY } from './usePosizioniChiuse'
import type { TablesInsert } from '../types/database'

type RigaDaImportare = Omit<TablesInsert<'transazioni'>, 'user_id'>

// Un solo inserimento in blocco: un import storico può contenere centinaia
// di righe, inserirle una per una invaliderebbe le query altrettante volte.
export function useImportaTransazioni() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (righe: RigaDaImportare[]) => {
      if (righe.length === 0) return
      const userId = await getUserId()

      const { error } = await supabase.from('transazioni').insert(righe.map((r) => ({ ...r, user_id: userId })))
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSAZIONI_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: TREE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: POSIZIONI_CHIUSE_QUERY_KEY })
    },
  })
}
