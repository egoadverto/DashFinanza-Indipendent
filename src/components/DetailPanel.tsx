import { percorsoNodo, type TreeNode } from '../lib/tree'
import { fmtObiettivo, BADGE_STATO } from '../lib/colonnePosizioni'
import { fmtData, fmtEur, fmtMese, fmtPct, fmtQty } from '../lib/format'
import { LABEL_TIPO_TRANSAZIONE, COLORE_TIPO_TRANSAZIONE } from '../lib/badgeTransazione'
import { useDettaglioTitolo } from '../hooks/useDettaglioTitolo'
import SlideOver from './SlideOver'
import Segmented from './Segmented'
import CloseButton from './CloseButton'
import InfoTooltip from './InfoTooltip'

const SI_NO: { value: 'si' | 'no'; label: string }[] = [
  { value: 'si', label: 'Sì' },
  { value: 'no', label: 'No' },
]

function coloreSegno(v: number | null): string | undefined {
  if (v == null) return undefined
  return v >= 0 ? 'var(--color-positive)' : 'var(--color-negative)'
}

function Statistica({ label, valore, colore }: { label: string; valore: string; colore?: string }) {
  return (
    <div className="rounded-[10px] border border-border p-3.5">
      <div className="mb-1.5 text-xs text-text-secondary">{label}</div>
      <div className="text-base font-semibold" style={{ color: colore }}>
        {valore}
      </div>
    </div>
  )
}

function Riga({ label, valore }: { label: string; valore: string }) {
  return (
    <div className="flex justify-between text-[13px]">
      <div className="text-text-secondary">{label}</div>
      <div>{valore}</div>
    </div>
  )
}

const W = 420
const H = 130
const PAD_X = 4
// Bande separate e non sovrapposte, dall'alto in basso: etichetta del
// massimo, la curva, etichetta del minimo, etichette delle date. Prima
// l'etichetta del minimo condivideva l'identica coordinata y del punto più
// basso della curva (bug reale: si sovrapponevano quando il primo prezzo
// dello storico era vicino al minimo, cosa comune su uno storico lungo).
const TOP_GAP = 16
const BOTTOM_GAP = 16
const DATE_GAP = 18
const PLOT_TOP = TOP_GAP
const PLOT_BOTTOM = H - BOTTOM_GAP - DATE_GAP

function GraficoPrezzo({ prezzi }: { prezzi: { data: string; prezzo: number }[] }) {
  if (prezzi.length < 2) return null
  const valori = prezzi.map((p) => p.prezzo)
  const min = Math.min(...valori)
  const max = Math.max(...valori)
  const span = max - min || 1
  const innerW = W - PAD_X * 2
  const innerH = PLOT_BOTTOM - PLOT_TOP
  const x = (i: number) => PAD_X + (i / (prezzi.length - 1)) * innerW
  const y = (v: number) => PLOT_TOP + innerH - ((v - min) / span) * innerH
  const path = prezzi.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.prezzo)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <text x={PAD_X} y={TOP_GAP - 4} fontSize={10} fill="var(--color-text-tertiary)">
        {fmtEur(max)}
      </text>
      <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinecap="round" />
      <text x={PAD_X} y={PLOT_BOTTOM + 12} fontSize={10} fill="var(--color-text-tertiary)">
        {fmtEur(min)}
      </text>
      <text x={PAD_X} y={H} fontSize={10} fill="var(--color-text-tertiary)">
        {fmtMese(prezzi[0].data)}
      </text>
      <text x={W - PAD_X} y={H} fontSize={10} textAnchor="end" fill="var(--color-text-tertiary)">
        {fmtMese(prezzi[prezzi.length - 1].data)}
      </text>
    </svg>
  )
}

