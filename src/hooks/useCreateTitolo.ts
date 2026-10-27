import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, getUserId } from '../lib/supabase'
import { trovaProviderId } from '../lib/providerTitolo'
import { TREE_QUERY_KEY } from './useTree'
import type { CategoriaTitolo, StatoNodo, TargetUnita } from '../types/domain'

interface NuovoTitoloInput {
  nome: string
  isin: string | null
  categoria: CategoriaTitolo
  simboloProvider: string | null
  ter: number | null
  parentId: string
  ordine: number
  targetValore: number | null
  targetUnita: TargetUnita | null
  stato: StatoNodo
  faPartePac: boolean
  pacImporto: number | null
  pacDinamizzazione: number | null
  note: string | null
}

export function useCreateTitolo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: NuovoTitoloInput) => {
      const userId = await getUserId()

      // L'anagrafica del titolo esiste una volta sola: se lo stesso
      // identificativo (ISIN, o ID provider per le cripto che non hanno
      // ISIN) è già presente in un altro portafoglio, si riusa quella riga.
      const chiave = input.isin || input.simboloProvider
      let titoloId: string | undefined
      if (chiave) {
        const colonna = input.isin ? 'isin' : 'simbolo_provider'
        const { data: esistente, error: cercaError } = await supabase
          .from('titoli')
          .select('id')
          .eq('user_id', userId)
          .eq(colonna, chiave)
          .maybeSingle()
        if (cercaError) throw new Error(cercaError.message)
        titoloId = esistente?.id
      }

      if (!titoloId) {
        const { data: nuovoTitolo, error: titoloError } = await supabase
          .from('titoli')
          .insert({
            user_id: userId,
            nome: input.nome,
            isin: input.isin,
            categoria: input.categoria,
            simbolo_provider: input.simboloProvider,
            provider_id: await trovaProviderId(userId, input.categoria, input.isin),
            ter: input.ter,
            valuta: 'EUR',
          })
          .select('id')
          .single()
        if (titoloError) throw new Error(titoloError.message)
        titoloId = nuovoTitolo.id
      }

      const { data: nuovoNodo, error: nodoError } = await supabase
        .from('nodi')
        .insert({
          user_id: userId,
          tipo: 'titolo',
          titolo_id: titoloId,
          parent_id: input.parentId,
          ordine: input.ordine,
          modo_target: input.targetValore != null ? 'stabilito' : null,
          target_valore: input.targetValore,
          target_unita: input.targetUnita,
          stato: input.stato,
          fa_parte_pac: input.faPartePac,
          pac_importo: input.pacImporto,
          pac_dinamizzazione: input.pacDinamizzazione,
          note: input.note,
        })
        .select('id')
        .single()
      if (nodoError) throw new Error(nodoError.message)
      return { nodoId: nuovoNodo.id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREE_QUERY_KEY })
    },
  })
}
