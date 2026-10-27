import { useState } from 'react'
import Modal from '../Modal'
import Segmented from '../Segmented'
import Dropdown from '../Dropdown'
import ConfirmDialog from '../ConfirmDialog'
import { useCreateTransazione } from '../../hooks/useCrud'
import { useUpdateTransazione } from '../../hooks/useCrud'
import { useDeleteTransazione } from '../../hooks/useCrud'
import type { TitoloOpzione } from '../../lib/tree'
import { parseNumeroIt } from '../../lib/format'
import type { Transazione, TipoTransazione, OrigineVersamento, OrigineTransazione } from '../../types/domain'

const TIPI: { value: TipoTransazione; label: string }[] = [
  { value: 'acquisto', label: 'Acquisto' },
  { value: 'vendita', label: 'Vendita' },
  { value: 'apertura', label: 'Apertura' },
]

const ORIGINI: { value: OrigineTransazione; label: string }[] = [
  { value: 'ricorrente', label: 'Ricorrente' },
  { value: 'manuale', label: 'Manuale' },
]

const ORIGINI_VERSAMENTO: { value: OrigineVersamento; label: string }[] = [
  { value: 'tfr', label: 'TFR' },
  { value: 'lavoratore', label: 'Lavoratore' },
  { value: 'datore', label: 'Datore' },
]

function oggi() {
  return new Date().toISOString().slice(0, 10)
}

export default function NuovaTransazione({
  titoli,
  transazioneEsistente,
  onClose,
}: {
  titoli: TitoloOpzione[]
  transazioneEsistente?: Transazione
  onClose: () => void
}) {
  const modificaMode = !!transazioneEsistente
  const [nodoId, setNodoId] = useState<string | null>(transazioneEsistente?.nodo_id ?? null)
  const [tipo, setTipo] = useState<TipoTransazione>((transazioneEsistente?.tipo as TipoTransazione) ?? 'acquisto')
  const [data, setData] = useState(transazioneEsistente?.data ?? oggi())
  const [quantita, setQuantita] = useState(transazioneEsistente?.quantita?.toString().replace('.', ',') ?? '')
  const [importo, setImporto] = useState(transazioneEsistente?.importo?.toString().replace('.', ',') ?? '')
  const [commissioni, setCommissioni] = useState(
    transazioneEsistente?.commissioni ? transazioneEsistente.commissioni.toString().replace('.', ',') : '',
  )
  const [origineVersamento, setOrigineVersamento] = useState<OrigineVersamento | null>(
    (transazioneEsistente?.origine_versamento as OrigineVersamento) ?? null,
  )
  const [origine, setOrigine] = useState<OrigineTransazione>((transazioneEsistente?.origine as OrigineTransazione) ?? 'manuale')
  const [note, setNote] = useState(transazioneEsistente?.note ?? '')
  const [confermaEliminazione, setConfermaEliminazione] = useState(false)
  const creaTransazione = useCreateTransazione()
  const aggiornaTransazione = useUpdateTransazione()
  const eliminaTransazione = useDeleteTransazione()

  const titoloSelezionato = titoli.find((t) => t.id === nodoId)
  const eVersamentoFondoPensione = titoloSelezionato?.categoria === 'fondo_pensione' && tipo === 'acquisto'

  const puoSalvare =
    nodoId !== null && data.trim().length > 0 && quantita.trim().length > 0 && (tipo === 'apertura' || importo.trim().length > 0)
  const erroreMutazione = creaTransazione.error ?? aggiornaTransazione.error ?? eliminaTransazione.error
  const salvataggioInCorso = creaTransazione.isPending || aggiornaTransazione.isPending

  async function handleSubmit() {
    if (!nodoId) return
    const changes = {
      nodo_id: nodoId,
      data,
      tipo,
      quantita: parseNumeroIt(quantita),
      importo: importo.trim() ? parseNumeroIt(importo) : null,
      commissioni: commissioni.trim() ? parseNumeroIt(commissioni) : 0,
      origine: tipo === 'apertura' ? null : origine,
      origine_versamento: eVersamentoFondoPensione ? origineVersamento : null,
      note: note.trim() || null,
    }
    if (modificaMode && transazioneEsistente) {
      await aggiornaTransazione.mutateAsync({ id: transazioneEsistente.id, changes })
    } else {
      await creaTransazione.mutateAsync(changes)
    }
    onClose()
  }

  async function handleDelete() {
    if (!transazioneEsistente) return
    await eliminaTransazione.mutateAsync(transazioneEsistente.id)
    onClose()
  }

  return (
    <Modal title={modificaMode ? 'Modifica transazione' : 'Nuova transazione'} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-1.5 text-xs text-text-secondary">Tipo</div>
          <Segmented options={TIPI} value={tipo} onChange={setTipo} />
        </div>

        <label className="block">
          <div className="mb-1.5 text-xs text-text-secondary">Titolo</div>
          <Dropdown
            options={titoli.map((t) => ({ value: t.id, label: t.percorso ? `${t.nome} — ${t.percorso}` : t.nome }))}
            value={nodoId}
            onChange={setNodoId}
            placeholder="Seleziona un titolo…"
          />
        </label>

        {eVersamentoFondoPensione && (
          <div>
            <div className="mb-1.5 text-xs text-text-secondary">Origine del versamento</div>
            <Segmented options={ORIGINI_VERSAMENTO} value={origineVersamento ?? 'tfr'} onChange={setOrigineVersamento} />
          </div>
        )}

        <label className="block">
          <div className="mb-1.5 text-xs text-text-secondary">Data</div>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </label>

        <div className="flex gap-3">
          <label className="block flex-1">
            <div className="mb-1.5 text-xs text-text-secondary">Quantità</div>
            <input
              inputMode="decimal"
              value={quantita}
              onChange={(e) => setQuantita(e.target.value)}
              placeholder="0,00000000"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block flex-1">
            <div className="mb-1.5 text-xs text-text-secondary">
              Importo{tipo === 'apertura' ? ' (facoltativo se il costo non è noto)' : ''}
            </div>
            <input
              inputMode="decimal"
              value={importo}
              onChange={(e) => setImporto(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>

        <label className="block">
          <div className="mb-1.5 text-xs text-text-secondary">Commissioni</div>
          <input
            inputMode="decimal"
            value={commissioni}
            onChange={(e) => setCommissioni(e.target.value)}
            placeholder="0,00"
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </label>

        {tipo !== 'apertura' && (
          <div>
            <div className="mb-1.5 text-xs text-text-secondary">Origine</div>
            <Segmented options={ORIGINI} value={origine} onChange={setOrigine} />
          </div>
        )}

        <label className="block">
          <div className="mb-1.5 text-xs text-text-secondary">Note</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </label>

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
              {salvataggioInCorso ? 'Salvataggio…' : modificaMode ? 'Salva modifiche' : 'Registra transazione'}
            </button>
          </div>
        </div>
      </div>

      {confermaEliminazione && (
        <ConfirmDialog
          title="Eliminare questa transazione?"
          message="Quantità e prezzo medio di carico della posizione verranno ricalcolati senza di essa. L'operazione non si può annullare."
          confirmLabel="Elimina"
          loading={eliminaTransazione.isPending}
          onConfirm={handleDelete}
          onCancel={() => setConfermaEliminazione(false)}
        />
      )}
    </Modal>
  )
}
