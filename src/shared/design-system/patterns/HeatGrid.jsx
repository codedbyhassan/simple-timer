import './heatgrid.css'

// rows: ['08:00', ...], cols: ['Mon', ...], values: rows x cols of numbers. Shades scale to the largest value.
export default function HeatGrid({ rows, cols, values, unit = '', label }) {
  const max = Math.max(...values.flat(), 1)
  const level = (v) => (v === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)))
  return (
    <div className="hms-heat" role="table" aria-label={label}>
      <div className="hms-heat__row hms-heat__row--head" role="row">
        <span />
        {cols.map((c) => <span key={c} role="columnheader" className="hms-heat__col">{c}</span>)}
      </div>
      {rows.map((r, ri) => (
        <div key={r} className="hms-heat__row" role="row">
          <span role="rowheader" className="hms-heat__rowlabel">{r}</span>
          {cols.map((c, ci) => (
            <span key={c} role="cell" className={`hms-heat__cell hms-heat__cell--${level(values[ri][ci])}`} title={`${r}, ${c}: ${values[ri][ci]}${unit ? ` ${unit}` : ''}`} aria-label={`${values[ri][ci]}`} />
          ))}
        </div>
      ))}
    </div>
  )
}
