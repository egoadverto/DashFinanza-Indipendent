import { fmtEur, fmtPct } from '../../lib/format'

const COLORI = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
]
const COLORE_ALTRO = 'var(--color-chart-7)'
const SPESSORE = 16
const PASSO_RAGGIO = 20
const RAGGIO_BASE = 88
// Stesso criterio delle ciambelle di Analisi/Composizione: i primi 5 per
// valore, il resto confluisce in "Altro" — evita anelli troppo sottili per
// essere leggibili con molte voci.
const MAX_VOCI = 5

function puntoArco(cx: number, cy: number, r: number, frazione: number) {
  const angolo = (180 - 180 * frazione) * (Math.PI / 180)
  return { x: cx + r * Math.cos(angolo), y: cy - r * Math.sin(angolo) }
}

export default function AllocazioneGauge({
  voci,
  totale,
  etichetta,
}: {
  voci: { nome: string; valore: number }[]
  totale: number
  etichetta: string
}) {
  const ordinate = [...voci].sort((a, b) => b.valore - a.valore)
  const principali = ordinate.slice(0, MAX_VOCI)
  const resto = ordinate.slice(MAX_VOCI)
  const valoreAltro = resto.reduce((s, v) => s + v.valore, 0)
  const anelli = valoreAltro > 0 ? [...principali, { nome: 'Altro', valore: valoreAltro }] : principali

  const n = Math.max(1, anelli.length)
  const rMax = RAGGIO_BASE + (n - 1) * PASSO_RAGGIO
  // cx deve crescere con rMax, altrimenti l'anello esterno esce dal viewBox
  // (bug reale: con 5+ voci rMax supera 160 e l'arco viene tagliato a sinistra/destra).
  const cx = Math.max(160, rMax + 20)
  const cy = rMax + 16
  const larghezza = cx * 2
  const altezza = cy + 46

  return (
    <div className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${larghezza} ${altezza}`} className="w-full">
        {anelli.map((v, i) => {
          const r = rMax - i * PASSO_RAGGIO
          const frazione = totale > 0 ? v.valore / totale : 0
          const inizio = puntoArco(cx, cy, r, 0)
          const fineTraccia = puntoArco(cx, cy, r, 1)
          const fine = puntoArco(cx, cy, r, frazione)
          const colore = v.nome === 'Altro' ? COLORE_ALTRO : COLORI[i % COLORI.length]
          return (
            <g key={v.nome}>
              <path
                d={`M${inizio.x},${inizio.y} A${r},${r} 0 1 1 ${fineTraccia.x},${fineTraccia.y}`}
                fill="none"
                stroke="var(--color-border-soft)"
                strokeWidth={SPESSORE}
                strokeLinecap="round"
              />
              {frazione > 0 && (
                <path
                  d={`M${inizio.x},${inizio.y} A${r},${r} 0 ${frazione >= 0.999 ? 1 : 0} 1 ${fine.x},${fine.y}`}
                  fill="none"
                  stroke={colore}
                  strokeWidth={SPESSORE}
                  strokeLinecap="round"
                />
              )}
            </g>
          )
        })}
        {/* Sotto la base del semicerchio: nessun anello disegna mai lì, qualunque sia n */}
        <text x={cx} y={cy + 18} textAnchor="middle" fontFamily="var(--font-display)" fontSize={18} fontWeight={600} fill="var(--color-text)">
          {fmtEur(totale)}
        </text>
        <text x={cx} y={cy + 35} textAnchor="middle" fontSize={10.5} fill="var(--color-text-tertiary)">
          {etichetta}
        </text>
      </svg>

      <div className="flex flex-col gap-2">
        {anelli.map((v, i) => (
          <div key={v.nome} className="flex items-center justify-between text-[12.5px]">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 flex-none rounded-full"
                style={{ background: v.nome === 'Altro' ? COLORE_ALTRO : COLORI[i % COLORI.length] }}
              />
              <span className="min-w-0 truncate">{v.nome}</span>
            </div>
            <span className="flex-none font-semibold">{fmtPct(totale > 0 ? (v.valore / totale) * 100 : 0)}</span>
          </div>
        ))}
        {anelli.length === 0 && <div className="text-[12.5px] text-text-tertiary">Nessuna voce ancora.</div>}
      </div>
    </div>
  )
}
