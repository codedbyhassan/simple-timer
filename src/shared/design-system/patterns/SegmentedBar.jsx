import './segmentedbar.css'

const TONES = { accent: 'var(--accent)', soft: 'var(--blue-300)', ink: 'var(--text)', muted: 'var(--border)' }

// segments: [{ label, value, tone }]
export default function SegmentedBar({ segments, label }) {
  const sum = segments.reduce((a, s) => a + s.value, 0) || 1
  return (
    <div className="hms-segbar" role="group" aria-label={label}>
      <div className="hms-segbar__bar">
        {segments.map((s) => <span key={s.label} className="hms-segbar__part" style={{ flexGrow: s.value, background: TONES[s.tone] || TONES.accent }} title={`${s.label}: ${s.value}`} />)}
      </div>
      <ul className="hms-segbar__legend">
        {segments.map((s) => (
          <li key={s.label}>
            <span className="hms-segbar__dot" style={{ background: TONES[s.tone] || TONES.accent }} />
            {s.label}
            <strong>{Math.round((s.value / sum) * 100)}%</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
