import { useMemo, useState, useSyncExternalStore } from 'react'
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  HeartPulse,
  Search,
  ShieldAlert,
  Stethoscope,
  Thermometer,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { getAppointments, subscribeToAppointments, updateAppointments } from '../front-desk/frontDeskStore.js'
import { getDemoPatients, subscribeToDemoPatients } from '../patients/patientStore.js'
import PatientLink from '../patients/PatientLink.jsx'
import './NursePage.css'

const today = new Date().toISOString().slice(0, 10)
const emptyVitals = {
  temperature: '',
  pulse: '',
  respiratoryRate: '',
  systolic: '',
  diastolic: '',
  oxygenSaturation: '',
  weight: '',
  height: '',
  painScore: '',
  notes: '',
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('')
}

function recordedTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function NursePage() {
  const appointments = useSyncExternalStore(subscribeToAppointments, getAppointments, getAppointments)
  const patients = useSyncExternalStore(subscribeToDemoPatients, getDemoPatients, getDemoPatients)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Needs vitals')
  const [activeAppointmentId, setActiveAppointmentId] = useState('')
  const [form, setForm] = useState(emptyVitals)
  const [formError, setFormError] = useState('')

  const dayAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.date === today),
    [appointments],
  )
  const needsVitals = useMemo(
    () => dayAppointments
      .filter((appointment) => ['Checked in', 'In triage'].includes(appointment.status))
      .sort((left, right) => left.time.localeCompare(right.time)),
    [dayAppointments],
  )
  const handedOff = useMemo(
    () => dayAppointments
      .filter((appointment) => appointment.status === 'With clinician' && appointment.vitals)
      .sort((left, right) => (right.vitals.recordedAt || '').localeCompare(left.vitals.recordedAt || '')),
    [dayAppointments],
  )
  const activeAppointment = appointments.find((appointment) => appointment.id === activeAppointmentId)
  const visibleAppointments = useMemo(() => {
    const records = filter === 'With clinician' ? handedOff : needsVitals
    const term = query.trim().toLowerCase()
    if (!term) return records
    return records.filter((appointment) =>
      `${appointment.patientName} ${appointment.patientId} ${appointment.department} ${appointment.clinician}`
        .toLowerCase()
        .includes(term),
    )
  }, [filter, handedOff, needsVitals, query])

  const startAssessment = (appointment) => {
    if (appointment.status === 'Checked in') {
      updateAppointments((current) => current.map((item) =>
        item.id === appointment.id ? { ...item, status: 'In triage' } : item,
      ))
    }
    setActiveAppointmentId(appointment.id)
    setForm({ ...emptyVitals, ...(appointment.vitals || {}) })
    setFormError('')
  }

  const saveAssessment = (event) => {
    event.preventDefault()
    if (!activeAppointment) return

    const vitals = {
      temperature: Number(form.temperature),
      pulse: Number(form.pulse),
      respiratoryRate: Number(form.respiratoryRate),
      systolic: Number(form.systolic),
      diastolic: Number(form.diastolic),
      oxygenSaturation: Number(form.oxygenSaturation),
      weight: form.weight ? Number(form.weight) : null,
      height: form.height ? Number(form.height) : null,
      painScore: form.painScore ? Number(form.painScore) : null,
      notes: form.notes.trim(),
      recordedAt: new Date().toISOString(),
    }

    if (Object.entries(vitals).some(([key, value]) => key !== 'notes' && key !== 'recordedAt' && value !== null && !Number.isFinite(value))) {
      setFormError('Enter valid numeric values for the recorded observations.')
      return
    }

    updateAppointments((current) => current.map((appointment) =>
      appointment.id === activeAppointment.id
        ? { ...appointment, status: 'With clinician', vitals }
        : appointment,
    ))
    setActiveAppointmentId('')
  }

  const patientFor = (appointment) => patients.find((patient) => patient.id === appointment.patientId)

  return (
    <section className="nurse-page" aria-labelledby="nurse-title">
      <header className="nurse-heading">
        <div>
          <div className="nurse-eyebrow"><HeartPulse size={15} /> Care operations</div>
          <h1 id="nurse-title">Nursing station</h1>
          <p>Assess checked-in patients, record their observations, and hand off to consultation.</p>
        </div>
        <div className="nurse-shift"><span className="nurse-shift-dot" /> Today’s patient flow</div>
      </header>

      <div className="nurse-demo-note">
        <ShieldAlert size={15} />
        <span>Local demo vitals and handoffs persist and sync across tabs in this browser profile only; no Supabase backend is connected.</span>
      </div>

      <section className="nurse-stats" aria-label="Nursing queue summary">
        <article className="nurse-stat">
          <span><Users size={15} /> Awaiting assessment</span>
          <strong>{needsVitals.length}</strong>
        </article>
        <article className="nurse-stat nurse-stat--active">
          <span><Activity size={15} /> In assessment</span>
          <strong>{needsVitals.filter((appointment) => appointment.status === 'In triage').length}</strong>
        </article>
        <article className="nurse-stat nurse-stat--complete">
          <span><CheckCircle2 size={15} /> Handed to clinician</span>
          <strong>{handedOff.length}</strong>
        </article>
        <article className="nurse-stat">
          <span><ClipboardList size={15} /> Visits today</span>
          <strong>{dayAppointments.length}</strong>
        </article>
      </section>

      <div className="nurse-workspace">
        <section className="content-panel nurse-worklist" aria-labelledby="nurse-worklist-title">
          <div className="nurse-panel-heading">
            <div>
              <h2 id="nurse-worklist-title">Patient worklist</h2>
              <p>Work through the check-in queue and pass completed assessments to consultation.</p>
            </div>
            <span className="nurse-queue-count"><Users size={14} /> {visibleAppointments.length} visits</span>
          </div>

          <div className="nurse-worklist-controls">
            <label className="nurse-search">
              <Search size={16} />
              <input
                type="search"
                aria-label="Search nursing worklist"
                placeholder="Search patient, ID, or department"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="nurse-filter-tabs" role="group" aria-label="Filter nursing visits">
              {['Needs vitals', 'With clinician'].map((option) => (
                <button
                  type="button"
                  className={filter === option ? 'nurse-filter-tab nurse-filter-tab--active' : 'nurse-filter-tab'}
                  key={option}
                  onClick={() => setFilter(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {visibleAppointments.length ? (
            <div className="nurse-patient-list">
              {visibleAppointments.map((appointment) => {
                const patient = patientFor(appointment)
                const hasVitals = Boolean(appointment.vitals)
                return (
                  <article className="nurse-patient-card" key={appointment.id}>
                    <span className="nurse-patient-avatar">{initials(appointment.patientName)}</span>
                    <div className="nurse-patient-main">
                      <div className="nurse-patient-name">
                        <strong><PatientLink patientId={appointment.patientId}>{appointment.patientName}</PatientLink></strong>
                        <span className={`nurse-visit-status ${hasVitals ? 'nurse-visit-status--done' : appointment.status === 'In triage' ? 'nurse-visit-status--active' : ''}`}>
                          {hasVitals ? 'Vitals recorded' : appointment.status}
                        </span>
                      </div>
                      <span className="nurse-patient-meta">{appointment.patientId} · {appointment.department} · {appointment.time}</span>
                      <span className="nurse-patient-detail">
                        {patient?.sex || 'Patient'}{patient?.dob ? ` · DOB ${patient.dob}` : ''} · {appointment.visitType}
                      </span>
                      {hasVitals && (
                        <span className="nurse-vitals-preview">
                          <Thermometer size={13} /> {appointment.vitals.temperature}°C
                          <HeartPulse size={13} /> {appointment.vitals.pulse} bpm
                          <Activity size={13} /> SpO₂ {appointment.vitals.oxygenSaturation}%
                          <span>Recorded {recordedTime(appointment.vitals.recordedAt)}</span>
                        </span>
                      )}
                    </div>
                    {filter === 'With clinician' ? (
                      <CheckCircle2 className="nurse-handoff-icon" size={18} aria-label="Handed to clinician" />
                    ) : (
                      <button className="button button--primary nurse-assess-button" type="button" onClick={() => startAssessment(appointment)}>
                        {appointment.status === 'In triage' ? 'Record vitals' : 'Start assessment'} <ArrowRight size={14} />
                      </button>
                    )}
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="nurse-empty-state">
              <CheckCircle2 size={22} />
              <strong>{filter === 'Needs vitals' ? 'Nursing queue is clear' : 'No clinician handoffs yet'}</strong>
              <span>{query ? 'Try another patient name or clear the search.' : 'Newly checked-in patients will appear here.'}</span>
            </div>
          )}
          <div className="nurse-list-footer">
            <span>{filter === 'Needs vitals' ? 'Checked-in visits move here from Front desk' : 'Vitals recorded and passed to consultation'}</span>
            <span>Shared visit queue</span>
          </div>
        </section>

        <aside className="content-panel nurse-handoff-panel" aria-labelledby="nurse-handoff-title">
          <div className="nurse-panel-heading">
            <div>
              <h2 id="nurse-handoff-title">Latest handoffs</h2>
              <p>Ready for clinician consultation</p>
            </div>
            <Stethoscope size={17} className="nurse-panel-icon" />
          </div>
          {handedOff.length ? (
            <div className="nurse-handoff-list">
              {handedOff.slice(0, 5).map((appointment) => (
                <article className="nurse-handoff-row" key={appointment.id}>
                  <span className="nurse-handoff-check"><Check size={14} /></span>
                  <div className="nurse-handoff-copy">
                    <strong><PatientLink patientId={appointment.patientId}>{appointment.patientName}</PatientLink></strong>
                    <span>{appointment.patientId} · {appointment.department}</span>
                    <small>
                      {appointment.vitals.temperature}°C · {appointment.vitals.pulse} bpm · BP {appointment.vitals.systolic}/{appointment.vitals.diastolic}
                    </small>
                  </div>
                  <span className="nurse-handoff-time">{recordedTime(appointment.vitals.recordedAt)}</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="nurse-handoff-empty">
              <Clock3 size={18} />
              <span>Completed assessments will be listed here for the clinician handoff.</span>
            </div>
          )}
          <div className="nurse-handoff-note"><UserRound size={14} /> Completing vitals updates the shared visit status to “With clinician”.</div>
        </aside>
      </div>

      {activeAppointment && (
        <div className="nurse-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setActiveAppointmentId('')}>
          <section className="nurse-modal" role="dialog" aria-modal="true" aria-labelledby="vitals-title">
            <div className="nurse-modal-heading">
              <div>
                <span className="nurse-modal-eyebrow"><HeartPulse size={14} /> Nursing assessment</span>
                <h2 id="vitals-title">Record patient vitals</h2>
                <p>{activeAppointment.patientName} · {activeAppointment.patientId} · {activeAppointment.department}</p>
              </div>
              <button className="icon-button" type="button" aria-label="Close vitals form" onClick={() => setActiveAppointmentId('')}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={saveAssessment}>
              <div className="nurse-vitals-grid">
                <label className="nurse-field">
                  <span>Temperature <small>°C</small></span>
                  <input name="temperature" type="number" step="0.1" min="25" max="45" required value={form.temperature} onChange={(event) => setForm({ ...form, temperature: event.target.value })} />
                </label>
                <label className="nurse-field">
                  <span>Pulse <small>bpm</small></span>
                  <input name="pulse" type="number" min="20" max="250" required value={form.pulse} onChange={(event) => setForm({ ...form, pulse: event.target.value })} />
                </label>
                <label className="nurse-field">
                  <span>Respiratory rate <small>/min</small></span>
                  <input name="respiratoryRate" type="number" min="4" max="80" required value={form.respiratoryRate} onChange={(event) => setForm({ ...form, respiratoryRate: event.target.value })} />
                </label>
                <fieldset className="nurse-field nurse-bp-field">
                  <legend>Blood pressure <small>mmHg</small></legend>
                  <div>
                    <input aria-label="Systolic blood pressure" type="number" min="40" max="300" required placeholder="Systolic" value={form.systolic} onChange={(event) => setForm({ ...form, systolic: event.target.value })} />
                    <span>/</span>
                    <input aria-label="Diastolic blood pressure" type="number" min="20" max="200" required placeholder="Diastolic" value={form.diastolic} onChange={(event) => setForm({ ...form, diastolic: event.target.value })} />
                  </div>
                </fieldset>
                <label className="nurse-field">
                  <span>Oxygen saturation <small>%</small></span>
                  <input name="oxygenSaturation" type="number" min="50" max="100" required value={form.oxygenSaturation} onChange={(event) => setForm({ ...form, oxygenSaturation: event.target.value })} />
                </label>
                <label className="nurse-field">
                  <span>Weight <small>kg · optional</small></span>
                  <input name="weight" type="number" step="0.1" min="0.1" max="500" value={form.weight} onChange={(event) => setForm({ ...form, weight: event.target.value })} />
                </label>
                <label className="nurse-field">
                  <span>Height <small>cm · optional</small></span>
                  <input name="height" type="number" step="0.1" min="20" max="250" value={form.height} onChange={(event) => setForm({ ...form, height: event.target.value })} />
                </label>
                <label className="nurse-field">
                  <span>Pain score <small>0–10 · optional</small></span>
                  <input name="painScore" type="number" min="0" max="10" value={form.painScore} onChange={(event) => setForm({ ...form, painScore: event.target.value })} />
                </label>
              </div>
              <label className="nurse-field nurse-notes-field">
                <span>Assessment notes <small>optional</small></span>
                <textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Add brief nursing observations for the clinician" />
              </label>
              <div className="nurse-modal-hint"><ShieldAlert size={14} /> Recorded observations are passed to the clinician; this preview does not provide clinical alerts.</div>
              {formError && <p className="nurse-form-error" role="alert">{formError}</p>}
              <div className="nurse-modal-actions">
                <button className="button button--secondary" type="button" onClick={() => setActiveAppointmentId('')}>Cancel</button>
                <button className="button button--primary" type="submit"><Check size={15} /> Save &amp; send to clinician</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}

export default NursePage
