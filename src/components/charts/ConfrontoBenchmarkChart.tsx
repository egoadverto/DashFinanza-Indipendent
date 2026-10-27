import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { fmtMese, fmtNum } from '../../lib/format'
import { smoothPath } from './smoothPath'

// right più largo del solito: vedi AndamentoChart, stesso bug con
// l'etichetta del mese finale tagliata sul bordo della card.
const PADDING = { top: 16, right: 34, bottom: 28, left: 40 }
// Stessa riduzione dell'85% di AndamentoChart, per coerenza tra i due grafici.
const FATTORE_ALTEZZA = 0.85

export interface SerieConfronto {
  nome: string
  colore: string
  punti: (number | null)[]
}

export default function ConfrontoBenchmarkChart({ mesi, serie }: { mesi: string[]; serie: SerieConfronto[] }) {
  const [indiceHover, setIndiceHover] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Stessa logica di AndamentoChart: misura lo spazio reale della card
  // invece di un viewBox fisso, per non deformare né lasciare vuoti.
  const [dim, setDim] = useState({ w: 560, h: 220 })

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) setDim({ w: rect.width, h: rect.height })
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setDim({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const LARGHEZZA = dim.w
  const ALTEZZA = dim.h * FATTORE_ALTEZZA

  const { linee, xs, yMin, yMax } = useMemo(() => {
    const valori = serie.flatMap((s) => s.punti.filter((v): v is number => v != null))
    const min = valori.length ? Math.min(...valori, 100) : 95
    const max = valori.length ? Math.max(...valori, 100) : 105
    const margine = (max - min) * 0.1 || 5
    const yMin = min - margine
    const yMax = max + margine

    const larghezzaUtile = LARGHEZZA - PADDING.left - PADDING.right
    const altezzaUtile = ALTEZZA - PADDING.top - PADDING.bottom
    const x = (i: number) => PADDING.left + (mesi.length <= 1 ? larghezzaUtile / 2 : (i / (mesi.length - 1)) * larghezzaUtile)
    const y = (v: number) => PADDING.top + altezzaUtile - ((v - yMin) / (yMax - yMin)) * altezzaUtile

    const xs = mesi.map((_, i) => x(i))
    const linee = serie.map((s) => {
      const puntiValidi = s.punti
        .map((v, i) => (v == null ? null : { x: x(i), y: y(v) }))
        .filter((p): p is { x: number; y: number } => p != null)
      return { ...s, path: smoothPath(puntiValidi), ultimo: puntiValidi[puntiValidi.length - 1] ?? null }
    })

    return { linee, xs, yMin, yMax }
  }, [mesi, serie, LARGHEZZA, ALTEZZA])

  if (mesi.length === 0) {
    return <div className="flex h-48 items-center justify-center text-sm text-text-tertiary">Nessun dato ancora.</div>
  }

  const ticksY = [0, 0.25, 0.5, 0.75, 1].map((f) => yMin + (yMax - yMin) * f)
  const passoLabelX = Math.max(1, Math.ceil(mesi.length / 6))

  function onMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const xRel = ((e.clientX - rect.left) / rect.width) * LARGHEZZA
    let piuVicino = 0
    let distanzaMin = Infinity
    xs.forEach((x, i) => {
      const d = Math.abs(x - xRel)
      if (d < distanzaMin) {
        distanzaMin = d
        piuVicino = i
      }
    })
    setIndiceHover(piuVicino)
  }

  return (
    <div ref={containerRef} className="relative flex h-full flex-col justify-center">
      <svg viewBox={`0 0 ${LARGHEZZA} ${ALTEZZA}`} className="w-full" style={{ height: ALTEZZA, display: 'block' }}>
        {ticksY.map((v, i) => {
          const yPos = PADDING.top + (ALTEZZA - PADDING.top - PADDING.bottom) * (1 - i / 4)
          return (
            <g key={i}>
              <line x1={PADDING.left} y1={yPos} x2={LARGHEZZA - PADDING.right} y2={yPos} stroke="var(--color-border-soft)" strokeWidth={1} />
              <text
                x={PADDING.left - 6}
                y={yPos + 4}
                textAnchor="end"
                fontFamily="var(--font-display)"
                fontSize={13}
                fill="var(--color-text-tertiary)"
              >
                {fmtNum(v, 0)}
              </text>
            </g>
          )
        })}

        {mesi.map((mese, i) =>
          i % passoLabelX === 0 ? (
            <text
              key={mese}
              x={xs[i]}
              y={ALTEZZA - 8}
              textAnchor="middle"
              fontFamily="var(--font-sans)"
              fontSize={13}
              fill="var(--color-text-tertiary)"
            >
              {fmtMese(mese)}
            </text>
          ) : null,
        )}

        {linee.map((l, i) => (
          <path
            key={l.nome}
            d={l.path}
            fill="none"
            stroke={l.colore}
            strokeWidth={i === 0 ? 3 : 2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {linee.map(
          (l, i) =>
            l.ultimo && (
              <circle
                key={l.nome}
                cx={l.ultimo.x}
                cy={l.ultimo.y}
                r={i === 0 ? 5.5 : 4.5}
                fill={l.colore}
                stroke="var(--color-surface)"
                strokeWidth={2}
              />
            ),
        )}

        {indiceHover != null && (
          <line
            x1={xs[indiceHover]}
            y1={PADDING.top}
            x2={xs[indiceHover]}
            y2={ALTEZZA - PADDING.bottom}
            stroke="var(--color-border-soft)"
            strokeWidth={1}
          />
        )}
        {indiceHover != null &&
          linee.map((l) => {
            const v = l.punti[indiceHover]
            if (v == null) return null
            const yPos = PADDING.top + (ALTEZZA - PADDING.top - PADDING.bottom) * (1 - (v - yMin) / (yMax - yMin))
            return <circle key={l.nome} cx={xs[indiceHover]} cy={yPos} r={3.5} fill={l.colore} />
          })}

        <rect
          x={PADDING.left}
          y={PADDING.top}
          width={LARGHEZZA - PADDING.left - PADDING.right}
          height={ALTEZZA - PADDING.top - PADDING.bottom}
          fill="transparent"
          onMouseMove={onMove}
          onMouseLeave={() => setIndiceHover(null)}
        />
      </svg>

      {indiceHover != null && (
        <div
          className="pointer-events-none absolute top-2 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-2 text-[12px] shadow-lg"
          style={{ left: `${(xs[indiceHover] / LARGHEZZA) * 100}%`, transform: 'translateX(-50%)' }}
        >
          <div className="mb-1 font-medium">{fmtMese(mesi[indiceHover])}</div>
          {linee.map((l) => {
            const v = l.punti[indiceHover]
            return (
              <div key={l.nome} className="flex items-center gap-1.5">
                <span className="h-2 w-2 flex-none rounded-full" style={{ background: l.colore }} />
                <span className="min-w-0 truncate">{l.nome}</span>
                <span className="ml-auto flex-none font-medium">{v == null ? '—' : fmtNum(v)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
