import { Icon } from '@ui'

export const uid = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now().toString(36)}`
export const patientFor = (data, id) => data.patients.find((patient) => patient.id === id)
export const patientName = (patient) => patient ? `${patient.firstName} ${patient.lastName}` : 'Patient record'
export const money = (value) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(Number(value || 0))
export const dateLabel = (value) => value ? new Date(value).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
export const statusTone = (value) => ({ Ready: 'success', Exported: 'info', 'Import passed': 'success', Warned: 'warning', Failed: 'critical', 'Not ready': 'warning', Unmapped: 'critical', Mapped: 'success' }[value] || 'neutral')
export const escapeXml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')

export function ClaimsNotice({ children, tone = 'info' }) {
  return children ? <div className={`hms-claims__notice hms-claims__notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}><Icon name={tone === 'error' ? 'alertTriangle' : tone === 'success' ? 'checkCircle' : 'info'} size={17} />{children}</div> : null
}
export function ClaimsError({ error }) { return error ? <ClaimsNotice tone="error">{error}</ClaimsNotice> : null }
export function ClaimsPanel({ title, description, actions, children, className = '' }) {
  return <section className={`hms-claims__panel ${className}`}><header className="hms-claims__panel-head"><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>{actions}</header>{children}</section>
}
export function ClaimsField({ label, value, onChange, options, ...props }) {
  return <label className="hms-claims__field"><span>{label}</span>{options ? <select value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props}>{options.map((option) => <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>)}</select> : <input value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props} />}</label>
}
export function ClaimsEmpty({ children }) { return <div className="hms-claims__empty"><Icon name="checkCircle" size={20} />{children}</div> }
