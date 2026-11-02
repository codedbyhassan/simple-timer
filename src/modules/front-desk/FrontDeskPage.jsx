import { useMemo, useState, useSyncExternalStore } from 'react'
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleUserRound,
  Clock3,
  ClipboardCheck,
  ListFilter,
  MessageSquareText,
  Plus,
  Search,
  ShieldAlert,
  Stethoscope,
  UserRoundCheck,
  Users,
  X,
} from 'lucide-react'
import { getDemoPatients, getPatientInsuranceStatus, subscribeToDemoPatients } from '../patients/patientStore.js'
import PatientLink from '../patients/PatientLink.jsx'
import { getAppointments, subscribeToAppointments, updateAppointments } from './frontDeskStore.js'
import { useRoleAccess } from '../../access/roleAccess.js'
import './FrontDeskPage.css'

const departments = ['General practice', 'Outpatient', 'Paediatrics', 'Cardiology', 'Dental']
const clinicians = ['Dr. K. Mensah', 'Dr. A. Owusu', 'Dr. E. Addo', 'Dr. M. Tetteh']
const appointmentStatuses = ['All statuses', 'Scheduled', 'Checked in', 'In triage', 'With clinician', 'Completed', 'Cancelled']
const initialSelectedDate = new Date().toISOString().slice(0, 10)
const emptyAppointment = {
  patientId: '',
  date: initialSelectedDate,
  time: '',
  department: '',
  clinician: '',
  visitType: 'General consultation',
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('')
}

