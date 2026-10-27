import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { TagDefinizione } from '../types/domain'

export const TAG_DEFINIZIONI_QUERY_KEY = ['tag_definizioni'] as const

export function useTagDefinizioni() {
  return useQuery({
    queryKey: TAG_DEFINIZIONI_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('tag_definizioni').select('*').order('nome')
      if (error) throw new Error(error.message)
      return data as TagDefinizione[]
    },
  })
}
