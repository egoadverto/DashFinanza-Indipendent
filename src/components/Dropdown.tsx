import { useState } from 'react'
import { useClickEsterno } from '../hooks/useClickEsterno'

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
  const ref = useClickEsterno<HTMLDivElement>(open, () => setOpen(false))

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
      {open && (
        <div className="absolute top-[calc(100%+4px)] z-20 max-h-60 w-full overflow-auto rounded-lg border border-border bg-surface p-1 shadow-lg">
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
        </div>
      )}
    </div>
  )
}
