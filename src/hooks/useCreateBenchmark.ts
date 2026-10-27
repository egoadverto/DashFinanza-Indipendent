import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, getUserId } from '../lib/supabase'
import { urlEdgeFunction } from '../lib/supabaseConfig'
import { BENCHMARK_QUERY_KEY } from './useBenchmark'

export function useCreateBenchmark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ nome, isin, colore }: { nome: string; isin: string; colore: string }) => {
      const userId = await getUserId()

      const { count } = await supabase.from('benchmark').select('id', { count: 'exact', head: true })
      const ordine = count ?? 0

      const { data: benchmark, error: erroreBenchmark } = await supabase
        .from('benchmark')
        .insert({ user_id: userId, nome, isin, ordine, colore })
        .select('id')
        .single()
      if (erroreBenchmark) throw new Error(erroreBenchmark.message)

      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const risposta = await fetch(urlEdgeFunction('cerca-benchmark'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionData.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ benchmarkId: benchmark.id, isin }),
        })
        if (!risposta.ok) throw new Error(`Storico non trovato per l'ISIN ${isin}: ${await risposta.text()}`)
      } catch (e) {
        await supabase.from('benchmark').delete().eq('id', benchmark.id)
        throw e
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BENCHMARK_QUERY_KEY })
    },
  })
}
