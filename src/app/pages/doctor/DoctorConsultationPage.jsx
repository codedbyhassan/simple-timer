import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Dialog, Icon, PageHeader, StatusBadge } from '@ui'
import { DIAGNOSIS_OPTIONS, DOCTOR_NAME } from './doctorData.js'
import { claimGaps, DoctorEmpty, DoctorError, DoctorField, DoctorNotice, DoctorPanel, DoctorPatient, patientFor, priorityRank, statusTone, uid } from './DoctorShared.jsx'
import { alreadyCharged, consultationCharge } from '@core/billing/charges.js'
import './doctor styles/shared.css'
import './doctor styles/consultation.css'

const EMPTY_FORM = {
  complaints: '', history: '', examination: '', diagnosisCode: '', diagnosisDescription: '',
  orders: [], prescriptions: [], procedures: [], referralFacility: '', referralReason: '', disposition: '', admitWardId: '', admitPriority: 'Routine', admitReason: '',
}
const PROCEDURES = ['ECG', 'Wound dressing', 'Nebulisation', 'Minor procedure']

function draftFor(entry, saved) {
  return saved || {
    ...EMPTY_FORM,
    encounterId: entry.id,
    patientId: entry.patientId,
    complaints: entry.reason || '',
    status: 'Draft',
  }
}

function allergiesFor(data, patientId) {
  return [...new Set(data.pharmacy.prescriptions
    .filter((prescription) => prescription.patientId === patientId)
    .flatMap((prescription) => prescription.allergies || [])
    .filter((allergy) => !allergy.toLowerCase().includes('review required')))]
}

function medicineConflicts(medicine, allergies) {
  return (medicine?.ingredients || []).some((ingredient) => allergies.some((allergy) => {
    const term = allergy.toLowerCase().split(/\s+/)[0]
    return ingredient.toLowerCase().includes(term) || term.includes(ingredient.toLowerCase())
  }))
}

