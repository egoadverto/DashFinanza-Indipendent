// XIRR: tasso di rendimento annuo che azzera il valore attuale netto dei
// flussi di cassa datati (Newton-Raphson, con partenza al 10%).
export interface FlussoCassa {
  data: Date
  importo: number
}

const GIORNO_MS = 24 * 60 * 60 * 1000

export function xirr(flussi: FlussoCassa[]): number | null {
  if (flussi.length < 2) return null
  const haPositivo = flussi.some((f) => f.importo > 0)
  const haNegativo = flussi.some((f) => f.importo < 0)
  if (!haPositivo || !haNegativo) return null

  const t0 = flussi[0].data.getTime()
  const anni = (d: Date) => (d.getTime() - t0) / (365 * GIORNO_MS)

  const npv = (r: number) => flussi.reduce((s, f) => s + f.importo / Math.pow(1 + r, anni(f.data)), 0)
  const dNpv = (r: number) =>
    flussi.reduce((s, f) => {
      const t = anni(f.data)
      return t === 0 ? s : s - (t * f.importo) / Math.pow(1 + r, t + 1)
    }, 0)

  let r = 0.1
  for (let i = 0; i < 100; i++) {
    const derivata = dNpv(r)
    if (Math.abs(derivata) < 1e-10) break
    const rSuccessivo = r - npv(r) / derivata
    if (!Number.isFinite(rSuccessivo) || rSuccessivo <= -1) break
    if (Math.abs(rSuccessivo - r) < 1e-7) return rSuccessivo
    r = rSuccessivo
  }
  return Number.isFinite(r) && r > -1 && Math.abs(npv(r)) < 1 ? r : null
}
