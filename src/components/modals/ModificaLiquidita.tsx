import { useState } from 'react'
import Modal from '../Modal'
import { useUpdateImpostazioni } from '../../hooks/useUpdateImpostazioni'
import { parseNumeroIt } from '../../lib/format'

export default function ModificaLiquidita({ valoreAttuale, onClose }: { valoreAttuale: number; onClose: () => void }) {
  const [valore, setValore] = useState(valoreAttuale.toString().replace('.', ','))
  const aggiorna = useUpdateImpostazioni()

  async function handleSubmit() {
    const numero = parseNumeroIt(valore)
    if (Number.isNaN(numero)) return
    await aggiorna.mutateAsync({ liquidita: numero })
    onClose()
  }

  return (
    <Modal title="Liquidità non investita" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <label className="block">
          <div className="mb-1.5 text-xs text-text-secondary">Importo</div>
          <input
            inputMode="decimal"
            value={valore}
            onChange={(e) => setValore(e.target.value)}
            placeholder="0,00"
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            autoFocus
          />
        </label>
        <div className="text-[11px] text-text-tertiary">Esclusa da pesi e rendimento.</div>

        {aggiorna.error && <div className="text-sm text-negative">{aggiorna.error.message}</div>}

        <div className="mt-2 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-medium text-text-secondary">
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={aggiorna.isPending}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {aggiorna.isPending ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
