export default function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-10 flex-none rounded-full transition-colors"
      style={{ background: checked ? 'var(--color-primary)' : 'var(--color-border)' }}
    >
      <span
        className="absolute top-0.5 left-0 h-5 w-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )
}
