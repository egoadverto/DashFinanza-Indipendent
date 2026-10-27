import { useMemo, useState } from 'react'
import { useTree } from '../hooks/useTree'
import { useDashboardData } from '../hooks/useDashboardData'
import { usePrivacy } from '../lib/privacy'
import { useClickEsterno } from '../hooks/useClickEsterno'
import type { TreeNode } from '../lib/tree'
import { fmtEur, fmtPct } from '../lib/format'
import Segmented from '../components/Segmented'
import AllocazioneGauge from '../components/charts/AllocazioneGauge'

// Costo medio tipico di un fondo a gestione attiva, usato come riferimento
// fisso di confronto — non un dato dell'utente, non modificabile.
const RIFERIMENTO_TER = 0.35

type Vista = 'composizione' | 'costi'

function titoliFoglia(nodi: TreeNode[]): TreeNode[] {
  const risultato: TreeNode[] = []
  const visita = (list: TreeNode[]) => {
    for (const n of list) {
      if (n.tipo === 'titolo') risultato.push(n)
      visita(n.children)
    }
  }
  visita(nodi)
  return risultato
}

function perPortafoglio(nodi: TreeNode[]): { nome: string; valore: number }[] {
  return nodi.map((r) => ({ nome: r.nome, valore: r.valore }))
}

function perTag(nodi: TreeNode[]): { nome: string; valore: number }[] {
  const somme = new Map<string, number>()
  const visita = (list: TreeNode[], tagCorrente: string | null) => {
    for (const n of list) {
      const tag = n.tipo === 'tag' ? n.nome : tagCorrente
      if (n.tipo === 'titolo') {
        const chiave = tag ?? 'Senza TAG'
        somme.set(chiave, (somme.get(chiave) ?? 0) + n.valore)
      }
      visita(n.children, tag)
    }
  }
  visita(nodi, null)
  return [...somme.entries()].map(([nome, valore]) => ({ nome, valore }))
}

function perTitolo(nodi: TreeNode[]): { nome: string; valore: number }[] {
  const somme = new Map<string, number>()
  for (const t of titoliFoglia(nodi)) somme.set(t.nome, (somme.get(t.nome) ?? 0) + t.valore)
  return [...somme.entries()].map(([nome, valore]) => ({ nome, valore }))
}

const LABEL_STATO: Record<string, string> = { attiva: 'Attiva', congelata: 'Congelata', chiusa: 'Chiusa' }

function perStato(nodi: TreeNode[]): { nome: string; valore: number }[] {
  const somme = new Map<string, number>()
  for (const t of titoliFoglia(nodi)) {
    const chiave = LABEL_STATO[t.stato ?? 'attiva'] ?? 'Attiva'
    somme.set(chiave, (somme.get(chiave) ?? 0) + t.valore)
  }
  return [...somme.entries()].map(([nome, valore]) => ({ nome, valore }))
}

const LABEL_CATEGORIA: Record<string, string> = { etf: 'ETF', etc: 'ETC', fondo_pensione: 'Fondo pensione', cripto: 'Cripto', altro: 'Altro' }

function perCategoria(nodi: TreeNode[]): { nome: string; valore: number }[] {
  const somme = new Map<string, number>()
  for (const t of titoliFoglia(nodi)) {
    const chiave = LABEL_CATEGORIA[t.categoria ?? 'altro'] ?? 'Altro'
    somme.set(chiave, (somme.get(chiave) ?? 0) + t.valore)
  }
  return [...somme.entries()].map(([nome, valore]) => ({ nome, valore }))
}

type VistaId = 'portafoglio' | 'tag' | 'titolo' | 'stato' | 'categoria'

