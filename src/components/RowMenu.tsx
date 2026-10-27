import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useClickEsterno } from '../hooks/useClickEsterno'
import { useDirezioneMenu } from '../hooks/useDirezioneMenu'

export interface RowMenuItem {
  label: string
  onClick: () => void
  negativo?: boolean
}

// Il menù a tre puntini ripetuto identico in ogni tabella (Posizioni,
// Posizioni chiuse, Transazioni): bottone ⋮ più un elenco di azioni che si
// apre sopra o sotto a seconda dello spazio disponibile. Il pannello è in
// portale su document.body: dentro una riga di tabella con scroll interno,
// posizionarlo relativamente alla riga lo taglierebbe fuori dal contenitore
// o lo farebbe coprire dalla riga successiva.
export default function RowMenu({
  aperto,
  onToggle,
  items,
  width = 144,
  className = '',
}: {
  aperto: boolean
  onToggle: (aperto: boolean) => void
  items: RowMenuItem[]
  width?: number
  className?: string
}) {
  // La stessa riga può esistere due volte (tabella desktop e schede mobile,
  // una delle due nascosta via CSS) con lo stesso id di menù aperto: senza
  // questo, la copia nascosta si apriva insieme e al mousedown su una voce
  // la considerava un click "fuori", chiudendo tutto prima del click.
  // Si apre solo l'istanza il cui bottone è stato premuto davvero.
  const [premutoQui, setPremutoQui] = useState(false)
  if (!aperto && premutoQui) setPremutoQui(false)
  const apertoQui = aperto && premutoQui
  const cambia = (v: boolean) => {
    setPremutoQui(v)
    onToggle(v)
  }
  const portaleRef = useRef<HTMLDivElement>(null)
  const menuRef = useClickEsterno<HTMLDivElement>(apertoQui, () => cambia(false), portaleRef)
  const posizione = useDirezioneMenu(apertoQui, menuRef, items.length, width)

  return (
    <div className={`relative flex-none ${className}`} ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => cambia(!apertoQui)}
        className="flex h-6 w-6 items-center justify-center rounded-md text-text-secondary hover:bg-background"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="2.5" r="1.2" fill="currentColor" />
          <circle cx="7" cy="7" r="1.2" fill="currentColor" />
          <circle cx="7" cy="11.5" r="1.2" fill="currentColor" />
        </svg>
      </button>
      {apertoQui &&
        createPortal(
          <div
            ref={portaleRef}
            className="fixed z-20 rounded-lg border border-border bg-surface p-1 shadow-lg"
            style={{ width, top: posizione.top, left: posizione.left }}
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  item.onClick()
                  cambia(false)
                }}
                className={`block w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm hover:bg-background ${item.negativo ? 'text-negative' : ''}`}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}
