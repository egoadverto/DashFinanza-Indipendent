// Badge Tipo transazione: condiviso tra Transazioni (elenco completo) e il
// pannello di dettaglio di un titolo (le sue ultime transazioni).
export const LABEL_TIPO_TRANSAZIONE: Record<string, string> = { acquisto: 'Acquisto', vendita: 'Vendita', apertura: 'Apertura' }

export const COLORE_TIPO_TRANSAZIONE: Record<string, { bg: string; color: string }> = {
  acquisto: { bg: 'var(--color-primary-active)', color: 'var(--color-primary)' },
  vendita: { bg: 'var(--color-negative-soft)', color: 'var(--color-negative)' },
  apertura: { bg: 'var(--color-warning-soft)', color: 'var(--color-warning)' },
}
