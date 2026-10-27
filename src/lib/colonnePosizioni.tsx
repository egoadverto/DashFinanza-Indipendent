import type { ReactNode } from 'react'
import type { TreeNode } from './tree'
import { fmtEur, fmtNum, fmtPct, fmtQty } from './format'

export const BADGE_STATO: Record<string, { label: string; bg: string }> = {
  attiva: { label: 'Attiva', bg: 'var(--color-background)' },
  congelata: { label: 'Congelata', bg: 'var(--color-warning-soft)' },
  chiusa: { label: 'Chiusa', bg: 'var(--color-border-soft)' },
}

export interface ColonnaContesto {
  tolleranza: number
}

export interface ColonnaDef {
  id: string
  label: string
  width: number
  defaultVisibile: boolean
  render: (nodo: TreeNode, ctx: ColonnaContesto) => ReactNode
}

function coloreSegno(v: number | null): string | undefined {
  if (v == null) return undefined
  return v >= 0 ? 'var(--color-positive)' : 'var(--color-negative)'
}

export function fmtObiettivo(n: TreeNode): string {
  if (n.modoTarget !== 'stabilito' || n.targetValore == null) return '—'
  return n.targetUnita === 'percentuale' ? fmtPct(n.targetValore) : fmtEur(n.targetValore)
}

export const COLONNE: ColonnaDef[] = [
  {
    id: 'obiettivo',
    label: 'Obiettivo',
    width: 128,
    defaultVisibile: true,
    render: (n) => fmtObiettivo(n),
  },
  {
    id: 'peso',
    label: 'Peso',
    width: 96,
    defaultVisibile: true,
    render: (n) => (n.peso != null ? fmtPct(n.peso) : '—'),
  },
  {
    id: 'scarto',
    label: 'Scarto',
    width: 112,
    defaultVisibile: true,
    // Se il gruppo ha un riferimento impostato, scartoPunti/scartoEuro sono
    // già calcolati rispetto a quello (vedi calcolaObiettivoEuro in tree.ts):
    // qui non c'è nulla di diverso da fare, il riferimento risulterà a zero.
    render: (n, ctx) => {
      if (n.scartoPunti == null || n.scartoEuro == null) return '—'
      // Solo lo scarto negativo (sotto obiettivo) è azionabile: l'app non
      // propone mai vendite, quindi essere sopra obiettivo non è un problema
      // da segnalare con lo stesso allarme.
      const indietro = n.scartoPunti < 0 && Math.abs(n.scartoPunti) > ctx.tolleranza
      return (
        <span
          className="inline-block w-full rounded px-1.5 py-0.5"
          style={{ background: indietro ? 'var(--color-negative-soft)' : undefined }}
        >
          <div>{fmtNum(n.scartoPunti, 1)} pt</div>
          <div className="text-xs text-text-secondary">{fmtEur(n.scartoEuro, { sign: true })}</div>
        </span>
      )
    },
  },
  {
    id: 'valore',
    label: 'Valore',
    width: 128,
    defaultVisibile: true,
    render: (n) => fmtEur(n.valore),
  },
  {
    id: 'pac',
    label: 'PAC',
    width: 96,
    defaultVisibile: true,
    render: (n) => {
      if (n.tipo !== 'titolo') return '—'
      return (
        <span
          className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-text-secondary"
          style={{ background: 'var(--color-background)' }}
        >
          {n.faPartePac ? 'Sì' : 'No'}
        </span>
      )
    },
  },
  {
    id: 'plPct',
    label: 'P/L %',
    width: 96,
    defaultVisibile: true,
    render: (n) => <span style={{ color: coloreSegno(n.plPct) }}>{fmtPct(n.plPct, { sign: true })}</span>,
  },
  {
    id: 'stato',
    label: 'Stato',
    width: 128,
    defaultVisibile: true,
    render: (n) => {
      if (!n.stato) return null
      const badge = BADGE_STATO[n.stato] ?? { label: n.stato, bg: 'var(--color-background)' }
      return (
        <span className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-text-secondary" style={{ background: badge.bg }}>
          {badge.label}
        </span>
      )
    },
  },
  {
    id: 'isin',
    label: 'ISIN',
    width: 140,
    defaultVisibile: false,
    render: (n) => n.isin ?? '—',
  },
  {
    id: 'quantita',
    label: 'Quantità',
    width: 140,
    defaultVisibile: false,
    render: (n) => (n.quantita != null ? fmtQty(n.quantita) : '—'),
  },
  {
    id: 'pmc',
    label: 'PMC',
    width: 112,
    defaultVisibile: false,
    render: (n) => (n.costoMedio != null ? fmtEur(n.costoMedio) : '—'),
  },
  {
    id: 'prezzo',
    label: 'Prezzo',
    width: 112,
    defaultVisibile: false,
    render: (n) => (n.prezzo != null ? fmtEur(n.prezzo) : '—'),
  },
  {
    id: 'plEuro',
    label: 'P/L €',
    width: 112,
    defaultVisibile: false,
    render: (n) => <span style={{ color: coloreSegno(n.plEuro) }}>{fmtEur(n.plEuro, { sign: true })}</span>,
  },
  {
    id: 'ter',
    label: 'TER',
    width: 96,
    defaultVisibile: false,
    render: (n) => (n.ter != null ? fmtPct(n.ter) : '—'),
  },
  {
    id: 'costoAnnuo',
    label: 'Costo annuo',
    width: 112,
    defaultVisibile: false,
    render: (n) => (n.ter != null ? fmtEur((n.valore * n.ter) / 100) : '—'),
  },
  {
    id: 'dinamizzazione',
    label: 'Dinamizzazione',
    width: 128,
    defaultVisibile: false,
    render: (n) => (n.pacDinamizzazione != null ? fmtPct(n.pacDinamizzazione) : '—'),
  },
]

const STORAGE_KEY = 'dashfinanza:colonne-posizioni'

export function caricaColonneVisibili(): Set<string> {
  try {
    const salvato = localStorage.getItem(STORAGE_KEY)
    if (salvato) return new Set(JSON.parse(salvato))
  } catch {
    // localStorage non disponibile o dato corrotto: si riparte dal default.
  }
  return new Set(COLONNE.filter((c) => c.defaultVisibile).map((c) => c.id))
}

export function salvaColonneVisibili(colonne: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...colonne]))
  } catch {
    // Niente di grave: la scelta semplicemente non sopravvive al reload.
  }
}

const STORAGE_KEY_ORDINE = 'dashfinanza:ordine-colonne-posizioni'

// L'ordine copre tutte le colonne (anche quelle nascoste): nasconderne una
// non le fa perdere il posto, mostrarla di nuovo la ritrova dov'era.
export function caricaOrdineColonne(): string[] {
  const idReali = COLONNE.map((c) => c.id)
  try {
    const salvato = localStorage.getItem(STORAGE_KEY_ORDINE)
    if (salvato) {
      const ordineSalvato: string[] = JSON.parse(salvato)
      // Riconcilia con le colonne reali: scarta id non più esistenti,
      // aggiunge in fondo eventuali colonne nuove non ancora nell'ordine.
      const valide = ordineSalvato.filter((id) => idReali.includes(id))
      const mancanti = idReali.filter((id) => !valide.includes(id))
      return [...valide, ...mancanti]
    }
  } catch {
    // localStorage non disponibile o dato corrotto: si riparte dall'ordine di default.
  }
  return idReali
}

export function salvaOrdineColonne(ordine: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY_ORDINE, JSON.stringify(ordine))
  } catch {
    // Niente di grave: la scelta semplicemente non sopravvive al reload.
  }
}
