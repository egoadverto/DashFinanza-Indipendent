// Logo: due anelli concentrici (come l'Allocazione in Dashboard) con un pallino al centro.
// Colori fissi, gli stessi di public/favicon.svg.
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="flex-none">
      <rect width="64" height="64" rx="32" fill="#4a44d1" />
      <g fill="none" strokeLinecap="round" strokeWidth="4.5">
        <path d="M11.3 39.5A22 22 0 1 1 52.7 39.5" stroke="#fff" opacity=".35" />
        <path d="M11.3 39.5A22 22 0 0 1 51.1 21.0" stroke="#fff" />
        <path d="M18.8 36.8A14 14 0 1 1 45.2 36.8" stroke="#fff" opacity=".35" />
        <path d="M18.8 36.8A14 14 0 0 1 39.0 19.9" stroke="#7be0a4" />
      </g>
      <circle cx="32" cy="32" r="6" fill="#7be0a4" />
    </svg>
  )
}
