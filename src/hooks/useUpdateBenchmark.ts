import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { BENCHMARK_QUERY_KEY } from './useBenchmark'

export function useUpdateBenchmark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      nome,
      isin,
      colore,
      isinPrecedente,
    }: {
      id: string
      nome: string
      isin: string
      colore: string
      isinPrecedente: string | null
    }) => {
      // Cambiare ISIN significa tracciare un indice diverso: lo storico
      // vecchio va cancellato prima di recuperare quello nuovo, altrimenti
      // resterebbero mischiati punti di due indici diversi.
      if (isin !== isinPrecedente) {
        const { error: erroreDelete } = await supabase.from('benchmark_valori').delete().eq('benchmark_id', id)
        if (erroreDelete) throw new Error(erroreDelete.message)

        const { data: sessionData } = await supabase.auth.getSession()
        const risposta = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cerca-benchmark`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionData.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ benchmarkId: id, isin }),
        })
        if (!risposta.ok) throw new Error(`Storico non trovato per l'ISIN ${isin}: ${await risposta.text()}`)
      }

      const { error } = await supabase.from('benchmark').update({ nome, isin, colore }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BENCHMARK_QUERY_KEY })
    },
  })
}
