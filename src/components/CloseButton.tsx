export default function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-text-tertiary hover:text-text" aria-label="Chiudi">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </button>
  )
}
