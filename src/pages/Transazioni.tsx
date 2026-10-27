import { useState } from 'react'
import { useTree } from '../hooks/useTree'
import { useTransazioni } from '../hooks/useTransazioni'
import { useDeleteTransazione } from '../hooks/useCrud'
import { usePosizioniChiuse } from '../hooks/usePosizioniChiuse'
import { flattenContenitori, flattenTitoli } from '../lib/tree'
import { fmtData, fmtEur, fmtQty } from '../lib/format'
import { LABEL_TIPO_TRANSAZIONE as LABEL_TIPO, COLORE_TIPO_TRANSAZIONE as COLORE_TIPO } from '../lib/badgeTransazione'
import NuovaTransazione from '../components/modals/NuovaTransazione'
import ImportaCsv from '../components/modals/ImportaCsv'
import ConfirmDialog from '../components/ConfirmDialog'
import RowMenu from '../components/RowMenu'
import type { Transazione } from '../types/domain'

const LABEL_ORIGINE: Record<string, string> = { ricorrente: 'Ricorrente', manuale: 'Manuale' }
const COLORE_ORIGINE: Record<string, string> = { ricorrente: 'var(--color-primary-active)', manuale: 'var(--color-positive-soft)' }

// Colonne condivise da intestazione e righe: la larghezza fissa è quella dei
// dati brevi (data, badge, cifre), Titolo prende tutto lo spazio residuo —
// prima era anche lei a larghezza fissa e troncava anche quando c'era spazio
// vuoto a destra.
const COLONNE = '104px minmax(220px,1fr) 112px 112px 112px 120px 120px 104px 40px'

