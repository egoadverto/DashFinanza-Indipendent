import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useImpostazioni } from '../hooks/useImpostazioni'

interface PrivacyState {
  hidden: boolean
  toggle: () => void
}

const PrivacyContext = createContext<PrivacyState | null>(null)

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false)
  const { data: impostazioni } = useImpostazioni()
  const inizializzato = useRef(false)

  useEffect(() => {
    if (impostazioni && !inizializzato.current) {
      inizializzato.current = true
      setHidden(impostazioni.privacy_all_apertura)
    }
  }, [impostazioni])

  return (
    <PrivacyContext.Provider value={{ hidden, toggle: () => setHidden((h) => !h) }}>
      {children}
    </PrivacyContext.Provider>
  )
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext)
  if (!ctx) throw new Error('usePrivacy va usato dentro PrivacyProvider')
  return ctx
}
