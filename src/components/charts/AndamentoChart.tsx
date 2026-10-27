import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PuntoAndamento } from '../../lib/andamento'
import { fmtEur, fmtMese, fmtNum } from '../../lib/format'
import { smoothPath } from './smoothPath'

// right più largo del solito: l'etichetta del mese sull'ultimo punto è
// centrata su di esso, e un margine di 16px non bastava a contenerla senza
// tagliarla sul bordo della card (bug reale, visto su schermi stretti).
const PADDING = { top: 16, right: 34, bottom: 28, left: 48 }
// Il disegno usa tutta la larghezza disponibile ma solo l'85% dell'altezza:
// il resto resta vuoto sotto il grafico, su richiesta esplicita dell'utente.
const FATTORE_ALTEZZA = 0.85

export default function AndamentoChart({ punti }: { punti: PuntoAndamento[] }) {
  const [indiceHover, setIndiceHover] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Il grafico misura lo spazio reale della card (ResizeObserver) invece di
  // usare un viewBox fisso: evita sia la deformazione di preserveAspectRatio
  // "none" sia lo spazio vuoto di "meet" quando il rapporto larghezza/altezza
  // della card non coincide con quello del disegno.
  const [dim, setDim] = useState({ w: 760, h: 260 })

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    // Misura subito (getBoundingClientRect gira nel commit di React, non
    // aspetta il primo giro di ResizeObserver): evita un frame iniziale con
    // le proporzioni sbagliate prima che l'observer scatti.
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

  const { pathValore, pathVersato, pathBanda, puntiXY, yMin, yMax } = useMemo(() => {
    if (punti.length === 0) {
      return { pathValore: '', pathVersato: '', pathBanda: '', puntiXY: [], yMin: 0, yMax: 1 }
    }
    const valori = punti.flatMap((p) => [p.valore, p.versato])
    const min = Math.min(...valori)
    const max = Math.max(...valori)
    const margine = (max - min) * 0.1 || max * 0.1 || 1
    const yMin = Math.max(0, min - margine)
    const yMax = max + margine

    const larghezzaUtile = LARGHEZZA - PADDING.left - PADDING.right
    const altezzaUtile = ALTEZZA - PADDING.top - PADDING.bottom
    const x = (i: number) => PADDING.left + (punti.length === 1 ? larghezzaUtile / 2 : (i / (punti.length - 1)) * larghezzaUtile)
    const y = (v: number) => PADDING.top + altezzaUtile - ((v - yMin) / (yMax - yMin)) * altezzaUtile

    const puntiXY = punti.map((p, i) => ({ x: x(i), yValore: y(p.valore), yVersato: y(p.versato), dato: p }))

    const pathValore = smoothPath(puntiXY.map((p) => ({ x: p.x, y: p.yValore })))
    const pathVersato = smoothPath(puntiXY.map((p) => ({ x: p.x, y: p.yVersato })))
    // Il riempimento scende fino all'asse orizzontale (come nel mockup), non
    // solo fino alla linea del versato: altrimenti l'area colorata è troppo
    // sottile ovunque le due linee si avvicinano.
    const baseline = PADDING.top + altezzaUtile
    const primo = puntiXY[0]
    const ultimoPunto = puntiXY[puntiXY.length - 1]
    const pathBanda = `${pathValore} L${ultimoPunto.x},${baseline} L${primo.x},${baseline} Z`

    return { pathValore, pathVersato, pathBanda, puntiXY, yMin, yMax }
  }, [punti, LARGHEZZA, ALTEZZA])

  if (punti.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-text-tertiary">Nessun dato ancora.</div>
  }

  const ticksY = [0, 0.25, 0.5, 0.75, 1].map((f) => yMin + (yMax - yMin) * f)
  const passoLabelX = Math.max(1, Math.ceil(punti.length / 8))

  function onMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const xRel = ((e.clientX - rect.left) / rect.width) * LARGHEZZA
    let piuVicino = 0
    let distanzaMin = Infinity
    puntiXY.forEach((p, i) => {
      const d = Math.abs(p.x - xRel)
      if (d < distanzaMin) {
        distanzaMin = d
        piuVicino = i
      }
    })
    setIndiceHover(piuVicino)
  }

  const hover = indiceHover != null ? puntiXY[indiceHover] : null
  const ultimo = puntiXY[puntiXY.length - 1]

  return (
    <div className="flex h-full flex-col">
      <div ref={containerRef} className="relative flex min-h-0 flex-1 flex-col justify-center">
      <svg viewBox={`0 0 ${LARGHEZZA} ${ALTEZZA}`} className="w-full" style={{ height: ALTEZZA, display: 'block' }}>
        <defs>
          <linearGradient id="andamentoFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {ticksY.map((v, i) => {
          const yPos = PADDING.top + (ALTEZZA - PADDING.top - PADDING.bottom) * (1 - i / 4)
          return (
            <g key={i}>
              <line x1={PADDING.left} y1={yPos} x2={LARGHEZZA - PADDING.right} y2={yPos} stroke="var(--color-border-soft)" strokeWidth={1} />
              <text
                x={PADDING.left - 8}
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

        {puntiXY.map((p, i) =>
          i % passoLabelX === 0 ? (
            <text
              key={i}
              x={p.x}
              y={ALTEZZA - 8}
              textAnchor="middle"
              fontFamily="var(--font-sans)"
              fontSize={13}
              fill="var(--color-text-tertiary)"
            >
              {fmtMese(p.dato.mese)}
            </text>
          ) : null,
        )}

        <path d={pathBanda} fill="url(#andamentoFill)" stroke="none" />
        <path d={pathVersato} fill="none" stroke="var(--color-chart-7)" strokeWidth={1.75} strokeDasharray="5 5" strokeLinecap="round" />
        <path d={pathValore} fill="none" stroke="var(--color-primary)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={ultimo.x} cy={ultimo.yValore} r={6} fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth={2.5} />
        <text
          x={ultimo.x - 8}
          y={Math.max(14, ultimo.yValore - 10)}
          textAnchor="end"
          fontFamily="var(--font-display)"
          fontSize={15}
          fontWeight={600}
          fill="var(--color-primary)"
        >
          {fmtEur(ultimo.dato.valore)}
        </text>

        {hover && (
          <line x1={hover.x} y1={PADDING.top} x2={hover.x} y2={ALTEZZA - PADDING.bottom} stroke="var(--color-border-soft)" strokeWidth={1} />
        )}
        {hover && <circle cx={hover.x} cy={hover.yValore} r={4} fill="var(--color-primary)" />}
        {hover && <circle cx={hover.x} cy={hover.yVersato} r={4} fill="var(--color-chart-7)" />}

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

      {hover && (
        <div
          className="pointer-events-none absolute top-2 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-2 text-[12px] shadow-lg"
          style={{ left: `${(hover.x / LARGHEZZA) * 100}%`, transform: 'translateX(-50%)' }}
        >
          <div className="mb-1 font-medium">{fmtMese(hover.dato.mese)}</div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-primary)' }} />
            Valore {fmtEur(hover.dato.valore)}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-chart-7)' }} />
            Versato {fmtEur(hover.dato.versato)}
          </div>
        </div>
      )}
    </div>

      <div className="mt-[14px] flex flex-none items-center gap-[22px] text-[12px] text-text-secondary">
        <div className="flex items-center gap-[7px]">
          <span className="h-[3px] w-[14px] rounded-[2px]" style={{ background: 'var(--color-primary)' }} />
          Valore attuale
        </div>
        <div className="flex items-center gap-[7px]">
          <span className="h-0 w-[14px] border-t-2 border-dashed" style={{ borderColor: 'var(--color-chart-7)' }} />
          Capitale versato
        </div>
      </div>
    </div>
  )
}
