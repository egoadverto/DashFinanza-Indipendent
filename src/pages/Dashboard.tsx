import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useTree } from '../hooks/useTree'
import { useDashboardData } from '../hooks/useDashboardData'
import { useImpostazioni } from '../hooks/useImpostazioni'
import { useUpdateImpostazioni } from '../hooks/useUpdateImpostazioni'
import { useBenchmark, type BenchmarkConValori } from '../hooks/useBenchmark'
import { useDeleteBenchmark } from '../hooks/useDeleteBenchmark'
import { usePrivacy } from '../lib/privacy'
import { calcolaAndamento, twr, indiceTWR, serieBase100, rendAnnuo, type PuntoAndamento } from '../lib/andamento'
import { xirr } from '../lib/xirr'
import { puoPartecipareAlPac, trovaNodo, flattenContenitori, type TreeNode } from '../lib/tree'
import { fmtEur, fmtNum, fmtPct } from '../lib/format'
import { PERIODI, type Periodo } from '../lib/periodo'
import Segmented from '../components/Segmented'
import NodeSelect from '../components/NodeSelect'
import AndamentoChart from '../components/charts/AndamentoChart'
import AllocazioneGauge from '../components/charts/AllocazioneGauge'
import ConfrontoBenchmarkChart, { type SerieConfronto } from '../components/charts/ConfrontoBenchmarkChart'
import ModificaLiquidita from '../components/modals/ModificaLiquidita'
import NuovoBenchmark from '../components/modals/NuovoBenchmark'
import InfoTooltip from '../components/InfoTooltip'
import { COLORI_BENCHMARK } from '../lib/coloriBenchmark'

function filtraPeriodo(punti: PuntoAndamento[], periodo: Periodo): PuntoAndamento[] {
  const mesi = { '3m': 3, '6m': 6, '1a': 12, dall_inizio: Infinity }[periodo]
  return punti.slice(-mesi)
}

function titoliCostoIgnoto(nodi: TreeNode[]): string[] {
  const risultato: string[] = []
  const visita = (list: TreeNode[]) => {
    for (const n of list) {
      if (n.tipo === 'titolo' && n.costoNoto === false) risultato.push(n.nome)
      visita(n.children)
    }
  }
  visita(nodi)
  return risultato
}

// Gli id titolo con costo di carico ignoto: le loro transazioni non hanno un
// importo affidabile, quindi contaminerebbero TWR/XIRR (valore intero contro
// un versato quasi a zero) se non venissero escluse a monte.
function idTitoliCostoIgnoto(nodi: TreeNode[]): Set<string> {
  const risultato = new Set<string>()
  const visita = (list: TreeNode[]) => {
    for (const n of list) {
      if (n.tipo === 'titolo' && n.costoNoto === false && n.titoloId) risultato.add(n.titoloId)
      visita(n.children)
    }
  }
  visita(nodi)
  return risultato
}

// Gli id titolo con PAC "Sì": "PAC mensile" si calcola dalle transazioni
// vere di questi titoli, non dall'importo dichiarato (solo informativo).
function idTitoliConPac(nodi: TreeNode[]): Set<string> {
  const risultato = new Set<string>()
  const visita = (list: TreeNode[]) => {
    for (const n of list) {
      if (n.tipo === 'titolo' && puoPartecipareAlPac(n) && n.titoloId) risultato.add(n.titoloId)
      visita(n.children)
    }
  }
  visita(nodi)
  return risultato
}

// Somma il valore dei soli titoli con costo di carico noto: serve come punto
// finale di XIRR al posto del valore attuale intero, coerente con l'esclusione
// applicata alle transazioni.
function valoreCalcolabile(nodi: TreeNode[]): number {
  let somma = 0
  const visita = (list: TreeNode[]) => {
    for (const n of list) {
      if (n.tipo === 'titolo') {
        if (n.costoNoto !== false) somma += n.valore
      } else {
        visita(n.children)
      }
    }
  }
  visita(nodi)
  return somma
}

interface Scarto {
  nome: string
  scarto: number
}

