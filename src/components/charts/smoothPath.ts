// Curva morbida attraverso una serie di punti: spline di Catmull-Rom convertita
// in bezier cubiche, passa esattamente per ogni punto reale (a differenza di
// una quadratica col punto medio come destinazione, che passa solo vicino).
// Condivisa da AndamentoChart e ConfrontoBenchmarkChart.
export function smoothPath(punti: { x: number; y: number }[]): string {
  if (punti.length === 0) return ''
  if (punti.length < 3) return punti.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  let d = `M${punti[0].x},${punti[0].y}`
  for (let i = 0; i < punti.length - 1; i++) {
    const p0 = punti[i - 1] ?? punti[i]
    const p1 = punti[i]
    const p2 = punti[i + 1]
    const p3 = punti[i + 2] ?? p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }
  return d
}
