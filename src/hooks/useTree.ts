import { useQuery } from '@tanstack/react-query'
import { supabase, unwrap } from '../lib/supabase'
import { assembleTree } from '../lib/tree'

export const TREE_QUERY_KEY = ['tree'] as const

async function fetchTree() {
  const [nodi, titoli, tagDefinizioni, valori, posizioni, prezzi] = await Promise.all([
    supabase.from('nodi').select('*').then(unwrap),
    supabase.from('titoli').select('*').then(unwrap),
    supabase.from('tag_definizioni').select('*').then(unwrap),
    supabase.from('v_nodo_valore').select('*').then(unwrap),
    supabase.from('v_posizioni').select('*').then(unwrap),
    supabase.from('v_ultimo_prezzo').select('*').then(unwrap),
  ])

  return assembleTree({ nodi, titoli, tagDefinizioni, valori, posizioni, prezzi })
}

export function useTree() {
  return useQuery({ queryKey: TREE_QUERY_KEY, queryFn: fetchTree })
}
