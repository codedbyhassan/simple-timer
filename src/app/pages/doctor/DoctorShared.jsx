import { Link } from 'react-router-dom'
import { Icon, StatusBadge } from '@ui'

export const uid = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now().toString(36)}`
export const patientFor = (data, id) => data.patients.find((patient) => patient.id === id)
export const personName = (patient) => patient ? `${patient.firstName} ${patient.lastName}`.trim() : 'Patient record'
export const ageLabel = (value) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}
export const dateTime = (value) => value ? new Date(value).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
export const priorityRank = (value) => value === 'Urgent' ? 0 : value === 'Priority' ? 1 : 2
export const statusTone = (value) => ({
  Urgent: 'critical', Priority: 'warning', Routine: 'neutral',
  'Waiting for triage': 'warning', 'Waiting for clinician': 'accent', 'In consultation': 'info',
  Investigations: 'warning', Admitted: 'success', Finalised: 'success', Verified: 'success',
  'Awaiting verification': 'warning', Critical: 'critical', Normal: 'success',
}[value] || 'neutral')

export function DoctorPanel({ title, description, actions, children, className = '' }) {
  return <section className={`hms-doctor__panel ${className}`}><header className="hms-doctor__panel-head"><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>{actions}</header>{children}</section>
}

export function DoctorNotice({ children, tone = 'info' }) {
  return children ? <div className={`hms-doctor__notice hms-doctor__notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}><Icon name={tone === 'error' ? 'alertTriangle' : tone === 'success' ? 'checkCircle' : 'info'} size={17} />{children}</div> : null
}

export function DoctorError({ error }) {
  return error ? <DoctorNotice tone="error">{error}</DoctorNotice> : null
}

export function DoctorEmpty({ title, children }) {
  return <div className="hms-doctor__empty"><Icon name="checkCircle" size={22} /><strong>{title}</strong>{children ? <p>{children}</p> : null}</div>
}

export function DoctorPatient({ patient, secondary }) {
  const initials = personName(patient).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'P'
  return <div className="hms-doctor__patient"><span className="hms-doctor__avatar">{initials}</span><span><strong>{personName(patient)}</strong><small>{patient?.id || 'Patient ID unavailable'}{secondary ? ` · ${secondary}` : ''}</small></span></div>
}

export function DoctorField({ label, value, onChange, options, hint, textarea = false, ...props }) {
  return <label className="hms-doctor__field"><span>{label}</span>{options ? <select value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props}>{options.map((option) => <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>)}</select> : textarea ? <textarea value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props} /> : <input value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props} />}{hint ? <small>{hint}</small> : null}</label>
}

export function DoctorMetric({ label, value, detail, icon, tone = '' }) {
  return <article className={`hms-doctor__metric${tone ? ` is-${tone}` : ''}`}><span className="hms-doctor__metric-icon"><Icon name={icon} size={19} /></span><span><small>{label}</small><strong>{value}</strong><em>{detail}</em></span></article>
}

export function EncounterLink({ entry, data, action = 'Open consultation' }) {
  const patient = patientFor(data, entry.patientId)
  return <article className="hms-doctor__encounter"><div className="hms-doctor__encounter-head"><DoctorPatient patient={patient} secondary={entry.department} /><StatusBadge tone={statusTone(entry.priority)}>{entry.priority || 'Routine'}</StatusBadge></div><p>{entry.reason || 'No presenting concern recorded'}</p><div className="hms-doctor__encounter-meta"><span><Icon name="clock" size={14} />{ageLabel(entry.arrivedAt)} waiting</span><span>{entry.triage?.recordedAt ? `Vitals recorded ${dateTime(entry.triage.recordedAt)}` : 'Triage summary unavailable'}</span></div>{entry.triage?.recordedAt ? <div className="hms-doctor__vitals">{[['BP', entry.triage.systolic && entry.triage.diastolic ? `${entry.triage.systolic}/${entry.triage.diastolic}` : '—'], ['Temp', entry.triage.temperature ? `${entry.triage.temperature}°C` : '—'], ['SpO₂', entry.triage.oxygenSaturation ? `${entry.triage.oxygenSaturation}%` : '—'], ['Pulse', entry.triage.pulse ? `${entry.triage.pulse} bpm` : '—']].map(([label, value]) => <span key={label}><small>{label}</small><strong>{value}</strong></span>)}</div> : null}<Link className="hms-doctor__button hms-doctor__button--quiet" to="/doctor/consultation" state={{ encounterId: entry.id }}>{action}<Icon name="arrowUpRight" size={15} /></Link></article>
}

export function claimGaps(draft, data) {
  const gaps = []
  if (!draft?.diagnosisCode) gaps.push('Add at least one coded ICD-10 diagnosis.')
  if ((draft?.procedures || []).some((procedure) => !procedure.diagnosisCode || !procedure.date)) gaps.push('Every procedure needs a diagnosis and date.')
  if (draft?.disposition === 'Refer' && (!draft.referralFacility?.trim() || !draft.referralReason?.trim())) gaps.push('Add the referral facility and reason.')
  const pending = data.lab.orders.filter((order) => order.encounterId === draft?.encounterId && order.status !== 'Verified')
  if (pending.length) gaps.push(`${pending.length} investigation${pending.length === 1 ? '' : 's'} still awaiting verified results.`)
  if ((draft?.prescriptions || []).some((item) => !item.medicineId && !item.freeText)) gaps.push('Complete or remove unfinished prescription items.')
  if (!draft?.disposition) gaps.push('Record the encounter disposition.')
  return gaps
}
