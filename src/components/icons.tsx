type IconProps = { className?: string }

export function IconGrid({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function IconTree({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="4" cy="14" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 6v6M6 4h3a2 2 0 012 2v1M6 14h3a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function IconSwap({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 6h11m0 0l-3-3m3 3l-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 12H5m0 0l3 3m-3-3l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconChart({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 14V8M8 14V4M13 14v-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 16h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconSliders({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none">
      <line x1="2" y1="5" x2="16" y2="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="11" cy="5" r="1.8" fill="var(--color-surface)" stroke="currentColor" strokeWidth="1.5" />
      <line x1="2" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="12" r="1.8" fill="var(--color-surface)" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="11" y1="11" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function IconEye({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M1 9C1 9 4 3.5 9 3.5S17 9 17 9 14 14.5 9 14.5 1 9 1 9Z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="9" r="2.3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
