import { useState } from 'react'
import { Dialog, Icon, PageHeader, StatusBadge } from '@ui'
import { NurseEmpty, NurseErrorNotice, NurseField, NurseMessage, NursePatientIdentity, elapsedLabel, nameOf, patientFor, statusTone, uid } from './NurseShared.jsx'
import './nurse styles/shared.css'
import './nurse styles/admissions.css'

export default async async function NurseAdmissionsPage({ data, error, commit, can }) {
  const [patientId, setPatientId] = useState('')
  const [wardId, setWardId] = useState('')
  const [reason, setReason] = useState('')
  const [priority, setPriority] = useState('Routine')
  const [showForm, setShowForm] = useState(false)
  const [bedDialogRequestId, setBedDialogRequestId] = useState('')
  const [bedChoices, setBedChoices] = useState({})
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const nurse = data.nurse
  const open = nurse.admissions.filter((item) => item.status === 'Awaiting bed').sort((a, b) => (a.priority === 'Priority' ? -1 : 1) - (b.priority === 'Priority' ? -1 : 1) || new Date(a.requestedAt) - new Date(b.requestedAt))
  const completed = nurse.admissions.filter((item) => item.status === 'Admitted')
  const availableBeds = (ward) => nurse.beds.filter((bed) => bed.status === 'Available' && (!ward || bed.wardId === ward))
  const addRequest = (event) => {
    event.preventDefault()
    if (!can('nursing.observe')) { setFormError('Your role does not have permission to create admission requests.'); return }
    if (!patientId || !wardId || !reason.trim()) { setFormError('Select a patient, ward and reason for admission.'); return }
    const request = { id: uid('ADM'), patientId, requestedAt: new Date().toISOString(), department: nurse.wards.find((ward) => ward.id === wardId)?.name || 'Inpatient', reason: reason.trim(), priority, status: 'Awaiting bed', wardId, bedId: '' }
    const nextNurse = { ...nurse, admissions: [request, ...nurse.admissions] }
    if (await commit({ ...data, nurse: nextNurse })) {
      setPatientId('')
      setWardId('')
      setReason('')
      setPriority('Routine')
      setFormError('')
      setMessage('Admission request added to the placement queue.')
      setShowForm(false)
    }
  }
  const admit = (request) => {
    if (!can('nursing.observe')) return
    const bedId = bedChoices[request.id]
    const bed = nurse.beds.find((item) => item.id === bedId && item.status === 'Available')
    if (!bed) { setFormError('That bed is no longer available. Choose another available bed.'); return }
    const patient = patientFor(data, request.patientId)
    const now = new Date().toISOString()
    const nextNurse = {
      ...nurse,
      beds: nurse.beds.map((item) => item.id === bed.id ? { ...item, status: 'Occupied', patientId: request.patientId, since: now } : item),
      admissions: nurse.admissions.map((item) => item.id === request.id ? { ...item, status: 'Admitted', bedId: bed.id, admittedAt: now } : item),
      tasks: [{ id: uid('TASK'), patientId: request.patientId, wardId: bed.wardId, type: 'Vital-sign round', note: 'Initial ward observation', dueAt: now, status: 'Due', priority: request.priority }, ...nurse.tasks],
      activity: [{ id: uid('ACT'), kind: 'Admission', message: `${nameOf(patient)} placed in bed ${bed.id}`, at: now }, ...nurse.activity],
    }
    if (await commit({ ...data, nurse: nextNurse })) {
      setMessage(`${nameOf(patient)} admitted to bed ${bed.id}.`)
      setFormError('')
      setBedDialogRequestId('')
    }
  }

  return <>
    <PageHeader title="Admission requests" description="Coordinate inpatient placement with the available ward beds and keep each request traceable." actions={can('nursing.observe') ? <button type="button" className="hms-nurse__button hms-nurse__button--primary" onClick={() => { setShowForm(true); setFormError(''); setMessage('') }}><Icon name="userPlus" size={16} />Request admission</button> : null} />
    <div className="hms-nurse">
      <NurseErrorNotice error={error} />
      <NurseMessage>{message}</NurseMessage>
      <NurseMessage tone="error">{formError}</NurseMessage>
      {can('nursing.observe') ? <Dialog open={showForm} title="Request admission" description="Send a patient to the inpatient bed-placement queue." onClose={() => setShowForm(false)}>
        <form className="hms-nurse__admission-form-grid" onSubmit={addRequest}>
          <NurseField label="Patient" value={patientId} onChange={setPatientId} options={[{ value: '', label: 'Choose patient' }, ...data.patients.map((patient) => ({ value: patient.id, label: `${nameOf(patient)} · ${patient.id}` }))]} />
          <NurseField label="Requested ward" value={wardId} onChange={setWardId} options={[{ value: '', label: 'Choose ward' }, ...nurse.wards.map((ward) => ({ value: ward.id, label: ward.name }))]} />
          <NurseField label="Priority" value={priority} onChange={setPriority} options={['Routine', 'Priority', 'Urgent']} />
          <NurseField label="Request reason" value={reason} onChange={setReason} placeholder="Reason from the care team" />
          <button type="submit" className="hms-nurse__button hms-nurse__button--primary"><Icon name="userPlus" size={16} />Add request</button>
        </form>
      </Dialog> : null}
      <section className="hms-nurse__panel"><header className="hms-nurse__panel-head"><div><span className="hms-nurse__eyebrow">Placement queue</span><h2>Waiting for a bed</h2></div><StatusBadge tone={open.length ? 'warning' : 'success'}>{open.length} pending</StatusBadge></header>
        {open.length ? <div className="hms-nurse__admission-list">{open.map((request) => {
          const patient = patientFor(data, request.patientId)
          const choices = availableBeds(request.wardId)
          return <article className="hms-nurse__admission-card" key={request.id}><div className="hms-nurse__admission-card-head"><NursePatientIdentity patient={patient} secondary={request.department} /><StatusBadge tone={statusTone(request.priority)}>{request.priority}</StatusBadge></div><p>{request.reason}</p><div className="hms-nurse__admission-meta"><span><Icon name="clock" size={14} />Waiting {elapsedLabel(request.requestedAt)}</span><span>{choices.length} available bed{choices.length === 1 ? '' : 's'} in requested ward</span></div>
            <div className="hms-nurse__admission-actions"><button type="button" className="hms-nurse__button hms-nurse__button--primary" onClick={() => setBedDialogRequestId(request.id)} disabled={!can('nursing.observe') || !choices.length}><Icon name="bed" size={16} />Allocate bed</button></div>
          </article>
        })}</div> : <NurseEmpty title="No admission requests waiting">New requests will appear here for bed placement.</NurseEmpty>}
      </section>
      <Dialog
        open={Boolean(bedDialogRequestId)}
        title="Allocate an inpatient bed"
        description="Select an available bed in the requested ward before completing placement."
        onClose={() => setBedDialogRequestId('')}
      >
        {(() => {
          const request = open.find((item) => item.id === bedDialogRequestId)
          if (!request) return null
          const choices = availableBeds(request.wardId)
          return <div className="hms-nurse__admission-actions"><label className="hms-nurse__field"><span>Available bed</span><select value={bedChoices[request.id] || ''} onChange={(event) => setBedChoices((current) => ({ ...current, [request.id]: event.target.value }))}><option value="">Choose available bed</option>{choices.map((bed) => <option key={bed.id} value={bed.id}>{bed.id}</option>)}</select></label><button type="button" className="hms-nurse__button hms-nurse__button--primary" onClick={() => admit(request)} disabled={!bedChoices[request.id] || !choices.length}><Icon name="bed" size={16} />Admit & allocate</button></div>
        })()}
      </Dialog>
      <section className="hms-nurse__panel"><header className="hms-nurse__panel-head"><div><span className="hms-nurse__eyebrow">Placement history</span><h2>Recently admitted</h2></div></header>
        {completed.length ? completed.slice(0, 5).map((request) => <div className="hms-nurse__admission-mini" key={request.id}><NursePatientIdentity patient={patientFor(data, request.patientId)} secondary={request.department} /><span>Bed {request.bedId} · {request.admittedAt ? new Date(request.admittedAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Placement confirmed'}</span><StatusBadge tone="success">Admitted</StatusBadge></div>) : <NurseEmpty title="No completed placements yet" />}
      </section>
    </div>
  </>
}
