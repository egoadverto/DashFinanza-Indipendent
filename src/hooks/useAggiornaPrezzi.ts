import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { urlEdgeFunction } from '../lib/supabaseConfig'
import { PROVIDER_PREZZI_QUERY_KEY } from './useProviderPrezzi'
import { TREE_QUERY_KEY } from './useTree'
import { DASHBOARD_QUERY_KEY } from './useDashboardData'

export function useAggiornaPrezzi() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (funzione: string) => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw new Error(sessionError.message)
      if (!sessionData.session) throw new Error('Sessione scaduta, ricarica la pagina.')

      const risposta = await fetch(urlEdgeFunction(funzione), {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      })
      if (!risposta.ok) throw new Error(`Aggiornamento fallito (${risposta.status})`)
      return risposta.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDER_PREZZI_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: TREE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY })
    },
  })
}
