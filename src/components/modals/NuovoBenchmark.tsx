import { useState } from 'react'
import Modal from '../Modal'
import ConfirmDialog from '../ConfirmDialog'
import { useCreateBenchmark } from '../../hooks/useCreateBenchmark'
import { useUpdateBenchmark } from '../../hooks/useUpdateBenchmark'
import { useDeleteBenchmark } from '../../hooks/useCrud'
import { COLORI_BENCHMARK } from '../../lib/coloriBenchmark'
import type { Benchmark } from '../../types/domain'

export default function NuovoBenchmark({
  benchmarkEsistente,
  coloreDefault,
  onClose,
}: {
  benchmarkEsistente?: Benchmark
  coloreDefault?: string
  onClose: () => void
}) {
  const modificaMode = !!benchmarkEsistente
  const [nome, setNome] = useState(benchmarkEsistente?.nome ?? '')
  const [isin, setIsin] = useState(benchmarkEsistente?.isin ?? '')
  const [colore, setColore] = useState(benchmarkEsistente?.colore ?? coloreDefault ?? COLORI_BENCHMARK[0])
  const [confermaEliminazione, setConfermaEliminazione] = useState(false)
  const creaBenchmark = useCreateBenchmark()
  const aggiornaBenchmark = useUpdateBenchmark()
  const eliminaBenchmark = useDeleteBenchmark()

  const puoSalvare = nome.trim().length > 0 && isin.trim().length > 0
  const inCorso = creaBenchmark.isPending || aggiornaBenchmark.isPending
  const errore = creaBenchmark.error ?? aggiornaBenchmark.error

  async function handleSubmit() {
    if (modificaMode && benchmarkEsistente) {
      await aggiornaBenchmark.mutateAsync({
        id: benchmarkEsistente.id,
        nome: nome.trim(),
        isin: isin.trim(),
        colore,
        isinPrecedente: benchmarkEsistente.isin,
      })
    } else {
      await creaBenchmark.mutateAsync({ nome: nome.trim(), isin: isin.trim(), colore })
    }
    onClose()
  }

  async function handleDelete() {
    if (!benchmarkEsistente) return
    await eliminaBenchmark.mutateAsync(benchmarkEsistente.id)
    onClose()
  }

  return (
    <Modal title={modificaMode ? 'Modifica benchmark' : 'Aggiungi benchmark'} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <label className="block">
          <div className="mb-1.5 text-xs text-text-secondary">Nome</div>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="es. MSCI World"
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            autoFocus
          />
        </label>

        <label className="block">
          <div className="mb-1.5 text-xs text-text-secondary">ISIN di un ETF rappresentativo</div>
          <input
            value={isin}
            onChange={(e) => setIsin(e.target.value.toUpperCase())}
            placeholder="es. IE00B4L5Y983"
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <div className="mt-1 text-[11px] text-text-tertiary">
            Lo storico si recupera dall'ISIN di un ETF che replica l'indice, con la stessa fonte già usata per i
            prezzi dei titoli.
            {modificaMode && ' Cambiarlo rifà da capo lo storico di questo benchmark.'}
          </div>
        </label>

        <div>
          <div className="mb-1.5 text-xs text-text-secondary">Colore</div>
          <div className="flex gap-2">
            {COLORI_BENCHMARK.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColore(c)}
                aria-label={`Colore ${c}`}
                className="h-7 w-7 flex-none rounded-full"
                style={{
                  background: c,
                  outline: colore === c ? '2px solid var(--color-text)' : 'none',
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
        </div>

        {errore && <div className="text-sm text-negative">{errore.message}</div>}

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
              disabled={!puoSalvare || inCorso}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {inCorso ? 'Recupero storico…' : modificaMode ? 'Salva modifiche' : 'Aggiungi'}
            </button>
          </div>
        </div>
      </div>

      {confermaEliminazione && (
        <ConfirmDialog
          title={`Eliminare "${benchmarkEsistente?.nome}"?`}
          message="L'operazione non si può annullare."
          confirmLabel="Elimina"
          loading={eliminaBenchmark.isPending}
          onConfirm={handleDelete}
          onCancel={() => setConfermaEliminazione(false)}
        />
      )}
    </Modal>
  )
}
