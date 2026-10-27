import { useState } from 'react'
import { useTree } from '../hooks/useTree'
import { useDeleteNodo } from '../hooks/useDeleteNodo'
import { useTagDefinizioni } from '../hooks/useTagDefinizioni'
import { useDeleteTagDefinizione } from '../hooks/useDeleteTagDefinizione'
import { useImpostazioni } from '../hooks/useImpostazioni'
import { contaFigli, flattenContenitori, sottoAlberoIds, trovaFratelli, trovaNodo, type TreeNode } from '../lib/tree'
import { useCreateNodo } from '../hooks/useCreateNodo'
import { useUpdateNodo } from '../hooks/useUpdateNodo'
import { useRiordinaNodi } from '../hooks/useRiordinaNodi'
import { useClickEsterno } from '../hooks/useClickEsterno'
import { fmtData, fmtEur, fmtNum, fmtPct } from '../lib/format'
import { usePosizioniChiuse } from '../hooks/usePosizioniChiuse'
import {
  BADGE_STATO,
  COLONNE,
  caricaColonneVisibili,
  salvaColonneVisibili,
  caricaOrdineColonne,
  salvaOrdineColonne,
  fmtObiettivo,
  type ColonnaContesto,
  type ColonnaDef,
} from '../lib/colonnePosizioni'
import NuovoPortafoglio from '../components/modals/NuovoPortafoglio'
import NuovoTitolo from '../components/modals/NuovoTitolo'
import NuovoTag from '../components/modals/NuovoTag'
import ConfirmDialog from '../components/ConfirmDialog'
import RowMenu from '../components/RowMenu'
import TagPanel from '../components/TagPanel'
import DetailPanel from '../components/DetailPanel'
import { IconSearch } from '../components/icons'
import type { TagDefinizione } from '../types/domain'
import type { StatoNodo } from '../types/domain'

const FILTRI_STATO: { value: StatoNodo | 'tutte'; label: string }[] = [
  { value: 'tutte', label: 'Tutte' },
  { value: 'attiva', label: 'Attive' },
  { value: 'congelata', label: 'Congelate' },
]

// Colonne con un valore numerico: cifre in Space Grotesk (font-display),
// coerente col resto dell'app — badge (PAC, Stato) e ISIN restano nel
// font di testo normale, non sono cifre da allineare in tabella.
const COLONNE_NUMERICHE = new Set([
  'obiettivo',
  'peso',
  'scarto',
  'valore',
  'plPct',
  'quantita',
  'pmc',
  'prezzo',
  'plEuro',
  'ter',
  'costoAnnuo',
  'dinamizzazione',
])

// Tiene solo i titoli che passano i filtri e i loro antenati (portafogli/TAG),
// scartando i rami che non contengono nessun risultato.
function filtraAlbero(nodi: TreeNode[], testo: string, stato: StatoNodo | 'tutte'): TreeNode[] {
  const t = testo.trim().toLowerCase()
  function filtra(n: TreeNode): TreeNode | null {
    if (n.tipo === 'titolo') {
      if (stato !== 'tutte' && n.stato !== stato) return null
      if (t && !n.nome.toLowerCase().includes(t) && !n.isin?.toLowerCase().includes(t)) return null
      return n
    }
    const figli = n.children.map(filtra).filter((f): f is TreeNode => f !== null)
    return figli.length > 0 ? { ...n, children: figli } : null
  }
  return nodi.map(filtra).filter((n): n is TreeNode => n !== null)
}

function contaTitoli(nodi: TreeNode[]): number {
  return nodi.reduce((s, n) => s + (n.tipo === 'titolo' ? 1 : contaTitoli(n.children)), 0)
}

