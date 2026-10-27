// Connessione Supabase: normalmente quella di build (.env.local / Netlify),
// ma sostituibile da Impostazioni per puntare a un progetto Supabase diverso
// — es. un amico con il proprio progetto, stesso codice dell'app.
const STORAGE_KEY = 'dashfinanza:supabase-override'

export interface SupabaseConfig {
  url: string
  anonKey: string
}

function leggiOverride(): SupabaseConfig | null {
  try {
    const salvato = localStorage.getItem(STORAGE_KEY)
    if (salvato) return JSON.parse(salvato)
  } catch {
    // localStorage non disponibile o dato corrotto: si ignora l'override, si torna al default di build.
  }
  return null
}

export function haOverride(): boolean {
  return leggiOverride() !== null
}

// La configurazione realmente in uso: l'override scelto in Impostazioni se
// presente, altrimenti quella di build.
export function configurazioneAttiva(): SupabaseConfig {
  return (
    leggiOverride() ?? {
      url: import.meta.env.VITE_SUPABASE_URL ?? '',
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    }
  )
}

export function impostaOverride(config: SupabaseConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function rimuoviOverride() {
  localStorage.removeItem(STORAGE_KEY)
}
