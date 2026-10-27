import { useState } from 'react'
import Modal from '../Modal'
import Segmented from '../Segmented'
import NodeSelect from '../NodeSelect'
import ConfirmDialog from '../ConfirmDialog'
import { useCreateNodo } from '../../hooks/useCreateNodo'
import { useUpdateNodo } from '../../hooks/useUpdateNodo'
import { useDeleteNodo } from '../../hooks/useDeleteNodo'
import { idConDiscendenti } from '../../lib/tree'
import type { ContenitoreOpzione, TreeNode } from '../../lib/tree'
import { parseNumeroIt } from '../../lib/format'

export default function NuovoPortafoglio({
  contenitori,
  parentIdIniziale,
  nodoEsistente,
  onClose,
}: {
  contenitori: ContenitoreOpzione[]
  parentIdIniziale: string | null
  nodoEsistente?: TreeNode
  onClose: () => void
}) {
  const modificaMode = !!nodoEsistente
  const [nome, setNome] = useState(nodoEsistente?.nome ?? '')
  const [parentId, setParentId] = useState<string | null>(nodoEsistente?.parentId ?? parentIdIniziale)
  const [modoTarget, setModoTarget] = useState<'stabilito' | 'calcolato'>(nodoEsistente?.modoTarget ?? 'stabilito')
  const [unita, setUnita] = useState<'percentuale' | 'euro'>(nodoEsistente?.targetUnita ?? 'percentuale')
  const [percentuale, setPercentuale] = useState(nodoEsistente?.targetValore?.toString().replace('.', ',') ?? '')
  const [note, setNote] = useState(nodoEsistente?.note ?? '')
  const [confermaEliminazione, setConfermaEliminazione] = useState(false)
  const creaNodo = useCreateNodo()
  const aggiornaNodo = useUpdateNodo()
  const eliminaNodo = useDeleteNodo()

  const esclusi = nodoEsistente ? idConDiscendenti(contenitori, nodoEsistente.id) : new Set<string>()
  const portafogli = contenitori.filter((c) => c.tipo === 'portafoglio' && !esclusi.has(c.id))
  const puoSalvare = nome.trim().length > 0 && (modoTarget === 'calcolato' || percentuale.trim().length > 0)
  const erroreMutazione = creaNodo.error ?? aggiornaNodo.error ?? eliminaNodo.error

  async function handleSubmit() {
    const targetValore = modoTarget === 'stabilito' ? parseNumeroIt(percentuale) : null
    const targetUnita = modoTarget === 'stabilito' ? unita : null

    if (modificaMode && nodoEsistente) {
      await aggiornaNodo.mutateAsync({
        id: nodoEsistente.id,
        changes: {
          nome: nome.trim(),
          parent_id: parentId,
          modo_target: modoTarget,
          target_valore: targetValore,
          target_unita: targetUnita,
          note: note.trim() || null,
        },
      })
    } else {
      const fratelli = contenitori.filter((c) => c.parentId === parentId)
      await creaNodo.mutateAsync({
        tipo: 'portafoglio',
        nome: nome.trim(),
        parent_id: parentId,
        ordine: fratelli.length,
        modo_target: modoTarget,
        target_valore: targetValore,
        target_unita: targetUnita,
        note: note.trim() || null,
      })
    }
    onClose()
  }

  async function handleDelete() {
    if (!nodoEsistente) return
    await eliminaNodo.mutateAsync(nodoEsistente.id)
    onClose()
  }

  return (
    <Modal title={modificaMode ? 'Modifica portafoglio' : 'Nuovo portafoglio'} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <label className="block">
          <div className="mb-1.5 text-xs text-text-secondary">Nome</div>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            autoFocus
          />
        </label>

        <label className="block">
          <div className="mb-1.5 text-xs text-text-secondary">Nodo padre</div>
          <NodeSelect opzioni={portafogli} value={parentId} onChange={setParentId} />
        </label>

        <div>
          <div className="mb-1.5 text-xs text-text-secondary">Come si calcola il peso obiettivo</div>
          <Segmented
            options={[
              { value: 'stabilito', label: 'Lo stabilisco io' },
              { value: 'calcolato', label: 'Lo calcolo dai titoli' },
            ]}
            value={modoTarget}
            onChange={setModoTarget}
          />
        </div>

        {modoTarget === 'stabilito' ? (
          <div className="flex gap-3">
            <label className="block flex-1">
              <div className="mb-1.5 text-xs text-text-secondary">Percentuale</div>
              <input
                inputMode="decimal"
                value={percentuale}
                onChange={(e) => setPercentuale(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <div className="flex-1">
              <div className="mb-1.5 text-xs text-text-secondary">Unità</div>
              <Segmented
                options={[
                  { value: 'percentuale', label: 'Percentuale' },
                  { value: 'euro', label: 'Importo in €' },
                ]}
                value={unita}
                onChange={setUnita}
              />
            </div>
          </div>
        ) : (
          <div className="text-sm text-text-secondary">
            Nessuna percentuale da inserire: il peso risulta dai titoli contenuti.
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
              disabled={!puoSalvare || creaNodo.isPending || aggiornaNodo.isPending}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {creaNodo.isPending || aggiornaNodo.isPending
                ? 'Salvataggio…'
                : modificaMode
                  ? 'Salva modifiche'
                  : 'Crea portafoglio'}
            </button>
          </div>
        </div>
      </div>

      {confermaEliminazione && (
        <ConfirmDialog
          title="Eliminare questo portafoglio?"
          message={
            nodoEsistente && nodoEsistente.children.length > 0
              ? `Contiene ${nodoEsistente.children.length} elementi: verranno eliminati anche quelli, insieme alle transazioni collegate.`
              : 'L\'operazione non si può annullare.'
          }
          confirmLabel="Elimina"
          loading={eliminaNodo.isPending}
          onConfirm={handleDelete}
          onCancel={() => setConfermaEliminazione(false)}
        />
      )}
    </Modal>
  )
}
