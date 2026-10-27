import { useMemo, useRef, useState } from 'react'
import Modal from '../Modal'
import Dropdown from '../Dropdown'
import { useCreateTitolo } from '../../hooks/useCreateTitolo'
import { useImportaTransazioni } from '../../hooks/useImportaTransazioni'
import { parseCsvScalable, type RigaImportScalable } from '../../lib/importScalable'
import { contaFigli, type ContenitoreOpzione, type TitoloOpzione, type TreeNode } from '../../lib/tree'
import type { Transazione } from '../../types/domain'

export default function ImportaCsv({
  roots,
  titoli,
  contenitori,
  transazioniEsistenti,
  onClose,
}: {
  roots: TreeNode[]
  titoli: TitoloOpzione[]
  contenitori: ContenitoreOpzione[]
  transazioniEsistenti: Transazione[]
  onClose: () => void
}) {
  const inputFile = useRef<HTMLInputElement>(null)
  const [righe, setRighe] = useState<RigaImportScalable[] | null>(null)
  const [scartate, setScartate] = useState(0)
  const [erroreFile, setErroreFile] = useState<string | null>(null)
  const [selezioneAmbigue, setSelezioneAmbigue] = useState<Record<string, string>>({})
  const [parentNuovi, setParentNuovi] = useState<string | null>(null)
  const creaTitolo = useCreateTitolo()
  const importaTransazioni = useImportaTransazioni()
  const [erroreImport, setErroreImport] = useState<string | null>(null)
  const [risultato, setRisultato] = useState<{ importate: number; duplicati: number; titoliCreati: number } | null>(null)

  const matchPerIsin = useMemo(() => {
    const mappa = new Map<string, TitoloOpzione[]>()
    if (!righe) return mappa
    for (const isin of new Set(righe.map((r) => r.isin))) {
      mappa.set(isin, titoli.filter((t) => t.isin === isin))
    }
    return mappa
  }, [righe, titoli])

  const isinNuovi = useMemo(() => [...matchPerIsin.entries()].filter(([, m]) => m.length === 0).map(([isin]) => isin), [matchPerIsin])
  const isinAmbigui = useMemo(() => [...matchPerIsin.entries()].filter(([, m]) => m.length > 1).map(([isin]) => isin), [matchPerIsin])
  const nomePerIsinNuovo = useMemo(() => {
    const mappa = new Map<string, string>()
    for (const r of righe ?? []) if (!mappa.has(r.isin)) mappa.set(r.isin, r.nome)
    return mappa
  }, [righe])

  const pronto =
    righe !== null &&
    righe.length > 0 &&
    isinAmbigui.every((isin) => selezioneAmbigue[isin]) &&
    (isinNuovi.length === 0 || parentNuovi !== null)

  const portafogli = contenitori.filter((c) => c.tipo === 'portafoglio')

  function apriSelettoreFile() {
    inputFile.current?.click()
  }

  async function caricaFile(file: File) {
    setErroreFile(null)
    setRisultato(null)
    setSelezioneAmbigue({})
    setParentNuovi(null)
    try {
      const testo = await file.text()
      const { righe: parsate, scartate: n } = parseCsvScalable(testo)
      if (parsate.length === 0) {
        setErroreFile('Nessuna riga di acquisto/vendita trovata in questo file.')
        setRighe(null)
        return
      }
      setRighe(parsate)
      setScartate(n)
    } catch {
      setErroreFile('Non riesco a leggere questo file. Verifica che sia il CSV esportato da Scalable Capital.')
    }
  }

  async function eseguiImport() {
    if (!righe) return
    setErroreImport(null)
    try {
      const nodoIdPerIsinNuovo: Record<string, string> = {}
      for (const isin of isinNuovi) {
        const { nodoId } = await creaTitolo.mutateAsync({
          nome: nomePerIsinNuovo.get(isin) ?? isin,
          isin,
          categoria: 'etf',
          simboloProvider: null,
          ter: null,
          parentId: parentNuovi!,
          ordine: contaFigli(roots, parentNuovi),
          targetValore: null,
          targetUnita: null,
          stato: 'attiva',
          faPartePac: true,
          pacImporto: null,
          pacDinamizzazione: null,
          note: null,
        })
        nodoIdPerIsinNuovo[isin] = nodoId
      }

      let duplicati = 0
      const daInserire = []
      for (const r of righe) {
        const match = matchPerIsin.get(r.isin) ?? []
        const nodoId = match.length === 1 ? match[0].id : match.length > 1 ? selezioneAmbigue[r.isin] : nodoIdPerIsinNuovo[r.isin]
        if (!nodoId) continue
        const duplicato = transazioniEsistenti.some(
          (t) =>
            t.nodo_id === nodoId &&
            t.data === r.data &&
            t.tipo === r.tipo &&
            Math.abs((t.importo ?? 0) - r.importo) < 0.005 &&
            Math.abs(t.quantita - r.quantita) < 0.0000005,
        )
        if (duplicato) {
          duplicati++
          continue
        }
        daInserire.push({
          nodo_id: nodoId,
          data: r.data,
          tipo: r.tipo,
          origine: r.origine,
          quantita: r.quantita,
          importo: r.importo,
          commissioni: r.commissioni,
        })
      }

      await importaTransazioni.mutateAsync(daInserire)
      setRisultato({ importate: daInserire.length, duplicati, titoliCreati: isinNuovi.length })
      setRighe(null)
    } catch (e) {
      setErroreImport(e instanceof Error ? e.message : 'Errore sconosciuto durante l’import.')
    }
  }

  const inCorso = creaTitolo.isPending || importaTransazioni.isPending

  return (
    <Modal title="Importa CSV" onClose={onClose} width={560}>
      <div className="flex flex-col gap-4">
        {!righe && !risultato && (
          <>
            <p className="text-sm text-text-secondary">
              Carica l’estratto "Broker Transactions" esportato da Scalable Capital. Le righe di liquidità (versamenti, canone,
              interessi) vengono ignorate: si importano solo acquisti e vendite di titoli.
            </p>
            <input
              ref={inputFile}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && caricaFile(e.target.files[0])}
            />
            <button
              onClick={apriSelettoreFile}
              className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-text-secondary hover:border-primary"
            >
              Scegli il file CSV…
            </button>
            {erroreFile && <div className="text-sm text-negative">{erroreFile}</div>}
          </>
        )}

        {righe && (
          <>
            <div className="rounded-lg bg-background px-3 py-2.5 text-sm">
              {righe.length} transazioni trovate nel file
              {scartate > 0 ? ` (${scartate} righe di liquidità ignorate)` : ''}.
            </div>

            {isinNuovi.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-sm font-medium">
                  {isinNuovi.length} titol{isinNuovi.length === 1 ? 'o nuovo' : 'i nuovi'} da creare
                </div>
                <ul className="list-disc pl-5 text-sm text-text-secondary">
                  {isinNuovi.map((isin) => (
                    <li key={isin}>{nomePerIsinNuovo.get(isin)}</li>
                  ))}
                </ul>
                <label className="block">
                  <div className="mb-1.5 text-xs text-text-secondary">In quale portafoglio?</div>
                  <Dropdown
                    options={portafogli.map((p) => ({ value: p.id, label: p.nome }))}
                    value={parentNuovi}
                    onChange={setParentNuovi}
                    placeholder="Seleziona un portafoglio…"
                  />
                </label>
              </div>
            )}

            {isinAmbigui.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-sm font-medium">
                  {isinAmbigui.length} titol{isinAmbigui.length === 1 ? 'o' : 'i'} presente in più portafogli: a quale assegnare?
                </div>
                {isinAmbigui.map((isin) => (
                  <label key={isin} className="block">
                    <div className="mb-1.5 text-xs text-text-secondary">{nomePerIsinNuovo.get(isin)}</div>
                    <Dropdown
                      options={(matchPerIsin.get(isin) ?? []).map((t) => ({ value: t.id, label: t.percorso ? `${t.nome} — ${t.percorso}` : t.nome }))}
                      value={selezioneAmbigue[isin] ?? null}
                      onChange={(v) => setSelezioneAmbigue((s) => ({ ...s, [isin]: v }))}
                      placeholder="Seleziona un titolo…"
                    />
                  </label>
                ))}
              </div>
            )}

            {erroreImport && <div className="text-sm text-negative">{erroreImport}</div>}

            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setRighe(null)}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-text-secondary"
              >
                Annulla
              </button>
              <button
                onClick={eseguiImport}
                disabled={!pronto || inCorso}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
              >
                {inCorso ? 'Importazione…' : 'Importa'}
              </button>
            </div>
          </>
        )}

        {risultato && (
          <>
            <div className="rounded-lg bg-background px-3 py-2.5 text-sm">
              Importate {risultato.importate} transazioni
              {risultato.duplicati > 0 ? `, ${risultato.duplicati} già presenti saltate` : ''}
              {risultato.titoliCreati > 0 ? `, ${risultato.titoliCreati} titol${risultato.titoliCreati === 1 ? 'o creato' : 'i creati'}` : ''}.
            </div>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
              >
                Chiudi
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