function Riga({
  nodo,
  livello,
  espansi,
  onToggle,
  menuApertoId,
  onToggleMenu,
  onModifica,
  onElimina,
  onDuplica,
  onDettaglio,
  colonne,
  contesto,
  nodoTrascinatoId,
  onDragStartNodo,
  onDropNodo,
  onDragEndNodo,
}: {
  nodo: TreeNode
  livello: number
  espansi: Set<string>
  onToggle: (id: string) => void
  menuApertoId: string | null
  onToggleMenu: (id: string | null) => void
  onModifica: (nodo: TreeNode) => void
  onElimina: (nodo: TreeNode) => void
  onDuplica: (nodo: TreeNode) => void
  onDettaglio: (nodo: TreeNode) => void
  colonne: ColonnaDef[]
  contesto: ColonnaContesto
  nodoTrascinatoId: string | null
  onDragStartNodo: (nodo: TreeNode) => void
  onDropNodo: (nodo: TreeNode, posizione: 'prima' | 'dopo') => void
  onDragEndNodo: () => void
}) {
  const haFigli = nodo.children.length > 0
  const aperto = espansi.has(nodo.id)
  const menuAperto = menuApertoId === nodo.id
  const pesoTag = { portafoglio: 600, tag: 500, titolo: 400 }[nodo.tipo]
  const inTrascinamento = nodoTrascinatoId === nodo.id

  return (
    <>
      <div
        className="flex cursor-pointer border-b border-border"
        style={{
          background: nodo.tipo === 'portafoglio' ? 'var(--color-background)' : 'var(--color-surface)',
          opacity: inTrascinamento ? 0.4 : 1,
        }}
        role="button"
        tabIndex={0}
        onClick={() => onDettaglio(nodo)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onDettaglio(nodo)
          }
        }}
        onDragOver={(e) => {
          if (!nodoTrascinatoId || nodoTrascinatoId === nodo.id) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
        }}
        onDrop={(e) => {
          if (!nodoTrascinatoId || nodoTrascinatoId === nodo.id) return
          e.preventDefault()
          const rect = e.currentTarget.getBoundingClientRect()
          onDropNodo(nodo, e.clientY < rect.top + rect.height / 2 ? 'prima' : 'dopo')
        }}
      >
        <div
          className="sticky left-0 z-10 flex w-80 flex-none items-center gap-2 border-r border-border py-2.5"
          style={{
            paddingLeft: livello * 24 + 12,
            background: nodo.tipo === 'portafoglio' ? 'var(--color-background)' : 'var(--color-surface)',
          }}
        >
          {haFigli ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggle(nodo.id)
              }}
              className="flex flex-none -m-2 items-center justify-center p-2 text-text-secondary"
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ transform: aperto ? 'rotate(90deg)' : 'none' }}>
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <div className="w-4" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <div className="truncate text-[13px]" style={{ fontWeight: pesoTag }} title={nodo.nome}>{nodo.nome}</div>
              {nodo.eRiferimento && (
                <span className="flex-none rounded px-1.5 py-0.5 text-[11px] font-semibold text-text-secondary bg-background">
                  Riferimento
                </span>
              )}
            </div>
            {nodo.isin && <div className="text-xs text-text-secondary">{nodo.isin}</div>}
          </div>
          <div
            draggable
            onClick={(e) => e.stopPropagation()}
            onDragStart={(e) => {
              // Firefox non avvia un trascinamento nativo senza dati
              // effettivamente allegati: senza questa riga il drag&drop
              // funziona in Chrome ma resta inerte altrove.
              e.dataTransfer.setData('text/plain', nodo.id)
              e.dataTransfer.effectAllowed = 'move'
              onDragStartNodo(nodo)
            }}
            onDragEnd={onDragEndNodo}
            className="flex h-6 w-6 flex-none cursor-grab items-center justify-center text-text-tertiary active:cursor-grabbing"
            title="Trascina per riordinare"
          >
            <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
              <circle cx="2.5" cy="2.5" r="1.2" fill="currentColor" />
              <circle cx="7.5" cy="2.5" r="1.2" fill="currentColor" />
              <circle cx="2.5" cy="7" r="1.2" fill="currentColor" />
              <circle cx="7.5" cy="7" r="1.2" fill="currentColor" />
              <circle cx="2.5" cy="11.5" r="1.2" fill="currentColor" />
              <circle cx="7.5" cy="11.5" r="1.2" fill="currentColor" />
            </svg>
          </div>
          <RowMenu
            aperto={menuAperto}
            onToggle={(v) => onToggleMenu(v ? nodo.id : null)}
            items={[
              { label: 'Modifica', onClick: () => onModifica(nodo) },
              { label: 'Duplica', onClick: () => onDuplica(nodo) },
              { label: 'Elimina', onClick: () => onElimina(nodo), negativo: true },
            ]}
          />
        </div>
        {colonne.map((c) => (
          <div
            key={c.id}
            className={`flex-none px-4 py-2.5 text-[13px] ${COLONNE_NUMERICHE.has(c.id) ? 'font-display' : ''}`}
            style={{ width: c.width }}
          >
            {c.render(nodo, contesto)}
          </div>
        ))}
      </div>
      {haFigli && aperto && nodo.children.map((figlio) => (
        <Riga
          key={figlio.id}
          nodo={figlio}
          livello={livello + 1}
          espansi={espansi}
          onToggle={onToggle}
          menuApertoId={menuApertoId}
          onToggleMenu={onToggleMenu}
          onModifica={onModifica}
          onElimina={onElimina}
          onDuplica={onDuplica}
          onDettaglio={onDettaglio}
          colonne={colonne}
          contesto={contesto}
          nodoTrascinatoId={nodoTrascinatoId}
          onDragStartNodo={onDragStartNodo}
          onDropNodo={onDropNodo}
          onDragEndNodo={onDragEndNodo}
        />
      ))}
    </>
  )
}

