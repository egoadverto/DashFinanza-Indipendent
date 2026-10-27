import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { configurazioneAttiva, haOverride, impostaOverride, rimuoviOverride } from '../lib/supabaseConfig'
import { useImpostazioni } from '../hooks/useImpostazioni'
import { useUpdateImpostazioni } from '../hooks/useUpdateImpostazioni'
import { useProviderPrezzi } from '../hooks/useProviderPrezzi'
import { useUpdateProviderPrezzo } from '../hooks/useUpdateProviderPrezzo'
import { useAggiornaPrezzi } from '../hooks/useAggiornaPrezzi'
import { PERIODI, type Periodo } from '../lib/periodo'
import { fmtData, parseNumeroIt } from '../lib/format'
import Segmented from '../components/Segmented'
import Toggle from '../components/Toggle'
import NuovoProvider from '../components/modals/NuovoProvider'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Impostazioni as ImpostazioniRow, ProviderPrezzo } from '../types/domain'

const FUNZIONE_PER_CODICE: Record<string, string> = {
  justetf: 'aggiorna-prezzi',
  coingecko: 'aggiorna-prezzi-cripto',
}

const SI_NO: { value: 'si' | 'no'; label: string }[] = [
  { value: 'si', label: 'Sì' },
  { value: 'no', label: 'No' },
]

type Draft = Pick<
  ImpostazioniRow,
  'periodo_grafici' | 'privacy_all_apertura' | 'tolleranza_punti' | 'importo_minimo' | 'dinamizzazione_default' | 'soglia_revisione'
>

function draftDi(i: ImpostazioniRow): Draft {
  return {
    periodo_grafici: i.periodo_grafici,
    privacy_all_apertura: i.privacy_all_apertura,
    tolleranza_punti: i.tolleranza_punti,
    importo_minimo: i.importo_minimo,
    dinamizzazione_default: i.dinamizzazione_default,
    soglia_revisione: i.soglia_revisione,
  }
}

function Campo({ etichetta, children, sotto }: { etichetta: string; children: React.ReactNode; sotto?: string }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs text-text-secondary">{etichetta}</div>
      {children}
      {sotto && <div className="mt-1 text-[11px] text-text-tertiary">{sotto}</div>}
    </label>
  )
}

// Un valore fisso per scelta di prodotto (valuta, formato, lingua): mostrarlo
// come dropdown vero sarebbe fuorviante, funzionerebbe solo in apparenza.
function CampoFisso({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <div>
      <div className="mb-1.5 text-xs text-text-secondary">{etichetta}</div>
      <div className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text-secondary">{valore}</div>
    </div>
  )
}

function CampoNumero({ valore, onChange, suffisso }: { valore: number; onChange: (v: number) => void; suffisso?: string }) {
  const [testo, setTesto] = useState(valore.toString().replace('.', ','))
  useEffect(() => setTesto(valore.toString().replace('.', ',')), [valore])
  return (
    <div className="flex items-center gap-2">
      <input
        inputMode="decimal"
        value={testo}
        onChange={(e) => {
          setTesto(e.target.value)
          const numero = parseNumeroIt(e.target.value)
          if (!Number.isNaN(numero)) onChange(numero)
        }}
        className="flex-1 rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
      {suffisso && <span className="flex-none text-sm text-text-secondary">{suffisso}</span>}
    </div>
  )
}

