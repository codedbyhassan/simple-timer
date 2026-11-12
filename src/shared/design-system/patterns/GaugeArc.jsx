import './gaugearc.css'

const TONES = { accent: 'var(--accent)', soft: 'var(--blue-300)', ink: 'var(--text)', muted: 'var(--border-strong)' }
const R = 96
const CX = 120
const CY = 118
const point = (deg) => [CX + R * Math.cos((deg * Math.PI) / 180), CY - R * Math.sin((deg * Math.PI) / 180)]

// segments: [{ label, value, tone }]. Draws a half circle from left to right.
export default function GaugeArc({ segments, total, caption, unit = '' }) {
  const sum = segments.reduce((a, s) => a + s.value, 0) || 1
  const gap = 2.4
  // Each segment starts where the previous one ended.
  const sweeps = segments.map((s) => (s.value / sum) * 180)
  const arcs = segments.map((s, i) => {
    const from = 180 - sweeps.slice(0, i).reduce((a, b) => a + b, 0)
    const a0 = from - gap / 2
    const a1 = from - sweeps[i] + gap / 2
    const [x0, y0] = point(a0)
    const [x1, y1] = point(a1)
    return { ...s, d: `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`, pct: Math.round((s.value / sum) * 100) }
  })
  return (
    <div className="hms-gauge">
      <svg viewBox="0 0 240 136" role="img" aria-label={`${total} ${caption}. ${arcs.map((a) => `${a.label} ${a.pct}%`).join(', ')}`}>
        {arcs.map((a) => <path key={a.label} d={a.d} fill="none" stroke={TONES[a.tone] || TONES.accent} strokeWidth="30" strokeLinecap="butt" />)}
        <text x={CX} y={CY - 18} textAnchor="middle" className="hms-gauge__num">{total}{unit}</text>
        <text x={CX} y={CY + 2} textAnchor="middle" className="hms-gauge__cap">{caption}</text>
      </svg>
      <ul className="hms-gauge__legend">
        {arcs.map((a) => (
          <li key={a.label}><span className="hms-gauge__dot" style={{ background: TONES[a.tone] || TONES.accent }} />{a.label}<strong>{a.pct}%</strong></li>
        ))}
      </ul>
    </div>
  )
}
