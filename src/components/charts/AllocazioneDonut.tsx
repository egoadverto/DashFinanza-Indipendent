import { fmtEur, fmtPct } from '../../lib/format'

const COLORI = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
  'var(--color-chart-7)',
]

const RAGGIO = 60
const SPESSORE = 22
const CIRCONFERENZA = 2 * Math.PI * RAGGIO

export default function AllocazioneDonut({ voci }: { voci: { nome: string; valore: number }[] }) {
  const totale = voci.reduce((s, v) => s + v.valore, 0)

  let cumulato = 0
  const archi = voci.map((v, i) => {
    const quota = totale > 0 ? v.valore / totale : 0
    const arco = {
      colore: COLORI[i % COLORI.length],
      lunghezza: quota * CIRCONFERENZA,
      offset: cumulato * CIRCONFERENZA,
      quota,
      nome: v.nome,
      valore: v.valore,
    }
    cumulato += quota
    return arco
  })

  return (
    <div className="flex flex-col items-center gap-5">
      <svg width={160} height={160} viewBox="0 0 160 160" className="flex-none -rotate-90">
        <circle cx={80} cy={80} r={RAGGIO} fill="none" stroke="var(--color-background)" strokeWidth={SPESSORE} />
        {archi.map((a, i) => (
          <circle
            key={i}
            cx={80}
            cy={80}
            r={RAGGIO}
            fill="none"
            stroke={a.colore}
            strokeWidth={SPESSORE}
            strokeDasharray={`${a.lunghezza} ${CIRCONFERENZA - a.lunghezza}`}
            strokeDashoffset={-a.offset}
          />
        ))}
        <text
          x={80}
          y={80}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={15}
          fontWeight={600}
          fill="var(--color-text)"
          className="rotate-90"
          style={{ transformOrigin: '80px 80px' }}
        >
          {fmtEur(totale)}
        </text>
      </svg>

      <div className="flex w-full min-w-0 flex-col gap-2">
        {archi.map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-[13px]">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: a.colore }} />
            <span className="min-w-0 flex-1 truncate">{a.nome}</span>
            <span className="flex-none font-medium">{fmtPct(a.quota * 100)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
