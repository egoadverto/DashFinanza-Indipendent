import type { OrigineTransazione, TipoTransazione } from '../types/domain'

export interface RigaImportScalable {
  data: string
  isin: string
  nome: string
  tipo: Extract<TipoTransazione, 'acquisto' | 'vendita'>
  origine: OrigineTransazione
  quantita: number
  importo: number
  commissioni: number
}

// Divide una riga CSV su ';' rispettando i campi tra virgolette (la
// descrizione del titolo è sempre quotata dall'export di Scalable).
function dividiRiga(riga: string): string[] {
  const campi: string[] = []
  let corrente = ''
  let dentroVirgolette = false
  for (const carattere of riga) {
    if (carattere === '"') {
      dentroVirgolette = !dentroVirgolette
    } else if (carattere === ';' && !dentroVirgolette) {
      campi.push(corrente)
      corrente = ''
    } else {
      corrente += carattere
    }
  }
  campi.push(corrente)
  return campi
}

// Formato numerico europeo: punto delle migliaia, virgola decimale.
function numero(testo: string): number {
  return Number(testo.replace(/\./g, '').replace(',', '.'))
}

const TIPO_MAP: Record<string, { tipo: RigaImportScalable['tipo']; origine: OrigineTransazione }> = {
  Buy: { tipo: 'acquisto', origine: 'manuale' },
  Sell: { tipo: 'vendita', origine: 'manuale' },
  'Savings plan': { tipo: 'acquisto', origine: 'ricorrente' },
}

// Legge l'export "Broker Transactions" di Scalable Capital: righe Cash
// (Deposit/Fee/Interest, non collegate a un titolo) e non eseguite vengono
// scartate, restano solo gli acquisti/vendite di titoli.
export function parseCsvScalable(testo: string): { righe: RigaImportScalable[]; scartate: number } {
  const linee = testo.split(/\r?\n/).filter((r) => r.trim().length > 0)
  if (linee.length === 0) return { righe: [], scartate: 0 }

  const intestazione = dividiRiga(linee[0])
  const indice = (colonna: string) => intestazione.indexOf(colonna)
  const iData = indice('date')
  const iStatus = indice('status')
  const iDescrizione = indice('description')
  const iAssetType = indice('assetType')
  const iTipo = indice('type')
  const iIsin = indice('isin')
  const iShares = indice('shares')
  const iAmount = indice('amount')
  const iFee = indice('fee')

  const righe: RigaImportScalable[] = []
  let scartate = 0

  for (const linea of linee.slice(1)) {
    const campi = dividiRiga(linea)
    const mappaTipo = TIPO_MAP[campi[iTipo]]
    if (campi[iAssetType] !== 'Security' || campi[iStatus] !== 'Executed' || !mappaTipo || !campi[iIsin]) {
      scartate++
      continue
    }
    righe.push({
      data: campi[iData],
      isin: campi[iIsin],
      nome: campi[iDescrizione],
      tipo: mappaTipo.tipo,
      origine: mappaTipo.origine,
      quantita: Math.abs(numero(campi[iShares])),
      importo: Math.abs(numero(campi[iAmount])),
      commissioni: Math.abs(numero(campi[iFee])),
    })
  }

  return { righe, scartate }
}
