import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { TREE_QUERY_KEY } from './useTree'
import type { CategoriaTitolo } from '../types/domain'

interface AggiornaTitoloInput {
  id: string
  nome: string
  isin: string | null
  categoria: CategoriaTitolo
  simboloProvider: string | null
  ter: number | null
}

export function useUpdateTitolo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, nome, isin, categoria, simboloProvider, ter }: AggiornaTitoloInput) => {
      const { error } = await supabase
        .from('titoli')
        .update({ nome, isin, categoria, simbolo_provider: simboloProvider, ter })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREE_QUERY_KEY })
    },
  })
}