export default function Transazioni() {
  const { data: tree, isLoading: caricoAlbero, error: erroreAlbero } = useTree()
  const { data: transazioni, isLoading: caricoTransazioni, error: erroreTransazioni } = useTransazioni()
  const { data: posizioniChiuse, isLoading: caricoChiuse, error: erroreChiuse } = usePosizioniChiuse()
  const eliminaTransazione = useDeleteTransazione()
  const [menuRigaAperto, setMenuRigaAperto] = useState<string | null>(null)
  const [modaleAperto, setModaleAperto] = useState(false)
  const [importoCsvAperto, setImportoCsvAperto] = useState(false)
  const [inModifica, setInModifica] = useState<Transazione | null>(null)
  const [daEliminare, setDaEliminare] = useState<Transazione | null>(null)

  if (caricoAlbero || caricoTransazioni || caricoChiuse) return <div className="text-sm text-text-secondary">Caricamento…</div>
  if (erroreAlbero || erroreTransazioni || erroreChiuse)
    return <div className="text-sm text-negative">Errore nel caricamento: {(erroreAlbero ?? erroreTransazioni ?? erroreChiuse)!.message}</div>

  const titoli = flattenTitoli(tree ?? [])
  // L'import CSV deve riconoscere l'ISIN anche di una posizione già chiusa
  // (sparisce dall'albero attivo, vedi sotto): altrimenti la scambia per un
  // titolo mai visto e prova a ricrearlo come posizione nuova.
  const titoliPerImport = [
    ...titoli,
    ...(posizioniChiuse ?? []).map((p) => ({ id: p.nodoId, nome: p.nome, isin: p.isin, categoria: null, percorso: '(chiusa)' })),
  ]
  const nomiTitoli = new Map(titoli.map((t) => [t.id, t.percorso ? `${t.nome} — ${t.percorso}` : t.nome]))
  // Una posizione venduta interamente sparisce dall'albero attivo (vedi
  // Posizioni): le sue transazioni restano, ma senza questo il nome del
  // titolo non si risolverebbe più e la riga mostrerebbe solo un trattino.
  for (const p of posizioniChiuse ?? []) {
    if (!nomiTitoli.has(p.nodoId)) nomiTitoli.set(p.nodoId, `${p.nome} (chiusa)`)
  }
  const righe = transazioni ?? []

  function apriModifica(t: Transazione) {
    setInModifica(t)
    setModaleAperto(true)
  }

  function chiudiModale() {
    setModaleAperto(false)
    setInModifica(null)
  }

  async function confermaEliminazione() {
    if (!daEliminare) return
    await eliminaTransazione.mutateAsync(daEliminare.id)
    setDaEliminare(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-lg font-semibold">Transazioni</div>
        <div className="flex gap-2">
          <button
            onClick={() => setImportoCsvAperto(true)}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-[13px] font-medium hover:bg-background sm:flex-none"
          >
            Importa CSV
          </button>
          <button
            onClick={() => titoli.length > 0 && setModaleAperto(true)}
            disabled={titoli.length === 0}
            title={titoli.length === 0 ? 'Crea prima un titolo in Posizioni' : undefined}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-medium text-white hover:bg-primary-hover disabled:opacity-50 sm:flex-none"
          >
            + Aggiungi transazione
          </button>
        </div>
      </div>

      <div className="overflow-auto rounded-[14px] border border-border bg-surface">
        <div className="min-w-max">
          <div className="grid border-b border-border" style={{ gridTemplateColumns: COLONNE }}>
            <div className="px-4 py-3 text-xs font-semibold text-text-secondary">Data</div>
            <div className="px-4 py-3 text-xs font-semibold text-text-secondary">Titolo</div>
            <div className="px-4 py-3 text-xs font-semibold text-text-secondary">Tipo</div>
            <div className="px-4 py-3 text-xs font-semibold text-text-secondary">Origine</div>
            <div className="px-4 py-3 text-right text-xs font-semibold text-text-secondary">Quantità</div>
            <div className="px-4 py-3 text-right text-xs font-semibold text-text-secondary">Prezzo unitario</div>
            <div className="px-4 py-3 text-right text-xs font-semibold text-text-secondary">Importo</div>
            <div className="px-4 py-3 text-right text-xs font-semibold text-text-secondary">Commissioni</div>
            <div className="px-2 py-3" />
          </div>

          {righe.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-text-tertiary">
              Nessuna transazione ancora. Registra la prima per iniziare.
            </div>
          ) : (
            righe.map((t) => {
              const menuAperto = menuRigaAperto === t.id
              const nomeTitolo = nomiTitoli.get(t.nodo_id) ?? '—'
              return (
                <div
                  key={t.id}
                  className="grid items-center border-b border-border last:border-b-0 hover:bg-background"
                  style={{ gridTemplateColumns: COLONNE }}
                >
                  <div className="px-4 py-2.5 text-[13px] font-display">{fmtData(t.data)}</div>
                  <div className="truncate px-4 py-2.5 text-[13px]" title={nomeTitolo}>
                    {nomeTitolo}
                  </div>
                  <div className="px-4 py-2.5 text-[13px]">
                    <span
                      className="rounded-lg px-2.5 py-1 text-[11px] font-semibold"
                      style={{ background: COLORE_TIPO[t.tipo]?.bg, color: COLORE_TIPO[t.tipo]?.color }}
                    >
                      {LABEL_TIPO[t.tipo] ?? t.tipo}
                    </span>
                  </div>
                  <div className="px-4 py-2.5 text-[13px]">
                    {t.origine && (
                      <span
                        className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-text-secondary"
                        style={{ background: COLORE_ORIGINE[t.origine] }}
                      >
                        {LABEL_ORIGINE[t.origine] ?? t.origine}
                      </span>
                    )}
                  </div>
                  <div className="px-4 py-2.5 text-right text-[13px] font-display">{fmtQty(t.quantita)}</div>
                  <div className="px-4 py-2.5 text-right text-[13px] font-display">
                    {t.prezzo_unitario != null ? fmtEur(t.prezzo_unitario) : '—'}
                  </div>
                  <div className="px-4 py-2.5 text-right text-[13px] font-display">
                    {t.importo != null ? fmtEur(t.importo) : '—'}
                  </div>
                  <div className="px-4 py-2.5 text-right text-[13px] font-display">{fmtEur(t.commissioni)}</div>
                  <RowMenu
                    aperto={menuAperto}
                    onToggle={(v) => setMenuRigaAperto(v ? t.id : null)}
                    className="px-2 py-2"
                    items={[
                      { label: 'Modifica', onClick: () => apriModifica(t) },
                      { label: 'Elimina', onClick: () => setDaEliminare(t), negativo: true },
                    ]}
                  />
                </div>
              )
            })
          )}
        </div>
      </div>

      {modaleAperto && (
        <NuovaTransazione titoli={titoli} transazioneEsistente={inModifica ?? undefined} onClose={chiudiModale} />
      )}

      {importoCsvAperto && (
        <ImportaCsv
          roots={tree ?? []}
          titoli={titoliPerImport}
          contenitori={flattenContenitori(tree ?? [])}
          transazioniEsistenti={righe}
          onClose={() => setImportoCsvAperto(false)}
        />
      )}

      {daEliminare && (
        <ConfirmDialog
          title="Eliminare questa transazione?"
          message="Quantità e prezzo medio di carico della posizione verranno ricalcolati senza di essa. L'operazione non si può annullare."
          confirmLabel="Elimina"
          loading={eliminaTransazione.isPending}
          onConfirm={confermaEliminazione}
          onCancel={() => setDaEliminare(null)}
        />
      )}
    </div>
  )
}
