import { useMemo, useState } from 'react'
import Modal from '../Modal'
import Segmented from '../Segmented'
import Dropdown from '../Dropdown'
import NodeSelect from '../NodeSelect'
import ConfirmDialog from '../ConfirmDialog'
import { useCreateTitolo } from '../../hooks/useCreateTitolo'
import { useUpdateNodo } from '../../hooks/useCrud'
import { useUpdateTitolo } from '../../hooks/useUpdateTitolo'
import { useDeleteNodo } from '../../hooks/useCrud'
import { unitaFratelli, type ContenitoreOpzione, type TreeNode } from '../../lib/tree'
import { parseNumeroIt } from '../../lib/format'
import type { CategoriaTitolo, StatoNodo, TargetUnita } from '../../types/domain'

const CATEGORIE: { value: CategoriaTitolo; label: string }[] = [
  { value: 'etf', label: 'ETF' },
  { value: 'etc', label: 'ETC' },
  { value: 'fondo_pensione', label: 'Fondo pensione' },
  { value: 'cripto', label: 'Cripto' },
  { value: 'altro', label: 'Altro' },
]

export default function NuovoTitolo({
  roots,
  contenitori,
  parentIdIniziale,
  nodoEsistente,
  onClose,
}: {
  roots: TreeNode[]
  contenitori: ContenitoreOpzione[]
  parentIdIniziale: string | null
  nodoEsistente?: TreeNode
  onClose: () => void
}) {
  const modificaMode = !!nodoEsistente
  const [nome, setNome] = useState(nodoEsistente?.nome ?? '')
  const [categoria, setCategoria] = useState<CategoriaTitolo>(nodoEsistente?.categoria ?? 'etf')
  const [isin, setIsin] = useState(nodoEsistente?.isin ?? '')
  const [simboloProvider, setSimboloProvider] = useState(nodoEsistente?.simboloProvider ?? '')
  const [ter, setTer] = useState(nodoEsistente?.ter?.toString().replace('.', ',') ?? '')
  const cripto = categoria === 'cripto'
  const [parentId, setParentId] = useState<string | null>(nodoEsistente?.parentId ?? parentIdIniziale)
  const [unitaScelta, setUnitaScelta] = useState<TargetUnita>(nodoEsistente?.targetUnita ?? 'percentuale')
  const [targetValore, setTargetValore] = useState(nodoEsistente?.targetValore?.toString().replace('.', ',') ?? '')
  const [stato, setStato] = useState<StatoNodo>((nodoEsistente?.stato as StatoNodo) ?? 'attiva')
  const congelata = stato === 'congelata'
  const senzaTargetPac = cripto || congelata
  // Una posizione congelata o cripto non può avere PAC: se il titolo aperto
  // in modifica è già in uno di questi due stati, il valore iniziale deve
  // rispettarlo subito, non solo dopo che l'utente tocca Stato o Categoria.
  const [faPartePac, setFaPartePac] = useState(
    nodoEsistente && (nodoEsistente.stato === 'congelata' || nodoEsistente.categoria === 'cripto')
      ? false
      : (nodoEsistente?.faPartePac ?? true),
  )
  const [pacImporto, setPacImporto] = useState(nodoEsistente?.pacImporto?.toString().replace('.', ',') ?? '')
  const [pacDinamizzazione, setPacDinamizzazione] = useState(
    nodoEsistente?.pacDinamizzazione?.toString().replace('.', ',') ?? '',
  )
  const [note, setNote] = useState(nodoEsistente?.note ?? '')
  const [confermaEliminazione, setConfermaEliminazione] = useState(false)

  function cambiaCategoria(nuova: CategoriaTitolo) {
    setCategoria(nuova)
    // Le cripto non hanno obiettivo, PAC né TER: passando a "Cripto" si
    // azzerano questi campi, così non restano valori nascosti da inviare.
    if (nuova === 'cripto') {
      setTargetValore('')
      setPacImporto('')
      setFaPartePac(false)
      setTer('')
    }
  }

  function cambiaStato(nuovo: StatoNodo) {
    setStato(nuovo)
    // Le posizioni congelate non hanno obiettivo né versamento ricorrente.
    if (nuovo === 'congelata') {
      setTargetValore('')
      setPacImporto('')
      setFaPartePac(false)
    }
  }

  const creaTitolo = useCreateTitolo()
  const aggiornaNodo = useUpdateNodo()
  const aggiornaTitolo = useUpdateTitolo()
  const eliminaNodo = useDeleteNodo()

  const unitaEreditata = useMemo(
    () => (modificaMode ? null : unitaFratelli(roots, parentId)),
    [roots, parentId, modificaMode],
  )
  const unita = unitaEreditata ?? unitaScelta

  const puoSalvare = nome.trim().length > 0 && (cripto || isin.trim().length > 0) && parentId !== null
  const erroreMutazione = creaTitolo.error ?? aggiornaNodo.error ?? aggiornaTitolo.error ?? eliminaNodo.error
  const salvataggioInCorso = creaTitolo.isPending || aggiornaNodo.isPending || aggiornaTitolo.isPending

  async function handleSubmit() {
    if (!parentId) return

    const targetValoreNumero = targetValore.trim() ? parseNumeroIt(targetValore) : null
    const targetUnitaFinale = targetValoreNumero != null ? unita : null
    const modoTargetFinale = targetValoreNumero != null ? 'stabilito' : null
    const terNumero = ter.trim() ? parseNumeroIt(ter) : null
    const isinFinale = cripto ? null : isin.trim() || null
    const simboloProviderFinale = simboloProvider.trim() || null

    if (modificaMode && nodoEsistente) {
      if (nodoEsistente.titoloId) {
        await aggiornaTitolo.mutateAsync({
          id: nodoEsistente.titoloId,
          nome: nome.trim(),
          isin: isinFinale,
          categoria,
          simboloProvider: simboloProviderFinale,
          ter: terNumero,
        })
      }
      await aggiornaNodo.mutateAsync({
        id: nodoEsistente.id,
        changes: {
          parent_id: parentId,
          modo_target: modoTargetFinale,
          target_valore: targetValoreNumero,
          target_unita: targetUnitaFinale,
          stato,
          fa_parte_pac: senzaTargetPac ? false : faPartePac,
          pac_importo: pacImporto.trim() ? parseNumeroIt(pacImporto) : null,
          pac_dinamizzazione: pacDinamizzazione.trim() ? parseNumeroIt(pacDinamizzazione) : null,
          note: note.trim() || null,
        },
      })
    } else {
      const fratelli = contenitori.filter((c) => c.parentId === parentId).length
      await creaTitolo.mutateAsync({
        nome: nome.trim(),
        isin: isinFinale,
        categoria,
        simboloProvider: simboloProviderFinale,
        ter: terNumero,
        parentId,
        ordine: fratelli,
        targetValore: targetValoreNumero,
        targetUnita: targetUnitaFinale,
        stato,
        faPartePac: senzaTargetPac ? false : faPartePac,
        pacImporto: pacImporto.trim() ? parseNumeroIt(pacImporto) : null,
        pacDinamizzazione: pacDinamizzazione.trim() ? parseNumeroIt(pacDinamizzazione) : null,
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
    <Modal title={modificaMode ? 'Modifica titolo' : 'Nuovo titolo'} onClose={onClose}>
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
          <div className="mb-1.5 text-xs text-text-secondary">Categoria</div>
          <Dropdown options={CATEGORIE} value={categoria} onChange={cambiaCategoria} />
        </label>

        {cripto ? (
          <label className="block">
            <div className="mb-1.5 text-xs text-text-secondary">ID CoinGecko (facoltativo)</div>
            <input
              value={simboloProvider}
              onChange={(e) => setSimboloProvider(e.target.value.toLowerCase())}
              placeholder="es. bitcoin, ethereum, cardano"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <div className="mt-1 text-[11px] text-text-tertiary">
              Identifica il prezzo su CoinGecko. Se non lo conosci, lascia vuoto: il titolo non riceverà
              aggiornamenti di prezzo automatici.
            </div>
          </label>
        ) : (
          <label className="block">
            <div className="mb-1.5 text-xs text-text-secondary">ISIN</div>
            <input
              value={isin}
              onChange={(e) => setIsin(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            {modificaMode && (
              <div className="mt-1 text-[11px] text-text-tertiary">
                Cambia l'anagrafica ovunque questo titolo sia usato, in tutti i portafogli.
              </div>
            )}
          </label>
        )}

        {!cripto && (
          <label className="block">
            <div className="mb-1.5 text-xs text-text-secondary">TER — costo annuo di gestione (facoltativo)</div>
            <input
              inputMode="decimal"
              value={ter}
              onChange={(e) => setTer(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <div className="mt-1 text-[11px] text-text-tertiary">
              In percentuale. Se non lo conosci, lascia vuoto: il titolo resta escluso dal costo medio del portafoglio.
            </div>
          </label>
        )}

        <label className="block">
          <div className="mb-1.5 text-xs text-text-secondary">Nodo padre</div>
          <NodeSelect opzioni={contenitori} value={parentId} onChange={setParentId} permettiNessuno={false} />
        </label>

        {senzaTargetPac && (
          <div className="rounded-lg bg-background px-3 py-2.5 text-[12px] text-text-secondary">
            {cripto
              ? 'Le posizioni cripto non hanno obiettivo né versamento ricorrente: si registra solo cosa possiedi.'
              : 'Le posizioni congelate non hanno obiettivo né versamento ricorrente: restano nell\'albero e contribuiscono al valore del nodo padre.'}
          </div>
        )}

        {!senzaTargetPac && (
          <div className="flex gap-3">
            <label className="block flex-1">
              <div className="mb-1.5 text-xs text-text-secondary">Obiettivo (facoltativo)</div>
              <input
                inputMode="decimal"
                value={targetValore}
                onChange={(e) => setTargetValore(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <div className="flex-1">
              <div className="mb-1.5 text-xs text-text-secondary">Unità</div>
              {unitaEreditata ? (
                <div className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text-secondary">
                  {unitaEreditata === 'percentuale' ? 'Percentuale (dai fratelli)' : 'Importo in € (dai fratelli)'}
                </div>
              ) : (
                <Segmented
                  options={[
                    { value: 'percentuale', label: 'Percentuale' },
                    { value: 'euro', label: 'Importo in €' },
                  ]}
                  value={unitaScelta}
                  onChange={setUnitaScelta}
                />
              )}
            </div>
          </div>
        )}

        <div>
          <div className="mb-1.5 text-xs text-text-secondary">Stato</div>
          <Segmented
            options={[
              { value: 'attiva', label: 'Attiva' },
              { value: 'congelata', label: 'Congelata' },
            ]}
            value={stato}
            onChange={cambiaStato}
          />
        </div>

        {!senzaTargetPac && (
          <div>
            <div className="mb-1.5 text-xs text-text-secondary">Fa parte di un PAC</div>
            <Segmented
              options={[
                { value: 'si', label: 'Sì' },
                { value: 'no', label: 'No' },
              ]}
              value={faPartePac ? 'si' : 'no'}
              onChange={(v) => {
                const attivo = v === 'si'
                setFaPartePac(attivo)
                if (!attivo) {
                  setPacImporto('')
                  setPacDinamizzazione('')
                }
              }}
            />
            <div className="mt-1 text-[11px] text-text-tertiary">
              "No" per una posizione una tantum: viene esclusa da Scarto e Riferimento.
            </div>
          </div>
        )}

        {!senzaTargetPac && faPartePac && (
          <label className="block">
            <div className="mb-1.5 text-xs text-text-secondary">Importo del versamento ricorrente (facoltativo)</div>
            <input
              inputMode="decimal"
              value={pacImporto}
              onChange={(e) => setPacImporto(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <div className="mt-1 text-[11px] text-text-tertiary">Solo informativo: l'importo reale lo gestisci sul broker.</div>
          </label>
        )}

        {!senzaTargetPac && faPartePac && (
          <label className="block">
            <div className="mb-1.5 text-xs text-text-secondary">Dinamizzazione annua (facoltativa)</div>
            <input
              inputMode="decimal"
              value={pacDinamizzazione}
              onChange={(e) => setPacDinamizzazione(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>
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
              {salvataggioInCorso ? 'Salvataggio…' : modificaMode ? 'Salva modifiche' : 'Crea titolo'}
            </button>
          </div>
        </div>
      </div>

      {confermaEliminazione && (
        <ConfirmDialog
          title="Eliminare questo titolo?"
          message="La posizione e le sue transazioni verranno eliminate. L'anagrafica del titolo resta, se usata altrove. L'operazione non si può annullare."
          confirmLabel="Elimina"
          loading={eliminaNodo.isPending}
          onConfirm={handleDelete}
          onCancel={() => setConfermaEliminazione(false)}
        />
      )}
    </Modal>
  )
}