export default function DoctorConsultationPage({ data, error, commit, can }) {
  const location = useLocation()
  const requestedPatientId = new URLSearchParams(location.search).get('patientId')
  const entries = data.queue.filter((entry) => ['Waiting for clinician', 'In consultation', 'Investigations'].includes(entry.stage))
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || new Date(a.arrivedAt) - new Date(b.arrivedAt))
  const requestedEncounter = entries.find((entry) => entry.patientId === requestedPatientId)
  const [selectedId, setSelectedId] = useState(location.state?.encounterId || requestedEncounter?.id || '')
  const [consultTab, setConsultTab] = useState('Consultation')
  const [formDialog, setFormDialog] = useState('')
  const selected = entries.find((entry) => entry.id === selectedId) || entries[0]
  const saved = selected ? data.doctor.drafts.find((draft) => draft.encounterId === selected.id) : null
  const [draftState, setDraftState] = useState({ encounterId: '', value: EMPTY_FORM })
  const form = selected
    ? draftState.encounterId === selected.id ? draftState.value : draftFor(selected, saved)
    : EMPTY_FORM
  const [orderTest, setOrderTest] = useState('')
  const [orderPriority, setOrderPriority] = useState('Routine')
  const [medicineId, setMedicineId] = useState('')
  const [dose, setDose] = useState('')
  const [frequency, setFrequency] = useState('1 DAILY')
  const [durationDays, setDurationDays] = useState('5')
  const [quantity, setQuantity] = useState('10')
  const [procedureName, setProcedureName] = useState(PROCEDURES[0])
  const [procedureDate, setProcedureDate] = useState(new Date().toISOString().slice(0, 10))
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const patient = selected ? patientFor(data, selected.patientId) : null
  const allergies = patient ? allergiesFor(data, patient.id) : []
  const gaps = claimGaps(form, data)
  const selectedMedicine = data.pharmacy.medicines.find((medicine) => medicine.id === medicineId)
  const allergyConflict = medicineConflicts(selectedMedicine, allergies)
  const draftReadOnly = form.status === 'Finalised'

  useEffect(() => {
    if (!selected || form.status === 'Finalised') return undefined
    const timer = window.setTimeout(async () => {
      const current = data.doctor.drafts.find((draft) => draft.encounterId === selected.id)
      const comparable = (draft) => {
        const copy = { ...draft }
        delete copy.updatedAt
        return copy
      }
      if (JSON.stringify(comparable(current || {})) === JSON.stringify(comparable(form))) return
      const savedDraft = { ...form, encounterId: selected.id, patientId: selected.patientId, updatedAt: new Date().toISOString() }
      const doctor = {
        ...data.doctor,
        drafts: [...data.doctor.drafts.filter((draft) => draft.encounterId !== selected.id), savedDraft],
      }
      await commit({ ...data, doctor })
    }, 350)
    return () => window.clearTimeout(timer)
  }, [form, selected, data, commit])

  const change = (key, value) => {
    if (!selected) return
    setDraftState((current) => ({
      encounterId: selected.id,
      value: { ...(current.encounterId === selected.id ? current.value : form), [key]: value },
    }))
    setMessage('')
    setActionError('')
  }
  const startConsultation = async () => {
    if (!selected || !can('clinical.consult')) { setActionError('Your role cannot start consultations.'); return }
    if (!['Waiting for clinician', 'In consultation', 'Investigations'].includes(selected.stage)) { setActionError('This encounter must complete triage handover before consultation.'); return }
    const queue = data.queue.map((entry) => entry.id === selected.id && entry.stage === 'Waiting for clinician' ? { ...entry, stage: 'In consultation' } : entry)
    const draft = draftFor(selected, data.doctor.drafts.find((item) => item.encounterId === selected.id))
    const started = { ...draft, startedAt: draft.startedAt || new Date().toISOString() }
    const doctor = { ...data.doctor, drafts: [...data.doctor.drafts.filter((item) => item.encounterId !== selected.id), started] }
    if (await commit({ ...data, queue, doctor })) {
      setDraftState({ encounterId: selected.id, value: started })
      setMessage(`${patient?.firstName || 'Patient'} consultation is open. Changes save automatically on this device.`)
      setActionError('')
    }
  }
  const addOrder = () => {
    if (!orderTest) { setActionError('Select a test before adding an investigation.'); return }
    if (form.orders.some((order) => order.testId === orderTest && !order.orderId)) { setActionError('That test is already in this consultation draft.'); return }
    const test = data.lab.catalogue.find((item) => item.id === orderTest)
    change('orders', [...form.orders, { id: uid('DORD'), testId: orderTest, name: test?.name || 'Investigation', priority: orderPriority }])
    setOrderTest('')
  }
  const placeOrders = async () => {
    if (!selected || !can('clinical.order')) { setActionError('Your role cannot order investigations.'); return }
    const draftOrders = form.orders.filter((order) => !order.orderId)
    if (!draftOrders.length) { setActionError('Add at least one new investigation first.'); return }
    const now = new Date().toISOString()
    const orders = draftOrders.map((order) => ({
        id: uid('LAB'), patientId: selected.patientId, encounterId: selected.id, testId: order.testId,
        orderedBy: DOCTOR_NAME, orderedAt: now, priority: order.priority, location: 'OPD',
        status: 'Ordered', resultValues: {}, resultStatus: 'Not entered', notification: null, recollections: 0,
      }))
    const specimens = orders.map((order) => {
      const test = data.lab.catalogue.find((item) => item.id === order.testId)
      return { id: uid('SP'), orderId: order.id, patientId: order.patientId, type: test?.specimenType || 'Not specified', status: 'Ordered', collectedAt: '', receivedAt: '', rejectedAt: '', rejectionReason: '', collectionChecks: null, recollectionRequested: false }
    })
    const lab = { ...data.lab, orders: [...orders, ...data.lab.orders], specimens: [...specimens, ...data.lab.specimens] }
    const nextForm = { ...form, orders: form.orders.map((item) => {
      const placed = orders.find((order) => order.testId === item.testId)
      return placed ? { ...item, orderId: placed.id, status: 'Ordered' } : item
    }) }
    const doctor = { ...data.doctor, drafts: [...data.doctor.drafts.filter((item) => item.encounterId !== selected.id), { ...nextForm, encounterId: selected.id, patientId: selected.patientId, updatedAt: now }] }
    const queue = data.queue.map((entry) => entry.id === selected.id ? { ...entry, stage: 'Investigations' } : entry)
    if (await commit({ ...data, lab, doctor, queue })) {
      setDraftState({ encounterId: selected.id, value: nextForm })
      setMessage(`${orders.length} investigation${orders.length === 1 ? '' : 's'} sent to the laboratory worklist.`)
      setActionError('')
    }
  }
  const addPrescription = () => {
    if (!selectedMedicine) { setActionError('Select a medicine for the prescription.'); return }
    if (allergyConflict) { setActionError(`Prescription blocked: ${selectedMedicine.name} conflicts with the recorded allergy ${allergies.join(', ')}.`); return }
    const days = Number(durationDays)
    const amount = Number(quantity)
    if (!dose.trim() || !frequency.trim() || !Number.isInteger(days) || days < 1 || !Number.isInteger(amount) || amount < 1) {
      setActionError('Enter dose, frequency, a positive duration in days and a whole-number quantity.')
      return
    }
    change('prescriptions', [...form.prescriptions, {
      id: uid('RXD'), medicineId, dose: `${dose.trim()} ${selectedMedicine.form}`, frequency: frequency.trim(),
      durationDays: days, prescribedQuantity: amount, dispensedQuantity: 0, standard: true,
    }])
    setDose('')
    setActionError('')
  }
  const createPrescription = async () => {
    if (!selected || !can('clinical.prescribe')) { setActionError('Your role cannot prescribe medicines.'); return }
    const draftItems = form.prescriptions.filter((item) => !item.prescriptionId)
    if (!draftItems.length) { setActionError('Add a complete prescription item first.'); return }
    if (allergies.length && !window.confirm(`Recorded allergies: ${allergies.join(', ')}. Confirm that you reviewed this allergy information before prescribing.`)) return
    const now = new Date().toISOString()
    const prescription = {
      id: uid('RX'), patientId: selected.patientId, encounterId: selected.id, prescribedBy: DOCTOR_NAME,
      prescribedAt: now, priority: selected.priority || 'Routine', status: 'New',
      allergyReview: allergies.length ? 'Reviewed by clinician' : 'No allergy recorded',
      allergies, items: draftItems.map((item) => ({ ...item, id: uid('RXI') })),
    }
    const pharmacy = { ...data.pharmacy, prescriptions: [prescription, ...data.pharmacy.prescriptions] }
    const nextForm = { ...form, prescriptions: form.prescriptions.map((item) => draftItems.includes(item) ? { ...item, prescriptionId: prescription.id } : item) }
    const doctor = { ...data.doctor, drafts: [...data.doctor.drafts.filter((item) => item.encounterId !== selected.id), { ...nextForm, encounterId: selected.id, patientId: selected.patientId, updatedAt: now }] }
    if (await commit({ ...data, pharmacy, doctor })) {
      setDraftState({ encounterId: selected.id, value: nextForm })
      setMessage(`${prescription.id} sent to the pharmacy queue.`)
      setActionError('')
    }
  }
  const addProcedure = () => {
    if (!form.diagnosisCode) { setActionError('Code a diagnosis before adding a procedure.'); return }
    change('procedures', [...form.procedures, { id: uid('PROC'), name: procedureName, date: procedureDate, diagnosisCode: form.diagnosisCode }])
  }
  const finalise = async () => {
    if (!selected || !can('clinical.finalize')) { setActionError('Your role cannot finalise consultations.'); return }
    if (form.disposition === 'Admit' && (!form.admitWardId || !(form.admitReason || '').trim())) { setActionError('Choose a ward and clinical indication for the admission.'); return }
    const blockers = claimGaps(form, data)
    if (blockers.length) { setActionError(`Cannot finalise: ${blockers.join(' ')}`); return }
    const now = new Date().toISOString()
    const finalized = { ...form, status: 'Finalised', finalisedAt: now, finalizedBy: DOCTOR_NAME }
    const queue = data.queue.map((entry) => entry.id === selected.id ? { ...entry, stage: form.disposition === 'Admit' ? 'Admitted' : 'Pharmacy / billing', outcome: form.disposition, finalizedAt: now } : entry)
    const doctor = { ...data.doctor, drafts: [...data.doctor.drafts.filter((item) => item.encounterId !== selected.id), finalized] }
    let nurse = data.nurse
    let updatedDoctor = doctor
    if (form.disposition === 'Refer') {
      updatedDoctor = {
        ...doctor,
        referrals: [...(doctor.referrals || []), {
          id: uid('REF'), patientId: selected.patientId, encounterId: selected.id,
          facility: form.referralFacility.trim(), reason: form.referralReason.trim(),
          referredBy: DOCTOR_NAME, referredAt: now, status: 'Pending',
        }],
      }
    }
    if (form.disposition === 'Admit') {
      const admission = {
        id: uid('ADM'), patientId: selected.patientId, requestedAt: now, department: selected.department || 'General medicine',
        reason: form.admitReason.trim(), priority: form.admitPriority || 'Routine',
        status: 'Awaiting bed', wardId: form.admitWardId, bedId: '', encounterId: selected.id, requestedBy: DOCTOR_NAME,
      }
      nurse = { ...nurse, admissions: [admission, ...(nurse.admissions || [])] }
    }
    const payments = alreadyCharged(data.payments, 'Consultation', selected.id) ? data.payments : [consultationCharge(data, selected, now), ...data.payments]
    if (await commit({ ...data, queue, doctor: updatedDoctor, nurse, payments })) {
      setDraftState({ encounterId: selected.id, value: finalized })
      setMessage(form.disposition === 'Admit' ? 'Consultation finalised, fee sent to billing and admission request sent to the ward.' : 'Consultation finalised and fee sent to billing.')
      setActionError('')
    }
  }

  return <>
    <PageHeader title="Consultation" description="Review the patient chart, document clinical decisions, and coordinate care across services." actions={<div className="hms-doctor__action-row"><Link className="hms-doctor__button hms-doctor__button--quiet" to={selected ? `/patient/${selected.patientId}` : '/doctor/queue'}><Icon name="users" size={16} />Patient chart</Link><Link className="hms-doctor__button hms-doctor__button--quiet" to="/doctor/queue"><Icon name="listOrdered" size={16} />My queue</Link></div>} />
    <div className="hms-doctor">
      <DoctorError error={error} />
      {message ? <DoctorNotice tone="success">{message}</DoctorNotice> : null}
      {actionError ? <DoctorNotice tone="error">{actionError}</DoctorNotice> : null}
      {entries.length ? <div className="hms-doctor__consult-layout">
        <aside className="hms-doctor__consult-sidebar">
          <DoctorPanel title="Encounter" description="Select a clinician-ready outpatient visit.">
            <label className="hms-doctor__field"><span>Patient encounter</span><select value={selected?.id || ''} onChange={(event) => { setSelectedId(event.target.value); setMessage(''); setActionError('') }}>{entries.map((entry) => { const person = patientFor(data, entry.patientId); return <option key={entry.id} value={entry.id}>{person?.firstName} {person?.lastName} · {entry.id}</option> })}</select></label>
            {selected && patient ? <div className="hms-doctor__selected-patient"><DoctorPatient patient={patient} secondary={selected.department} /><StatusBadge tone={statusTone(selected.stage)}>{selected.stage}</StatusBadge><p>{selected.reason || 'No presenting concern recorded'}</p><small>{selected.triage?.recordedAt ? `Triage by ${selected.triage.recordedBy || 'Nursing team'} · ${selected.triage.priority || selected.priority}` : 'No structured triage observations available.'}</small><Link className="hms-doctor__button hms-doctor__button--quiet" to={`/patient/${selected.patientId}`}>View complete patient chart <Icon name="arrowUpRight" size={14} /></Link></div> : null}
            {selected?.stage === 'Waiting for clinician' ? <button type="button" className="hms-doctor__button hms-doctor__button--primary hms-doctor__full-button" onClick={startConsultation}><Icon name="stethoscope" size={16} />Start consultation</button> : null}
          </DoctorPanel>
          <DoctorPanel title="Claim readiness" description="Resolve these items before finalisation.">
            {gaps.length ? <ul className="hms-doctor__gap-list">{gaps.map((gap) => <li key={gap}><Icon name="alertCircle" size={15} />{gap}</li>)}</ul> : <DoctorNotice tone="success">Required encounter fields are complete.</DoctorNotice>}
          </DoctorPanel>
        </aside>
        {selected ? <div className={`hms-doctor__consult-main${draftReadOnly ? ' is-readonly' : ''}`}>
          <nav className="hms-doctor__consult-tabs" role="tablist" aria-label="Consultation sections">{['Consultation', 'Investigations', 'Medicines', 'Plan'].map((tab) => <button key={tab} type="button" role="tab" aria-selected={consultTab === tab} onClick={() => setConsultTab(tab)}>{tab}</button>)}</nav>
          {consultTab === 'Consultation' ? <>
          <DoctorPanel title="Clinical notes" description="Presenting concern, relevant history, and examination.">
            <p className="hms-doctor__muted">{form.complaints || form.history || form.examination ? 'Clinical notes are recorded for this encounter.' : 'No clinical notes have been entered.'}</p>
            <button type="button" className="hms-doctor__button hms-doctor__button--quiet" onClick={() => setFormDialog('notes')} disabled={draftReadOnly}><Icon name="edit" size={15} />Edit clinical notes</button>
          </DoctorPanel>
          <DoctorPanel title="Diagnosis" description="Select a coded diagnosis. One code is required before finalisation.">
            <p className="hms-doctor__muted">{form.diagnosisCode ? `${form.diagnosisCode} · ${form.diagnosisDescription}` : 'No diagnosis selected.'}</p>
            <button type="button" className="hms-doctor__button hms-doctor__button--quiet" onClick={() => setFormDialog('diagnosis')} disabled={draftReadOnly}><Icon name="edit" size={15} />Select diagnosis</button>
          </DoctorPanel>
          </> : null}
          {consultTab === 'Investigations' ? <DoctorPanel title="Investigations" description="New laboratory orders are shared with the Lab worklist and block finalisation until verified.">
            {form.orders.length ? <ul className="hms-doctor__line-list">{form.orders.map((item) => <li key={item.id}><span><strong>{item.name}</strong><small>{item.orderId ? `${item.orderId} · ${item.status}` : `${item.priority} priority · draft`}</small></span>{!item.orderId && !draftReadOnly ? <button type="button" className="hms-doctor__icon-button" aria-label={`Remove ${item.name}`} onClick={() => change('orders', form.orders.filter((row) => row.id !== item.id))}><Icon name="trash" size={15} /></button> : null}</li>)}</ul> : <p className="hms-doctor__muted">No investigations added to this consultation.</p>}
            <div className="hms-doctor__action-row"><button type="button" className="hms-doctor__button hms-doctor__button--quiet" onClick={() => setFormDialog('investigations')} disabled={draftReadOnly}><Icon name="plus" size={15} />Add investigation</button><button type="button" className="hms-doctor__button hms-doctor__button--primary" onClick={placeOrders} disabled={draftReadOnly || !can('clinical.order')}><Icon name="send" size={15} />Place new lab orders</button></div>
          </DoctorPanel> : null}
          {consultTab === 'Medicines' ? <DoctorPanel title="Prescriptions" description="Prescriptions are sent to the Pharmacy queue for review and dispensing.">
            {allergies.length ? <DoctorNotice tone="warning">Recorded allergy information: {allergies.join(', ')}. Conflicting medicines are blocked.</DoctorNotice> : null}
            {form.prescriptions.length ? <ul className="hms-doctor__line-list">{form.prescriptions.map((item) => { const medicine = data.pharmacy.medicines.find((row) => row.id === item.medicineId); return <li key={item.id}><span><strong>{medicine?.name || 'Medicine'} · {item.dose}</strong><small>{item.frequency} · {item.durationDays} days · Qty {item.prescribedQuantity}{item.prescriptionId ? ` · ${item.prescriptionId} sent` : ''}</small></span>{!item.prescriptionId && !draftReadOnly ? <button type="button" className="hms-doctor__icon-button" aria-label="Remove prescription" onClick={() => change('prescriptions', form.prescriptions.filter((row) => row.id !== item.id))}><Icon name="trash" size={15} /></button> : null}</li> })}</ul> : <p className="hms-doctor__muted">No prescription items added.</p>}
            <div className="hms-doctor__action-row"><button type="button" className="hms-doctor__button hms-doctor__button--quiet" onClick={() => setFormDialog('prescriptions')} disabled={draftReadOnly}><Icon name="plus" size={15} />Add prescription</button><button type="button" className="hms-doctor__button hms-doctor__button--primary" onClick={createPrescription} disabled={draftReadOnly || !can('clinical.prescribe')}><Icon name="pill" size={15} />Send to pharmacy</button></div>
          </DoctorPanel> : null}
          {consultTab === 'Plan' ? <>
          <DoctorPanel title="Procedures" description="Every procedure must include an encounter diagnosis and date.">
            {form.procedures.map((procedure) => <div className="hms-doctor__procedure-row" key={procedure.id}><strong>{procedure.name}</strong><span>{procedure.date} · {procedure.diagnosisCode}</span></div>)}
            <button type="button" className="hms-doctor__button hms-doctor__button--quiet" onClick={() => setFormDialog('procedures')} disabled={draftReadOnly}><Icon name="plus" size={15} />Add procedure</button>
          </DoctorPanel>
          <DoctorPanel title="Referral and disposition" description="Record where the patient is going next.">
            <p className="hms-doctor__muted">{form.disposition || 'No disposition selected.'}</p>
            <button type="button" className="hms-doctor__button hms-doctor__button--quiet" onClick={() => setFormDialog('disposition')} disabled={draftReadOnly}><Icon name="edit" size={15} />Edit plan</button>
          </DoctorPanel>
          </> : null}
          <Dialog open={formDialog === 'notes'} title="Clinical notes" description="Document the encounter's presenting concern and clinical assessment." onClose={() => setFormDialog('')} size="large">
            <div className="hms-doctor__form-grid"><DoctorField label="Presenting complaints" value={form.complaints} onChange={(value) => change('complaints', value)} textarea rows={3} disabled={draftReadOnly} /><DoctorField label="Relevant history" value={form.history} onChange={(value) => change('history', value)} textarea rows={3} disabled={draftReadOnly} /><DoctorField label="Examination and assessment" value={form.examination} onChange={(value) => change('examination', value)} textarea rows={4} disabled={draftReadOnly} /></div>
          </Dialog>
          <Dialog open={formDialog === 'diagnosis'} title="Select diagnosis" description="Choose the encounter's primary coded diagnosis." onClose={() => setFormDialog('')}>
            <div className="hms-doctor__form-grid hms-doctor__form-grid--diagnosis"><DoctorField label="ICD-10 code and description" value={form.diagnosisCode} onChange={(value) => { const option = DIAGNOSIS_OPTIONS.find((item) => item.code === value); setDraftState({ encounterId: selected.id, value: { ...form, diagnosisCode: value, diagnosisDescription: option?.description || '' } }) }} options={[{ value: '', label: 'Choose a diagnosis' }, ...DIAGNOSIS_OPTIONS.map((item) => ({ value: item.code, label: `${item.code} · ${item.description}` }))]} disabled={draftReadOnly} /><p className="hms-doctor__hint">Confirm the diagnosis against the hospital&apos;s approved coding catalogue.</p></div>
          </Dialog>
          <Dialog open={formDialog === 'investigations'} title="Add laboratory investigation" description="Add an order to this encounter." onClose={() => setFormDialog('')}>
            <div className="hms-doctor__inline-fields"><DoctorField label="Laboratory test" value={orderTest} onChange={setOrderTest} options={[{ value: '', label: 'Select a test' }, ...data.lab.catalogue.map((test) => ({ value: test.id, label: test.name }))]} disabled={draftReadOnly} /><DoctorField label="Priority" value={orderPriority} onChange={setOrderPriority} options={['Routine', 'Priority', 'Urgent']} disabled={draftReadOnly} /><button type="button" className="hms-doctor__button hms-doctor__button--quiet" onClick={addOrder} disabled={draftReadOnly}>Add test</button></div>
          </Dialog>
          <Dialog open={formDialog === 'prescriptions'} title="Add prescription" description="Add a medicine and structured dosing instructions." onClose={() => setFormDialog('')} size="large">
            <div className="hms-doctor__prescription-fields"><DoctorField label="Medicine" value={medicineId} onChange={setMedicineId} options={[{ value: '', label: 'Select from pharmacy formulary' }, ...data.pharmacy.medicines.map((item) => ({ value: item.id, label: `${item.name} · ${item.form}` }))]} disabled={draftReadOnly} /><DoctorField label="Dose" value={dose} onChange={setDose} placeholder="e.g. 1" disabled={draftReadOnly} /><DoctorField label="Frequency" value={frequency} onChange={setFrequency} placeholder="e.g. 1 DAILY" disabled={draftReadOnly} /><DoctorField label="Duration (days)" type="number" min="1" value={durationDays} onChange={setDurationDays} disabled={draftReadOnly} /><DoctorField label="Quantity" type="number" min="1" value={quantity} onChange={setQuantity} disabled={draftReadOnly} /></div>
            {allergyConflict ? <DoctorNotice tone="error">This medicine conflicts with the patient allergy record. Prescribing is blocked.</DoctorNotice> : null}
            <button type="button" className="hms-doctor__button hms-doctor__button--quiet" onClick={addPrescription} disabled={draftReadOnly || allergyConflict}>Add item</button>
          </Dialog>
          <Dialog open={formDialog === 'procedures'} title="Add procedure" description="Record the procedure and its date for this encounter." onClose={() => setFormDialog('')}>
            <div className="hms-doctor__inline-fields"><DoctorField label="Procedure" value={procedureName} onChange={setProcedureName} options={PROCEDURES} disabled={draftReadOnly} /><DoctorField label="Date" type="date" value={procedureDate} onChange={setProcedureDate} disabled={draftReadOnly} /><button type="button" className="hms-doctor__button hms-doctor__button--quiet" onClick={addProcedure} disabled={draftReadOnly}>Add procedure</button></div>
          </Dialog>
          <Dialog open={formDialog === 'disposition'} title="Referral and disposition" description="Record where the patient is going next." onClose={() => setFormDialog('')}>
            <div className="hms-doctor__form-grid hms-doctor__form-grid--diagnosis"><DoctorField label="Disposition" value={form.disposition} onChange={(value) => change('disposition', value)} options={[{ value: '', label: 'Select a disposition' }, 'Discharge home', 'Admit', 'Refer', 'Follow-up']} disabled={draftReadOnly} />{form.disposition === 'Refer' ? <><DoctorField label="Facility or service" value={form.referralFacility} onChange={(value) => change('referralFacility', value)} placeholder="Referral facility name" disabled={draftReadOnly} /><DoctorField label="Referral reason" value={form.referralReason} onChange={(value) => change('referralReason', value)} placeholder="Reason and relevant instructions" disabled={draftReadOnly} /></> : null}{form.disposition === 'Admit' ? <><DoctorField label="Admit to ward" value={form.admitWardId} onChange={(value) => change('admitWardId', value)} options={[{ value: '', label: (data.nurse?.wards || []).length ? 'Select a ward' : 'No wards configured' }, ...(data.nurse?.wards || []).map((ward) => ({ value: ward.id, label: ward.name || ward.id }))]} disabled={draftReadOnly} /><DoctorField label="Admission priority" value={form.admitPriority} onChange={(value) => change('admitPriority', value)} options={['Routine', 'Priority', 'Emergency']} disabled={draftReadOnly} /><DoctorField label="Clinical indication" value={form.admitReason} onChange={(value) => change('admitReason', value)} placeholder="Reason for admission" disabled={draftReadOnly} /></> : null}</div>
          </Dialog>
          <DoctorPanel title="Investigations" description="New laboratory orders are shared with the Lab worklist and block finalisation until verified.">
            {form.orders.length ? <ul className="hms-doctor__line-list">{form.orders.map((item) => <li key={item.id}><span><strong>{item.name}</strong><small>{item.orderId ? `${item.orderId} · ${item.status}` : `${item.priority} priority · draft`}</small></span>{!item.orderId && !draftReadOnly ? <button type="button" className="hms-doctor__icon-button" aria-label={`Remove ${item.name}`} onClick={() => change('orders', form.orders.filter((row) => row.id !== item.id))}><Icon name="trash" size={15} /></button> : null}</li>)}</ul> : <p className="hms-doctor__muted">No investigations added to this consultation.</p>}
            <div className="hms-doctor__inline-fields"><DoctorField label="Laboratory test" value={orderTest} onChange={setOrderTest} options={[{ value: '', label: 'Select a test' }, ...data.lab.catalogue.map((test) => ({ value: test.id, label: test.name }))]} disabled={draftReadOnly} /><DoctorField label="Priority" value={orderPriority} onChange={setOrderPriority} options={['Routine', 'Priority', 'Urgent']} disabled={draftReadOnly} /><button type="button" className="hms-doctor__button hms-doctor__button--quiet" onClick={addOrder} disabled={draftReadOnly}>Add test</button></div>
            <button type="button" className="hms-doctor__button hms-doctor__button--primary" onClick={placeOrders} disabled={draftReadOnly || !can('clinical.order')}><Icon name="send" size={15} />Place new lab orders</button>
          </DoctorPanel>
          <DoctorPanel title="Prescriptions" description="Structured dose, frequency, duration and quantity are sent to the Pharmacy queue.">
            {allergies.length ? <DoctorNotice tone="warning">Recorded allergy information: {allergies.join(', ')}. Conflicting medicines are blocked.</DoctorNotice> : null}
            {form.prescriptions.length ? <ul className="hms-doctor__line-list">{form.prescriptions.map((item) => { const medicine = data.pharmacy.medicines.find((row) => row.id === item.medicineId); return <li key={item.id}><span><strong>{medicine?.name || 'Medicine'} · {item.dose}</strong><small>{item.frequency} · {item.durationDays} days · Qty {item.prescribedQuantity}{item.prescriptionId ? ` · ${item.prescriptionId} sent` : ''}</small></span>{!item.prescriptionId && !draftReadOnly ? <button type="button" className="hms-doctor__icon-button" aria-label="Remove prescription" onClick={() => change('prescriptions', form.prescriptions.filter((row) => row.id !== item.id))}><Icon name="trash" size={15} /></button> : null}</li> })}</ul> : <p className="hms-doctor__muted">No prescription items added.</p>}
            <div className="hms-doctor__prescription-fields">
              <DoctorField label="Medicine" value={medicineId} onChange={setMedicineId} options={[{ value: '', label: 'Select from pharmacy formulary' }, ...data.pharmacy.medicines.map((item) => ({ value: item.id, label: `${item.name} · ${item.form}` }))]} disabled={draftReadOnly} />
              <DoctorField label="Dose" value={dose} onChange={setDose} placeholder="e.g. 1" disabled={draftReadOnly} />
              <DoctorField label="Frequency" value={frequency} onChange={setFrequency} placeholder="e.g. 1 DAILY" disabled={draftReadOnly} />
              <DoctorField label="Duration (days)" type="number" min="1" value={durationDays} onChange={setDurationDays} disabled={draftReadOnly} />
              <DoctorField label="Quantity" type="number" min="1" value={quantity} onChange={setQuantity} disabled={draftReadOnly} />
            </div>
            {allergyConflict ? <DoctorNotice tone="error">This medicine conflicts with the patient allergy record. Prescribing is blocked.</DoctorNotice> : null}
            <div className="hms-doctor__action-row"><button type="button" className="hms-doctor__button hms-doctor__button--quiet" onClick={addPrescription} disabled={draftReadOnly || allergyConflict}>Add item</button><button type="button" className="hms-doctor__button hms-doctor__button--primary" onClick={createPrescription} disabled={draftReadOnly || !can('clinical.prescribe')}><Icon name="pill" size={15} />Send to pharmacy</button></div>
          </DoctorPanel>
          <DoctorPanel title="Procedures" description="Every procedure must include an encounter diagnosis and date.">
            {form.procedures.map((procedure) => <div className="hms-doctor__procedure-row" key={procedure.id}><strong>{procedure.name}</strong><span>{procedure.date} · {procedure.diagnosisCode}</span></div>)}
            <div className="hms-doctor__inline-fields"><DoctorField label="Procedure" value={procedureName} onChange={setProcedureName} options={PROCEDURES} disabled={draftReadOnly} /><DoctorField label="Date" type="date" value={procedureDate} onChange={setProcedureDate} disabled={draftReadOnly} /><button type="button" className="hms-doctor__button hms-doctor__button--quiet" onClick={addProcedure} disabled={draftReadOnly}>Add procedure</button></div>
          </DoctorPanel>
          <DoctorPanel title="Referral and disposition" description="Record where the patient is going next.">
            <div className="hms-doctor__form-grid hms-doctor__form-grid--diagnosis">
              <DoctorField label="Disposition" value={form.disposition} onChange={(value) => change('disposition', value)} options={[{ value: '', label: 'Select a disposition' }, 'Discharge home', 'Admit', 'Refer', 'Follow-up']} disabled={draftReadOnly} />
              {form.disposition === 'Refer' ? <><DoctorField label="Facility or service" value={form.referralFacility} onChange={(value) => change('referralFacility', value)} placeholder="Referral facility name" disabled={draftReadOnly} /><DoctorField label="Referral reason" value={form.referralReason} onChange={(value) => change('referralReason', value)} placeholder="Reason and relevant instructions" disabled={draftReadOnly} /></> : null}
            </div>
          </DoctorPanel>
          <div className="hms-doctor__finalize-bar"><span>{draftReadOnly ? `Finalised ${form.finalisedAt ? new Date(form.finalisedAt).toLocaleString() : ''}` : `${gaps.length} item${gaps.length === 1 ? '' : 's'} to resolve`}</span><button type="button" className="hms-doctor__button hms-doctor__button--primary" onClick={finalise} disabled={draftReadOnly || !can('clinical.finalize')}><Icon name="checkCircle" size={16} />Finalise consultation</button></div>
        </div> : null}
      </div> : <DoctorEmpty title="No active encounters">Open the OPD queue to find active patients.</DoctorEmpty>}
    </div>
  </>
}
