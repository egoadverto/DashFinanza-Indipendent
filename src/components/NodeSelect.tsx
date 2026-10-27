import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useClickEsterno } from '../hooks/useClickEsterno'
import { useDirezioneMenu } from '../hooks/useDirezioneMenu'
import type { ContenitoreOpzione } from '../lib/tree'

function profondita(id: string, byId: Map<string, ContenitoreOpzione>): number {
  let depth = 0
  let current = byId.get(id)
  while (current?.parentId) {
    depth++
    current = byId.get(current.parentId)
  }
  return depth
}

export default function NodeSelect({
  opzioni,
  value,
  onChange,
  placeholder = 'Nessuno — crea un portafoglio radice',
  permettiNessuno = true,
  variant = 'default',
}: {
  opzioni: ContenitoreOpzione[]
  value: string | null
  onChange: (id: string | null) => void
  placeholder?: string
  permettiNessuno?: boolean
  // 'minimal': solo testo+icona, senza bordo/sfondo — per un filtro discreto
  // sopra un grafico invece di un campo di form vero e proprio.
  variant?: 'default' | 'minimal'
}) {
  const [open, setOpen] = useState(false)
  const byId = new Map(opzioni.map((p) => [p.id, p]))
  const selezionato = value ? byId.get(value) : null
  const label = selezionato ? selezionato.nome : permettiNessuno ? placeholder : 'Seleziona…'
  const portaleRef = useRef<HTMLDivElement>(null)
  const ref = useClickEsterno<HTMLDivElement>(open, () => setOpen(false), portaleRef)
  // In portale, come Dropdown: niente lista tagliata dal modale né riaperta dal <label>.
  const larghezzaMinimal = 260
  const pos = useDirezioneMenu(open, ref, Math.min(opzioni.length + (permettiNessuno ? 1 : 0), 6.5), larghezzaMinimal)

  return (
    <div className="relative" ref={ref}>
      {variant === 'minimal' ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-[11.5px] text-text-tertiary"
        >
          <span>{label}</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h9M17 6h3" />
            <path d="M4 12h3M11 12h9" />
            <path d="M4 18h13M21 18h0" />
            <circle cx="13" cy="6" r="2" />
            <circle cx="7" cy="12" r="2" />
            <circle cx="17" cy="18" r="2" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left text-sm"
        >
          <span>{label}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      {open && createPortal(
        <div
          ref={portaleRef}
          className="fixed z-[60] max-h-60 overflow-y-auto overflow-x-hidden rounded-lg border border-border bg-surface p-1 shadow-lg"
          style={
            variant === 'minimal'
              ? { top: pos.top, left: pos.left, width: larghezzaMinimal }
              : { top: pos.top, left: pos.sinistraTrigger, width: pos.larghezzaTrigger }
          }
        >
          {permettiNessuno && (
            <div
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
              className="cursor-pointer rounded-md px-3 py-2 text-sm hover:bg-background"
            >
              {placeholder}
            </div>
          )}
          {opzioni.map((o) => (
            <div
              key={o.id}
              onClick={() => {
                onChange(o.id)
                setOpen(false)
              }}
              style={{ paddingLeft: 12 + profondita(o.id, byId) * 16 }}
              className="cursor-pointer rounded-md py-2 pr-3 text-sm hover:bg-background"
            >
              {o.nome}
              {o.tipo === 'tag' && <span className="ml-1.5 text-[11px] text-text-tertiary">TAG</span>}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}
