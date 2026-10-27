export type Periodo = '3m' | '6m' | '1a' | 'dall_inizio'

export const PERIODI: { value: Periodo; label: string }[] = [
  { value: '3m', label: '3 mesi' },
  { value: '6m', label: '6 mesi' },
  { value: '1a', label: '1 anno' },
  { value: 'dall_inizio', label: "Dall'inizio" },
]