// Vista mobile: una scheda per nodo invece di una riga di tabella con
// colonne fisse (che su schermi stretti restava leggibile solo la prima,
// il resto andava scoperto scorrendo di lato — scelto con l'utente, tra due
// mockup, in favore di questo). Niente drag&drop di riordino (HTML5 nativo,
// non funziona a tocco): resta disponibile solo nella vista a tabella.
function RigaCard({
  nodo,
  livello,
  espansi,
  onToggle,
  menuApertoId,
  onToggleMenu,
  onModifica,
  onElimina,
  onDuplica,
  onDettaglio,
  contesto,
}: {
  nodo: TreeNode
  livello: number
  espansi: Set<string>
  onToggle: (id: string) => void
  menuApertoId: string | null
  onToggleMenu: (id: string | null) => void
  onModifica: (nodo: TreeNode) => void
  onElimina: (nodo: TreeNode) => void
  onDuplica: (nodo: TreeNode) => void
  onDettaglio: (nodo: TreeNode) => void
  contesto: ColonnaContesto
}) {
  const haFigli = nodo.children.length > 0
  const aperto = espansi.has(nodo.id)
  const menuAperto = menuApertoId === nodo.id
  const pesoTag = { portafoglio: 600, tag: 500, titolo: 400 }[nodo.tipo]
  const haObiettivo = nodo.scartoPunti != null && nodo.scartoEuro != null
  const indietro = haObiettivo && nodo.scartoPunti! < 0 && Math.abs(nodo.scartoPunti!) > contesto.tolleranza
  const badgeStato = nodo.stato && nodo.stato !== 'attiva' ? (BADGE_STATO[nodo.stato] ?? { label: nodo.stato, bg: 'var(--color-background)' }) : null
  const coloreSegno = (v: number | null) => (v == null ? undefined : v >= 0 ? 'var(--color-positive)' : 'var(--color-negative)')

  return (
    <>
      <div
        className="cursor-pointer rounded-[10px] border border-border px-3 py-2.5"
        style={{ marginLeft: livello * 16, background: nodo.tipo === 'titolo' ? 'var(--color-surface)' : 'var(--color-background)' }}
        role="button"
        tabIndex={0}
        onClick={() => onDettaglio(nodo)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onDettaglio(nodo)
          }
        }}
      >
        <div className="flex items-center gap-1.5">
          {haFigli ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggle(nodo.id)
              }}
              className="flex flex-none -m-2 items-center justify-center p-2 text-text-secondary"
            >
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ transform: aperto ? 'rotate(90deg)' : 'none' }}>
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <div className="w-3 flex-none" />
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px]" style={{ fontWeight: pesoTag }}>
              {nodo.nome}
            </div>
            {nodo.isin && <div className="text-xs text-text-secondary">{nodo.isin}</div>}
          </div>
          {nodo.eRiferimento && (
            <span className="flex-none rounded px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary bg-background">Riferimento</span>
          )}
          {badgeStato && (
            <span className="flex-none rounded-lg px-2 py-0.5 text-[10px] font-semibold text-text-secondary" style={{ background: badgeStato.bg }}>
              {badgeStato.label}
            </span>
          )}
          <RowMenu
            aperto={menuAperto}
            onToggle={(v) => onToggleMenu(v ? nodo.id : null)}
            items={[
              { label: 'Modifica', onClick: () => onModifica(nodo) },
              { label: 'Duplica', onClick: () => onDuplica(nodo) },
              { label: 'Elimina', onClick: () => onElimina(nodo), negativo: true },
            ]}
          />
        </div>

        {nodo.tipo === 'titolo' ? (
          <div className="mt-2 flex flex-wrap gap-1.5 pl-[18px] font-display text-[11px]">
            {nodo.peso != null && (
              <span className="rounded-md bg-background px-2 py-1 text-text-secondary">Peso {fmtPct(nodo.peso)}</span>
            )}
            <span className="rounded-md bg-background px-2 py-1 text-text-secondary">{fmtEur(nodo.valore)}</span>
            {nodo.plPct != null && (
              <span className="rounded-md bg-background px-2 py-1" style={{ color: coloreSegno(nodo.plPct) }}>
                {fmtPct(nodo.plPct, { sign: true })}
              </span>
            )}
            <span className="rounded-md bg-background px-2 py-1 font-sans font-semibold text-text-secondary">PAC {nodo.faPartePac ? 'Sì' : 'No'}</span>
          </div>
        ) : haObiettivo ? (
          <div className="mt-2 grid grid-cols-3 gap-2 pl-[18px]">
            <div>
              <div className="text-[10px] text-text-tertiary">Peso</div>
              <div className="font-display text-[13px] font-medium">{nodo.peso != null ? fmtPct(nodo.peso) : '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-text-tertiary">Obiettivo</div>
              <div className="font-display text-[13px] font-medium">{fmtObiettivo(nodo)}</div>
            </div>
            <div className="rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5" style={{ background: indietro ? 'var(--color-negative-soft)' : undefined }}>
              <div className="text-[10px] text-text-tertiary">Scarto</div>
              <div className="font-display text-[13px] font-medium">{fmtNum(nodo.scartoPunti, 1)} pt</div>
              <div className="font-display text-[10px] text-text-secondary">{fmtEur(nodo.scartoEuro, { sign: true })}</div>
            </div>
          </div>
        ) : (
          <div className="mt-1 pl-[18px] font-display text-[11px] text-text-secondary">
            Peso {nodo.peso != null ? fmtPct(nodo.peso) : '—'} · {fmtEur(nodo.valore)}
            {nodo.plPct != null && (
              <>
                {' '}
                · <span style={{ color: coloreSegno(nodo.plPct) }}>{fmtPct(nodo.plPct, { sign: true })}</span>
              </>
            )}
          </div>
        )}
      </div>
      {haFigli && aperto && nodo.children.map((figlio) => (
        <RigaCard
          key={figlio.id}
          nodo={figlio}
          livello={livello + 1}
          espansi={espansi}
          onToggle={onToggle}
          menuApertoId={menuApertoId}
          onToggleMenu={onToggleMenu}
          onModifica={onModifica}
          onElimina={onElimina}
          onDuplica={onDuplica}
          onDettaglio={onDettaglio}
          contesto={contesto}
        />
      ))}
    </>
  )
}

