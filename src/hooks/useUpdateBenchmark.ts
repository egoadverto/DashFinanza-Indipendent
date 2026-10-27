import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { urlEdgeFunction } from '../lib/supabaseConfig'
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
      // resterebbero mischiati punti di due indici diversi. Se il download
      // fallisce si rimette lo storico vecchio, così l'errore non lo perde.
      if (isin !== isinPrecedente) {
        const { data: vecchi, error: erroreLettura } = await supabase
          .from('benchmark_valori')
          .select('benchmark_id, data, valore')
          .eq('benchmark_id', id)
        if (erroreLettura) throw new Error(erroreLettura.message)

        const { error: erroreDelete } = await supabase.from('benchmark_valori').delete().eq('benchmark_id', id)
        if (erroreDelete) throw new Error(erroreDelete.message)

        const ripristina = async () => {
          // La funzione può aver scritto righe parziali prima di fallire.
          await supabase.from('benchmark_valori').delete().eq('benchmark_id', id)
          if (vecchi.length) await supabase.from('benchmark_valori').insert(vecchi)
        }

        try {
          const { data: sessionData } = await supabase.auth.getSession()
          const risposta = await fetch(urlEdgeFunction('cerca-benchmark'), {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${sessionData.session?.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ benchmarkId: id, isin }),
          })
          if (!risposta.ok) throw new Error(`Storico non trovato per l'ISIN ${isin}: ${await risposta.text()}`)
        } catch (e) {
          await ripristina()
          throw e
        }
      }

      const { error } = await supabase.from('benchmark').update({ nome, isin, colore }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BENCHMARK_QUERY_KEY })
    },
  })
}
