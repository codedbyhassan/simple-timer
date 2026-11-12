import { Link } from 'react-router-dom'

import { Icon, StatusBadge } from '@ui'

import { TODAY } from './receptionData.js'

export { TODAY }



export const activeQueueStages = new Set(['Registered', 'Waiting for triage', 'Waiting for clinician', 'Investigations', 'In consultation', 'Pharmacy / billing'])

export const STATUS_TONE = { Expected: 'info', Arrived: 'success', 'No-show': 'warning', Cancelled: 'neutral', Completed: 'neutral', Unpaid: 'critical', 'Part-paid': 'warning', Settled: 'success', 'Waiting for triage': 'warning', 'Waiting for clinician': 'info', Investigations: 'accent', 'In consultation': 'accent', Registered: 'info', 'Pharmacy / billing': 'warning' }

export const uid = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now().toString(36)}`

export const nameOf = (patient) => patient ? `${patient.firstName} ${patient.lastName}`.trim() : 'Unknown patient'

export const fullName = (patient) => [patient?.firstName, patient?.lastName].filter(Boolean).join(' ')

export const initials = (patient) => fullName(patient).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

export const patientFor = (data, patientId) => data.patients.find((patient) => patient.id === patientId)

export const money = (amount) => `GHS ${Number(amount || 0).toFixed(2)}`

export const formatDate = (date) => date ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not recorded'

export const ageOf = (date) => date ? Math.max(0, Math.floor((Date.now() - new Date(`${date}T12:00:00`).getTime()) / 31_557_600_000)) : null

export const formatElapsed = (startedAt) => {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60_000))
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export const elapsedMinutes = (startedAt) => Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60_000))

export const statusTone = (status) => STATUS_TONE[status] || 'neutral'

export const patientPath = (id) => `/reception/patients/${encodeURIComponent(id)}`



export function ErrorNotice({ error }) {
  return error ? <div className="hms-reception__notice hms-reception__notice--error" role="alert"><Icon name="alertTriangle" size={17} />{error}</div> : null
}

export function SearchField({ value, onChange, placeholder = 'Search patients by name, phone or record number', autoFocus = false }) {
  return (
    <label className="hms-reception__search">
      <Icon name="search" size={18} />
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoFocus={autoFocus} />
      {value ? <button type="button" onClick={() => onChange('')} aria-label="Clear search"><Icon name="x" size={15} /></button> : null}
    </label>
  )
}

export function EmptyResult({ icon = 'search', title, children }) {
  return <div className="hms-reception__empty"><span><Icon name={icon} size={20} /></span><strong>{title}</strong>{children ? <p>{children}</p> : null}</div>
}

export function PatientIdentity({ patient }) {
  return (
    <div className="hms-reception__identity">
      <span className="hms-reception__avatar">{initials(patient)}</span>
      <span><strong>{nameOf(patient)}</strong><small>{patient.id} · {patient.sex || 'Sex not recorded'}{ageOf(patient.dateOfBirth) !== null ? ` · ${ageOf(patient.dateOfBirth)} yrs` : ''}</small></span>
    </div>
  )
}

export function AppointmentLine({ appointment, patient, onCheckIn, canCheckIn, onNoShow, compact = false }) {
  return (
    <article className={`hms-reception__appointment${compact ? ' hms-reception__appointment--compact' : ''}`}>
      <time className="hms-reception__appointment-time">{appointment.time}</time>
      <div className="hms-reception__appointment-body">
        <div className="hms-reception__appointment-title"><Link to={patientPath(patient?.id)}>{nameOf(patient)}</Link><StatusBadge tone={statusTone(appointment.status)}>{appointment.status}</StatusBadge></div>
        <p>{appointment.department} <span>·</span> {appointment.reason}</p>
        {!compact && appointment.provider ? <small>{appointment.provider}</small> : null}
      </div>
      {appointment.status === 'Expected' && canCheckIn ? <div className="hms-reception__appointment-actions"><button type="button" className="hms-reception__button hms-reception__button--primary" onClick={() => onCheckIn(appointment)}><Icon name="check" size={15} />Check in</button>{onNoShow ? <button type="button" className="hms-reception__button hms-reception__button--quiet" onClick={() => onNoShow(appointment)} aria-label={`Mark ${nameOf(patient)} as no-show`}>No-show</button> : null}</div> : null}
    </article>
  )
}

export function createCheckIn(data, patientId, details = {}, appointmentId = '') {
  const patient = patientFor(data, patientId)
  if (!patient) return { error: 'Select a patient record before checking in.' }
  const existing = data.queue.find((item) => item.patientId === patientId && activeQueueStages.has(item.stage))
  const appointments = data.appointments.map((item) => item.id === appointmentId ? { ...item, status: 'Arrived' } : item)
  if (existing) return { data: { ...data, appointments }, message: `${nameOf(patient)} is already on the OPD queue.` }
  const queueEntry = {
    id: uid('ENC'),
    patientId,
    department: details.department || data.appointments.find((item) => item.id === appointmentId)?.department || 'General medicine',
    reason: details.reason || data.appointments.find((item) => item.id === appointmentId)?.reason || 'Walk-in consultation',
    stage: 'Registered',
    arrivedAt: new Date().toISOString(),
    priority: 'Routine',
    appointmentId,
  }
  return {
    data: {
      ...data,
      appointments,
      queue: [queueEntry, ...data.queue],
      patients: data.patients.map((item) => item.id === patientId ? { ...item, lastVisit: TODAY } : item),
    },
    message: `${nameOf(patient)} checked in and added to the OPD queue.`,
  }
}

export function FormField({ label, value, onChange, type = 'text', options, required = false, hint, ...props }) {
  return (
    <label className="hms-reception__field">
      <span>{label}{required ? <b aria-hidden="true"> *</b> : null}</span>
      {options ? <select required={required} value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props}>{options.map((option) => <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>)}</select> : <input required={required} type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props} />}
      {hint ? <small>{hint}</small> : null}
    </label>
  )
}

export function stageClass(stage) {
  if (stage === 'Registered') return 'registered'
  if (stage.includes('triage')) return 'triage'
  if (stage.includes('clinician')) return 'clinician'
  if (stage === 'In consultation') return 'consultation'
  if (stage === 'Investigations') return 'investigations'
  return 'billing'
}

export function getClaimGaps(patient) {
  const gaps = []
  if (!patient.phone?.trim()) gaps.push({ label: 'Contact number missing', severity: 'Needs attention' })
  if (!patient.dateOfBirth) gaps.push({ label: 'Date of birth missing', severity: 'Needs attention' })
  if (patient.coverage === 'NHIS') {
    if (!patient.memberNumber) gaps.push({ label: 'NHIS membership number missing', severity: 'High priority' })
    else if (!/^\d{8}(\d{2})?$/.test(patient.memberNumber)) gaps.push({ label: 'NHIS number format is invalid', severity: 'High priority' })
    if (!patient.expiry) gaps.push({ label: 'NHIS expiry date missing', severity: 'Needs attention' })
    else if (new Date(`${patient.expiry}T23:59:59`) < new Date()) gaps.push({ label: 'NHIS membership expired', severity: 'High priority' })
    if (patient.dependent && !patient.principalName?.trim()) gaps.push({ label: 'Principal member details missing', severity: 'High priority' })
  }
  if (!patient.nextOfKin?.trim()) gaps.push({ label: 'Next of kin not recorded', severity: 'Review' })
  return gaps
}
