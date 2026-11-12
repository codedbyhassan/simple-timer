import './meter.css'

// Thin usage bar. tone: accent | critical | success | warning.
export default function Meter({ value, max = 100, tone = 'accent', label }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="hms-meter" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <span className={`hms-meter__fill hms-meter__fill--${tone}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
