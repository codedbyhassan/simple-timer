import { useState } from 'react'
import './pillbarchart.css'

// data: [{ label, value }]. The tallest bar is highlighted until another one is hovered or focused.
export default function PillBarChart({ data, unit = '', height = 190, label }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const top = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0)
  const [hover, setHover] = useState(null)
  const active = hover ?? top
  return (
    <div className="hms-pills" role="group" aria-label={label} style={{ height }}>
      {data.map((d, i) => (
        <button
          key={d.label}
          type="button"
          className={`hms-pills__col${i === active ? ' is-active' : ''}`}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(null)}
          aria-label={`${d.label}: ${d.value}${unit ? ` ${unit}` : ''}`}
        >
          <span className="hms-pills__track">
            {i === active ? <span className="hms-pills__tip">{d.value}{unit ? ` ${unit}` : ''}</span> : null}
            <span className="hms-pills__bar" style={{ height: `${Math.max(8, (d.value / max) * 100)}%` }} />
          </span>
          <span className="hms-pills__label">{d.label}</span>
        </button>
      ))}
    </div>
  )
}