export default function Impostazioni() {
  const { session } = useAuth()
  const { data: impostazioni, isLoading, error } = useImpostazioni()
  const aggiorna = useUpdateImpostazioni()
  const { data: providers, isLoading: caricoProvider } = useProviderPrezzi()
  const aggiornaProvider = useUpdateProviderPrezzo()
  const aggiornaPrezzi = useAggiornaPrezzi()

  const [draft, setDraft] = useState<Draft | null>(null)
  const [modaleProvider, setModaleProvider] = useState<'nuovo' | ProviderPrezzo | null>(null)
  const [chiaviVisibili, setChiaviVisibili] = useState<Set<string>>(new Set())
  const [connessioneDraft, setConnessioneDraft] = useState(() => configurazioneAttiva())
  const [chiaveConnessioneVisibile, setChiaveConnessioneVisibile] = useState(false)
  const [confermaConnessione, setConfermaConnessione] = useState(false)
  const [confermaRipristino, setConfermaRipristino] = useState(false)

  useEffect(() => {
    if (impostazioni && draft === null) setDraft(draftDi(impostazioni))
  }, [impostazioni, draft])

  async function cambiaConnessione() {
    impostaOverride(connessioneDraft)
    await supabase.auth.signOut()
    window.location.reload()
  }

  async function ripristinaConnessione() {
    rimuoviOverride()
    await supabase.auth.signOut()
    window.location.reload()
  }

  if (isLoading || caricoProvider) return <div className="text-sm text-text-secondary">Caricamento…</div>
  if (error) return <div className="text-sm text-negative">Errore nel caricamento: {error.message}</div>
  if (!impostazioni || !draft) return null

  const modificato = JSON.stringify(draft) !== JSON.stringify(draftDi(impostazioni))

  function annulla() {
    setDraft(draftDi(impostazioni!))
  }

  async function salva() {
    if (!draft) return
    await aggiorna.mutateAsync(draft)
  }

  function toggleChiaveVisibile(id: string) {
    setChiaviVisibili((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-lg font-semibold">Impostazioni</div>
        <div className="flex gap-2">
          <button
            onClick={annulla}
            disabled={!modificato}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-text-secondary disabled:opacity-40 sm:flex-none"
          >
            Annulla
          </button>
          <button
            onClick={salva}
            disabled={!modificato || aggiorna.isPending}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-40 sm:flex-none"
          >
            {aggiorna.isPending ? 'Salvataggio…' : 'Salva modifiche'}
          </button>
        </div>
      </div>

      {aggiorna.error && <div className="text-sm text-negative">{aggiorna.error.message}</div>}

      <section className="rounded-[12px] border border-border bg-surface px-[26px] py-6">
        <div className="mb-5 text-base font-semibold">Generali</div>
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
              <CampoFisso etichetta="Valuta" valore="Euro (€)" />
              <CampoFisso etichetta="Formato numerico" valore="Italiano (2.890,00 €)" />
              <CampoFisso etichetta="Lingua" valore="Italiano" />
              <CampoFisso etichetta="Data di riferimento" valore={fmtData(new Date().toISOString())} />
            </div>

            <div className="border-t border-border" />

            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
              <Campo etichetta="Periodo predefinito dei grafici">
                <Segmented options={PERIODI} value={draft.periodo_grafici as Periodo} onChange={(v) => setDraft({ ...draft, periodo_grafici: v })} />
              </Campo>
              <div className="flex items-center justify-between gap-6">
                <div>
                  <div className="text-sm">Privacy attiva all'apertura</div>
                  <div className="text-[11px] text-text-tertiary">Nasconde gli importi finché non la disattivi tu</div>
                </div>
                <div className="w-32 flex-none">
                  <Segmented
                    options={SI_NO}
                    value={draft.privacy_all_apertura ? 'si' : 'no'}
                    onChange={(v) => setDraft({ ...draft, privacy_all_apertura: v === 'si' })}
                  />
                </div>
              </div>
            </div>
          </div>
      </section>

      <section className="rounded-[12px] border border-border bg-surface px-[26px] py-6">
        <div className="mb-5 text-base font-semibold">Allocazione</div>
        <div className="flex flex-col gap-6">
            <div className="rounded-lg bg-background px-3 py-2.5 text-[12px] text-text-secondary">
              Solo parametri globali: gli obiettivi di ogni portafoglio, TAG o titolo si impostano nell'albero in
              Posizioni, non qui.
            </div>

            <Campo etichetta={`Tolleranza di scostamento — ±${draft.tolleranza_punti.toFixed(1)} pt`}>
              <input
                type="range"
                min={1}
                max={15}
                step={0.5}
                value={draft.tolleranza_punti}
                onChange={(e) => setDraft({ ...draft, tolleranza_punti: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-[11px] text-text-tertiary">
                <span>Rigoroso (±1 pt)</span>
                <span>Flessibile (±15 pt)</span>
              </div>
            </Campo>

            <div className="border-t border-border" />

            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
              <Campo etichetta="Importo minimo per versamento">
                <CampoNumero valore={draft.importo_minimo} onChange={(v) => setDraft({ ...draft, importo_minimo: v })} suffisso="€" />
              </Campo>

              <Campo etichetta="Dinamizzazione annua predefinita">
                <CampoNumero
                  valore={draft.dinamizzazione_default}
                  onChange={(v) => setDraft({ ...draft, dinamizzazione_default: v })}
                  suffisso="%"
                />
              </Campo>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
              <Campo etichetta="Soglia di revisione strutturale">
                <CampoNumero valore={draft.soglia_revisione} onChange={(v) => setDraft({ ...draft, soglia_revisione: v })} suffisso="€" />
              </Campo>
            </div>
          </div>
      </section>

      <section className="rounded-[12px] border border-border bg-surface px-[26px] py-6">
        <div className="mb-5 text-base font-semibold">Dati e account</div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold">Provider di prezzo</div>
            <button
              onClick={() => setModaleProvider('nuovo')}
              className="self-start rounded-lg bg-primary px-3 py-2 text-[13px] font-medium text-white hover:bg-primary-hover"
            >
              + Aggiungi provider
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {(providers ?? []).map((p) => (
              <div key={p.id} className="rounded-[10px] bg-background p-4">
                <div className="mb-3 flex items-center gap-3">
                  <Toggle checked={p.attivo} onChange={(v) => aggiornaProvider.mutate({ id: p.id, changes: { attivo: v } })} />
                  <span className="flex-1 font-medium">{p.nome}</span>
                  <span
                    className="text-[12px] font-medium"
                    style={{ color: p.ultimo_errore ? 'var(--color-negative)' : p.ultimo_ok ? 'var(--color-positive)' : 'var(--color-text-tertiary)' }}
                  >
                    {p.ultimo_errore ? 'Errore' : p.ultimo_ok ? 'OK' : 'Mai eseguito'}
                  </span>
                  <button onClick={() => setModaleProvider(p)} className="text-text-tertiary hover:text-text" aria-label="Modifica provider">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M9.5 1.5l3 3-8 8-3.5.5.5-3.5 8-8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-6 text-[13px]">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-text-tertiary">Chiave API</span>
                    <span>{p.chiave_api ? (chiaviVisibili.has(p.id) ? p.chiave_api : '••••••••') : 'Non serve'}</span>
                    {p.chiave_api && (
                      <button onClick={() => toggleChiaveVisibile(p.id)} className="text-[11px] text-primary">
                        {chiaviVisibili.has(p.id) ? 'Nascondi' : 'Mostra'}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-text-tertiary">Frequenza</span>
                    <span>Giornaliera, alle 6:00</span>
                  </div>
                  <div className="text-[11px] text-text-tertiary">
                    Ultimo aggiornamento: {p.ultimo_ok ? fmtData(p.ultimo_ok) : '—'}
                  </div>
                  {FUNZIONE_PER_CODICE[p.codice] && (
                    <button
                      onClick={() => aggiornaPrezzi.mutate(FUNZIONE_PER_CODICE[p.codice])}
                      disabled={aggiornaPrezzi.isPending}
                      className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-medium hover:bg-background disabled:opacity-50"
                    >
                      {aggiornaPrezzi.isPending ? 'Aggiornamento…' : 'Aggiorna adesso'}
                    </button>
                  )}
                </div>
                {p.ultimo_errore && <div className="mt-2 text-[11px] text-negative">{p.ultimo_errore}</div>}
              </div>
            ))}
            {(providers ?? []).length === 0 && (
              <div className="rounded-[10px] bg-background p-4 text-sm text-text-tertiary">Nessun provider ancora.</div>
            )}
          </div>

          <div className="text-[11px] text-text-tertiary">
            Se un aggiornamento fallisce, i prezzi restano quelli dell'ultima esecuzione riuscita: nessuna posizione
            mostra un valore inventato.
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Account</div>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-xs text-text-secondary hover:text-text"
              >
                Esci
              </button>
            </div>
            <div className="flex gap-8 text-[13px]">
              <div>
                <div className="text-[11px] text-text-tertiary">Email</div>
                <div>{session?.user.email}</div>
              </div>
              <div>
                <div className="text-[11px] text-text-tertiary">Ultimo accesso</div>
                <div>{session?.user.last_sign_in_at ? fmtData(session.user.last_sign_in_at) : '—'}</div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-text-tertiary">Le credenziali si gestiscono esternamente, da qui non si cambiano.</div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-1 flex items-center gap-2">
              <div className="text-sm font-semibold">Connessione dati</div>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-text-secondary"
                style={{ background: haOverride() ? 'var(--color-warning-soft)' : 'var(--color-background)' }}
              >
                {haOverride() ? 'Personalizzata' : 'Predefinita'}
              </span>
            </div>
            <div className="mb-3 text-[11px] text-text-tertiary">
              Per usare un progetto Supabase diverso da quello predefinito — per esempio per far usare l'app a
              qualcun altro, con il suo database. Salvare disconnette e ricarica la pagina.
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
              <Campo etichetta="URL Supabase">
                <input
                  value={connessioneDraft.url}
                  onChange={(e) => setConnessioneDraft({ ...connessioneDraft, url: e.target.value })}
                  placeholder="https://xxxxxxxx.supabase.co"
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </Campo>
              <Campo etichetta="Chiave anonima (anon key)">
                <div className="flex items-center gap-2">
                  <input
                    type={chiaveConnessioneVisibile ? 'text' : 'password'}
                    value={connessioneDraft.anonKey}
                    onChange={(e) => setConnessioneDraft({ ...connessioneDraft, anonKey: e.target.value })}
                    className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => setChiaveConnessioneVisibile((v) => !v)}
                    className="flex-none text-[11px] font-medium text-primary"
                  >
                    {chiaveConnessioneVisibile ? 'Nascondi' : 'Mostra'}
                  </button>
                </div>
              </Campo>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setConfermaConnessione(true)}
                disabled={!connessioneDraft.url.trim() || !connessioneDraft.anonKey.trim()}
                className="rounded-lg bg-primary px-4 py-2.5 text-[13px] font-medium text-white hover:bg-primary-hover disabled:opacity-40"
              >
                Salva e ricarica
              </button>
              {haOverride() && (
                <button
                  onClick={() => setConfermaRipristino(true)}
                  className="rounded-lg border border-border px-4 py-2.5 text-[13px] font-medium hover:bg-background"
                >
                  Ripristina predefinito
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {confermaConnessione && (
        <ConfirmDialog
          title="Cambiare la connessione dati?"
          message="Ti disconnette subito e ricarica la pagina, mostrando i dati del progetto Supabase appena indicato. Dovrai accedere di nuovo con le credenziali di quel progetto."
          confirmLabel="Salva e ricarica"
          onConfirm={cambiaConnessione}
          onCancel={() => setConfermaConnessione(false)}
        />
      )}

      {confermaRipristino && (
        <ConfirmDialog
          title="Ripristinare la connessione predefinita?"
          message="Ti disconnette subito e ricarica la pagina, tornando al progetto Supabase predefinito. Dovrai accedere di nuovo con le tue credenziali."
          confirmLabel="Ripristina e ricarica"
          onConfirm={ripristinaConnessione}
          onCancel={() => setConfermaRipristino(false)}
        />
      )}

      {modaleProvider && (
        <NuovoProvider
          providerEsistente={modaleProvider === 'nuovo' ? undefined : modaleProvider}
          onClose={() => setModaleProvider(null)}
        />
      )}
    </div>
  )
}
