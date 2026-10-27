import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { configurazioneAttiva } from './supabaseConfig'

const { url, anonKey } = configurazioneAttiva()

if (!url) {
  throw new Error("Nessun URL Supabase configurato: imposta VITE_SUPABASE_URL, oppure una connessione personalizzata in Impostazioni.")
}
if (!anonKey) {
  throw new Error("Nessuna chiave Supabase configurata: imposta VITE_SUPABASE_ANON_KEY, oppure una connessione personalizzata in Impostazioni.")
}

export const supabase = createClient<Database>(url, anonKey)

export async function getUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error(error.message)
  return data.user.id
}

export function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data as T
}
