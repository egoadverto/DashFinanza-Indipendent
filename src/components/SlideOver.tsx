import type { ReactNode } from 'react'
import { useClickEsterno } from '../hooks/useClickEsterno'

// Il velo di sfondo è solo visivo (pointer-events-none): un click su una
// riga della tabella sotto il pannello deve raggiungerla direttamente e
// cambiare dettaglio, non limitarsi a chiudere il pannello corrente.
export default function SlideOver({
  width = 420,
  onClose,
  children,
}: {
  width?: number
  onClose: () => void
  children: ReactNode
}) {
  const panelRef = useClickEsterno<HTMLDivElement>(true, onClose)

  return (
    <div className="pointer-events-none fixed inset-0 z-50 bg-black/25">
      <div
        ref={panelRef}
        className="pointer-events-auto absolute top-0 right-0 bottom-0 flex flex-col gap-4 overflow-auto bg-surface p-4 shadow-xl sm:p-6"
        style={{ width: '100%', maxWidth: width }}
      >
        {children}
      </div>
    </div>
  )
}
