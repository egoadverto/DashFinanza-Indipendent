import { useQuery } from '@tanstack/react-query'
import { supabase, getUserId } from '../lib/supabase'
import type { Impostazioni } from '../types/domain'

export const IMPOSTAZIONI_QUERY_KEY = ['impostazioni'] as const

async function fetchImpostazioni(): Promise<Impostazioni> {
  const { data, error } = await supabase.from('impostazioni').select('*').maybeSingle()
  if (error) throw new Error(error.message)
  if (data) return data

  // Nessuna riga ancora: la creiamo con i valori di default dello schema.
  const userId = await getUserId()

  const { data: creata, error: erroreCreazione } = await supabase
    .from('impostazioni')
    .insert({ user_id: userId })
    .select('*')
    .single()
  if (erroreCreazione) throw new Error(erroreCreazione.message)
  return creata
}

export function useImpostazioni() {
  return useQuery({ queryKey: IMPOSTAZIONI_QUERY_KEY, queryFn: fetchImpostazioni })
}
