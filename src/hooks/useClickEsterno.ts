import { useEffect, useRef, type RefObject } from 'react'

// Chiude un menù o un dropdown al primo click fuori dal suo contenitore,
// non solo ricliccando il pulsante che l'ha aperto. extraRef copre il caso
// di un pannello in portale (es. RowMenu su document.body): non è un
// discendente DOM del contenitore principale, quindi va controllato a parte.
export function useClickEsterno<T extends HTMLElement>(attivo: boolean, onFuori: () => void, extraRef?: RefObject<HTMLElement | null>) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!attivo) return
    function handler(e: MouseEvent) {
      const target = e.target as Node
      if (ref.current?.contains(target)) return
      if (extraRef?.current?.contains(target)) return
      onFuori()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [attivo, onFuori, extraRef])

  return ref
}
