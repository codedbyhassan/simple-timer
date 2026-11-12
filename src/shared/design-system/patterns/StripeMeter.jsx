import './stripemeter.css'

const TONES = { accent: 'var(--accent)', soft: 'var(--blue-300)', ink: 'var(--text)' }

// groups: [{ label, count, tone }]. One thin pill per unit, grouped by colour.
export default function StripeMeter({ groups, label }) {
  return (
    <div className="hms-stripes" role="group" aria-label={label}>
      <div className="hms-stripes__heads">
        {groups.map((g) => <span key={g.label} style={{ flexGrow: g.count }}><strong>{g.count}</strong> {g.label}</span>)}
      </div>
      <div className="hms-stripes__row">
        {groups.flatMap((g) => Array.from({ length: g.count }, (_, i) => <span key={`${g.label}-${i}`} className="hms-stripes__pill" style={{ background: TONES[g.tone] || TONES.accent }} />))}
      </div>
    </div>
  )
}
