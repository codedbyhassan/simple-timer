import { Icon } from '@ui'

export const uid = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now().toString(36)}`
export const patientName = (patient) => patient ? `${patient.firstName} ${patient.lastName}` : 'Patient record'
export const patientFor = (data, id) => data.patients.find((patient) => patient.id === id)
export const money = (value) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(Number(value || 0))
export const balance = (invoice) => Math.max(0, Number(invoice.billed || 0) - Number(invoice.paid || 0))
export const dateLabel = (value) => value ? new Date(value).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
export const statusTone = (value) => value === 'Settled' || value === 'Reconciled' ? 'success' : value === 'Pending approval' ? 'warning' : value === 'Unpaid' ? 'critical' : 'info'

export function CashierNotice({ children, tone = 'info' }) {
  return children ? <div className={`hms-cashier__notice hms-cashier__notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}><Icon name={tone === 'error' ? 'alertTriangle' : tone === 'success' ? 'checkCircle' : 'info'} size={17} />{children}</div> : null
}
export function CashierError({ error }) { return error ? <CashierNotice tone="error">{error}</CashierNotice> : null }
export function CashierPanel({ title, description, actions, children, className = '' }) {
  return <section className={`hms-cashier__panel ${className}`}><header className="hms-cashier__panel-head"><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>{actions}</header>{children}</section>
}
export function CashierField({ label, value, onChange, options, ...props }) {
  return <label className="hms-cashier__field"><span>{label}</span>{options ? <select value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props}>{options.map((option) => <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>)}</select> : <input value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props} />}</label>
}
export function CashierEmpty({ children }) { return <div className="hms-cashier__empty"><Icon name="checkCircle" size={20} />{children}</div> }
