import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Benchmark, BenchmarkValore } from '../types/domain'

export const BENCHMARK_QUERY_KEY = ['benchmark'] as const

export interface BenchmarkConValori extends Benchmark {
  valori: BenchmarkValore[]
}

export function useBenchmark() {
  return useQuery({
    queryKey: BENCHMARK_QUERY_KEY,
    queryFn: async (): Promise<BenchmarkConValori[]> => {
      const [{ data: benchmark, error: erroreBenchmark }, { data: valori, error: erroreValori }] = await Promise.all([
        supabase.from('benchmark').select('*').order('ordine'),
        supabase.from('benchmark_valori').select('*').order('data'),
      ])
      if (erroreBenchmark) throw new Error(erroreBenchmark.message)
      if (erroreValori) throw new Error(erroreValori.message)

      return benchmark.map((b) => ({ ...b, valori: valori.filter((v) => v.benchmark_id === b.id) }))
    },
  })
}
