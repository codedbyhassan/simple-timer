import './segmented.css'

// options: [{ value, label }]. Radio semantics, arrow-key navigation comes from native radios.
export default function SegmentedControl({ label, name, value, onChange, options }) {
  return (
    <div className="hms-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={o.value} className={`hms-seg__opt${value === o.value ? ' is-on' : ''}`}>
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  )
}