function formatDay(value) {
  return new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${value}T12:00:00`))
}

function FrontDeskPage() {
  const { hasPermission } = useRoleAccess()
  const canManageAppointments = hasPermission('appointments.manage')
  const canManageQueue = hasPermission('opd.queue.manage')
  const canDraftMessages = hasPermission('messages.draft')
  const patients = useSyncExternalStore(subscribeToDemoPatients, getDemoPatients, getDemoPatients)
  const appointments = useSyncExternalStore(subscribeToAppointments, getAppointments, getAppointments)
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate)
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState('')
  const [form, setForm] = useState(emptyAppointment)
  const [formError, setFormError] = useState('')
  const [smsPatientId, setSmsPatientId] = useState('')
  const [smsText, setSmsText] = useState('')

  const datedAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.date === selectedDate),
    [appointments, selectedDate],
  )
  const visibleAppointments = useMemo(() => {
    const term = query.trim().toLowerCase()
    return datedAppointments
      .filter((appointment) => {
        const matchesStatus = statusFilter === 'All statuses' || appointment.status === statusFilter
        const patient = patients.find((item) => item.id === appointment.patientId)
        const searchable = `${appointment.patientName} ${appointment.patientId} ${appointment.department} ${appointment.clinician} ${patient?.phone || appointment.phone}`.toLowerCase()
        return matchesStatus && (!term || searchable.includes(term))
      })
      .sort((left, right) => left.time.localeCompare(right.time))
  }, [datedAppointments, patients, query, statusFilter])

  const summary = useMemo(() => {
    const counts = { Scheduled: 0, 'Checked in': 0, 'In triage': 0, 'With clinician': 0, Completed: 0, Cancelled: 0 }
    datedAppointments.forEach((appointment) => { counts[appointment.status] += 1 })
    return counts
  }, [datedAppointments])

  const openBooking = () => {
    setForm({ ...emptyAppointment, date: selectedDate })
    setFormError('')
    setModal('booking')
  }

  const openWalkIn = () => {
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setForm({ ...emptyAppointment, date: selectedDate, time })
    setFormError('')
    setModal('walk-in')
  }

  const saveAppointment = (event) => {
    event.preventDefault()
    const patient = patients.find((item) => item.id === form.patientId)
    if (!patient) {
      setFormError('Choose a patient from the registered patient directory.')
      return
    }

    const duplicate = appointments.some(
      (appointment) =>
        appointment.date === form.date &&
        appointment.time === form.time &&
        appointment.clinician === form.clinician &&
        appointment.status !== 'Cancelled',
    )
    if (duplicate) {
      setFormError('This clinician already has an appointment at that time.')
      return
    }

    const isWalkIn = modal === 'walk-in'
    const newAppointment = {
      ...form,
      id: `APT-${Date.now().toString().slice(-7)}`,
      patientName: patient.name,
      phone: patient.phone,
      status: isWalkIn ? 'Checked in' : 'Scheduled',
      checkedInAt: isWalkIn ? new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(new Date()) : '',
      source: isWalkIn ? 'Walk-in' : 'Booked at front desk',
    }
    updateAppointments((current) => [...current, newAppointment])
    setSelectedDate(form.date)
    setStatusFilter('All statuses')
    setQuery('')
    setModal('')
  }

  const changeStatus = (appointmentId, status) => {
    updateAppointments((current) =>
      current.map((appointment) =>
        appointment.id === appointmentId
          ? {
              ...appointment,
              status,
              checkedInAt: status === 'Checked in' && !appointment.checkedInAt
                ? new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(new Date())
                : appointment.checkedInAt,
            }
          : appointment,
      ),
    )
  }

  const openSms = (appointment) => {
    setSmsPatientId(appointment.patientId)
    setSmsText(`Hello ${appointment.patientName.split(' ')[0]}, this is Ascend Hospital. Your ${appointment.time} appointment is scheduled for ${appointment.department}.`)
    setModal('sms')
  }

  const smsPatient = patients.find((patient) => patient.id === smsPatientId)

  return (
    <section className="front-desk-page" aria-labelledby="front-desk-title">
      <header className="front-desk-heading">
        <div>
          <div className="front-desk-eyebrow"><ClipboardCheck size={15} /> Care operations</div>
          <h1 id="front-desk-title">Front desk</h1>
          <p>Manage today’s appointments, patient arrivals, and check-in queue.</p>
        </div>
        <div className="front-desk-heading-actions">
          <label className="front-desk-date">
            <CalendarDays size={15} />
            <input aria-label="Select appointment date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
            <ChevronDown size={14} />
          </label>
          {canManageQueue && <button className="button button--secondary" type="button" onClick={openWalkIn}>
            <UserRoundCheck size={15} /> Check in walk-in
          </button>}
          {canManageAppointments && <button className="button button--primary" type="button" onClick={openBooking}>
            <Plus size={16} /> Book appointment
          </button>}
        </div>
      </header>

      <div className="front-desk-date-line">{formatDay(selectedDate)} <span>·</span> Front desk operations</div>


      <section className="front-desk-stats" aria-label="Appointment and queue summary">
        <article className="front-desk-stat">
          <span><CalendarDays size={15} /> Appointments</span>
          <strong>{datedAppointments.length}</strong>
        </article>
        <article className="front-desk-stat front-desk-stat--arrived">
          <span><UserRoundCheck size={15} /> Checked in</span>
          <strong>{summary['Checked in'] + summary['In triage'] + summary['With clinician'] + summary.Completed}</strong>
        </article>
        <article className="front-desk-stat front-desk-stat--waiting">
          <span><Clock3 size={15} /> Waiting</span>
          <strong>{summary['Checked in'] + summary['In triage']}</strong>
        </article>
        <article className="front-desk-stat front-desk-stat--care">
          <span><Stethoscope size={15} /> With clinician</span>
          <strong>{summary['With clinician']}</strong>
        </article>
      </section>

      <section className="front-desk-board content-panel" aria-label="Front desk appointment board">
        <div className="front-desk-board-heading">
          <div>
            <h2>Appointment board</h2>
            <p>Check patients in and track their visit through the queue.</p>
          </div>
          <div className="front-desk-board-count"><Users size={15} /> {datedAppointments.length} visits</div>
        </div>

        <div className="front-desk-controls">
          <label className="front-desk-search">
            <Search size={16} />
            <input
              type="search"
              aria-label="Search appointments"
              placeholder="Search patient, ID, phone or clinician"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="front-desk-status-filter">
            <ListFilter size={15} />
            <select aria-label="Filter appointments by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {appointmentStatuses.map((status) => <option key={status}>{status}</option>)}
            </select>
            <ChevronDown size={14} />
          </label>
        </div>

        {visibleAppointments.length > 0 ? (
          <div className="front-desk-table-wrap">
            <table className="front-desk-table">
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Patient</th>
                  <th scope="col">Visit</th>
                  <th scope="col">Clinician</th>
                  <th scope="col">Insurance</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleAppointments.map((appointment) => {
                  const patient = patients.find((item) => item.id === appointment.patientId)
                  const status = patient ? getPatientInsuranceStatus(patient) : 'Non-insured'
                  return (
                    <tr key={appointment.id}>
                      <td><span className="front-desk-time">{appointment.time}</span></td>
                      <td>
                        <div className="front-desk-patient">
                          <span className="front-desk-avatar">{initials(appointment.patientName)}</span>
                          <span><PatientLink patientId={appointment.patientId}>{appointment.patientName}</PatientLink><small>{appointment.patientId} · {patient?.phone || appointment.phone}</small></span>
                        </div>
                      </td>
                      <td><span className="front-desk-visit">{appointment.department}</span><small className="front-desk-visit-type">{appointment.visitType}</small></td>
                      <td>{appointment.clinician}</td>
                      <td><span className={`front-desk-insurance front-desk-insurance--${status.toLowerCase().replace(' ', '-')}`}>{status}</span></td>
                      <td><span className={`front-desk-status front-desk-status--${appointment.status.toLowerCase().replace(' ', '-')}`}>{appointment.status}</span></td>
                      <td>
                        <div className="front-desk-row-actions">
                          {canManageQueue && appointment.status === 'Scheduled' && (
                            <button className="front-desk-action-button front-desk-action-button--primary" type="button" onClick={() => changeStatus(appointment.id, 'Checked in')}>
                              <Check size={14} /> Check in
                            </button>
                          )}
                          {canManageQueue && appointment.status === 'Checked in' && (
                            <button className="front-desk-action-button" type="button" onClick={() => changeStatus(appointment.id, 'In triage')}>
                              Move to triage <ArrowRight size={13} />
                            </button>
                          )}
                          {canDraftMessages && appointment.status !== 'Completed' && appointment.status !== 'Cancelled' && (
                            <button className="front-desk-icon-action" type="button" aria-label={`Draft SMS to ${appointment.patientName}`} title="Draft SMS reminder" onClick={() => openSms(appointment)}>
                              <MessageSquareText size={15} />
                            </button>
                          )}
                          {appointment.status === 'Completed' && <CheckCircle2 className="front-desk-completed-icon" size={17} aria-label="Visit completed" />}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="front-desk-empty">
            <CalendarDays size={21} />
            <strong>No appointments found</strong>
            <span>Try another date or clear the search and status filters.</span>
          </div>
        )}
        <div className="front-desk-board-footer">
          <span>Showing {visibleAppointments.length} of {datedAppointments.length} appointments</span>
          <span>Patients are selected from the shared patient directory</span>
        </div>
      </section>

      <section className="front-desk-bottom-grid">
        <article className="content-panel front-desk-queue-panel">
          <div className="front-desk-board-heading">
            <div><h2>Live check-in queue</h2><p>Patients ready for their next care step</p></div>
            
          </div>
          <div className="front-desk-queue">
            {datedAppointments.filter((item) => ['Checked in', 'In triage', 'With clinician'].includes(item.status)).length ? (
              datedAppointments
                .filter((item) => ['Checked in', 'In triage', 'With clinician'].includes(item.status))
                .sort((left, right) => left.time.localeCompare(right.time))
                .map((appointment, index) => (
                  <div className="front-desk-queue-row" key={appointment.id}>
                    <span className="front-desk-queue-number">{String(index + 1).padStart(2, '0')}</span>
                    <span className="front-desk-queue-person">
                      <PatientLink patientId={appointment.patientId}>{appointment.patientName}</PatientLink>
                      <small>{appointment.patientId} · {appointment.department}</small>
                    </span>
                    <span className={`front-desk-status front-desk-status--${appointment.status.toLowerCase().replace(' ', '-')}`}>{appointment.status}</span>
                  </div>
                ))
            ) : (
              <div className="front-desk-queue-empty"><CircleUserRound size={18} /> No patients are checked in yet.</div>
            )}
          </div>
        </article>

        <article className="content-panel front-desk-quick-panel">
          <div className="front-desk-board-heading">
            <div><h2>Front desk shortcuts</h2><p>Common patient-flow tasks</p></div>
          </div>
          {hasPermission('patients.directory') && <button type="button" className="front-desk-shortcut" onClick={() => {
            window.history.pushState({}, '', '/patients')
            window.dispatchEvent(new PopStateEvent('popstate'))
          }}>
            <span><Users size={16} /></span><strong>Open patient directory</strong><ArrowRight size={15} />
          </button>}
          {canManageAppointments && <button type="button" className="front-desk-shortcut" onClick={openBooking}>
            <span><CalendarDays size={16} /></span><strong>Schedule an appointment</strong><ArrowRight size={15} />
          </button>}
          <div className="front-desk-quick-note"><ShieldAlert size={14} /> Arkesel SMS sending will be enabled after secure backend configuration.</div>
        </article>
      </section>

      {(modal === 'booking' || modal === 'walk-in') && (
        <div className="front-desk-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModal('')}>
          <section className="front-desk-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title">
            <div className="front-desk-modal-heading">
              <div><span className="front-desk-modal-icon"><CalendarDays size={18} /></span><h2 id="booking-title">{modal === 'walk-in' ? 'Check in a walk-in' : 'Book an appointment'}</h2><p>{modal === 'walk-in' ? 'Select a registered patient and add them directly to the check-in queue.' : 'Select a registered patient and schedule their visit.'}</p></div>
              <button className="icon-button" type="button" aria-label="Close appointment form" onClick={() => setModal('')}><X size={18} /></button>
            </div>
            <form onSubmit={saveAppointment}>
              <div className="front-desk-form-grid">
                <label className="front-desk-form-field front-desk-form-field--wide">
                  <span>Patient <b>*</b></span>
                  <select required value={form.patientId} onChange={(event) => setForm({ ...form, patientId: event.target.value })}>
                    <option value="">Select a patient</option>
                    {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} · {patient.id}</option>)}
                  </select>
                </label>
                <label className="front-desk-form-field"><span>Date <b>*</b></span><input type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
                <label className="front-desk-form-field"><span>Time <b>*</b></span><input type="time" required value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label>
                <label className="front-desk-form-field"><span>Department <b>*</b></span><select required value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })}><option value="">Select department</option>{departments.map((department) => <option key={department}>{department}</option>)}</select></label>
                <label className="front-desk-form-field"><span>Clinician <b>*</b></span><select required value={form.clinician} onChange={(event) => setForm({ ...form, clinician: event.target.value })}><option value="">Select clinician</option>{clinicians.map((clinician) => <option key={clinician}>{clinician}</option>)}</select></label>
                <label className="front-desk-form-field front-desk-form-field--wide"><span>Visit type</span><select value={form.visitType} onChange={(event) => setForm({ ...form, visitType: event.target.value })}><option>General consultation</option><option>Follow-up</option><option>Review</option><option>New patient</option></select></label>
              </div>
              {formError && <p className="front-desk-form-error" role="alert">{formError}</p>}
              <div className="front-desk-form-note"><ShieldAlert size={14} /> Appointment and check-in details are saved in this browser only. SMS notifications are not sent.</div>
              <div className="front-desk-modal-actions"><button className="button button--secondary" type="button" onClick={() => setModal('')}>Cancel</button><button className="button button--primary" type="submit">{modal === 'walk-in' ? <UserRoundCheck size={15} /> : <CalendarDays size={15} />}{modal === 'walk-in' ? 'Check in patient' : 'Add appointment'}</button></div>
            </form>
          </section>
        </div>
      )}

      {modal === 'sms' && smsPatient && (
        <div className="front-desk-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModal('')}>
          <section className="front-desk-modal front-desk-sms-modal" role="dialog" aria-modal="true" aria-labelledby="sms-title">
            <div className="front-desk-modal-heading">
              <div><span className="front-desk-modal-icon"><MessageSquareText size={18} /></span><h2 id="sms-title">Appointment SMS draft</h2><p>To {smsPatient.name} · {smsPatient.phone}</p></div>
              <button className="icon-button" type="button" aria-label="Close SMS draft" onClick={() => setModal('')}><X size={18} /></button>
            </div>
            <label className="front-desk-form-field"><span>Message</span><textarea rows={4} maxLength={320} value={smsText} onChange={(event) => setSmsText(event.target.value)} /></label>
            <div className="front-desk-form-note"><ShieldAlert size={14} /> Arkesel is not configured. This draft will not be sent.</div>
            <div className="front-desk-modal-actions"><span>{smsText.length}/320 characters</span><button className="button button--secondary" type="button" onClick={() => setModal('')}>Close draft</button></div>
          </section>
        </div>
      )}
    </section>
  )
}

export default FrontDeskPage
