import { useState } from 'react'
import Modal from '../Modal'
import Segmented from '../Segmented'
import Dropdown from '../Dropdown'
import NodeSelect from '../NodeSelect'
import ConfirmDialog from '../ConfirmDialog'
import { useCreateNodo } from '../../hooks/useCreateNodo'
import { useUpdateNodo } from '../../hooks/useUpdateNodo'
import { useDeleteNodo } from '../../hooks/useDeleteNodo'
import { useCreateTagDefinizione } from '../../hooks/useCreateTagDefinizione'
import { useUpdateTagDefinizione } from '../../hooks/useUpdateTagDefinizione'
import { useDeleteTagDefinizione } from '../../hooks/useDeleteTagDefinizione'
import type { ContenitoreOpzione, TreeNode } from '../../lib/tree'
import { parseNumeroIt } from '../../lib/format'
import type { ModoTarget, TagDefinizione } from '../../types/domain'

export default function NuovoTag({
  contenitori,
  tagDefinizioni,
  parentIdIniziale,
  nodoEsistente,
  definizioneEsistente,
  onClose,
}: {
  contenitori: ContenitoreOpzione[]
  tagDefinizioni: TagDefinizione[]
  parentIdIniziale: string | null
  nodoEsistente?: TreeNode
  definizioneEsistente?: TagDefinizione
  onClose: () => void
}) {
  const modalitaOccorrenza = !!nodoEsistente
  const modalitaSoloDefinizione = !nodoEsistente && !!definizioneEsistente
  const modificaMode = modalitaOccorrenza || modalitaSoloDefinizione

  const [fonte, setFonte] = useState<'esistente' | 'nuovo'>(tagDefinizioni.length > 0 ? 'esistente' : 'nuovo')
  const [tagDefinizioneIdScelta, setTagDefinizioneIdScelta] = useState<string | null>(null)
  const [nome, setNome] = useState(nodoEsistente?.nome ?? definizioneEsistente?.nome ?? '')
  const [parentId, setParentId] = useState<string | null>(nodoEsistente?.parentId ?? parentIdIniziale)
  const [modoTarget, setModoTarget] = useState<ModoTarget>(
    nodoEsistente?.modoTarget ?? (definizioneEsistente?.modo_target as ModoTarget) ?? 'stabilito',
  )
  const [percentuale, setPercentuale] = useState(
    (nodoEsistente?.targetValore ?? definizioneEsistente?.target_percentuale)?.toString().replace('.', ',') ?? '',
  )
  const [note, setNote] = useState(definizioneEsistente?.note ?? '')
  const [confermaEliminazione, setConfermaEliminazione] = useState(false)

  const creaNodo = useCreateNodo()
  const aggiornaNodo = useUpdateNodo()
  const eliminaNodo = useDeleteNodo()
  const creaDefinizione = useCreateTagDefinizione()
  const aggiornaDefinizione = useUpdateTagDefinizione()
  const eliminaDefinizione = useDeleteTagDefinizione()

  const portafogli = contenitori.filter((c) => c.tipo === 'portafoglio')
  const puoSalvare =
    (modificaMode || fonte === 'nuovo' ? nome.trim().length > 0 : tagDefinizioneIdScelta !== null) &&
    (modalitaSoloDefinizione || parentId !== null) &&
    (modoTarget === 'calcolato' || percentuale.trim().length > 0)
  const erroreMutazione =
    creaNodo.error ?? aggiornaNodo.error ?? creaDefinizione.error ?? aggiornaDefinizione.error ?? eliminaDefinizione.error
  const salvataggioInCorso =
    creaNodo.isPending || aggiornaNodo.isPending || creaDefinizione.isPending || aggiornaDefinizione.isPending

  function payloadDefinizione() {
    return {
      nome: nome.trim(),
      modo_target: modoTarget,
      target_percentuale: modoTarget === 'stabilito' ? parseNumeroIt(percentuale) : null,
    }
  }

  async function handleSubmit() {
    if (modalitaSoloDefinizione && definizioneEsistente) {
      await aggiornaDefinizione.mutateAsync({
        id: definizioneEsistente.id,
        changes: { ...payloadDefinizione(), note: note.trim() || null },
      })
      onClose()
      return
    }

    if (modalitaOccorrenza && nodoEsistente?.tagDefinizioneId) {
      await aggiornaDefinizione.mutateAsync({ id: nodoEsistente.tagDefinizioneId, changes: payloadDefinizione() })
      if (parentId && parentId !== nodoEsistente.parentId) {
        await aggiornaNodo.mutateAsync({ id: nodoEsistente.id, changes: { parent_id: parentId } })
      }
      onClose()
      return
    }

    if (!parentId) return
    let tagDefinizioneId = fonte === 'esistente' ? tagDefinizioneIdScelta : null
    if (fonte === 'nuovo') {
      const nuovaDefinizione = await creaDefinizione.mutateAsync({ ...payloadDefinizione(), note: note.trim() || null })
      tagDefinizioneId = nuovaDefinizione.id
    }
    if (!tagDefinizioneId) return

    const fratelli = contenitori.filter((c) => c.parentId === parentId).length
    await creaNodo.mutateAsync({ tipo: 'tag', tag_definizione_id: tagDefinizioneId, parent_id: parentId, ordine: fratelli })
    onClose()
  }

  async function handleDelete() {
    if (modalitaSoloDefinizione && definizioneEsistente) {
      await eliminaDefinizione.mutateAsync(definizioneEsistente.id)
    } else if (nodoEsistente) {
      await eliminaNodo.mutateAsync(nodoEsistente.id)
    }
    onClose()
  }

  return (
    <Modal
      title={modalitaSoloDefinizione ? 'Modifica definizione TAG' : modalitaOccorrenza ? 'Modifica TAG' : 'Aggiungi TAG'}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        {!modificaMode && tagDefinizioni.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs text-text-secondary">TAG</div>
            <Segmented
              options={[
                { value: 'esistente', label: 'Già creato' },
                { value: 'nuovo', label: 'Nuovo' },
              ]}
              value={fonte}
              onChange={setFonte}
            />
          </div>
        )}

        {!modificaMode && fonte === 'esistente' ? (
          <label className="block">
            <div className="mb-1.5 text-xs text-text-secondary">Quale TAG</div>
            <Dropdown
              options={tagDefinizioni.map((t) => ({ value: t.id, label: t.nome }))}
              value={tagDefinizioneIdScelta}
              onChange={setTagDefinizioneIdScelta}
              placeholder="Seleziona un TAG…"
            />
          </label>
        ) : (
          <>
            <label className="block">
              <div className="mb-1.5 text-xs text-text-secondary">Nome</div>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
                autoFocus
              />
              {(modalitaOccorrenza || modalitaSoloDefinizione) && (
                <div className="mt-1 text-[11px] text-text-tertiary">
                  Cambia la regola ovunque questo TAG sia usato, in tutti i portafogli.
                </div>
              )}
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
              <label className="block">
                <div className="mb-1.5 text-xs text-text-secondary">Percentuale</div>
                <input
                  inputMode="decimal"
                  value={percentuale}
                  onChange={(e) => setPercentuale(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>
            ) : (
              <div className="text-sm text-text-secondary">
                Nessuna percentuale da inserire: il peso risulta dai titoli contenuti.
              </div>
            )}

            {modalitaSoloDefinizione && (
              <label className="block">
                <div className="mb-1.5 text-xs text-text-secondary">Note</div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>
            )}
          </>
        )}

        {!modalitaSoloDefinizione && (
          <label className="block">
            <div className="mb-1.5 text-xs text-text-secondary">Portafoglio</div>
            <NodeSelect opzioni={portafogli} value={parentId} onChange={setParentId} permettiNessuno={false} />
          </label>
        )}

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
              {salvataggioInCorso ? 'Salvataggio…' : modificaMode ? 'Salva modifiche' : 'Aggiungi TAG'}
            </button>
          </div>
        </div>
      </div>

      {confermaEliminazione && (
        <ConfirmDialog
          title={modalitaSoloDefinizione ? 'Eliminare questa definizione TAG?' : 'Rimuovere questo TAG dal portafoglio?'}
          message={
            modalitaSoloDefinizione
              ? "Possibile solo se il TAG non è più usato in nessun portafoglio. L'operazione non si può annullare."
              : nodoEsistente && nodoEsistente.children.length > 0
                ? `Contiene ${nodoEsistente.children.length} titoli: verranno eliminati anche quelli, insieme alle transazioni collegate. La definizione del TAG resta, se usata altrove.`
                : "La definizione del TAG resta, se usata altrove. L'operazione non si può annullare."
          }
          confirmLabel="Elimina"
          loading={eliminaNodo.isPending || eliminaDefinizione.isPending}
          onConfirm={handleDelete}
          onCancel={() => setConfermaEliminazione(false)}
        />
      )}
    </Modal>
  )
}
