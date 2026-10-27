import { useLayoutEffect, useState, type RefObject } from 'react'

// Altezza approssimata di una voce di menù (py-2 + testo) più il padding
// del contenitore: p-1 su entrambi i lati.
const ALTEZZA_VOCE = 36
const PADDING_CONTENITORE = 8
const MARGINE = 4

export interface PosizioneMenu {
  direzione: 'sopra' | 'sotto'
  top: number
  left: number
  // Bordo sinistro e larghezza del pulsante: per le tendine larghe quanto il campo.
  sinistraTrigger: number
  larghezzaTrigger: number
}

// Un menù a tendina di riga si apre di norma verso il basso; se la finestra
// non ha spazio sufficiente sotto il pulsante, il menù si apre verso l'alto
// invece. La posizione è calcolata in coordinate di finestra (fixed) perché
// il menù è renderizzato in portale: dentro una tabella con scroll interno,
// un menù posizionato relativamente alla riga finirebbe tagliato dal
// contenitore o coperto dalla riga successiva (che ha il proprio sfondo
// sticky sopra di lui nello stacking order).
export function useDirezioneMenu(aperto: boolean, triggerRef: RefObject<HTMLElement | null>, numeroVoci: number, width: number): PosizioneMenu {
  const [posizione, setPosizione] = useState<PosizioneMenu>({ direzione: 'sotto', top: 0, left: 0, sinistraTrigger: 0, larghezzaTrigger: 0 })

  useLayoutEffect(() => {
    if (!aperto || !triggerRef.current) return

    const calcola = () => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      const altezzaMenu = numeroVoci * ALTEZZA_VOCE + PADDING_CONTENITORE
      const staSotto = rect.bottom + MARGINE + altezzaMenu <= window.innerHeight
      const direzione = staSotto ? 'sotto' : 'sopra'
      setPosizione({
        direzione,
        top: direzione === 'sotto' ? rect.bottom + MARGINE : rect.top - MARGINE - altezzaMenu,
        left: rect.right - width,
        sinistraTrigger: rect.left,
        larghezzaTrigger: rect.width,
      })
    }

    calcola()
    window.addEventListener('scroll', calcola, true)
    window.addEventListener('resize', calcola)
    return () => {
      window.removeEventListener('scroll', calcola, true)
      window.removeEventListener('resize', calcola)
    }
  }, [aperto, triggerRef, numeroVoci, width])

  return posizione
}
