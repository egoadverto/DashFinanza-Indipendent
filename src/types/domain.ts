// Le colonne "enum" dello schema sono `text` con un check constraint in
// Postgres: il generatore le tipizza come `string`. Questi alias restringono
// il tipo lato client agli stessi valori ammessi dal vincolo, così
// TypeScript segnala un valore fuori lista prima che lo faccia il database.
import type { Tables } from './database'

export type TipoNodo = 'portafoglio' | 'tag' | 'titolo'
export type StatoNodo = 'attiva' | 'congelata' | 'chiusa'
export type ModoTarget = 'stabilito' | 'calcolato'
export type TargetUnita = 'percentuale' | 'euro'
export type TipoTransazione = 'acquisto' | 'vendita' | 'apertura'
export type OrigineTransazione = 'ricorrente' | 'manuale'
export type OrigineVersamento = 'tfr' | 'lavoratore' | 'datore'
export type CategoriaTitolo = 'etf' | 'etc' | 'fondo_pensione' | 'cripto' | 'altro'

export type Nodo = Tables<'nodi'>
export type Titolo = Tables<'titoli'>
export type TagDefinizione = Tables<'tag_definizioni'>
export type Transazione = Tables<'transazioni'>
export type Prezzo = Tables<'prezzi'>
export type Benchmark = Tables<'benchmark'>
export type BenchmarkValore = Tables<'benchmark_valori'>
export type ProviderPrezzo = Tables<'provider_prezzi'>
export type Impostazioni = Tables<'impostazioni'>

export type VPosizioni = Tables<'v_posizioni'>
export type VNodoValore = Tables<'v_nodo_valore'>
export type VUltimoPrezzo = Tables<'v_ultimo_prezzo'>
export type VTerMedio = Tables<'v_ter_medio'>
export type VRealizzato = Tables<'v_realizzato'>
