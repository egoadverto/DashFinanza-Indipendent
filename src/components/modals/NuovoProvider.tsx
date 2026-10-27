import { useState } from 'react'
import Modal from '../Modal'
import ConfirmDialog from '../ConfirmDialog'
import { useCreateProviderPrezzo } from '../../hooks/useCrud'
import { useUpdateProviderPrezzo } from '../../hooks/useCrud'
import { useDeleteProviderPrezzo } from '../../hooks/useCrud'
import type { ProviderPrezzo } from '../../types/domain'

export default function NuovoProvider({ providerEsistente, onClose }: { providerEsistente?: ProviderPrezzo; onClose: () => void }) {
  const modificaMode = !!providerEsistente
  const [nome, setNome] = useState(providerEsistente?.nome ?? '')
  const [codice, setCodice] = useState(providerEsistente?.codice ?? '')
  const [chiaveApi, setChiaveApi] = useState(providerEsistente?.chiave_api ?? '')
  const [confermaEliminazione, setConfermaEliminazione] = useState(false)
  const creaProvider = useCreateProviderPrezzo()
  const aggiornaProvider = useUpdateProviderPrezzo()
  const eliminaProvider = useDeleteProviderPrezzo()

  const puoSalvare = nome.trim().length > 0 && codice.trim().length > 0
  const erroreMutazione = creaProvider.error ?? aggiornaProvider.error ?? eliminaProvider.error
  const salvataggioInCorso = creaProvider.isPending || aggiornaProvider.isPending

  async function handleSubmit() {
    if (modificaMode && providerEsistente) {
      await aggiornaProvider.mutateAsync({
        id: providerEsistente.id,
        changes: { nome: nome.trim(), codice: codice.trim(), chiave_api: chiaveApi.trim() || null },
      })
    } else {
      await creaProvider.mutateAsync({ nome: nome.trim(), codice: codice.trim(), chiave_api: chiaveApi.trim() || null })
    }
    onClose()
  }

  async function handleDelete() {
    if (!providerEsistente) return
    await eliminaProvider.mutateAsync(providerEsistente.id)
    onClose()
  }

  return (
    <Modal title={modificaMode ? 'Modifica provider' : 'Nuovo provider'} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <label className="block">
          <div className="mb-1.5 text-xs text-text-secondary">Nome</div>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="es. Twelve Data"
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            autoFocus
          />
        </label>

        <label className="block">
          <div className="mb-1.5 text-xs text-text-secondary">Codice</div>
          <input
            value={codice}
            onChange={(e) => setCodice(e.target.value.toLowerCase())}
            placeholder="es. twelvedata"
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </label>

        <label className="block">
          <div className="mb-1.5 text-xs text-text-secondary">Chiave API (facoltativa)</div>
          <input
            value={chiaveApi}
            onChange={(e) => setChiaveApi(e.target.value)}
            placeholder="Lascia vuoto se non serve"
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </label>

        <div className="rounded-lg bg-background px-3 py-2.5 text-[12px] text-text-secondary">
          Salvare qui registra solo la configurazione. Oggi solo justETF (titoli con ISIN) e CoinGecko (titoli cripto)
          sono collegati all'aggiornamento automatico dei prezzi — un provider diverso non recupera ancora quotazioni
          da solo.
        </div>
        {erroreMutazione && <div className="text-sm text-negative">{erroreMutazione.message}</div>}

        <div className="mt-2 flex items-center justify-between">
          {modificaMode ? (
            <button onClick={() => setConfermaEliminazione(true)} className="text-sm font-medium text-negative">
              Elimina
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-medium text-text-secondary">
              Annulla
            </button>
            <button
              onClick={handleSubmit}
              disabled={!puoSalvare || salvataggioInCorso}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {salvataggioInCorso ? 'Salvataggio…' : modificaMode ? 'Salva modifiche' : 'Crea provider'}
            </button>
          </div>
        </div>
      </div>

      {confermaEliminazione && (
        <ConfirmDialog
          title="Eliminare questo provider?"
          message="I titoli collegati resteranno, senza più un provider assegnato. L'operazione non si può annullare."
          confirmLabel="Elimina"
          loading={eliminaProvider.isPending}
          onConfirm={handleDelete}
          onCancel={() => setConfermaEliminazione(false)}
        />
      )}
    </Modal>
  )
}
