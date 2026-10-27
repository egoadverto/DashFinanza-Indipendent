import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useClickEsterno } from '../hooks/useClickEsterno'
import { useDirezioneMenu } from '../hooks/useDirezioneMenu'

export default function Dropdown<T extends string>({
  options,
  value,
  onChange,
  placeholder = 'Seleziona…',
}: {
  options: { value: T; label: string }[]
  value: T | null
  onChange: (value: T) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const selezionato = options.find((o) => o.value === value)
  const portaleRef = useRef<HTMLDivElement>(null)
  const ref = useClickEsterno<HTMLDivElement>(open, () => setOpen(false), portaleRef)
  // In portale: dentro un modale con scroll proprio la lista restava tagliata,
  // e dentro un <label> ogni click su una voce riapriva la tendina.
  const pos = useDirezioneMenu(open, ref, Math.min(options.length, 6.5), 0)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left text-sm"
      >
        <span className={selezionato ? '' : 'text-text-tertiary'}>{selezionato?.label ?? placeholder}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && createPortal(
        <div
          ref={portaleRef}
          className="fixed z-[60] max-h-60 overflow-auto rounded-lg border border-border bg-surface p-1 shadow-lg"
          style={{ top: pos.top, left: pos.sinistraTrigger, width: pos.larghezzaTrigger }}
        >
          {options.map((o) => (
            <div
              key={o.value}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              className="cursor-pointer rounded-md px-3 py-2 text-sm hover:bg-background"
            >
              {o.label}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}