const VISTE: { id: VistaId; label: string }[] = [
  { id: 'portafoglio', label: 'Per portafoglio' },
  { id: 'tag', label: 'Per TAG' },
  { id: 'titolo', label: 'Per titolo' },
  { id: 'stato', label: 'Per stato' },
  { id: 'categoria', label: 'Per categoria' },
]
// Per portafoglio e Per stato sono spente di default: con pochi portafogli o
// stati reali le loro fette spesso ricalcano quasi le stesse divisioni di
// un'altra vista, l'utente le ha giudicate doppioni (confermato 2026-08-27).
const VISTE_DEFAULT: VistaId[] = ['tag', 'titolo']
const STORAGE_KEY = 'dashfinanza:viste-composizione'

function caricaVisteAttive(): Set<VistaId> {
  try {
    const salvato = localStorage.getItem(STORAGE_KEY)
    if (salvato) return new Set(JSON.parse(salvato))
  } catch {
    // localStorage non disponibile o dato corrotto: si riparte dal default.
  }
  return new Set(VISTE_DEFAULT)
}

function salvaVisteAttive(viste: Set<VistaId>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...viste]))
  } catch {
    // Niente di grave: la scelta semplicemente non sopravvive al reload.
  }
}

export default function Analisi() {
  const { data: tree, isLoading: caricoTree, error: erroreTree } = useTree()
  const { data: dashData, isLoading: caricoDati, error: erroreDati } = useDashboardData()
  const { hidden } = usePrivacy()
  const [vista, setVista] = useState<Vista>('composizione')
  const [visteAttive, setVisteAttive] = useState<Set<VistaId>>(() => caricaVisteAttive())
  const [menuVisteAperto, setMenuVisteAperto] = useState(false)
  const refMenuViste = useClickEsterno<HTMLDivElement>(menuVisteAperto, () => setMenuVisteAperto(false))

  const roots = useMemo(() => tree ?? [], [tree])

  const datiPerVista: Record<VistaId, { nome: string; valore: number }[]> = {
    portafoglio: useMemo(() => perPortafoglio(roots), [roots]),
    tag: useMemo(() => perTag(roots), [roots]),
    titolo: useMemo(() => perTitolo(roots), [roots]),
    stato: useMemo(() => perStato(roots), [roots]),
    categoria: useMemo(() => perCategoria(roots), [roots]),
  }

  const costi = useMemo(
    () =>
      titoliFoglia(roots)
        .filter((t) => t.ter != null)
        .map((t) => ({ nome: t.nome, ter: t.ter!, valore: t.valore, costoAnnuo: (t.valore * t.ter!) / 100 }))
        .sort((a, b) => b.ter - a.ter),
    [roots],
  )
  const costoAnnuoMax = costi.length > 0 ? Math.max(...costi.map((c) => c.costoAnnuo)) : 0
  const escludeCripto = useMemo(() => titoliFoglia(roots).some((t) => t.categoria === 'cripto'), [roots])

  if (caricoTree || caricoDati) return <div className="text-sm text-text-secondary">Caricamento…</div>
  const errore = erroreTree ?? erroreDati
  if (errore) return <div className="text-sm text-negative">Errore nel caricamento: {errore.message}</div>

  const mostra = (testo: string) => (hidden ? '••••' : testo)
  const terMedio = dashData?.terMedio?.ter_medio ?? null
  const costoAnnuoTotale = dashData?.terMedio?.costo_annuo ?? null

  function toggleVista(id: VistaId) {
    setVisteAttive((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      salvaVisteAttive(next)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-lg font-semibold">Analisi</div>

      <div className="flex items-center justify-between">
        <div className="self-start">
          <Segmented
            options={[
              { value: 'composizione', label: 'Composizione' },
              { value: 'costi', label: 'Costi' },
            ]}
            value={vista}
            onChange={setVista}
          />
        </div>

        {vista === 'composizione' && (
          <div className="relative" ref={refMenuViste}>
            <button
              onClick={() => setMenuVisteAperto((o) => !o)}
              className="flex h-9 items-center rounded-lg border border-border px-4 text-[13px] font-medium hover:bg-background"
            >
              Viste
            </button>
            {menuVisteAperto && (
              <div className="absolute top-[calc(100%+6px)] right-0 z-20 w-52 rounded-lg border border-border bg-surface p-1 shadow-lg">
                {VISTE.map((v) => (
                  <label
                    key={v.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-background"
                  >
                    <input type="checkbox" checked={visteAttive.has(v.id)} onChange={() => toggleVista(v.id)} />
                    {v.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {vista === 'composizione' &&
        (hidden ? (
          <div className="rounded-[14px] border border-border bg-surface p-8 text-center text-sm text-text-tertiary">
            Valori nascosti
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {VISTE.filter((v) => visteAttive.has(v.id)).map((v) => {
              const voci = datiPerVista[v.id]
              const totale = voci.reduce((s, x) => s + x.valore, 0)
              return (
                <div key={v.id} className="rounded-[14px] border border-border bg-surface p-4">
                  <div className="mb-3 text-sm font-semibold">{v.label}</div>
                  {voci.length === 0 ? (
                    <div className="text-sm text-text-tertiary">Nessun dato ancora.</div>
                  ) : (
                    <AllocazioneGauge voci={voci} totale={totale} etichetta="totale portafoglio" />
                  )}
                </div>
              )
            })}
            {visteAttive.size === 0 && (
              <div className="sm:col-span-2 rounded-[14px] border border-border bg-surface p-8 text-center text-sm text-text-tertiary">
                Nessuna vista attiva. Scegline almeno una da "Viste".
              </div>
            )}
          </div>
        ))}

      {vista === 'costi' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-[12px] border border-border bg-surface px-[22px] py-5">
              <div className="text-xs text-text-secondary">Costo medio ponderato</div>
              <div className="text-[26px] font-display font-semibold leading-tight">{fmtPct(terMedio)}</div>
            </div>
            <div className="rounded-[12px] border border-border bg-surface px-[22px] py-5">
              <div className="text-xs text-text-secondary">Costo annuo totale</div>
              <div className="text-[26px] font-display font-semibold leading-tight">{mostra(fmtEur(costoAnnuoTotale))}</div>
            </div>
          </div>

          <div className="rounded-[12px] border border-border bg-surface px-[22px] py-5">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-text-secondary">
              <span>Il tuo portafoglio</span>
              <span>Riferimento di mercato {fmtPct(RIFERIMENTO_TER)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, ((terMedio ?? 0) / RIFERIMENTO_TER) * 100)}%` }}
              />
            </div>
          </div>

          <div className="rounded-[14px] border border-border bg-surface p-4">
            <div className="mb-3 text-sm font-semibold">Titoli per TER</div>
            {costi.length === 0 ? (
              <div className="text-sm text-text-tertiary">Nessun titolo con TER noto.</div>
            ) : (
              <div className="flex flex-col">
                <div className="flex border-b border-border pb-2 text-xs font-semibold text-text-secondary">
                  <div className="min-w-0 flex-1">Titolo</div>
                  <div className="w-14 flex-none text-right sm:w-24">TER</div>
                  <div className="w-20 flex-none text-right sm:w-32">Valore</div>
                  <div className="w-20 flex-none text-right sm:w-32">Costo annuo</div>
                </div>
                {costi.map((c) => (
                  <div
                    key={c.nome}
                    className={`flex border-b border-border py-2.5 text-[13px] last:border-b-0 ${
                      c.costoAnnuo === costoAnnuoMax ? 'bg-negative-soft' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1 truncate" title={c.nome}>{c.nome}</div>
                    <div className="w-14 flex-none text-right sm:w-24">{fmtPct(c.ter)}</div>
                    <div className="w-20 flex-none text-right sm:w-32">{mostra(fmtEur(c.valore))}</div>
                    <div className="w-20 flex-none text-right sm:w-32">{mostra(fmtEur(c.costoAnnuo))}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-col gap-1 text-[11px] text-text-tertiary">
              {escludeCripto && <div>Le posizioni cripto sono escluse: non hanno un costo di gestione.</div>}
              <div>L'ordinamento per TER non coincide con quello per costo reale: il peso della posizione conta più dell'aliquota.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
