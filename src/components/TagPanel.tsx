import type { TagDefinizione } from '../types/domain'
import type { TreeNode } from '../lib/tree'
import { fmtPct } from '../lib/format'
import SlideOver from './SlideOver'
import CloseButton from './CloseButton'

// Quante volte una definizione TAG compare nell'albero (può essere usata in
// più portafogli con titoli diversi) e quanti titoli totali contiene.
function usoDefinizione(roots: TreeNode[], definizioneId: string): { portafogli: number; titoli: number } {
  let portafogli = 0
  let titoli = 0
  const visita = (nodi: TreeNode[]) => {
    for (const n of nodi) {
      if (n.tipo === 'tag' && n.tagDefinizioneId === definizioneId) {
        portafogli++
        titoli += n.children.length
      }
      visita(n.children)
    }
  }
  visita(roots)
  return { portafogli, titoli }
}

export default function TagPanel({
  definizioni,
  roots,
  onEdit,
  onDelete,
  onClose,
}: {
  definizioni: TagDefinizione[]
  roots: TreeNode[]
  onEdit: (d: TagDefinizione) => void
  onDelete: (d: TagDefinizione) => void
  onClose: () => void
}) {
  return (
    <SlideOver width={420} onClose={onClose}>
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold">TAG</div>
          <CloseButton onClick={onClose} />
        </div>

        {definizioni.length === 0 ? (
          <div className="text-sm text-text-tertiary">Nessuna definizione TAG ancora. Se ne crea una da "+ Aggiungi" → "TAG".</div>
        ) : (
          <div className="flex flex-col gap-3">
            {definizioni.map((d) => {
              const uso = usoDefinizione(roots, d.id)
              return (
                <div key={d.id} className="flex flex-col gap-1.5 rounded-[10px] border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{d.nome}</div>
                    <div className="flex gap-2.5">
                      <button onClick={() => onEdit(d)} className="text-text-secondary hover:text-text" title="Modifica" aria-label="Modifica">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M9.5 1.5l3 3-8 8-3.3.5.5-3.3 8-8z" stroke="currentColor" strokeWidth="1.2" />
                        </svg>
                      </button>
                      <button onClick={() => onDelete(d)} className="text-text-secondary hover:text-negative" title="Elimina" aria-label="Elimina">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path
                            d="M2.5 3.5h9M5 3.5V2a1 1 0 011-1h2a1 1 0 011 1v1.5M3.5 3.5l.6 8.5a1 1 0 001 .9h3.8a1 1 0 001-.9l.6-8.5"
                            stroke="currentColor"
                            strokeWidth="1.2"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-text-secondary">
                    {d.modo_target === 'stabilito' && d.target_percentuale != null ? fmtPct(d.target_percentuale) : 'Obiettivo dai titoli'}
                  </div>
                  <div className="text-xs text-text-secondary">
                    Usato in {uso.portafogli} {uso.portafogli === 1 ? 'portafoglio' : 'portafogli'} · {uso.titoli} titoli
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-auto border-t border-border pt-3 text-xs text-text-tertiary">
          Un TAG è una definizione riutilizzabile: lo stesso TAG può essere usato in più portafogli con titoli diversi.
        </div>
    </SlideOver>
  )
}
