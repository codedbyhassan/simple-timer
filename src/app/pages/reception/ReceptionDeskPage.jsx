import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Dialog, Icon, PageHeader } from '@ui'
import { ErrorNotice, SearchField, EmptyResult, PatientIdentity, AppointmentLine, createCheckIn, FormField, uid, nameOf, patientFor, patientPath } from './ReceptionShared.jsx'
import { TODAY } from './receptionData.js'
import useLocalDepartments from '@core/storage/useLocalDepartments.js'
import './reception styles/shared.css'
import './reception styles/desk.css'

const EMPTY_PATIENT = {
  firstName: '',
  lastName: '',
  sex: '',
  dateOfBirth: '',
  phone: '',
  address: '',
  coverage: 'Self-pay',
  memberNumber: '',
  membershipType: 'Principal member',
  dependent: false,
  principalName: '',
  expiry: '',
  nextOfKin: '',
  otherInsurance: '',
  visitType: 'Walk-in',
  department: '',
  reason: '',
}

export default function ReceptionDeskPage({ menu, data, error, commit, can }) {
  const { options: departmentOptions } = useLocalDepartments()
  const [query, setQuery] = useState('')
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [step, setStep] = useState(0)
  const [showRegistration, setShowRegistration] = useState(false)
  const [values, setValues] = useState(EMPTY_PATIENT)
  const [differentPerson, setDifferentPerson] = useState(false)
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const patients = data.patients.filter((patient) => `${nameOf(patient)} ${patient.id} ${patient.phone} ${patient.memberNumber}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 5)
  const duplicateMatches = can('patients.create') ? data.patients.filter((patient) => {
    const samePhone = values.phone.trim() && patient.phone.replace(/\s/g, '') === values.phone.trim().replace(/\s/g, '')
    const sameName = values.firstName.trim() && values.lastName.trim()
      && nameOf(patient).toLowerCase() === `${values.firstName} ${values.lastName}`.trim().toLowerCase()
    const sameDob = values.dateOfBirth && patient.dateOfBirth === values.dateOfBirth
    return samePhone || (sameName && (!values.dateOfBirth || sameDob))
  }) : []
  const todaysAppointments = data.appointments.filter((appointment) => appointment.date === TODAY && ['Expected', 'Arrived'].includes(appointment.status)).slice(0, 4)
  const set = (key, value) => { setValues((current) => ({ ...current, [key]: value })); setFormError(''); setMessage(''); if (key === 'phone' || key === 'firstName' || key === 'lastName' || key === 'dateOfBirth') setDifferentPerson(false) }
  const checkIn = async (patientId, appointmentId = '', details = {}) => {
    if (!can('encounters.open')) { setFormError('Your role does not have permission to check patients into the OPD queue.'); return }
    const result = createCheckIn(data, patientId, details, appointmentId)
    if (result.error) { setFormError(result.error); return }
    if (await commit(result.data)) { setMessage(result.message); setSelectedPatientId(patientId) }
  }
  const createPatient = async (event) => {
    event.preventDefault()
    if (!can('patients.create')) { setFormError('Your role does not have permission to register patients.'); return }
    if (values.coverage === 'NHIS' && values.memberNumber && !/^\d{8}(\d{2})?$/.test(values.memberNumber)) { setFormError('NHIS membership numbers must contain 8 or 10 digits.'); setStep(1); return }
    if (duplicateMatches.length && !differentPerson) { setFormError('Review the possible duplicate match and confirm if this is a different person.'); setStep(0); return }
    if (values.visitType === 'Appointment' && !values.department) { setFormError('Configure a department in Administration before booking an appointment.'); setStep(2); return }
    const patient = {
      ...values,
      id: `ASC-PAT-${String(Date.now()).slice(-6)}`,
      createdAt: new Date().toISOString(),
      lastVisit: TODAY,
      dependent: values.dependent,
      membershipType: values.dependent ? 'Dependent' : values.membershipType,
    }
    let next = { ...data, patients: [patient, ...data.patients] }
    if (values.visitType === 'Appointment') {
      const appointment = { id: uid('APT'), patientId: patient.id, date: TODAY, time: '12:00', department: values.department, provider: 'To be assigned', reason: values.reason || 'Reception booking', status: 'Expected' }
      next = { ...next, appointments: [appointment, ...data.appointments] }
      if (await commit(next)) { setMessage(`${nameOf(patient)} registered and added to today’s appointment schedule.`); setValues(EMPTY_PATIENT); setStep(0); setQuery(''); setShowRegistration(false) }
      return
    }
    if (values.visitType === 'Walk-in' && can('encounters.open')) {
      const result = createCheckIn(next, patient.id, values)
      next = result.data
    }
    if (await commit(next)) { setMessage(values.visitType === 'Walk-in' && can('encounters.open') ? `${nameOf(patient)} registered and checked in.` : `${nameOf(patient)} registered successfully.`); setSelectedPatientId(patient.id); setValues(EMPTY_PATIENT); setStep(0); setQuery(''); setDifferentPerson(false); setShowRegistration(false) }
  }
  const nextStep = () => {
    if (step === 0 && (!values.firstName.trim() || !values.lastName.trim() || !values.sex || !values.phone.trim())) { setFormError('Enter the patient’s name, sex and contact number to continue.'); return }
    if (step === 1 && values.coverage === 'NHIS' && values.memberNumber && !/^\d{8}(\d{2})?$/.test(values.memberNumber)) { setFormError('NHIS membership numbers must contain 8 or 10 digits.'); return }
    setFormError('')
    setStep((current) => Math.min(2, current + 1))
  }

  return (
    <>
      <PageHeader title={menu.label} description="Find a returning patient, register a new record or welcome a scheduled arrival." actions={can('patients.create') ? <button type="button" className="hms-reception__button hms-reception__button--primary" onClick={() => { setShowRegistration(true); setFormError(''); setMessage('') }}><Icon name="userPlus" size={16} />Register patient</button> : null} />
      <div className="hms-reception">
        <ErrorNotice error={error} />
        {formError ? <div className="hms-reception__notice hms-reception__notice--error" role="alert"><Icon name="alertTriangle" size={17} />{formError}</div> : null}
        {message ? <div className="hms-reception__notice hms-reception__notice--success" role="status"><Icon name="checkCircle" size={17} />{message}</div> : null}
        <section className="hms-reception__search-strip"><div><span className="hms-reception__eyebrow">Patient lookup</span><h2>Who are you welcoming?</h2></div><SearchField value={query} onChange={(next) => { setQuery(next); setSelectedPatientId(''); setMessage('') }} placeholder="Search name, phone or patient number" autoFocus /></section>
        {query ? <section className="hms-reception__search-results" aria-label="Patient search results">
          {patients.map((patient) => <button key={patient.id} type="button" className={`hms-reception__search-result${selectedPatientId === patient.id ? ' is-selected' : ''}`} onClick={() => { setSelectedPatientId(patient.id); setMessage(''); setFormError('') }}><PatientIdentity patient={patient} /><span>{patient.phone || 'No phone recorded'}</span><Icon name={selectedPatientId === patient.id ? 'checkCircle' : 'chevronRight'} size={17} /></button>)}
          {patients.length === 0 ? <div className="hms-reception__no-match"><span>No matching patient record found.</span>{can('patients.create') ? <button type="button" className="hms-reception__button hms-reception__button--quiet" onClick={() => { setValues({ ...EMPTY_PATIENT, firstName: query.trim().split(/\s+/).slice(0, -1).join(' '), lastName: query.trim().split(/\s+/).slice(-1)[0] || '' }); setQuery(''); setStep(0); setShowRegistration(true) }}><Icon name="userPlus" size={16} />Start registration</button> : null}</div> : null}
        </section> : null}
        <div className="hms-reception__desk-grid">
          <section className="hms-reception__panel">
            <header className="hms-reception__panel-head"><div><span className="hms-reception__eyebrow">Today · {todaysAppointments.length} next arrivals</span><h2>Appointment check-in</h2></div><Link to="/reception/appointments">Full schedule <Icon name="arrowUpRight" size={15} /></Link></header>
            <div className="hms-reception__appointment-list">
              {todaysAppointments.map((appointment) => <AppointmentLine key={appointment.id} appointment={appointment} patient={patientFor(data, appointment.patientId)} canCheckIn={can('encounters.open')} onCheckIn={(item) => checkIn(item.patientId, item.id)} />)}
              {todaysAppointments.length === 0 ? <EmptyResult icon="calendar" title="No more expected arrivals" /> : null}
            </div>
            {selectedPatientId ? <div className="hms-reception__selected-patient">
              <PatientIdentity patient={patientFor(data, selectedPatientId)} />
              <div className="hms-reception__selected-facts"><span>{patientFor(data, selectedPatientId)?.phone || 'Phone not recorded'}</span><span>{patientFor(data, selectedPatientId)?.coverage || 'Coverage not recorded'}</span></div>
              <div className="hms-reception__button-row"><Link className="hms-reception__button hms-reception__button--quiet" to={patientPath(selectedPatientId)}>Open patient record</Link>{can('encounters.open') ? <button className="hms-reception__button hms-reception__button--primary" type="button" onClick={() => checkIn(selectedPatientId)}><Icon name="check" size={16} />Check in walk-in</button> : null}</div>
            </div> : null}
          </section>
          {can('patients.create') ? <Dialog open={showRegistration} title="Register a patient" description="Create an administrative record and optionally add a visit." onClose={() => setShowRegistration(false)} size="large">
            <header className="hms-reception__panel-head"><div><span className="hms-reception__eyebrow">New patient</span><h2>Registration</h2></div><span className="hms-reception__step-count">Step {step + 1} of 3</span></header>
            <div className="hms-reception__step-track" aria-hidden="true"><span style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
            <div className="hms-reception__steps" role="list" aria-label="Registration steps">{['Identity', 'Coverage & contacts', 'Visit'].map((label, index) => <button type="button" role="listitem" key={label} className={index === step ? 'is-current' : index < step ? 'is-done' : ''} onClick={() => index < step && setStep(index)}><b>{index < step ? <Icon name="check" size={13} /> : index + 1}</b>{label}</button>)}</div>
            <form onSubmit={createPatient} className="hms-reception__form">
              {step === 0 ? <div className="hms-reception__form-grid">
                <FormField label="First name" value={values.firstName} onChange={(value) => set('firstName', value)} required autoComplete="given-name" />
                <FormField label="Last name" value={values.lastName} onChange={(value) => set('lastName', value)} required autoComplete="family-name" />
                <FormField label="Sex" value={values.sex} onChange={(value) => set('sex', value)} options={[{ value: '', label: 'Select' }, 'Female', 'Male', 'Other', 'Prefer not to say']} required />
                <FormField label="Date of birth" value={values.dateOfBirth} onChange={(value) => set('dateOfBirth', value)} type="date" max={TODAY} />
                <FormField label="Phone number" value={values.phone} onChange={(value) => set('phone', value)} type="tel" required autoComplete="tel" />
                <FormField label="Home address" value={values.address} onChange={(value) => set('address', value)} autoComplete="street-address" />
                {duplicateMatches.length ? <div className="hms-reception__duplicate" role="status"><div><Icon name="alertTriangle" size={17} /><strong>Possible existing record{duplicateMatches.length > 1 ? 's' : ''}</strong></div>{duplicateMatches.map((patient) => <Link key={patient.id} to={patientPath(patient.id)}>{nameOf(patient)} · {patient.id} · {patient.phone || 'No phone'} <Icon name="arrowUpRight" size={14} /></Link>)}<label><input type="checkbox" checked={differentPerson} onChange={(event) => setDifferentPerson(event.target.checked)} />I confirmed this is a different person</label></div> : null}
              </div> : null}
              {step === 1 ? <div className="hms-reception__form-grid">
                <FormField label="Coverage" value={values.coverage} onChange={(value) => set('coverage', value)} options={['Self-pay', 'NHIS', 'Private insurance']} />
                {values.coverage === 'NHIS' ? <>
                  <FormField label="NHIS membership number" value={values.memberNumber} onChange={(value) => set('memberNumber', value.replace(/\D/g, '').slice(0, 10))} hint={values.memberNumber ? (/^\d{8}(\d{2})?$/.test(values.memberNumber) ? 'Format valid; eligibility has not been verified.' : 'Enter an 8- or 10-digit number.') : '8 or 10 digits'} inputMode="numeric" />
                  <FormField label="Membership type" value={values.dependent ? 'Dependent' : values.membershipType} onChange={(value) => set('membershipType', value)} options={['Principal member', 'Dependent']} />
                  <label className="hms-reception__check-field"><input type="checkbox" checked={values.dependent} onChange={(event) => set('dependent', event.target.checked)} /><span>Patient is a dependant</span></label>
                  {values.dependent ? <FormField label="Principal member name" value={values.principalName} onChange={(value) => set('principalName', value)} required /> : null}
                  <FormField label="Membership expiry" value={values.expiry} onChange={(value) => set('expiry', value)} type="date" />
                </> : null}
                {values.coverage === 'Private insurance' ? <FormField label="Insurance provider" value={values.otherInsurance} onChange={(value) => set('otherInsurance', value)} /> : null}
                <FormField label="Next of kin and contact" value={values.nextOfKin} onChange={(value) => set('nextOfKin', value)} />
              </div> : null}
              {step === 2 ? <div className="hms-reception__form-grid">
                <FormField label="Department or clinic" value={values.department} onChange={(value) => set('department', value)} options={[{ value: '', label: departmentOptions.length ? 'Choose department' : 'No departments configured' }, ...departmentOptions]} />
                <FormField label="Visit type" value={values.visitType} onChange={(value) => set('visitType', value)} options={['Walk-in', 'Appointment', 'Information only']} />
                <label className="hms-reception__field hms-reception__field--wide"><span>Reason for visit</span><textarea rows="3" value={values.reason} onChange={(event) => set('reason', event.target.value)} placeholder="Brief reason shared by the patient" /></label>
                <div className="hms-reception__registration-summary"><Icon name="info" size={17} /><span>Patient registration captures administrative details only. Clinical assessment remains with the care team.</span></div>
              </div> : null}
              <div className="hms-reception__form-actions">{step > 0 ? <button type="button" className="hms-reception__button hms-reception__button--quiet" onClick={() => setStep((current) => current - 1)}>Back</button> : <span className="hms-reception__required-note">* Required fields</span>}{step < 2 ? <button type="button" className="hms-reception__button hms-reception__button--primary" onClick={nextStep}>Continue <Icon name="arrowUpRight" size={15} /></button> : <button type="submit" className="hms-reception__button hms-reception__button--primary"><Icon name="check" size={16} />Register patient</button>}</div>
            </form>
          </Dialog> : <section className="hms-reception__panel"><EmptyResult icon="user" title="Patient registration is not available"><Link to="/reception/patients">Search existing patient records</Link></EmptyResult></section>}
        </div>
      </div>
    </>
  )
}
