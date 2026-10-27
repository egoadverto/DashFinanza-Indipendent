// Ricostruisce il valore e il versato del portafoglio nel tempo per il
// grafico "Andamento" e la tabella "Versamenti mensili". Un punto per mese:
// quantità cumulata di ogni titolo alla fine del mese, moltiplicata per
// l'ultimo prezzo disponibile in quel mese (i prezzi storici sono mensili,
// vedi l'Edge Function `aggiorna-prezzi`).
export interface TransazioneGrezza {
  data: string
  tipo: 'acquisto' | 'vendita' | 'apertura'
  quantita: number
  importo: number | null
  commissioni: number
  titoloId: string
}

export interface PrezzoGrezzo {
  titoloId: string
  data: string
  prezzo: number
}

export interface PuntoAndamento {
  mese: string
  valore: number
  versato: number
}

export function calcolaAndamento(transazioni: TransazioneGrezza[], prezzi: PrezzoGrezzo[]): PuntoAndamento[] {
  if (transazioni.length === 0) return []

  const perTitoloTx = new Map<string, TransazioneGrezza[]>()
  for (const t of transazioni) {
    if (!perTitoloTx.has(t.titoloId)) perTitoloTx.set(t.titoloId, [])
    perTitoloTx.get(t.titoloId)!.push(t)
  }
  for (const lista of perTitoloTx.values()) lista.sort((a, b) => a.data.localeCompare(b.data))

  const perTitoloPrezzi = new Map<string, PrezzoGrezzo[]>()
  for (const p of prezzi) {
    if (!perTitoloPrezzi.has(p.titoloId)) perTitoloPrezzi.set(p.titoloId, [])
    perTitoloPrezzi.get(p.titoloId)!.push(p)
  }
  for (const lista of perTitoloPrezzi.values()) lista.sort((a, b) => a.data.localeCompare(b.data))

  const primoMese = transazioni.reduce((min, t) => (t.data < min ? t.data : min), transazioni[0].data).slice(0, 7)
  const meseCorrente = new Date().toISOString().slice(0, 7)
  const mesiSet = new Set<string>([meseCorrente])
  for (const p of prezzi) {
    const m = p.data.slice(0, 7)
    if (m >= primoMese) mesiSet.add(m)
  }
  const mesi = [...mesiSet].sort()

  return mesi.map((mese) => {
    const fineMese = `${mese}-31`
    let valore = 0
    let versato = 0

    for (const [titoloId, txs] of perTitoloTx) {
      let quantita = 0
      let versatoNetto = 0
      for (const t of txs) {
        if (t.data > fineMese) break
        if (t.tipo === 'vendita') {
          quantita -= t.quantita
          versatoNetto -= (t.importo ?? 0) - t.commissioni
        } else {
          quantita += t.quantita
          versatoNetto += (t.importo ?? 0) + t.commissioni
        }
      }
      versato += versatoNetto

      if (quantita > 0) {
        const prezzoLista = perTitoloPrezzi.get(titoloId)
        let prezzo: number | null = null
        if (prezzoLista) {
          for (const p of prezzoLista) {
            if (p.data <= fineMese) prezzo = p.prezzo
            else break
          }
        }
        if (prezzo != null) valore += quantita * prezzo
      }
    }

    return { mese, valore, versato }
  })
}

export interface PuntoIndice {
  mese: string
  indice: number | null
}

// Stesso calcolo di twr(), ma restituisce l'indice base 100 mese per mese
// invece del solo fattore finale: serve al confronto benchmark, dove il
// portafoglio va disegnato come una curva sulla stessa scala degli indici.
export function indiceTWR(punti: PuntoAndamento[]): PuntoIndice[] {
  if (punti.length === 0) return []
  const risultato: PuntoIndice[] = [{ mese: punti[0].mese, indice: 100 }]
  let indice = 100
  for (let i = 1; i < punti.length; i++) {
    const precedente = punti[i - 1]
    const corrente = punti[i]
    if (precedente.valore > 0) {
      const flusso = corrente.versato - precedente.versato
      indice *= (corrente.valore - flusso) / precedente.valore
    }
    risultato.push({ mese: corrente.mese, indice })
  }
  return risultato
}

// Riporta una serie di valori grezzi (prezzi di un benchmark) sugli stessi
// mesi del portafoglio, normalizzati a base 100 sul primo mese comune. Per
// ogni mese usa l'ultima quotazione disponibile a fine mese, come i prezzi
// dei titoli in calcolaAndamento.
export function serieBase100(valori: { data: string; valore: number }[], mesi: string[]): (number | null)[] {
  const ordinati = [...valori].sort((a, b) => a.data.localeCompare(b.data))

  const perMese = mesi.map((mese) => {
    const fineMese = `${mese}-31`
    let v: number | null = null
    for (const p of ordinati) {
      if (p.data <= fineMese) v = p.valore
      else break
    }
    return v
  })

  const base = perMese.find((v) => v != null) ?? null
  if (base == null) return perMese.map(() => null)
  return perMese.map((v) => (v == null ? null : (v / base) * 100))
}

// Rendimento annuo composto a partire da un indice base 100 e dal numero di
// mesi trascorsi dall'inizio della serie.
export function rendAnnuo(indiceFinale: number, mesi: number): number | null {
  if (mesi <= 0) return null
  return Math.pow(indiceFinale / 100, 12 / mesi) - 1
}

// Rendimento mensile concatenato (TWR approssimato): ogni mese è un
// sotto-periodo unico, senza tener conto del giorno esatto dei versamenti
// dentro il mese. Approssimazione standard quando si hanno solo prezzi
// mensili, non un vero TWR giornaliero. Stesso fattore composto calcolato
// da indiceTWR(): qui basta l'ultimo punto, riportato da base 100 a fattore.
export function twr(punti: PuntoAndamento[]): number | null {
  if (punti.length < 2) return null
  const haDati = punti.some((_, i) => i > 0 && punti[i - 1].valore > 0)
  if (!haDati) return null
  const indici = indiceTWR(punti)
  return indici[indici.length - 1].indice! / 100 - 1
}
