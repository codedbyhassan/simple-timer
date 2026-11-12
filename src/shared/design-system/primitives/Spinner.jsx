import './spinner.css'

export default function Spinner({ size = 18, label }) {
  return (
    <span className="hms-spinner" style={{ width: size, height: size }} role={label ? 'status' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />
  )
}