export default function Posizioni() {
  const { data: tree, isLoading, error } = useTree()
  const { data: tagDefinizioni, isLoading: caricoTagDef, error: erroreTagDef } = useTagDefinizioni()
  const { data: impostazioni } = useImpostazioni()
  const eliminaNodo = useDeleteNodo()
  const creaNodo = useCreateNodo()
  const aggiornaNodoStato = useUpdateNodo()
  const riordinaNodi = useRiordinaNodi()
  const [nodoTrascinatoId, setNodoTrascinatoId] = useState<string | null>(null)
  const eliminaTagDefinizione = useDeleteTagDefinizione()
  const [espansi, setEspansi] = useState<Set<string>>(new Set())
  const [menuAggiungiAperto, setMenuAggiungiAperto] = useState(false)
  const [menuRigaAperto, setMenuRigaAperto] = useState<string | null>(null)
  const [modale, setModale] = useState<'portafoglio' | 'titolo' | 'tag' | null>(null)
  const [nodoInModifica, setNodoInModifica] = useState<TreeNode | null>(null)
  const [nodoDaEliminare, setNodoDaEliminare] = useState<TreeNode | null>(null)
  const [nodoDettaglioId, setNodoDettaglioId] = useState<string | null>(null)
  const [definizioneInModifica, setDefinizioneInModifica] = useState<TagDefinizione | null>(null)
  const [definizioneDaEliminare, setDefinizioneDaEliminare] = useState<TagDefinizione | null>(null)
  const [colonneVisibili, setColonneVisibili] = useState<Set<string>>(() => caricaColonneVisibili())
  const [ordineColonne, setOrdineColonne] = useState<string[]>(() => caricaOrdineColonne())
  const [colonnaTrascinataId, setColonnaTrascinataId] = useState<string | null>(null)
  const [menuColonneAperto, setMenuColonneAperto] = useState(false)
  const { data: posizioniChiuse } = usePosizioniChiuse()
  const [chiuseAperto, setChiuseAperto] = useState(false)
  const [menuChiusaAperto, setMenuChiusaAperto] = useState<string | null>(null)
  const refMenuColonne = useClickEsterno<HTMLDivElement>(menuColonneAperto, () => setMenuColonneAperto(false))
  const refMenuAggiungi = useClickEsterno<HTMLDivElement>(menuAggiungiAperto, () => setMenuAggiungiAperto(false))
  const [chiusaDaEliminare, setChiusaDaEliminare] = useState<string | null>(null)
  const [tagPanelAperto, setTagPanelAperto] = useState(false)
  const [filtroTesto, setFiltroTesto] = useState('')
  const [filtroStato, setFiltroStato] = useState<StatoNodo | 'tutte'>('tutte')

  function toggleColonna(id: string) {
    setColonneVisibili((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      salvaColonneVisibili(next)
      return next
    })
  }

  // Riordino delle colonne nel menù "Colonne", stessa logica del riordino
  // tra fratelli nell'albero: trascinata via dalla sua posizione, reinserita
  // prima o dopo la colonna bersaglio.
  function spostaColonna(targetId: string, posizione: 'prima' | 'dopo') {
    if (!colonnaTrascinataId || colonnaTrascinataId === targetId) return
    const senzaTrascinata = ordineColonne.filter((id) => id !== colonnaTrascinataId)
    const indiceTarget = senzaTrascinata.indexOf(targetId)
    const nuovoOrdine = [...senzaTrascinata]
    nuovoOrdine.splice(posizione === 'prima' ? indiceTarget : indiceTarget + 1, 0, colonnaTrascinataId)
    setOrdineColonne(nuovoOrdine)
    salvaOrdineColonne(nuovoOrdine)
  }

  function toggle(id: string) {
    setEspansi((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function idConFigli(nodi: TreeNode[]): string[] {
    return nodi.flatMap((n) => (n.children.length > 0 ? [n.id, ...idConFigli(n.children)] : []))
  }

  if (isLoading || caricoTagDef) return <div className="text-sm text-text-secondary">Caricamento…</div>
  if (error || erroreTagDef) return <div className="text-sm text-negative">Errore nel caricamento: {(error ?? erroreTagDef)!.message}</div>

  const roots = tree ?? []
  // Rideriva sempre il nodo fresco dall'albero (non uno snapshot preso al
  // click) così il pannello riflette subito una mutazione fatta al suo interno.
  const nodoDettaglio = nodoDettaglioId ? trovaNodo(roots, nodoDettaglioId) : null
  const contenitori = flattenContenitori(roots)
  const definizioni = tagDefinizioni ?? []
  const portafogli = contenitori.filter((c) => c.tipo === 'portafoglio')

  function apriModifica(nodo: TreeNode) {
    setNodoInModifica(nodo)
    setModale(nodo.tipo === 'titolo' ? 'titolo' : nodo.tipo === 'tag' ? 'tag' : 'portafoglio')
  }

  // Duplica solo la configurazione del nodo (target, stato, PAC): per un
  // portafoglio o un TAG nessun figlio, per un titolo nessuna transazione —
  // il duplicato riparte vuoto, coerente col fatto che quantità e valore non
  // si inseriscono mai a mano.
  function duplicaNodo(nodo: TreeNode) {
    creaNodo.mutate({
      tipo: nodo.tipo,
      parent_id: nodo.parentId,
      ordine: contaFigli(roots, nodo.parentId),
      nome: nodo.tipo === 'portafoglio' ? `${nodo.nome} (copia)` : null,
      titolo_id: nodo.titoloId,
      tag_definizione_id: nodo.tagDefinizioneId,
      stato: nodo.stato,
      modo_target: nodo.modoTarget,
      target_valore: nodo.targetValore,
      target_unita: nodo.targetUnita,
      fa_parte_pac: nodo.faPartePac,
      pac_importo: nodo.pacImporto,
      pac_dinamizzazione: nodo.pacDinamizzazione,
      note: nodo.note,
    })
  }

  function dragStartNodo(nodo: TreeNode) {
    setNodoTrascinatoId(nodo.id)
  }

  function dragEndNodo() {
    setNodoTrascinatoId(null)
  }

  // Il riordino è sempre tra fratelli: se il nodo trascinato ha un genitore
  // diverso dal bersaglio, non succede nulla (non si sposta di livello).
  function dropNodo(target: TreeNode, posizione: 'prima' | 'dopo') {
    if (!nodoTrascinatoId) return
    const fratelli = trovaFratelli(roots, target.parentId)
    const trascinato = fratelli.find((n) => n.id === nodoTrascinatoId)
    setNodoTrascinatoId(null)
    if (!trascinato || trascinato.id === target.id) return

    const senzaTrascinato = fratelli.filter((n) => n.id !== trascinato.id)
    const indiceTarget = senzaTrascinato.findIndex((n) => n.id === target.id)
    const nuovoOrdine = [...senzaTrascinato]
    nuovoOrdine.splice(posizione === 'prima' ? indiceTarget : indiceTarget + 1, 0, trascinato)

    riordinaNodi.mutate(nuovoOrdine.map((n, i) => ({ id: n.id, ordine: i })))
  }

  function apriModificaDefinizione(definizione: TagDefinizione) {
    setDefinizioneInModifica(definizione)
    setModale('tag')
  }

  function chiudiModale() {
    setModale(null)
    setNodoInModifica(null)
    setDefinizioneInModifica(null)
  }

  async function confermaEliminazione() {
    if (!nodoDaEliminare) return
    await eliminaNodo.mutateAsync(nodoDaEliminare.id)
    setNodoDaEliminare(null)
  }

  async function riapriPosizione(nodoId: string) {
    await aggiornaNodoStato.mutateAsync({ id: nodoId, changes: { stato: 'attiva' } })
  }

  async function impostaRiferimento(parentId: string, riferimentoId: string | null) {
    await aggiornaNodoStato.mutateAsync({ id: parentId, changes: { riferimento_id: riferimentoId } })
  }

  async function confermaEliminazioneChiusa() {
    if (!chiusaDaEliminare) return
    await eliminaNodo.mutateAsync(chiusaDaEliminare)
    setChiusaDaEliminare(null)
  }

  async function confermaEliminazioneDefinizione() {
    if (!definizioneDaEliminare) return
    await eliminaTagDefinizione.mutateAsync(definizioneDaEliminare.id)
    setDefinizioneDaEliminare(null)
  }

  const contenitoriPerModifica = nodoInModifica
    ? contenitori.filter((c) => !sottoAlberoIds(nodoInModifica).has(c.id))
    : contenitori

  const colonnePerId = new Map(COLONNE.map((c) => [c.id, c]))
  const colonneOrdinate: ColonnaDef[] = ordineColonne.map((id) => colonnePerId.get(id)).filter((c): c is ColonnaDef => c !== undefined)
  const colonneAttive: ColonnaDef[] = colonneOrdinate.filter((c) => colonneVisibili.has(c.id))
  const contesto: ColonnaContesto = { tolleranza: impostazioni?.tolleranza_punti ?? 5 }
  const filtriAttivi = filtroTesto.trim() !== '' || filtroStato !== 'tutte'
  const alberoVisibile = filtriAttivi ? filtraAlbero(roots, filtroTesto, filtroStato) : roots
  // Con un filtro attivo l'albero si mostra sempre tutto aperto: altrimenti
  // i risultati resterebbero nascosti dietro un nodo collassato.
  const espansiEffettivi = filtriAttivi ? new Set(idConFigli(alberoVisibile)) : espansi
  const risultatiFiltro = filtriAttivi ? contaTitoli(alberoVisibile) : 0

  function azzeraFiltri() {
    setFiltroTesto('')
    setFiltroStato('tutte')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-lg font-semibold">Posizioni</div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 sm:w-[280px]">
          <IconSearch className="text-text-tertiary" />
          <input
            value={filtroTesto}
            onChange={(e) => setFiltroTesto(e.target.value)}
            placeholder="Cerca per nome o ISIN"
            className="w-full bg-transparent text-[13px] outline-none"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {FILTRI_STATO.map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltroStato(f.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                filtroStato === f.value ? 'bg-primary-active text-primary' : 'text-text-secondary hover:bg-background'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {filtriAttivi && (
          <div className="flex items-center gap-3 text-[13px] text-text-secondary">
            <div>{risultatiFiltro} {risultatiFiltro === 1 ? 'risultato' : 'risultati'}</div>
            <button onClick={azzeraFiltri} className="font-medium text-primary">
              Azzera filtri
            </button>
          </div>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button
              onClick={() => setEspansi(new Set(idConFigli(roots)))}
              title="Espandi tutto"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-background"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => setEspansi(new Set())}
              title="Richiudi tutto"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-background"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M3 10l5-5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="relative hidden md:block" ref={refMenuColonne}>
            <button
              onClick={() => setMenuColonneAperto((o) => !o)}
              className="flex h-9 items-center rounded-lg border border-border px-4 text-[13px] font-medium hover:bg-background"
            >
              Colonne
            </button>
            {menuColonneAperto && (
              <div className="absolute top-[calc(100%+6px)] right-0 z-20 w-56 rounded-lg border border-border bg-surface p-1 shadow-lg">
                {colonneOrdinate.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-background"
                  >
                    <input type="checkbox" checked={colonneVisibili.has(c.id)} onChange={() => toggleColonna(c.id)} />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setTagPanelAperto(true)}
            className="flex h-9 items-center rounded-lg border border-border px-4 text-[13px] font-medium hover:bg-background"
          >
            Gestisci TAG
          </button>
          <div className="relative" ref={refMenuAggiungi}>
            <button
              onClick={() => setMenuAggiungiAperto((o) => !o)}
              className="flex h-9 items-center rounded-lg bg-primary px-4 text-[13px] font-medium text-white hover:bg-primary-hover"
            >
              + Aggiungi
            </button>
          {menuAggiungiAperto && (
            <div className="absolute top-[calc(100%+6px)] right-0 z-20 w-44 rounded-lg border border-border bg-surface p-1 shadow-lg">
              <div
                onClick={() => {
                  setModale('portafoglio')
                  setMenuAggiungiAperto(false)
                }}
                className="cursor-pointer rounded-md px-3 py-2 text-sm hover:bg-background"
              >
                Portafoglio
              </div>
              <div
                onClick={() => {
                  if (contenitori.length === 0) return
                  setModale('titolo')
                  setMenuAggiungiAperto(false)
                }}
                className={`rounded-md px-3 py-2 text-sm ${
                  contenitori.length === 0 ? 'cursor-not-allowed text-text-tertiary' : 'cursor-pointer hover:bg-background'
                }`}
                title={contenitori.length === 0 ? 'Crea prima un portafoglio' : undefined}
              >
                Titolo
              </div>
              <div
                onClick={() => {
                  if (portafogli.length === 0) return
                  setModale('tag')
                  setMenuAggiungiAperto(false)
                }}
                className={`rounded-md px-3 py-2 text-sm ${
                  portafogli.length === 0 ? 'cursor-not-allowed text-text-tertiary' : 'cursor-pointer hover:bg-background'
                }`}
                title={portafogli.length === 0 ? 'Crea prima un portafoglio' : undefined}
              >
                TAG
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      <div className="hidden overflow-auto rounded-[12px] border border-border bg-surface md:block">
        <div className="min-w-max">
          <div className="flex border-b border-border">
            <div className="sticky left-0 z-10 w-80 flex-none border-r border-border bg-surface px-4 py-3 text-xs font-semibold text-text-secondary">
              Struttura
            </div>
            {colonneAttive.map((c) => (
              <div
                key={c.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', c.id)
                  e.dataTransfer.effectAllowed = 'move'
                  setColonnaTrascinataId(c.id)
                }}
                onDragEnd={() => setColonnaTrascinataId(null)}
                onDragOver={(e) => {
                  if (!colonnaTrascinataId || colonnaTrascinataId === c.id) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                }}
                onDrop={(e) => {
                  if (!colonnaTrascinataId || colonnaTrascinataId === c.id) return
                  e.preventDefault()
                  const rect = e.currentTarget.getBoundingClientRect()
                  spostaColonna(c.id, e.clientX < rect.left + rect.width / 2 ? 'prima' : 'dopo')
                }}
                className="flex flex-none cursor-grab items-center gap-1 px-4 py-3 text-xs font-semibold text-text-secondary active:cursor-grabbing"
                style={{ width: c.width, opacity: colonnaTrascinataId === c.id ? 0.4 : 1 }}
                title="Trascina per riordinare"
              >
                <svg width="7" height="11" viewBox="0 0 10 14" fill="none" className="flex-none text-text-tertiary">
                  <circle cx="2.5" cy="2.5" r="1.2" fill="currentColor" />
                  <circle cx="7.5" cy="2.5" r="1.2" fill="currentColor" />
                  <circle cx="2.5" cy="7" r="1.2" fill="currentColor" />
                  <circle cx="7.5" cy="7" r="1.2" fill="currentColor" />
                  <circle cx="2.5" cy="11.5" r="1.2" fill="currentColor" />
                  <circle cx="7.5" cy="11.5" r="1.2" fill="currentColor" />
                </svg>
                <span className="truncate">{c.label}</span>
              </div>
            ))}
          </div>

          {roots.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-text-tertiary">
              Nessun portafoglio ancora. Aggiungi il primo per iniziare.
            </div>
          ) : filtriAttivi && alberoVisibile.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-text-tertiary">Nessun titolo corrisponde ai filtri.</div>
          ) : (
            alberoVisibile.map((nodo) => (
              <Riga
                key={nodo.id}
                nodo={nodo}
                livello={0}
                espansi={espansiEffettivi}
                onToggle={toggle}
                menuApertoId={menuRigaAperto}
                onToggleMenu={setMenuRigaAperto}
                onModifica={apriModifica}
                onElimina={setNodoDaEliminare}
                onDuplica={duplicaNodo}
                onDettaglio={(n) => setNodoDettaglioId(n.id)}
                colonne={colonneAttive}
                contesto={contesto}
                nodoTrascinatoId={nodoTrascinatoId}
                onDragStartNodo={dragStartNodo}
                onDropNodo={dropNodo}
                onDragEndNodo={dragEndNodo}
              />
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 md:hidden">
        {roots.length === 0 ? (
          <div className="rounded-[12px] border border-border bg-surface px-4 py-10 text-center text-sm text-text-tertiary">
            Nessun portafoglio ancora. Aggiungi il primo per iniziare.
          </div>
        ) : filtriAttivi && alberoVisibile.length === 0 ? (
          <div className="rounded-[12px] border border-border bg-surface px-4 py-10 text-center text-sm text-text-tertiary">
            Nessun titolo corrisponde ai filtri.
          </div>
        ) : (
          alberoVisibile.map((nodo) => (
            <RigaCard
              key={nodo.id}
              nodo={nodo}
              livello={0}
              espansi={espansiEffettivi}
              onToggle={toggle}
              menuApertoId={menuRigaAperto}
              onToggleMenu={setMenuRigaAperto}
              onModifica={apriModifica}
              onElimina={setNodoDaEliminare}
              onDuplica={duplicaNodo}
              onDettaglio={(n) => setNodoDettaglioId(n.id)}
              contesto={contesto}
            />
          ))
        )}
      </div>

      {modale === 'portafoglio' && (
        <NuovoPortafoglio
          contenitori={contenitoriPerModifica}
          parentIdIniziale={null}
          nodoEsistente={nodoInModifica?.tipo === 'portafoglio' ? nodoInModifica : undefined}
          onClose={chiudiModale}
        />
      )}
      {modale === 'titolo' && (
        <NuovoTitolo
          roots={roots}
          contenitori={contenitori}
          parentIdIniziale={null}
          nodoEsistente={nodoInModifica?.tipo === 'titolo' ? nodoInModifica : undefined}
          onClose={chiudiModale}
        />
      )}
      {modale === 'tag' && (
        <NuovoTag
          contenitori={contenitoriPerModifica}
          tagDefinizioni={definizioni}
          parentIdIniziale={null}
          nodoEsistente={nodoInModifica?.tipo === 'tag' ? nodoInModifica : undefined}
          definizioneEsistente={definizioneInModifica ?? undefined}
          onClose={chiudiModale}
        />
      )}

      {tagPanelAperto && (
        <TagPanel
          definizioni={definizioni}
          roots={roots}
          onEdit={(d) => {
            apriModificaDefinizione(d)
            setTagPanelAperto(false)
          }}
          onDelete={(d) => {
            setDefinizioneDaEliminare(d)
            setTagPanelAperto(false)
          }}
          onClose={() => setTagPanelAperto(false)}
        />
      )}

      {nodoDettaglio && (
        <DetailPanel
          nodo={nodoDettaglio}
          roots={roots}
          onEdit={() => {
            apriModifica(nodoDettaglio)
            setNodoDettaglioId(null)
          }}
          onImpostaRiferimento={impostaRiferimento}
          onClose={() => setNodoDettaglioId(null)}
        />
      )}

      <div className="rounded-[12px] border border-border bg-surface">
        <button
          onClick={() => setChiuseAperto((o) => !o)}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium"
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ transform: chiuseAperto ? 'rotate(90deg)' : 'none' }}>
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Posizioni chiuse
          <span className="text-text-tertiary">({(posizioniChiuse ?? []).length})</span>
        </button>
        {chiuseAperto && (
          <div className="overflow-auto border-t border-border">
            <div className="min-w-max">
              <div className="flex border-b border-border">
                <div className="w-64 flex-none px-4 py-3 text-xs font-semibold text-text-secondary">Titolo</div>
                <div className="w-36 flex-none px-4 py-3 text-xs font-semibold text-text-secondary">ISIN</div>
                <div className="w-44 flex-none px-4 py-3 text-xs font-semibold text-text-secondary">Periodo</div>
                <div className="w-32 flex-none px-4 py-3 text-xs font-semibold text-text-secondary">Versato</div>
                <div className="w-32 flex-none px-4 py-3 text-xs font-semibold text-text-secondary">Ricavo</div>
                <div className="w-32 flex-none px-4 py-3 text-xs font-semibold text-text-secondary">Risultato €</div>
                <div className="w-28 flex-none px-4 py-3 text-xs font-semibold text-text-secondary">Risultato %</div>
                <div className="w-10 flex-none px-2 py-3" />
              </div>
              {(posizioniChiuse ?? []).length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-text-tertiary">Nessuna posizione chiusa ancora.</div>
              ) : (
                <>
                  {posizioniChiuse!.map((p) => {
                    const menuAperto = menuChiusaAperto === p.nodoId
                    return (
                      <div key={p.nodoId} className="flex items-center border-b border-border last:border-b-0">
                        <div className="w-64 flex-none truncate px-4 py-2.5 text-[13px]">{p.nome}</div>
                        <div className="w-36 flex-none px-4 py-2.5 text-[13px] text-text-secondary">{p.isin ?? '—'}</div>
                        <div className="w-44 flex-none px-4 py-2.5 text-[13px]">
                          {fmtData(p.primaOperazione)} – {fmtData(p.ultimaOperazione)}
                        </div>
                        <div className="w-32 flex-none px-4 py-2.5 text-[13px] font-display">{fmtEur(p.versato)}</div>
                        <div className="w-32 flex-none px-4 py-2.5 text-[13px] font-display">{fmtEur(p.ricavo)}</div>
                        <div
                          className="w-32 flex-none px-4 py-2.5 text-[13px] font-display font-medium"
                          style={{ color: p.risultatoEuro >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}
                        >
                          {fmtEur(p.risultatoEuro, { sign: true })}
                        </div>
                        <div
                          className="w-28 flex-none px-4 py-2.5 text-[13px] font-display font-medium"
                          style={{ color: p.risultatoPct == null ? undefined : p.risultatoPct >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}
                        >
                          {fmtPct(p.risultatoPct, { sign: true })}
                        </div>
                        <RowMenu
                          aperto={menuAperto}
                          onToggle={(v) => setMenuChiusaAperto(v ? p.nodoId : null)}
                          width={160}
                          className="w-10 px-2 py-2"
                          items={[
                            { label: 'Riapri posizione', onClick: () => riapriPosizione(p.nodoId) },
                            { label: 'Elimina', onClick: () => setChiusaDaEliminare(p.nodoId), negativo: true },
                          ]}
                        />
                      </div>
                    )
                  })}
                  <div className="flex items-center border-t border-border bg-background font-medium">
                    <div className="w-64 flex-none px-4 py-2.5 text-[13px]">Totale</div>
                    <div className="w-36 flex-none px-4 py-2.5 text-[13px]" />
                    <div className="w-44 flex-none px-4 py-2.5 text-[13px]" />
                    <div className="w-32 flex-none px-4 py-2.5 text-[13px] font-display">
                      {fmtEur(posizioniChiuse!.reduce((s, p) => s + p.versato, 0))}
                    </div>
                    <div className="w-32 flex-none px-4 py-2.5 text-[13px] font-display">
                      {fmtEur(posizioniChiuse!.reduce((s, p) => s + p.ricavo, 0))}
                    </div>
                    <div
                      className="w-32 flex-none px-4 py-2.5 text-[13px] font-display"
                      style={{ color: posizioniChiuse!.reduce((s, p) => s + p.risultatoEuro, 0) >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}
                    >
                      {fmtEur(posizioniChiuse!.reduce((s, p) => s + p.risultatoEuro, 0), { sign: true })}
                    </div>
                    <div className="w-28 flex-none px-4 py-2.5 text-[13px]" />
                    <div className="w-10 flex-none px-2 py-2" />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {chiusaDaEliminare && (
        <ConfirmDialog
          title="Eliminare questa posizione chiusa?"
          message="La posizione e tutte le sue transazioni verranno eliminate. L'operazione non si può annullare."
          confirmLabel="Elimina"
          loading={eliminaNodo.isPending}
          onConfirm={confermaEliminazioneChiusa}
          onCancel={() => setChiusaDaEliminare(null)}
        />
      )}

      {definizioneDaEliminare && (
        <ConfirmDialog
          title={`Eliminare la definizione "${definizioneDaEliminare.nome}"?`}
          message={eliminaTagDefinizione.error?.message ?? 'L\'operazione non si può annullare.'}
          confirmLabel="Elimina"
          loading={eliminaTagDefinizione.isPending}
          onConfirm={confermaEliminazioneDefinizione}
          onCancel={() => setDefinizioneDaEliminare(null)}
        />
      )}

      {nodoDaEliminare && (
        <ConfirmDialog
          title={`Eliminare "${nodoDaEliminare.nome}"?`}
          message={
            nodoDaEliminare.children.length > 0
              ? `Contiene ${nodoDaEliminare.children.length} elementi: verranno eliminati anche quelli, insieme alle transazioni collegate.`
              : "L'operazione non si può annullare."
          }
          confirmLabel="Elimina"
          loading={eliminaNodo.isPending}
          onConfirm={confermaEliminazione}
          onCancel={() => setNodoDaEliminare(null)}
        />
      )}
    </div>
  )
}
