import { Link } from 'react-router-dom'
import { Icon, StatusBadge } from '@ui'

export const nameOf = (patient) => patient ? `${patient.firstName} ${patient.lastName}`.trim() : 'Patient record'
export const initials = (patient) => nameOf(patient).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
export const patientFor = (data, patientId) => data.patients.find((patient) => patient.id === patientId)
export const uid = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now().toString(36)}`
export const formatTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
export const formatDateTime = (value) => value ? new Date(value).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
export const elapsedMinutes = (value) => Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
export const elapsedLabel = (value) => {
  const minutes = elapsedMinutes(value)
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}
export const statusTone = (value) => ({
  'Waiting for triage': 'warning',
  Registered: 'info',
  'Waiting for clinician': 'accent',
  Priority: 'warning',
  Urgent: 'critical',
  Routine: 'neutral',
  Due: 'warning',
  Overdue: 'critical',
  Completed: 'success',
  'Awaiting bed': 'warning',
  Admitted: 'success',
  Preparing: 'info',
  Available: 'success',
  Occupied: 'accent',
  Reserved: 'warning',
  Cleaning: 'warning',
  'Out of service': 'critical',
}[value] || 'neutral')

export function NurseErrorNotice({ error }) {
  return error ? <div className="hms-nurse__notice hms-nurse__notice--error" role="alert"><Icon name="alertTriangle" size={17} />{error}</div> : null
}

export function NurseMessage({ children, tone = 'success' }) {
  return children ? <div className={`hms-nurse__notice hms-nurse__notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}><Icon name={tone === 'error' ? 'alertTriangle' : 'checkCircle'} size={17} />{children}</div> : null
}

export function NurseSearch({ value, onChange, placeholder = 'Search patient or record number' }) {
  return <label className="hms-nurse__search"><Icon name="search" size={17} /><input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />{value ? <button type="button" onClick={() => onChange('')} aria-label="Clear search"><Icon name="x" size={15} /></button> : null}</label>
}

export function NurseEmpty({ title, children }) {
  return <div className="hms-nurse__empty"><span><Icon name="checkCircle" size={21} /></span><strong>{title}</strong>{children ? <p>{children}</p> : null}</div>
}

export function NursePatientIdentity({ patient, secondary }) {
  return <div className="hms-nurse__identity"><span className="hms-nurse__avatar">{initials(patient)}</span><span><strong>{nameOf(patient)}</strong><small>{patient?.id}{secondary ? ` · ${secondary}` : ''}</small></span></div>
}

export function NurseField({ label, value, onChange, options, type = 'text', unit, hint, min, max, step = 'any', ...props }) {
  return <label className="hms-nurse__field"><span>{label}{unit ? <small>{unit}</small> : null}</span>{options ? <select value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props}>{options.map((option) => <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>)}</select> : <input type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} min={min} max={max} step={step} {...props} />}{hint ? <small className="hms-nurse__field-hint">{hint}</small> : null}</label>
}

export function NursePatientLink({ patientId, children, className = '' }) {
  return <Link className={className} to={`/patient/${encodeURIComponent(patientId || '')}`}>{children}</Link>
}

export function NurseTaskRow({ task, patient, onComplete, canUpdate }) {
  return <article className="hms-nurse__task-row"><span className="hms-nurse__task-icon"><Icon name={task.type.includes('Medication') ? 'pill' : task.type.includes('Vital') || task.type === 'Observation' ? 'heartPulse' : 'clipboardList'} size={17} /></span><span className="hms-nurse__task-copy"><strong>{task.type}</strong><small>{nameOf(patient)} · {task.note || 'No handover note'}</small><small>{task.status === 'Completed' ? `Completed ${formatTime(task.completedAt)}` : `Due ${formatTime(task.dueAt)}`}</small></span><StatusBadge tone={statusTone(task.status)}>{task.status}</StatusBadge>{task.status !== 'Completed' && canUpdate ? <button type="button" className="hms-nurse__button hms-nurse__button--quiet" onClick={() => onComplete(task)}>Complete</button> : null}</article>
}
