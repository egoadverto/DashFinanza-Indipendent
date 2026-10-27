export default function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex gap-[2px] rounded-lg bg-background p-[3px]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs whitespace-nowrap ${
            value === o.value ? 'bg-surface font-semibold text-primary shadow-sm' : 'text-text-secondary'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
