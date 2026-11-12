import { useState } from 'react'
import { CountBadge, Dialog, Icon, PageHeader } from '@ui'
import { ErrorNotice, SearchField, EmptyResult, AppointmentLine, createCheckIn, FormField, uid, nameOf, patientFor, formatDate } from './ReceptionShared.jsx'
import { TODAY, TOMORROW } from './receptionData.js'
import useLocalDepartments from '@core/storage/useLocalDepartments.js'
import './reception styles/shared.css'
import './reception styles/appointments.css'

export default function AppointmentsPage({ menu, data, error, commit, can }) {
  const { options: departmentOptions } = useLocalDepartments()
  const [date, setDate] = useState(TODAY)
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [values, setValues] = useState({ patientId: '', date: TODAY, time: '11:00', department: '', provider: '', reason: '' })
  const appointments = data.appointments.filter((appointment) => appointment.date === date)
  const filtered = appointments.filter((appointment) => {
    const patient = patientFor(data, appointment.patientId)
    return (filter === 'All' || appointment.status === filter)
      && `${nameOf(patient)} ${patient?.id} ${appointment.department} ${appointment.provider} ${appointment.reason}`.toLowerCase().includes(query.toLowerCase())
  }).sort((a, b) => a.time.localeCompare(b.time))

  const checkIn = async (appointment) => {
    if (!can('encounters.open')) return
    const result = createCheckIn(data, appointment.patientId, {}, appointment.id)
    if (result.error) { setFormError(result.error); return }
    if (await commit(result.data)) setMessage(result.message)
  }
  const setAppointmentStatus = async (appointment, status) => {
    if (!can('appointments.manage')) return
    if (await commit({ ...data, appointments: data.appointments.map((item) => item.id === appointment.id ? { ...item, status } : item) })) setMessage(`${nameOf(patientFor(data, appointment.patientId))} marked ${status.toLowerCase()}.`)
  }
  const createAppointment = async (event) => {
    event.preventDefault()
    if (!can('appointments.manage')) { setFormError('Your role does not have permission to schedule appointments.'); return }
    if (!values.patientId) { setFormError('Select a patient before booking an appointment.'); return }
    if (!values.department) { setFormError('Select a configured department before booking an appointment.'); return }
    if (values.date < TODAY) { setFormError('Choose today or a future date.'); return }
    const appointment = { ...values, id: uid('APT'), provider: values.provider.trim() || 'To be assigned', reason: values.reason.trim() || 'Scheduled visit', status: 'Expected' }
    if (await commit({ ...data, appointments: [...data.appointments, appointment] })) {
      setDate(values.date)
      setFilter('All')
      setShowForm(false)
      setFormError('')
      setMessage(`Appointment booked for ${nameOf(patientFor(data, appointment.patientId))}.`)
      setValues({ patientId: '', date: TODAY, time: '11:00', department: '', provider: '', reason: '' })
    }
  }

  return (
    <>
      <PageHeader title={menu.label} description="Plan visits, prepare for arrivals and keep appointment outcomes current." actions={can('appointments.manage') ? <button type="button" className="hms-reception__button hms-reception__button--primary" onClick={() => { setShowForm((open) => !open); setFormError(''); setMessage('') }}><Icon name="plus" size={16} />Book appointment</button> : null} />
      <div className="hms-reception">
        <ErrorNotice error={error} />
        {formError ? <div className="hms-reception__notice hms-reception__notice--error" role="alert"><Icon name="alertTriangle" size={17} />{formError}</div> : null}
        {message ? <div className="hms-reception__notice hms-reception__notice--success" role="status"><Icon name="checkCircle" size={17} />{message}</div> : null}
        <Dialog open={showForm} title="Schedule a patient visit" description="Create an appointment for a registered patient." onClose={() => setShowForm(false)} size="large">
          <form className="hms-reception__form-grid" onSubmit={createAppointment}>
            <FormField label="Patient" value={values.patientId} onChange={(value) => setValues((current) => ({ ...current, patientId: value }))} options={[{ value: '', label: 'Choose patient' }, ...data.patients.map((patient) => ({ value: patient.id, label: `${nameOf(patient)} · ${patient.id}` }))]} required />
            <FormField label="Department" value={values.department} onChange={(value) => setValues((current) => ({ ...current, department: value }))} options={[{ value: '', label: departmentOptions.length ? 'Choose department' : 'No departments configured' }, ...departmentOptions]} />
            <FormField label="Date" value={values.date} onChange={(value) => setValues((current) => ({ ...current, date: value }))} type="date" min={TODAY} required />
            <FormField label="Time" value={values.time} onChange={(value) => setValues((current) => ({ ...current, time: value }))} type="time" required />
            <FormField label="Provider (optional)" value={values.provider} onChange={(value) => setValues((current) => ({ ...current, provider: value }))} />
            <FormField label="Reason for visit" value={values.reason} onChange={(value) => setValues((current) => ({ ...current, reason: value }))} />
            <div className="hms-reception__form-actions hms-reception__field--wide"><button type="button" className="hms-reception__button hms-reception__button--quiet" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="hms-reception__button hms-reception__button--primary"><Icon name="calendar" size={16} />Save appointment</button></div>
          </form>
        </Dialog>
        <div className="hms-reception__schedule-tools">
          <div className="hms-reception__date-switch"><button type="button" className={date === TODAY ? 'is-selected' : ''} onClick={() => setDate(TODAY)}>Today</button><button type="button" className={date === TOMORROW ? 'is-selected' : ''} onClick={() => setDate(TOMORROW)}>Tomorrow</button><label><Icon name="calendar" size={16} /><input type="date" value={date} min={TODAY} onChange={(event) => setDate(event.target.value)} aria-label="Choose appointment date" /></label></div>
          <SearchField value={query} onChange={setQuery} placeholder="Search patient, clinic or provider" />
        </div>
        <div className="hms-reception__schedule-summary"><span><strong>{appointments.length}</strong> scheduled</span><span><strong>{appointments.filter((item) => item.status === 'Arrived').length}</strong> arrived</span><span><strong>{appointments.filter((item) => item.status === 'No-show').length}</strong> no-show</span><span className="hms-reception__schedule-summary-date">{formatDate(date)}</span></div>
        <section className="hms-reception__panel">
          <div className="hms-reception__filter-tabs" role="tablist" aria-label="Appointment status filter">{['All', 'Expected', 'Arrived', 'No-show', 'Completed'].map((status) => <button key={status} role="tab" aria-selected={filter === status} className={filter === status ? 'is-active' : ''} type="button" onClick={() => setFilter(status)}>{status}{status === 'Expected' ? <CountBadge>{appointments.filter((item) => item.status === 'Expected').length}</CountBadge> : null}</button>)}</div>
          {filtered.length ? <div className="hms-reception__appointment-list">{filtered.map((appointment) => <AppointmentLine key={appointment.id} appointment={appointment} patient={patientFor(data, appointment.patientId)} canCheckIn={can('encounters.open')} onCheckIn={checkIn} onNoShow={can('appointments.manage') ? (item) => setAppointmentStatus(item, 'No-show') : null} />)}</div> : <EmptyResult icon="calendar" title="No appointments in this view"><button type="button" className="hms-reception__text-button" onClick={() => { setFilter('All'); setQuery('') }}>Clear filters</button></EmptyResult>}
        </section>
      </div>
    </>
  )
}