// Stesso scartoPunti già calcolato in assembleTree (tree.ts) per la colonna
// Scarto di Posizioni: tiene conto del riferimento impostato sul gruppo e
// esclude i titoli senza PAC. Prima veniva ricalcolato qui con la vecchia
// formula (peso - obiettivo), che ignorava entrambe le cose — la Dashboard
// mostrava scarti diversi da quelli in Posizioni per lo stesso titolo.
function raccogliScarti(nodi: TreeNode[], tolleranza: number): Scarto[] {
  const risultato: Scarto[] = []
  const visita = (list: TreeNode[]) => {
    for (const n of list) {
      if (n.scartoPunti != null && Math.abs(n.scartoPunti) > tolleranza) {
        risultato.push({ nome: n.nome, scarto: n.scartoPunti })
      }
      visita(n.children)
    }
  }
  visita(nodi)
  return risultato
}

function Scheda({ etichetta, valore, sotto, info }: { etichetta: string; valore: string; sotto?: string; info?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[12px] border border-border bg-surface px-[18px] py-4">
      <div className="flex items-center gap-1 text-xs text-text-secondary">
        {etichetta}
        {info && <InfoTooltip text={info} />}
      </div>
      <div className="text-[17px] font-display font-semibold">{valore}</div>
      {sotto && <div className="text-[11px] text-text-tertiary">{sotto}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { data: tree, isLoading: caricoTree, error: erroreTree } = useTree()
  const { data: dashData, isLoading: caricoDati, error: erroreDati } = useDashboardData()
  const { data: impostazioni, isLoading: caricoImpostazioni, error: erroreImpostazioni } = useImpostazioni()
  const { data: benchmark, isLoading: caricoBenchmark, error: erroreBenchmark } = useBenchmark()
  const eliminaBenchmark = useDeleteBenchmark()
  const aggiornaImpostazioni = useUpdateImpostazioni()
  const { hidden } = usePrivacy()
  const [periodo, setPeriodo] = useState<Periodo>('dall_inizio')
  const [modaleLiquidita, setModaleLiquidita] = useState(false)
  const [modaleBenchmark, setModaleBenchmark] = useState<'nuovo' | BenchmarkConValori | null>(null)
  const periodoInizializzato = useRef(false)

  useEffect(() => {
    if (impostazioni && !periodoInizializzato.current) {
      periodoInizializzato.current = true
      setPeriodo(impostazioni.periodo_grafici as Periodo)
    }
  }, [impostazioni])

  const roots = useMemo(() => tree ?? [], [tree])

  const capitaleVersato = roots.reduce((s, r) => s + r.versato, 0)
  const valoreAttuale = roots.reduce((s, r) => s + r.valore, 0)
  const calcolabile = roots.every((r) => r.rendimentoCalcolabile) && capitaleVersato > 0
  const rendimentoPct = calcolabile ? ((valoreAttuale - capitaleVersato) / capitaleVersato) * 100 : null
  const rendimentoEuro = calcolabile ? valoreAttuale - capitaleVersato : null
  const esclusi = titoliCostoIgnoto(roots)
  const idsEsclusi = useMemo(() => idTitoliCostoIgnoto(roots), [roots])
  const valoreAttualeCalcolabile = useMemo(() => valoreCalcolabile(roots), [roots])
  const transazioniCalcolabili = useMemo(
    () => (dashData ? dashData.transazioni.filter((t) => !idsEsclusi.has(t.titoloId)) : []),
    [dashData, idsEsclusi],
  )

  const punti = useMemo(
    () => (dashData ? calcolaAndamento(transazioniCalcolabili, dashData.prezzi) : []),
    [dashData, transazioniCalcolabili],
  )
  const puntiFiltrati = useMemo(() => filtraPeriodo(punti, periodo), [punti, periodo])
  const twrPct = useMemo(() => twr(punti), [punti])
  const xirrPct = useMemo(() => {
    if (!dashData) return null
    const flussi = transazioniCalcolabili.map((t) => ({
      data: new Date(t.data),
      importo: t.tipo === 'vendita' ? (t.importo ?? 0) - t.commissioni : -((t.importo ?? 0) + t.commissioni),
    }))
    if (valoreAttualeCalcolabile > 0) flussi.push({ data: new Date(), importo: valoreAttualeCalcolabile })
    return xirr(flussi)
  }, [dashData, transazioniCalcolabili, valoreAttualeCalcolabile])

  // PAC mensile: somma delle transazioni reali dell'ultimo mese in cui ce ne
  // sono state, solo per i titoli con PAC "Sì" — non l'importo dichiarato
  // (solo informativo), che può non corrispondere a cosa versi davvero.
  // Calcolato direttamente sulle transazioni (non su calcolaAndamento, i cui
  // mesi seguono la disponibilità dei prezzi: se il mese corrente ha già un
  // prezzo ma non ancora un versamento, il delta uscirebbe 0 invece di
  // mostrare l'ultimo mese versato davvero).
  const idsPac = useMemo(() => idTitoliConPac(roots), [roots])
  const transazioniPac = useMemo(
    () => (dashData ? dashData.transazioni.filter((t) => idsPac.has(t.titoloId)) : []),
    [dashData, idsPac],
  )
  const pacMensile = useMemo(() => {
    if (transazioniPac.length === 0) return 0
    const ultimoMese = transazioniPac.reduce((max, t) => {
      const mese = t.data.slice(0, 7)
      return mese > max ? mese : max
    }, transazioniPac[0].data.slice(0, 7))
    return transazioniPac
      .filter((t) => t.data.slice(0, 7) === ultimoMese)
      .reduce((s, t) => s + (t.tipo === 'vendita' ? -((t.importo ?? 0) - t.commissioni) : (t.importo ?? 0) + t.commissioni), 0)
  }, [transazioniPac])
  const scarti = impostazioni ? raccogliScarti(roots, impostazioni.tolleranza_punti) : []

  // Allocazione: di default i nodi radice, ma l'utente può scegliere un
  // nodo qualsiasi come riferimento — allora si mostrano i suoi figli
  // diretti. Se il nodo salvato non esiste più nell'albero, trovaNodo
  // torna null e si ricade sui nodi radice senza errori.
  const nodoAllocazioneId = impostazioni?.dashboard_allocazione_nodo_id ?? null
  const nodoAllocazione = nodoAllocazioneId ? trovaNodo(roots, nodoAllocazioneId) : null
  const vociAllocazione = nodoAllocazione
    ? nodoAllocazione.children.map((c) => ({ nome: c.nome, valore: c.valore }))
    : roots.map((r) => ({ nome: r.nome, valore: r.valore }))
  const totaleAllocazione = nodoAllocazione ? nodoAllocazione.valore : valoreAttuale
  const etichettaAllocazione = nodoAllocazione ? `valore di ${nodoAllocazione.nome}` : 'valore totale'
  const contenitoriAllocazione = useMemo(() => flattenContenitori(roots), [roots])

  const versamentiMensili = useMemo(() => {
    const inverso = [...punti].reverse().slice(0, 12)
    return inverso.map((p, i) => {
      const precedente = inverso[i + 1]
      const delta = p.versato - (precedente?.versato ?? 0)
      const variazione = precedente && precedente.versato !== 0 ? (delta / precedente.versato) * 100 : null
      return { mese: p.mese, versato: delta, variazione }
    })
  }, [punti])

  const mesiConfronto = useMemo(() => punti.map((p) => p.mese), [punti])
  const serieConfronto = useMemo((): SerieConfronto[] => {
    const indicePortafoglio = indiceTWR(punti)
    const serie: SerieConfronto[] = [
      { nome: 'Il tuo portafoglio', colore: 'var(--color-chart-1)', punti: indicePortafoglio.map((p) => p.indice) },
    ]
    for (const b of benchmark ?? []) {
      serie.push({ nome: b.nome, colore: b.colore, punti: serieBase100(b.valori, mesiConfronto) })
    }
    return serie
  }, [punti, benchmark, mesiConfronto])

  if (caricoTree || caricoDati || caricoImpostazioni || caricoBenchmark) return <div className="text-sm text-text-secondary">Caricamento…</div>
  const errore = erroreTree ?? erroreDati ?? erroreImpostazioni ?? erroreBenchmark
  if (errore) return <div className="text-sm text-negative">Errore nel caricamento: {errore.message}</div>

  const mostra = (testo: string) => (hidden ? '••••' : testo)

  return (
    <div className="flex flex-col">
      <div className="mb-7 text-[26px] font-display font-semibold">Dashboard</div>

      {/* Fascia KPI */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="rounded-[12px] border border-border bg-surface px-[22px] py-5">
          <div className="text-xs text-text-secondary">Capitale versato</div>
          <div className="text-[26px] font-display font-semibold leading-tight">{mostra(fmtEur(capitaleVersato))}</div>
        </div>
        <div className="rounded-[12px] border border-border bg-surface px-[22px] py-5">
          <div className="text-xs text-text-secondary">Valore attuale</div>
          <div className="text-[26px] font-display font-semibold leading-tight">{mostra(fmtEur(valoreAttuale))}</div>
        </div>
        <div className="rounded-[12px] border border-border bg-surface px-[22px] py-5">
          <div className="text-xs text-text-secondary">Rendimento</div>
          <div
            className="text-[26px] font-display font-semibold leading-tight"
            style={{ color: rendimentoPct == null ? undefined : rendimentoPct >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}
          >
            {mostra(fmtPct(rendimentoPct, { sign: true }))}
          </div>
          {rendimentoEuro != null && (
            <div
              className="text-[13px] font-display font-medium"
              style={{ color: rendimentoPct == null ? undefined : rendimentoPct >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}
            >
              {mostra(fmtEur(rendimentoEuro, { sign: true }))}
            </div>
          )}
          {esclusi.length > 0 && (
            <div className="mt-1 text-[11px] text-text-secondary">
              Calcolato su {mostra(fmtEur(capitaleVersato))}; {esclusi.join(', ')} {esclusi.length === 1 ? 'è escluso' : 'sono esclusi'}{' '}
              perché privo di costo di carico.
            </div>
          )}
        </div>
        <div className="rounded-[12px] border border-border bg-surface px-[22px] py-5">
          <div className="text-xs text-text-secondary">Capitale totale</div>
          <div className="text-[26px] font-display font-semibold leading-tight">
            {impostazioni ? mostra(fmtEur(valoreAttuale + impostazioni.liquidita)) : '—'}
          </div>
          <div className="mt-1 text-[11px] text-text-tertiary">Investito più liquidità non investita</div>
        </div>
      </div>

      {/* Schede compatte */}
      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-5">
        <Scheda
          etichetta="TWR"
          valore={twrPct == null ? '—' : mostra(fmtPct(twrPct * 100, { sign: true }))}
          sotto={esclusi.length > 0 ? 'Esclude titoli a costo ignoto' : undefined}
          info="Rendimento del portafoglio al netto dei tuoi versamenti e prelievi: misura quanto hanno reso gli investimenti in sé, utile per confrontarli con un indice."
        />
        <Scheda
          etichetta="XIRR"
          valore={xirrPct == null ? '—' : mostra(fmtPct(xirrPct * 100, { sign: true }))}
          sotto={esclusi.length > 0 ? 'Esclude titoli a costo ignoto' : undefined}
          info="Il tuo tasso di rendimento annuo effettivo: tiene conto di quando e quanto hai versato nel tempo, quindi riflette anche il tuo timing, non solo il mercato."
        />
        <Scheda etichetta="PAC mensile" valore={mostra(fmtEur(pacMensile))} />
        <Scheda
          etichetta="Costo annuo"
          valore={dashData?.terMedio?.costo_annuo != null ? mostra(fmtEur(dashData.terMedio.costo_annuo)) : '—'}
          sotto={dashData?.terMedio?.ter_medio != null ? `${fmtPct(dashData.terMedio.ter_medio)} TER medio` : undefined}
        />
        <div className="flex flex-col gap-1 rounded-[12px] border border-border bg-surface px-[18px] py-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-text-secondary">Liquidità</div>
            <button onClick={() => setModaleLiquidita(true)} className="text-text-tertiary hover:text-text" aria-label="Modifica liquidità">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M9.5 1.5l3 3-8 8-3.5.5.5-3.5 8-8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="text-[17px] font-display font-semibold">{impostazioni ? mostra(fmtEur(impostazioni.liquidita)) : '—'}</div>
          <div className="text-[11px] text-text-tertiary">Esclusa da pesi e rendimento</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Andamento del portafoglio */}
        <div className="flex flex-col rounded-[12px] border border-border bg-surface px-6 py-[22px] lg:col-span-8">
          <div className="mb-3 flex flex-none flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold">Andamento del portafoglio</div>
            <div className="self-start overflow-x-auto">
              <Segmented options={PERIODI} value={periodo} onChange={setPeriodo} />
            </div>
          </div>
          {hidden ? (
            <div className="flex flex-1 items-center justify-center text-sm text-text-tertiary">Valori nascosti</div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="h-[280px] min-h-0 lg:h-auto lg:flex-1">
                <AndamentoChart punti={puntiFiltrati} />
              </div>
              {esclusi.length > 0 && (
                <div className="mt-2 flex-none text-[11px] text-text-tertiary">
                  Esclude {esclusi.join(', ')} {esclusi.length === 1 ? 'perché privo' : 'perché privi'} di costo di carico.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Allocazione + Da controllare */}
        <div className="flex flex-col gap-4 lg:col-span-4">
          <div className="rounded-[12px] border border-border bg-surface px-[22px] py-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Allocazione</div>
              <NodeSelect
                variant="minimal"
                opzioni={contenitoriAllocazione}
                value={nodoAllocazioneId}
                onChange={(id) => aggiornaImpostazioni.mutate({ dashboard_allocazione_nodo_id: id })}
                placeholder="Nodi radice"
              />
            </div>
            {vociAllocazione.length === 0 ? (
              <div className="text-sm text-text-tertiary">Nessun portafoglio ancora.</div>
            ) : hidden ? (
              <div className="text-sm text-text-tertiary">Valori nascosti</div>
            ) : (
              <>
                <AllocazioneGauge voci={vociAllocazione} totale={totaleAllocazione} etichetta={etichettaAllocazione} />
                {vociAllocazione.some((v) => v.valore === 0) && (
                  <div className="mt-3 text-[11px] text-text-tertiary">I nodi a zero non sono ancora attivi.</div>
                )}
              </>
            )}
          </div>

          {/* Da controllare */}
          <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-surface px-[22px] py-5">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold">Da controllare</div>
              {scarti.length > 0 && (
                <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold text-text-secondary">{scarti.length}</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {scarti.map((s) => {
                const sopra = s.scarto > 0
                return (
                  <div
                    key={s.nome}
                    className={`flex gap-2 rounded-lg border-l-[3px] px-3 py-2.5 text-[12px] leading-snug ${
                      sopra ? 'border-info bg-info-soft' : 'border-warning bg-warning-soft'
                    }`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="mt-0.5 flex-none"
                      style={{ color: sopra ? 'var(--color-info)' : 'var(--color-warning)' }}
                    >
                      {sopra ? (
                        <>
                          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" />
                          <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                        </>
                      ) : (
                        <>
                          <path d="M12 3l10 18H2z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
                          <path d="M12 10v4M12 17h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                        </>
                      )}
                    </svg>
                    <span>
                      <strong>{s.nome}</strong> è {sopra ? 'sopra' : 'sotto'} obiettivo di {fmtNum(Math.abs(s.scarto), 1)} punti
                    </span>
                  </div>
                )
              })}
              {impostazioni && impostazioni.soglia_revisione > 0 && (
                <div className="rounded-lg bg-background px-3 py-2.5 text-[12px]">
                  <div className="mb-1.5 text-text-secondary">Capitale rispetto alla soglia di revisione</div>
                  <div className="mb-1.5 font-semibold">
                    {mostra(fmtEur(valoreAttuale))}{' '}
                    <span className="font-normal text-text-tertiary">/ {mostra(fmtEur(impostazioni.soglia_revisione))}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, (valoreAttuale / impostazioni.soglia_revisione) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {scarti.length === 0 && !impostazioni?.soglia_revisione && (
                <div className="text-[12px] text-text-tertiary">Niente da controllare, per ora.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Confronto benchmark */}
        <div className="flex flex-col rounded-[12px] border border-border bg-surface px-6 py-[22px] lg:col-span-8">
          <div className="mb-3 flex flex-none items-center justify-between">
            <div className="text-sm font-semibold">Confronto benchmark</div>
            <button
              onClick={() => setModaleBenchmark('nuovo')}
              className="text-text-tertiary hover:text-text"
              title="Aggiungi benchmark"
              aria-label="Aggiungi benchmark"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {hidden ? (
            <div className="flex flex-1 items-center justify-center text-sm text-text-tertiary">Valori nascosti</div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="h-[280px] min-h-0 lg:h-auto lg:flex-1">
                <ConfrontoBenchmarkChart mesi={mesiConfronto} serie={serieConfronto} />
              </div>
              <div className="mt-3 flex flex-none flex-col gap-1.5">
                {serieConfronto.map((s, i) => {
                  const puntiValidi = s.punti.filter((v): v is number => v != null)
                  const valoreFinale = puntiValidi.length ? puntiValidi[puntiValidi.length - 1] : null
                  const perfPeriodo = valoreFinale == null ? null : valoreFinale - 100
                  const rendAnnuoValore =
                    valoreFinale == null || mesiConfronto.length < 2 ? null : (rendAnnuo(valoreFinale, mesiConfronto.length - 1) ?? null)
                  const b = i > 0 ? (benchmark ?? [])[i - 1] : null
                  return (
                    <div key={s.nome} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                      <span className="h-2 w-2 flex-none rounded-full" style={{ background: s.colore }} />
                      <span className="min-w-0 flex-1 truncate">{s.nome}</span>
                      {/* Forza le colonne numeriche su una riga a sé sotto sm: senza,
                          su mobile restavano 224px di colonne fisse + nome nello
                          stesso rigo, e il nome veniva schiacciato a un carattere. */}
                      <div className="basis-full sm:hidden" />
                      <span className="w-14 flex-none text-right sm:w-16">{valoreFinale == null ? '—' : fmtNum(valoreFinale)}</span>
                      <span
                        className="w-16 flex-none text-right sm:w-20"
                        style={{ color: perfPeriodo == null ? undefined : perfPeriodo >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}
                      >
                        {fmtPct(perfPeriodo, { sign: true })}
                      </span>
                      <span
                        className="w-16 flex-none text-right sm:w-20"
                        style={{
                          color: rendAnnuoValore == null ? undefined : rendAnnuoValore >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
                        }}
                      >
                        {fmtPct(rendAnnuoValore == null ? null : rendAnnuoValore * 100, { sign: true })}
                      </span>
                      {b ? (
                        <>
                          <button
                            onClick={() => setModaleBenchmark(b)}
                            className="flex-none text-text-tertiary hover:text-text"
                            aria-label={`Modifica ${s.nome}`}
                          >
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                              <path d="M9.5 1.5l3 3-8 8-3.3.5.5-3.3 8-8z" stroke="currentColor" strokeWidth="1.2" />
                            </svg>
                          </button>
                          <button
                            onClick={() => eliminaBenchmark.mutate(b.id)}
                            className="flex-none text-text-tertiary hover:text-negative"
                            aria-label={`Rimuovi ${s.nome}`}
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <span className="w-9 flex-none" />
                      )}
                    </div>
                  )
                })}
                {(benchmark ?? []).length === 0 && (
                  <div className="text-[11px] text-text-tertiary">Nessun benchmark ancora. Aggiungine uno con "+".</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Versamenti mensili */}
        <div className="rounded-[12px] border border-border bg-surface px-6 py-[22px] lg:col-span-4">
          <div className="mb-3 text-sm font-semibold">Versamenti mensili</div>
          {versamentiMensili.length === 0 ? (
            <div className="text-sm text-text-tertiary">Nessun versamento ancora.</div>
          ) : (
            <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
              <div className="border-b border-border pb-2 text-[11px] font-semibold text-text-secondary">Mese</div>
              <div className="border-b border-border pb-2 text-right text-[11px] font-semibold text-text-secondary">Versato</div>
              <div className="border-b border-border pb-2 text-right text-[11px] font-semibold text-text-secondary">Var.</div>
              {versamentiMensili.map((v) => (
                <Fragment key={v.mese}>
                  <div className="py-2 text-[12px]">{new Date(`${v.mese}-01`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</div>
                  <div className="py-2 text-right text-[12px]">{mostra(fmtEur(v.versato))}</div>
                  <div
                    className="py-2 text-right text-[12px]"
                    style={{ color: v.variazione == null ? undefined : v.variazione >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}
                  >
                    {fmtPct(v.variazione, { sign: true })}
                  </div>
                </Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {modaleLiquidita && impostazioni && (
        <ModificaLiquidita valoreAttuale={impostazioni.liquidita} onClose={() => setModaleLiquidita(false)} />
      )}
      {modaleBenchmark && (
        <NuovoBenchmark
          benchmarkEsistente={modaleBenchmark === 'nuovo' ? undefined : modaleBenchmark}
          coloreDefault={COLORI_BENCHMARK[(benchmark ?? []).length % COLORI_BENCHMARK.length]}
          onClose={() => setModaleBenchmark(null)}
        />
      )}
    </div>
  )
}
