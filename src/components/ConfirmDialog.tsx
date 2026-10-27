export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Conferma',
  onConfirm,
  onCancel,
  loading,
}: {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-[400px] rounded-[14px] border border-border bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 text-base font-semibold">{title}</div>
        <div className="mb-5 text-sm text-text-secondary">{message}</div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-4 py-2.5 text-sm font-medium text-text-secondary">
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-negative px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? 'Eliminazione…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
