import { Link } from 'react-router-dom'
import { Icon, StatusBadge } from '@ui'

export const uid = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10)}`
export const patientFor = (data, patientId) => data.patients.find((patient) => patient.id === patientId)
export const medicineFor = (data, medicineId) => data.pharmacy.medicines.find((medicine) => medicine.id === medicineId)
export const batchesFor = (data, medicineId) => data.pharmacy.batches
  .filter((batch) => batch.medicineId === medicineId && batch.quantity > 0 && batch.expiresAt >= new Date().toISOString().slice(0, 10))
  .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
export const onHand = (data, medicineId) => data.pharmacy.batches
  .filter((batch) => batch.medicineId === medicineId)
  .reduce((sum, batch) => sum + batch.quantity, 0)
export const availableQuantity = (data, medicineId) => batchesFor(data, medicineId)
  .reduce((sum, batch) => sum + batch.quantity, 0)
export const personName = (patient) => patient ? `${patient.firstName} ${patient.lastName}`.trim() : 'Patient record'
export const when = (value) => value ? new Date(value).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
export const day = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
export const ageLabel = (value) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}
export const money = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(Number(value) || 0)
export const statusTone = (value) => ({
  New: 'warning', 'In progress': 'info', Partial: 'warning', Dispensed: 'success',
  Priority: 'warning', Urgent: 'critical', Routine: 'neutral',
  Receipt: 'success', Dispense: 'accent', Adjustment: 'warning',
}[value] || 'neutral')

export function PharmacyPanel({ title, description, actions, children, className = '' }) {
  return <section className={`hms-pharmacy__panel ${className}`}><header className="hms-pharmacy__panel-head"><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>{actions}</header>{children}</section>
}

export function PharmacyNotice({ children, tone = 'info' }) {
  return children ? <div className={`hms-pharmacy__notice hms-pharmacy__notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}><Icon name={tone === 'error' ? 'alertTriangle' : tone === 'success' ? 'checkCircle' : 'info'} size={17} />{children}</div> : null
}

export function PharmacyError({ error }) {
  return error ? <PharmacyNotice tone="error">{error}</PharmacyNotice> : null
}

export function PharmacyPatient({ patient, secondary }) {
  return <div className="hms-pharmacy__patient"><span className="hms-pharmacy__avatar">{personName(patient).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'P'}</span><span><strong>{personName(patient)}</strong><small>{patient?.id || 'Patient ID unavailable'}{secondary ? ` · ${secondary}` : ''}</small></span></div>
}

export function PharmacyField({ label, value, onChange, options, hint, ...props }) {
  return <label className="hms-pharmacy__field"><span>{label}</span>{options ? <select value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props}>{options.map((option) => <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>)}</select> : <input value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props} />}{hint ? <small>{hint}</small> : null}</label>
}

export function PharmacyEmpty({ title, children }) {
  return <div className="hms-pharmacy__empty"><Icon name="checkCircle" size={22} /><strong>{title}</strong>{children ? <p>{children}</p> : null}</div>
}

export function PharmacyMenuLink({ to, children }) {
  return <Link className="hms-pharmacy__link" to={to}>{children}<Icon name="chevronDown" size={15} /></Link>
}

export function RxStatus({ status }) {
  return <StatusBadge tone={statusTone(status)}>{status}</StatusBadge>
}
