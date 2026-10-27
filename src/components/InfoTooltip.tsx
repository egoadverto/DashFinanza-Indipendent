import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useClickEsterno } from '../hooks/useClickEsterno'

const LARGHEZZA = 224
const MARGINE = 6

// Icona ⓘ con spiegazione. Prima era solo un tooltip nativo del browser
// (attributo title): su touch non c'è hover, quindi su mobile toccare
// l'icona non faceva nulla — bug reale segnalato dall'utente. Ora un tap
// apre anche un popover vero, in portale su document.body (come RowMenu:
// dentro un pannello con overflow-auto, es. DetailPanel, verrebbe
// altrimenti tagliato fuori), con la posizione orizzontale sempre
// ricalcolata per restare dentro lo schermo qualunque sia il punto in cui
// si trova l'icona. Il title resta, per chi passa comunque il mouse.
export default function InfoTooltip({ text }: { text: string }) {
  const [aperto, setAperto] = useState(false)
  const [posizione, setPosizione] = useState({ top: 0, left: 0 })
  const portaleRef = useRef<HTMLDivElement>(null)
  const ref = useClickEsterno<HTMLButtonElement>(aperto, () => setAperto(false), portaleRef)

  function apri() {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const left = Math.max(8, Math.min(rect.left + rect.width / 2 - LARGHEZZA / 2, window.innerWidth - LARGHEZZA - 8))
    setPosizione({ top: rect.bottom + MARGINE, left })
    setAperto(true)
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => (aperto ? setAperto(false) : apri())}
        title={text}
        aria-label="Informazioni"
        className="flex -m-2 cursor-help items-center justify-center p-2 text-text-tertiary"
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
          <line x1="7" y1="6.2" x2="7" y2="10" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="7" cy="4.2" r="0.7" fill="currentColor" />
        </svg>
      </button>
      {aperto &&
        createPortal(
          <div
            ref={portaleRef}
            className="fixed z-30 rounded-lg border border-border bg-surface p-2.5 text-[11px] font-normal leading-snug text-text shadow-lg"
            style={{ width: LARGHEZZA, top: posizione.top, left: posizione.left }}
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  )
}