export default function DetailPanel({
  nodo,
  roots,
  onEdit,
  onImpostaRiferimento,
  onClose,
}: {
  nodo: TreeNode
  roots: TreeNode[]
  onEdit: () => void
  onImpostaRiferimento: (parentId: string, riferimentoId: string | null) => void
  onClose: () => void
}) {
  const isTitolo = nodo.tipo === 'titolo'
  const breadcrumb = percorsoNodo(roots, nodo.id).join(' › ')
  const { data: dettaglio } = useDettaglioTitolo(isTitolo ? nodo.titoloId : null, isTitolo ? nodo.id : null)

  const justetfUrl = isTitolo && nodo.isin ? `https://www.justetf.com/en/etf-profile.html?isin=${nodo.isin}` : null
  const coingeckoUrl =
    isTitolo && nodo.categoria === 'cripto' && nodo.simboloProvider
      ? `https://www.coingecko.com/en/coins/${nodo.simboloProvider}`
      : null

  return (
    <SlideOver width={480} onClose={onClose}>
      <div className="flex items-start justify-between">
        <div>
          {breadcrumb && <div className="mb-1.5 text-xs text-text-secondary">{breadcrumb}</div>}
          <div className="text-lg font-semibold">{nodo.nome}</div>
          {nodo.isin && <div className="mt-0.5 text-xs text-text-secondary">{nodo.isin}</div>}
        </div>
        <CloseButton onClick={onClose} />
      </div>

      <button onClick={onEdit} className="w-fit rounded-lg bg-primary px-4 py-2.5 text-[13px] font-medium text-white hover:bg-primary-hover">
        Modifica
      </button>

      <div className="grid grid-cols-2 gap-3">
        <Statistica label="Valore" valore={fmtEur(nodo.valore)} />
        <Statistica label="Peso" valore={nodo.peso != null ? fmtPct(nodo.peso) : '—'} />
        {isTitolo ? (
          <Statistica label="PMC" valore={nodo.costoMedio != null ? fmtEur(nodo.costoMedio) : '—'} />
        ) : (
          <>
            <Statistica label="Obiettivo" valore={fmtObiettivo(nodo)} />
            <Statistica label="P/L" valore={fmtPct(nodo.plPct, { sign: true })} colore={coloreSegno(nodo.plPct)} />
          </>
        )}
      </div>

      {nodo.parentId && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-[13px]">
            Questo nodo è il riferimento del suo gruppo
            <InfoTooltip text="Se attivo, gli scarti degli altri elementi del gruppo si calcolano rispetto al peso di questo nodo, non rispetto al proprio obiettivo: il gruppo si ricalcola come se questo nodo fosse esattamente al suo obiettivo." />
          </div>
          <Segmented
            options={SI_NO}
            value={nodo.eRiferimento ? 'si' : 'no'}
            onChange={(v) => onImpostaRiferimento(nodo.parentId!, v === 'si' ? nodo.id : null)}
          />
        </div>
      )}

      {nodo.children.length > 0 && (
        <div>
          <div className="mb-2.5 text-[13px] font-semibold">Composizione</div>
          <div className="flex flex-col">
            {nodo.children.map((c) => (
              <div key={c.id} className="flex items-center border-b border-border py-2 text-[13px] last:border-b-0">
                <div className="flex-1 truncate">{c.nome}</div>
                <div className="font-medium">{c.peso != null ? fmtPct(c.peso) : '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isTitolo && (
        <>
          <div>
            <div className="mb-2.5 text-[13px] font-semibold">Anagrafica</div>
            <div className="flex flex-col gap-2">
              <Riga label="Quantità" valore={nodo.quantita != null ? fmtQty(nodo.quantita) : '—'} />
              <Riga label="Prezzo attuale" valore={nodo.prezzo != null ? fmtEur(nodo.prezzo) : '—'} />
              {nodo.ter != null && <Riga label="TER" valore={fmtPct(nodo.ter)} />}
              {nodo.ter != null && <Riga label="Costo annuo" valore={fmtEur((nodo.valore * nodo.ter) / 100)} />}
            </div>
          </div>

          <div>
            <div className="mb-2.5 text-[13px] font-semibold">Classificazione</div>
            <div className="flex flex-col gap-2">
              <Riga label="Nodo padre" valore={breadcrumb || '—'} />
              <Riga label="Obiettivo" valore={fmtObiettivo(nodo)} />
              {nodo.stato && <Riga label="Stato" valore={BADGE_STATO[nodo.stato]?.label ?? nodo.stato} />}
            </div>
          </div>

          {nodo.pacImporto != null && (
            <div>
              <div className="mb-2.5 text-[13px] font-semibold">Versamento ricorrente</div>
              <div className="text-[13px]">{fmtEur(nodo.pacImporto)}</div>
            </div>
          )}

          {dettaglio && dettaglio.prezzi.length >= 2 && (
            <div>
              <div className="mb-2.5 text-[13px] font-semibold">Prezzo</div>
              <GraficoPrezzo prezzi={dettaglio.prezzi} />
            </div>
          )}

          {(justetfUrl || coingeckoUrl) && (
            <div className="flex justify-end gap-4 border-t border-border pt-3 text-[13px]">
              {justetfUrl && (
                <a href={justetfUrl} target="_blank" rel="noreferrer" className="font-medium text-primary">
                  Apri su justETF
                </a>
              )}
              {coingeckoUrl && (
                <a href={coingeckoUrl} target="_blank" rel="noreferrer" className="font-medium text-primary">
                  Apri su CoinGecko
                </a>
              )}
            </div>
          )}

          {dettaglio && dettaglio.transazioni.length > 0 && (
            <div>
              <div className="mb-2.5 text-[13px] font-semibold">Ultime transazioni</div>
              <div className="flex flex-col">
                <div className="flex border-b border-border pb-1.5 text-[10.5px] font-semibold text-text-tertiary">
                  <div className="w-[70px] flex-none">Data</div>
                  <div className="flex-1">Tipo</div>
                  <div className="w-16 flex-none text-right">Quantità</div>
                  <div className="w-20 flex-none text-right">Importo</div>
                </div>
                {dettaglio.transazioni.slice(0, 6).map((t) => (
                  <div key={t.id} className="flex items-center border-b border-border py-2 text-[12.5px] last:border-b-0">
                    <div className="w-[70px] flex-none font-display">{fmtData(t.data)}</div>
                    <div className="flex-1">
                      <span
                        className="rounded-md px-2 py-0.5 text-[10.5px] font-semibold"
                        style={{ background: COLORE_TIPO_TRANSAZIONE[t.tipo]?.bg, color: COLORE_TIPO_TRANSAZIONE[t.tipo]?.color }}
                      >
                        {LABEL_TIPO_TRANSAZIONE[t.tipo] ?? t.tipo}
                      </span>
                    </div>
                    <div className="w-16 flex-none text-right font-display">{fmtQty(t.quantita)}</div>
                    <div className="w-20 flex-none text-right font-display">{t.importo != null ? fmtEur(t.importo) : '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </SlideOver>
  )
}
