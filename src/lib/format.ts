// Formato italiano in tutta l'app: virgola per i decimali, punto per le
// migliaia, simbolo − (non il trattino ASCII) per i valori negativi.
type Nullable = number | null | undefined

export function fmtEur(n: Nullable, opts: { sign?: boolean } = {}): string {
  if (n === null || n === undefined) return '—'
  const sign = opts.sign && n > 0 ? '+' : opts.sign && n < 0 ? '−' : n < 0 ? '−' : ''
  const abs = Math.abs(n)
  const str = abs.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })
  return `${sign}${str} €`
}

export function fmtNum(n: Nullable, dec = 2): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: true })
}

export function fmtPct(n: Nullable, opts: { sign?: boolean } = {}): string {
  if (n === null || n === undefined) return '—'
  const sign = opts.sign ? (n > 0 ? '+' : n < 0 ? '−' : '') : ''
  return `${sign}${fmtNum(Math.abs(n))}%`
}

export function fmtQty(n: Nullable): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('it-IT', { minimumFractionDigits: 8, maximumFractionDigits: 8, useGrouping: true })
}

export function fmtData(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { timeZone: 'UTC' })
}

// L'inverso di fmtNum/fmtEur: un input scritto in formato italiano (virgola
// decimale) diventa il numero che serve per calcoli e salvataggio.
export function parseNumeroIt(testo: string): number {
  return Number(testo.replace(',', '.'))
}

export function fmtMese(mese: string): string {
  const [anno, m] = mese.split('-')
  const data = new Date(Number(anno), Number(m) - 1, 1)
  return data.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }).replace('.', '')
}
