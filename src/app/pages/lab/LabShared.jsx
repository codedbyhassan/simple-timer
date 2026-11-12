import { Icon, StatusBadge } from '@ui'

export const uid = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10)}`
export const patientFor = (data, patientId) => data.patients.find((patient) => patient.id === patientId)
export const testFor = (data, testId) => data.lab.catalogue.find((test) => test.id === testId)
export const specimenFor = (data, orderId) => data.lab.specimens.find((specimen) => specimen.orderId === orderId)
export const nameOf = (patient) => patient ? `${patient.firstName} ${patient.lastName}`.trim() : 'Patient record'
export const elapsed = (value) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}
export const isOverdue = (order, test) => order.status !== 'Verified'
  && Date.now() - new Date(order.orderedAt).getTime() > (test?.turnaroundHours || 4) * 3_600_000
export const dateTime = (value) => value ? new Date(value).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
export const dateOnly = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
export const onHand = (data, stockId) => data.lab.stock.find((item) => item.id === stockId)?.quantity || 0
export const tone = (value) => ({
  Ordered: 'neutral', Collected: 'info', Received: 'accent', 'In process': 'warning',
  'Awaiting verification': 'warning', Verified: 'success', Rejected: 'critical',
  Routine: 'neutral', Priority: 'warning', Urgent: 'critical',
  High: 'warning', Low: 'warning', Critical: 'critical', Normal: 'success',
  Receipt: 'success', Issue: 'accent', Adjustment: 'warning',
}[value] || 'neutral')
export const resultFlag = (component, value) => {
  if (component.options) return ''
  if (value === '' || !Number.isFinite(Number(value))) return ''
  const result = Number(value)
  if ((component.criticalLow !== undefined && result < component.criticalLow) || (component.criticalHigh !== undefined && result > component.criticalHigh)) return 'Critical'
  if ((component.low !== undefined && result < component.low) || (component.high !== undefined && result > component.high)) return result < component.low ? 'Low' : 'High'
  return 'Normal'
}

export function LabPanel({ title, description, actions, children, className = '' }) {
  return <section className={`hms-lab__panel ${className}`}><header className="hms-lab__panel-head"><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>{actions}</header>{children}</section>
}

export function LabNotice({ children, tone: variant = 'info' }) {
  return children ? <div className={`hms-lab__notice hms-lab__notice--${variant}`} role={variant === 'error' ? 'alert' : 'status'}><Icon name={variant === 'error' ? 'alertTriangle' : variant === 'success' ? 'checkCircle' : variant === 'warning' ? 'alertTriangle' : 'info'} size={17} />{children}</div> : null
}

export function LabError({ error }) {
  return error ? <LabNotice tone="error">{error}</LabNotice> : null
}

export function LabEmpty({ title, children }) {
  return <div className="hms-lab__empty"><Icon name="checkCircle" size={22} /><strong>{title}</strong>{children ? <p>{children}</p> : null}</div>
}

export function LabPatient({ patient, secondary }) {
  return <div className="hms-lab__patient"><span className="hms-lab__avatar">{nameOf(patient).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'P'}</span><span><strong>{nameOf(patient)}</strong><small>{patient?.id || 'Patient ID unavailable'}{secondary ? ` · ${secondary}` : ''}</small></span></div>
}

export function LabField({ label, value, onChange, options, hint, ...props }) {
  return <label className="hms-lab__field"><span>{label}</span>{options ? <select value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props}>{options.map((option) => <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>)}</select> : <input value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props} />}{hint ? <small>{hint}</small> : null}</label>
}

export function LabStatus({ children }) {
  return <StatusBadge tone={tone(children)}>{children}</StatusBadge>
}
