import { useMemo, useState, useSyncExternalStore } from 'react'
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  FlaskConical,
  HeartPulse,
  Pill,
  Plus,
  Save,
  Search,
  Stethoscope,
  UserRound,
  X,
} from 'lucide-react'
import { getAppointments, subscribeToAppointments, updateAppointments } from '../front-desk/frontDeskStore.js'
import { getDemoPatients, subscribeToDemoPatients } from '../patients/patientStore.js'
import PatientLink from '../patients/PatientLink.jsx'
import { useRoleAccess } from '../../access/roleAccess.js'
import { calculatePrescriptionBilling, createCareId, getCareData, subscribeToCareData, updateCareData } from './careStore.js'
import { formatClockTime, formatDateTime12 } from '../shared/TimeInput.jsx'
import './CarePages.css'

const today = new Date().toISOString().slice(0, 10)
const clinicianName = 'Dr. Jordan Mensah'
const diagnosisCatalog = [
  { icd10: 'B50.9', gdrgCode: 'MEDI28A', diagnosis: 'Plasmodium Falciparum Malaria' },
  { icd10: 'J18.9', gdrgCode: 'MEDI31A', diagnosis: 'Pneumonia' },
]
const initialForm = { chiefComplaint: '', history: '', examination: '', diagnosis: '', diagnoses: [], plan: '' }
const newDiagnosisDraft = () => ({ id: createCareId('DX-DRAFT'), icd10: '', gdrgCode: '', diagnosis: '' })
const newLabDraft = () => ({ id: createCareId('LAB-DRAFT'), inventoryItemId: '', priority: 'Routine', clinicalNote: '' })
const newPrescriptionDraft = () => ({ id: createCareId('RX-DRAFT'), inventoryItemId: '', dose: '', frequency: '', duration: '', quantity: '', instructions: '' })
const initialInventoryForm = { name: '', unit: '', onHand: '', reorderLevel: '', claimCode: '', retailPrice: '', trackStock: true }
const currencyFormatter = new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 })
const createInventoryMovement = ({ item, type, quantity, balance, reference = '' }) => ({
  id: createCareId('MOV'),
  inventoryItemId: item.id,
  itemCode: item.itemCode,
  itemName: item.name,
  department: item.department,
  type,
  quantity,
  balance,
  unit: item.unit,
  reference,
  createdAt: currentTimestamp(),
})
function getInventoryMovements(data) {
  if (Array.isArray(data.inventoryMovements) && data.inventoryMovements.length) return data.inventoryMovements
  return (data.inventory || []).filter((item) => item.trackStock && item.onHand > 0).map((item) => ({
    id: `OPEN-${item.id}`,
    inventoryItemId: item.id,
    itemCode: item.itemCode,
    itemName: item.name,
    department: item.department,
    type: 'Opening balance snapshot',
    quantity: item.onHand,
    balance: item.onHand,
    unit: item.unit,
    reference: 'Existing preview stock at ledger introduction',
    createdAt: '',
  }))
}

function formatCurrency(value) {
  return currencyFormatter.format(value)
}

function formatDateTime(value) {
  return formatDateTime12(value)
}

function currentTimestamp() {
  return new Date().toISOString()
}

function useCareSnapshot() {
  return useSyncExternalStore(subscribeToCareData, getCareData, getCareData)
}

function CarePageHeader({ icon: Icon, title, description, aside }) {
  return (
    <header className="care-page-heading">
      <div>
        <div className="care-page-eyebrow"><Icon size={15} /> Care operations</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {aside}
    </header>
  )
}

function ClinicalPage({ pageId = 'consultation', pageTitle = 'Consultation' }) {
  const { hasPermission } = useRoleAccess()
  const canConsult = hasPermission('clinical.consult')
  const canReviewResults = hasPermission('clinical.results.review')
  const appointments = useSyncExternalStore(subscribeToAppointments, getAppointments, getAppointments)
  const patients = useSyncExternalStore(subscribeToDemoPatients, getDemoPatients, getDemoPatients)
  const careData = useCareSnapshot()
  const [query, setQuery] = useState('')
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('')
  const [form, setForm] = useState(initialForm)
  const [labDrafts, setLabDrafts] = useState(() => [newLabDraft()])
  const [prescriptionDrafts, setPrescriptionDrafts] = useState(() => [newPrescriptionDraft()])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const labInventory = careData.inventory.filter((item) => item.department === 'laboratory')
  const pharmacyInventory = careData.inventory.filter((item) => item.department === 'pharmacy')

  const clinicalVisits = useMemo(
    () => appointments
      // Active encounters must remain visible after midnight until they are
      // clinically resolved; appointment date is not an encounter expiry date.
      .filter((appointment) => ['With clinician', 'In consultation'].includes(appointment.status))
      .filter((appointment) => pageId === 'results-inbox'
        ? careData.labOrders.some((order) => order.appointmentId === appointment.id && order.status === 'Result ready' && !order.reviewedAt)
        : pageId === 'doctor-queue'
          ? !careData.consultations.some((consultation) => consultation.appointmentId === appointment.id && consultation.status !== 'Completed')
          : pageId === 'consultation'
            ? careData.consultations.some((consultation) => consultation.appointmentId === appointment.id && consultation.status !== 'Completed')
            : true)
      .sort((left, right) => left.time.localeCompare(right.time)),
    [appointments, careData.consultations, careData.labOrders, pageId],
  )
  const visibleVisits = useMemo(() => {
    const term = query.trim().toLowerCase()
    return clinicalVisits.filter((appointment) =>
      `${appointment.patientName} ${appointment.patientId} ${appointment.department} ${appointment.clinician}`
        .toLowerCase()
        .includes(term),
    )
  }, [clinicalVisits, query])
  const selectedAppointment = appointments.find((appointment) => appointment.id === selectedAppointmentId)
  const selectedPatient = patients.find((patient) => patient.id === selectedAppointment?.patientId)
  const consultation = careData.consultations.find((item) => item.appointmentId === selectedAppointmentId)
  const relatedLabs = careData.labOrders.filter((item) => item.appointmentId === selectedAppointmentId)
  const relatedPrescriptions = careData.prescriptions.filter((item) => item.appointmentId === selectedAppointmentId)
  const waitingForResults = relatedLabs.some((item) => item.status !== 'Result ready')
  const consultationsAwaitingResults = careData.consultations.filter((item) =>
    item.status === 'Awaiting results' &&
    careData.labOrders.some((order) => order.appointmentId === item.appointmentId && order.status !== 'Result ready'),
  ).length
  const labResultsToReview = careData.labOrders.filter((order) =>
    order.status === 'Result ready' &&
    !order.reviewedAt &&
    careData.consultations.find((item) => item.id === order.consultationId)?.status !== 'Completed',
  ).length

  const reviewLabResult = (orderId) => {
    if (!canReviewResults) return
    const reviewedAt = currentTimestamp()
    updateCareData((current) => {
      const labOrders = current.labOrders.map((order) =>
        order.id === orderId && order.status === 'Result ready' && !order.reviewedAt
          ? { ...order, reviewedAt }
          : order,
      )
      const reviewedOrder = current.labOrders.find((order) => order.id === orderId)
      if (!reviewedOrder) return current
      const hasOutstandingResults = labOrders.some((order) =>
        order.appointmentId === reviewedOrder.appointmentId
        && (order.status !== 'Result ready' || !order.reviewedAt),
      )
      return {
        ...current,
        labOrders,
        consultations: hasOutstandingResults
          ? current.consultations
          : current.consultations.map((item) =>
            item.appointmentId === reviewedOrder.appointmentId && item.status === 'Awaiting results'
              ? { ...item, status: 'In progress', updatedAt: reviewedAt }
              : item,
          ),
      }
    })
    setNotice('Laboratory result marked as reviewed.')
  }

  const openVisit = (appointment) => {
    if (!canConsult && !canReviewResults) return
    const currentConsultation = careData.consultations.find((item) => item.appointmentId === appointment.id)
    // Opening a visit is read-only. Result review is recorded only through
    // the explicit per-result action in the encounter workspace.
    setSelectedAppointmentId(appointment.id)
    setForm({ ...initialForm, ...(currentConsultation || {}) })
    setError('')
    setNotice('')
    setLabDrafts([newLabDraft()])
    setPrescriptionDrafts([newPrescriptionDraft()])
  }

  const persistConsultation = (status) => {
    if (!selectedAppointment) return null
    const existing = careData.consultations.find((item) => item.appointmentId === selectedAppointment.id)
    const timestamp = currentTimestamp()
    const next = {
      ...(existing || {}),
      id: existing?.id || createCareId('CONS'),
      appointmentId: selectedAppointment.id,
      patientId: selectedAppointment.patientId,
      patientName: selectedAppointment.patientName,
      department: selectedAppointment.department,
      clinician: selectedAppointment.clinician || clinicianName,
      visitType: selectedAppointment.visitType,
      chiefComplaint: form.chiefComplaint.trim(),
      history: form.history.trim(),
      examination: form.examination.trim(),
      diagnosis: form.diagnoses?.find((item) => item.diagnosis)?.diagnosis || form.diagnosis.trim(),
      diagnoses: (form.diagnoses || []).filter((item) => item.diagnosis.trim()).map((item) => ({
        gdrgCode: item.gdrgCode.trim().toUpperCase(),
        icd10: item.icd10.trim().toUpperCase(),
        diagnosis: item.diagnosis.trim(),
      })),
      plan: form.plan.trim(),
      status,
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
    }
    updateCareData((current) => ({
      ...current,
      consultations: existing
        ? current.consultations.map((item) => item.id === existing.id ? next : item)
        : [...current.consultations, next],
    }))
    return next
  }

  const saveAndPause = () => {
    if (!canConsult) return
    const status = waitingForResults ? 'Awaiting results' : 'In progress'
    persistConsultation(status)
    updateAppointments((current) => current.map((item) =>
      item.id === selectedAppointmentId ? { ...item, status: 'With clinician' } : item,
    ))
    setNotice(status === 'Awaiting results' ? 'Saved and paused — consultation is waiting for lab results.' : 'Consultation saved. You can resume it from the queue.')
    setSelectedAppointmentId('')
  }

  const completeConsultation = () => {
    if (!canConsult) return
    if (waitingForResults) {
      setError('Review all pending lab results before completing this consultation. You can save and pause meanwhile.')
      return
    }
    const diagnoses = form.diagnoses || []
    if (!diagnoses.length || diagnoses.some((item) =>
      !item.diagnosis.trim() ||
      !/^[A-Z]\d{2}(?:\.\d{1,4})?$/i.test(item.icd10.trim()) ||
      !/^[A-Z]{4}\d{2}[A-Z]$/i.test(item.gdrgCode.trim()),
    )) {
      setError('Add at least one diagnosis with a valid ICD-10 code and GDRG code before completing the consultation.')
      return
    }
    persistConsultation('Completed')
    updateAppointments((current) => current.map((item) =>
      item.id === selectedAppointmentId ? { ...item, status: 'Completed' } : item,
    ))
    setSelectedAppointmentId('')
    setNotice('Consultation completed and added to the patient record.')
    setError('')
  }

  const addLabOrder = (event) => {
    event.preventDefault()
    if (!canConsult) {
      setError('You do not have permission to create clinical orders.')
      return
    }
    if (!labDrafts.length || labDrafts.some((draft) =>
      !labInventory.some((item) => item.id === draft.inventoryItemId),
    )) {
      setError('Choose a laboratory test for each request row, or remove unused rows.')
      return
    }
    const consultationRecord = persistConsultation('Awaiting results')
    const orders = labDrafts.map((draft) => {
      const test = labInventory.find((item) => item.id === draft.inventoryItemId)
      return {
        id: createCareId('LAB'),
        consultationId: consultationRecord.id,
        appointmentId: selectedAppointment.id,
        patientId: selectedAppointment.patientId,
        patientName: selectedAppointment.patientName,
        department: selectedAppointment.department,
        inventoryItemId: test.id,
        testName: test.name,
        claimGdrgCode: test.claimCode || '',
        claimServiceDate: today,
        priority: draft.priority,
        clinicalNote: draft.clinicalNote.trim(),
        orderedBy: selectedAppointment.clinician || clinicianName,
        status: 'Requested',
        result: '',
        resultNote: '',
        requestedAt: currentTimestamp(),
      }
    })
    updateCareData((current) => ({ ...current, labOrders: [...current.labOrders, ...orders] }))
    setLabDrafts([newLabDraft()])
    setError('')
    setNotice(`${orders.length} lab request${orders.length === 1 ? '' : 's'} sent to Laboratory.`)
  }

  const prescribe = (event) => {
    event.preventDefault()
    if (!canConsult) {
      setError('You do not have permission to prescribe medications.')
      return
    }
    if (!prescriptionDrafts.length || prescriptionDrafts.some((draft) =>
      !pharmacyInventory.some((item) => item.id === draft.inventoryItemId) ||
      !draft.dose.trim() ||
      !draft.frequency.trim() ||
      !Number.isInteger(Number(draft.quantity)) ||
      Number(draft.quantity) < 1,
    )) {
      setError('Choose a medication and enter dose, frequency, and a whole-number quantity for each prescription row.')
      return
    }
    const consultationRecord = persistConsultation(waitingForResults ? 'Awaiting results' : 'In progress')
    const prescriptions = prescriptionDrafts.map((draft) => {
      const medication = pharmacyInventory.find((item) => item.id === draft.inventoryItemId)
      return {
        id: createCareId('RX'),
        consultationId: consultationRecord.id,
        appointmentId: selectedAppointment.id,
        patientId: selectedAppointment.patientId,
        patientName: selectedAppointment.patientName,
        inventoryItemId: medication.id,
        medication: medication.name,
        medicineCode: medication.claimCode || '',
        dose: draft.dose.trim(),
        frequency: draft.frequency.trim(),
        duration: draft.duration.trim(),
        quantity: String(Number(draft.quantity)),
        dispensedQty: Number(draft.quantity),
        nhisPrice: medication.nhisPrice ?? null,
        nhisCategory: medication.nhisCategory || '',
        retailPrice: Number.isFinite(medication.retailPrice) ? medication.retailPrice : null,
        testTopUpCedis: medication.testTopUpCedis ?? null,
        pricingMode: medication.pricingMode || 'verified-retail',
        serviceDate: today,
        prescription: { dose: draft.dose.trim(), frequency: draft.frequency.trim(), duration: draft.duration.trim(), unparsed: '' },
        instructions: draft.instructions.trim(),
        prescribedBy: selectedAppointment.clinician || clinicianName,
        status: 'Sent to pharmacy',
        prescribedAt: currentTimestamp(),
        dispensedAt: '',
      }
    })
    updateCareData((current) => ({ ...current, prescriptions: [...current.prescriptions, ...prescriptions] }))
    setPrescriptionDrafts([newPrescriptionDraft()])
    setError('')
    setNotice(`${prescriptions.length} prescription${prescriptions.length === 1 ? '' : 's'} sent to Pharmacy.`)
  }

  const openPatientRecord = () => {
    if (!selectedPatient) return
    if (canConsult) {
      const status = waitingForResults ? 'Awaiting results' : 'In progress'
      persistConsultation(status)
      updateAppointments((current) => current.map((item) =>
        item.id === selectedAppointment.id ? { ...item, status: 'With clinician' } : item,
      ))
    }
    window.history.pushState({}, '', `/patients/${encodeURIComponent(selectedPatient.id)}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <section className="care-page" aria-labelledby="clinical-title">
      <CarePageHeader
        icon={Stethoscope}
        title={pageTitle}
        description={pageId === 'results-inbox' ? 'Review verified laboratory results and update the clinical encounter.' : pageId === 'doctor-queue' ? 'Prioritise patients handed over by Nursing and open the next clinical encounter.' : 'Review patient history, make a diagnosis, order investigations, and prescribe treatment.'}
        aside={<span className="care-shift-indicator"><i /> Clinician worklist</span>}
      />

      <section className="care-stats" aria-label="Consultation work summary">
        <article><span><UserRound size={15} /> Ready for consultation</span><strong>{clinicalVisits.length}</strong></article>
        <article><span><Clock3 size={15} /> Waiting for lab results</span><strong>{consultationsAwaitingResults}</strong></article>
        <article><span><FlaskConical size={15} /> Lab results to review</span><strong>{labResultsToReview}</strong></article>
        <article><span><Pill size={15} /> Prescriptions at pharmacy</span><strong>{careData.prescriptions.filter((item) => item.status === 'Sent to pharmacy').length}</strong></article>
      </section>

      {notice && <div className="care-inline-notice" role="status"><CheckCircle2 size={15} />{notice}</div>}

      <div className="clinical-layout">
        <section className="content-panel clinical-queue">
          <div className="care-panel-heading">
            <div><h2>{pageId === 'results-inbox' ? 'Results awaiting review' : pageId === 'doctor-queue' ? 'My clinical queue' : 'Consultation queue'}</h2><p>{pageId === 'results-inbox' ? 'Only encounters with verified, unreviewed results are shown.' : 'Patients handed over by Nursing'}</p></div>
            <span>{visibleVisits.length} visits</span>
          </div>
          <label className="care-search">
            <Search size={15} />
            <input aria-label="Search clinician queue" type="search" placeholder="Search patient, ID, department" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="clinical-queue-list">
            {visibleVisits.map((appointment) => {
              const patient = patients.find((item) => item.id === appointment.patientId)
              const draft = careData.consultations.find((item) => item.appointmentId === appointment.id)
              const pendingCount = careData.labOrders.filter((item) => item.appointmentId === appointment.id && item.status !== 'Result ready').length
              const readyCount = careData.labOrders.filter((item) => item.appointmentId === appointment.id && item.status === 'Result ready' && !item.reviewedAt).length
              return (
                <article className={`clinical-queue-item ${selectedAppointmentId === appointment.id ? 'clinical-queue-item--active' : ''}`} key={appointment.id}>
                  <div className="clinical-queue-item-top">
                    <span className="clinical-patient-avatar">{appointment.patientName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
                    <div className="clinical-patient-copy">
                      <strong><PatientLink patientId={appointment.patientId}>{appointment.patientName}</PatientLink></strong>
                      <span>{appointment.patientId} · {appointment.department}</span>
                      <small>{patient?.sex || 'Patient'} · {formatClockTime(appointment.time)} · {appointment.visitType}</small>
                    </div>
                  </div>
                  <div className="clinical-queue-item-bottom">
                    <span className={`clinical-queue-state ${readyCount ? 'clinical-queue-state--results-ready' : draft ? `clinical-queue-state--${draft.status.toLowerCase().replaceAll(' ', '-')}` : ''}`}>
                      {pendingCount
                        ? `${pendingCount} lab result${pendingCount > 1 ? 's' : ''} pending`
                        : readyCount
                          ? `${readyCount} lab result${readyCount > 1 ? 's' : ''} ready`
                          : draft?.status || appointment.status}
                    </span>
                    {(canConsult || canReviewResults) && <button className="clinical-open-button" type="button" onClick={() => openVisit(appointment)}>
                      {canConsult ? draft ? 'Resume' : 'Consult' : 'Review'} <ArrowRight size={13} />
                    </button>}
                  </div>
                </article>
              )
            })}
            {!visibleVisits.length && (
              <div className="care-empty-state"><CheckCircle2 size={20} /><strong>Clinician queue is clear</strong><span>Visits passed from Nursing will appear here.</span></div>
            )}
          </div>
        </section>

        <section className="content-panel clinical-workspace" aria-labelledby="clinical-workspace-title">
          {selectedAppointment ? (
            <>
              <div className="clinical-patient-context">
              <div className="clinical-workspace-heading">
                <div>
                  <span className="care-section-kicker"><Stethoscope size={13} /> Active consultation</span>
                  <h2 id="clinical-workspace-title">{selectedAppointment.patientName}</h2>
                  <p>{selectedAppointment.patientId} · {selectedAppointment.department} · {selectedAppointment.visitType}</p>
                </div>
                <button className="care-icon-button" type="button" aria-label="Close consultation" onClick={() => canConsult ? saveAndPause() : setSelectedAppointmentId('')}><X size={17} /></button>
              </div>
              <button type="button" className="care-patient-record-link" onClick={openPatientRecord}>
                <FileText size={14} /> Open full patient record <ArrowRight size={13} />
              </button>
              {selectedAppointment.vitals ? (
                <div className="clinical-vitals-strip">
                  <span><HeartPulse size={14} /> {selectedAppointment.vitals.systolic}/{selectedAppointment.vitals.diastolic} mmHg</span>
                  <span><Activity size={14} /> {selectedAppointment.vitals.pulse} bpm</span>
                  <span>{selectedAppointment.vitals.temperature}°C</span>
                  <span>SpO₂ {selectedAppointment.vitals.oxygenSaturation}%</span>
                  <small>Nursing vitals</small>
                </div>
              ) : (
                <div className="clinical-no-vitals"><Activity size={14} /> No nursing vitals have been recorded for this visit.</div>
              )}

              <div className="clinical-history-strip">
                <strong>Patient history</strong>
                <span>{careData.consultations.filter((item) => item.patientId === selectedAppointment.patientId && item.id !== consultation?.id).length} saved consultations</span>
                <span>{careData.prescriptions.filter((item) => item.patientId === selectedAppointment.patientId).length} prescriptions</span>
                <button type="button" onClick={openPatientRecord}>View chart</button>
              </div>
              </div>

              {canConsult && <div className="clinical-editor">
                <label className="care-field">
                  <span>Chief complaint</span>
                  <input value={form.chiefComplaint} onChange={(event) => setForm({ ...form, chiefComplaint: event.target.value })} placeholder="Patient’s primary concern" />
                </label>
                <label className="care-field">
                  <span>History of present illness</span>
                  <textarea rows={2} value={form.history} onChange={(event) => setForm({ ...form, history: event.target.value })} placeholder="Symptoms, onset, duration, relevant history" />
                </label>
                <label className="care-field">
                  <span>Examination findings</span>
                  <textarea rows={2} value={form.examination} onChange={(event) => setForm({ ...form, examination: event.target.value })} placeholder="Relevant clinical examination" />
                </label>
                <label className="care-field">
                  <span>Assessment and plan</span>
                  <textarea rows={2} value={form.plan} onChange={(event) => setForm({ ...form, plan: event.target.value })} placeholder="Treatment and follow-up plan" />
                </label>
              </div>}

              {canConsult && <section className="clinical-inline-form clinical-data-section clinical-diagnosis-section">
                <div className="clinical-subheading"><h3><Stethoscope size={15} /> Diagnoses</h3><span>Each row carries ICD-10 and GDRG claim fields</span></div>
                <div className="clinical-data-grid">
                  {(form.diagnoses || []).map((diagnosis, index) => {
                    const catalogMatch = diagnosisCatalog.find((item) => item.icd10 === diagnosis.icd10)
                    return (
                      <article className="clinical-data-card clinical-diagnosis-card" key={diagnosis.id || `${diagnosis.icd10}-${index}`}>
                        <div className="clinical-data-card-heading"><strong>Diagnosis {index + 1}</strong><button className="clinical-remove-button" type="button" onClick={() => setForm({ ...form, diagnoses: form.diagnoses.filter((_, rowIndex) => rowIndex !== index) })}>Remove</button></div>
                        <label className="care-field"><span>Diagnosis catalog</span><select value={catalogMatch ? diagnosis.icd10 : diagnosis.diagnosis ? 'other' : ''} onChange={(event) => {
                          const selected = diagnosisCatalog.find((item) => item.icd10 === event.target.value)
                          const diagnoses = [...(form.diagnoses || [])]
                          diagnoses[index] = selected ? { ...diagnoses[index], ...selected } : { ...diagnoses[index], icd10: '', gdrgCode: '', diagnosis: '' }
                          setForm({ ...form, diagnoses })
                        }}><option value="">Choose diagnosis</option>{diagnosisCatalog.map((item) => <option key={item.icd10} value={item.icd10}>{item.diagnosis} · {item.icd10}</option>)}<option value="other">Other — enter billing codes</option></select></label>
                        {catalogMatch ? (
                          <p className="clinical-code-note">ICD-10 <strong>{diagnosis.icd10}</strong><span>GDRG <strong>{diagnosis.gdrgCode}</strong></span></p>
                        ) : (
                          <div className="clinical-form-row">
                            <label className="care-field"><span>Clinical diagnosis</span><input value={diagnosis.diagnosis} onChange={(event) => {
                              const diagnoses = [...(form.diagnoses || [])]
                              diagnoses[index] = { ...diagnoses[index], diagnosis: event.target.value }
                              setForm({ ...form, diagnoses })
                            }} placeholder="Diagnosis description" /></label>
                            <label className="care-field"><span>ICD-10</span><input value={diagnosis.icd10} onChange={(event) => {
                              const diagnoses = [...(form.diagnoses || [])]
                              diagnoses[index] = { ...diagnoses[index], icd10: event.target.value.toUpperCase() }
                              setForm({ ...form, diagnoses })
                            }} placeholder="e.g. J18.9" /></label>
                            <label className="care-field"><span>GDRG code</span><input value={diagnosis.gdrgCode} onChange={(event) => {
                              const diagnoses = [...(form.diagnoses || [])]
                              diagnoses[index] = { ...diagnoses[index], gdrgCode: event.target.value.toUpperCase() }
                              setForm({ ...form, diagnoses })
                            }} placeholder="From approved billing master" /></label>
                          </div>
                        )}
                      </article>
                    )
                  })}
                  {!form.diagnoses?.length && <p className="clinical-empty-note">Add a coded diagnosis. A valid ICD-10 and diagnosis GDRG are required to complete the consultation.</p>}
                </div>
                <button className="clinical-add-button" type="button" onClick={() => setForm({ ...form, diagnoses: [...(form.diagnoses || []), newDiagnosisDraft()] })}><Plus size={14} /> Add diagnosis</button>
              </section>}

              {relatedLabs.length > 0 && (
                <section className="clinical-orders-section">
                  <div className="clinical-subheading"><h3><FlaskConical size={15} /> Investigations</h3><span>{relatedLabs.length} ordered</span></div>
                  {relatedLabs.map((order) => (
                    <div className="clinical-order-row" key={order.id}>
                      <div><strong>{order.testName}</strong><span>{order.priority} · {formatDateTime(order.requestedAt)}</span><small className={order.claimGdrgCode ? '' : 'clinical-claim-warning'}>{order.claimGdrgCode ? `GDRG ${order.claimGdrgCode}` : 'Claims GDRG mapping required'}</small>{order.result && <p>{order.result}{order.resultNote ? ` — ${order.resultNote}` : ''}</p>}</div>
                      <div className="clinical-order-row-actions">
                        <span className={`care-status care-status--${order.status.toLowerCase().replaceAll(' ', '-')}`}>{order.status}</span>
                        {order.status === 'Result ready' && (
                          order.reviewedAt
                            ? <span className="clinical-result-reviewed"><CheckCircle2 size={13} /> Reviewed</span>
                            : canReviewResults && <button className="clinical-add-button" type="button" onClick={() => reviewLabResult(order.id)}>Mark reviewed</button>
                        )}
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {canConsult && <form className="clinical-inline-form" onSubmit={addLabOrder}>
                <div className="clinical-subheading"><h3><FlaskConical size={15} /> Investigation requests</h3><span>Submit multiple tests together</span></div>
                <div className="clinical-data-grid">
                  {labDrafts.map((draft, index) => {
                    const selectedTest = labInventory.find((item) => item.id === draft.inventoryItemId)
                    return (
                      <article className="clinical-data-card" key={draft.id}>
                        <div className="clinical-data-card-heading"><strong>Investigation {index + 1}</strong>{labDrafts.length > 1 && <button className="clinical-remove-button" type="button" onClick={() => setLabDrafts(labDrafts.filter((item) => item.id !== draft.id))}>Remove</button>}</div>
                        <div className="clinical-form-row">
                          <label className="care-field"><span>Test</span><select required value={draft.inventoryItemId} onChange={(event) => setLabDrafts(labDrafts.map((item) => item.id === draft.id ? { ...item, inventoryItemId: event.target.value } : item))}><option value="">Select test</option>{labInventory.map((test) => <option key={test.id} value={test.id}>{test.name} · {test.trackStock ? `${test.onHand} ${test.unit} available` : 'untracked stock'}</option>)}</select></label>
                          <label className="care-field"><span>Priority</span><select value={draft.priority} onChange={(event) => setLabDrafts(labDrafts.map((item) => item.id === draft.id ? { ...item, priority: event.target.value } : item))}><option>Routine</option><option>Urgent</option></select></label>
                        </div>
                        <label className="care-field"><span>Clinical note <i>optional</i></span><input value={draft.clinicalNote} onChange={(event) => setLabDrafts(labDrafts.map((item) => item.id === draft.id ? { ...item, clinicalNote: event.target.value } : item))} placeholder="Reason / specimen instructions" /></label>
                        <p className={`clinical-code-note ${selectedTest?.claimCode ? '' : 'clinical-claim-warning'}`}>{selectedTest?.claimCode ? `CLAIM-it investigation GDRG ${selectedTest.claimCode}` : 'No approved investigation GDRG is configured for this test yet.'}</p>
                      </article>
                    )
                  })}
                </div>
                {!labInventory.length && <p className="clinical-empty-note">Add investigation items in Laboratory inventory before ordering.</p>}
                <div className="clinical-form-actions"><button className="clinical-add-button" type="button" onClick={() => setLabDrafts([...labDrafts, newLabDraft()])}><Plus size={14} /> Add another test</button><button className="clinical-add-button clinical-add-button--primary" type="submit"><Check size={14} /> Send {labDrafts.length} request{labDrafts.length === 1 ? '' : 's'}</button></div>
              </form>}

              {relatedPrescriptions.length > 0 && (
                <section className="clinical-orders-section">
                  <div className="clinical-subheading"><h3><Pill size={15} /> Prescriptions</h3><span>{relatedPrescriptions.length} ordered</span></div>
                  {relatedPrescriptions.map((prescription) => (
                    <div className="clinical-order-row" key={prescription.id}>
                      <div><strong>{prescription.medication} · {prescription.dose}</strong><span>{prescription.frequency}{prescription.duration ? ` · ${prescription.duration}` : ''}</span><small className={prescription.medicineCode ? '' : 'clinical-claim-warning'}>{prescription.medicineCode ? `Medicine code ${prescription.medicineCode}` : 'Claims medicine code required'}</small></div>
                      <span className={`care-status care-status--${prescription.status.toLowerCase().replaceAll(' ', '-')}`}>{prescription.status}</span>
                    </div>
                  ))}
                </section>
              )}

              {canConsult && <form className="clinical-inline-form" onSubmit={prescribe}>
                <div className="clinical-subheading"><h3><Pill size={15} /> Prescriptions</h3><span>Submit multiple catalog items together</span></div>
                <div className="clinical-data-grid">
                  {prescriptionDrafts.map((draft, index) => {
                    const selectedMedication = pharmacyInventory.find((item) => item.id === draft.inventoryItemId)
                    return (
                      <article className="clinical-data-card" key={draft.id}>
                        <div className="clinical-data-card-heading"><strong>Prescription {index + 1}</strong>{prescriptionDrafts.length > 1 && <button className="clinical-remove-button" type="button" onClick={() => setPrescriptionDrafts(prescriptionDrafts.filter((item) => item.id !== draft.id))}>Remove</button>}</div>
                        <div className="clinical-form-row">
                          <label className="care-field"><span>Medication</span><select required value={draft.inventoryItemId} onChange={(event) => setPrescriptionDrafts(prescriptionDrafts.map((item) => item.id === draft.id ? { ...item, inventoryItemId: event.target.value } : item))}><option value="">Select pharmacy item</option>{pharmacyInventory.map((medication) => <option key={medication.id} value={medication.id}>{medication.name} · {medication.trackStock ? `${medication.onHand} ${medication.unit} available` : 'untracked'}</option>)}</select></label>
                          <label className="care-field"><span>Dose</span><input required value={draft.dose} onChange={(event) => setPrescriptionDrafts(prescriptionDrafts.map((item) => item.id === draft.id ? { ...item, dose: event.target.value } : item))} placeholder="As directed by clinician" /></label>
                        </div>
                        <p className={`clinical-code-note ${selectedMedication?.claimCode ? '' : 'clinical-claim-warning'}`}>{selectedMedication?.claimCode ? `CLAIM-it medicine code ${selectedMedication.claimCode}` : 'No approved medicine code is configured for this item yet.'}</p>
                        {selectedMedication?.nhisPrice != null && (
                          <p className="clinical-code-note">
                            NHIS tariff {formatCurrency(selectedMedication.nhisPrice)} · Category {selectedMedication.nhisCategory}
                            {selectedMedication.pricingMode === 'synthetic-test'
                              ? ` · TEST ONLY random add-on ${formatCurrency(selectedMedication.testTopUpCedis)} per unit`
                              : selectedMedication.retailPrice == null
                                ? ' · Full retail price not set; patient top-up is unknown'
                              : ` · Estimated top-up ${formatCurrency(Math.max(0, selectedMedication.retailPrice - selectedMedication.nhisPrice))} per listed item`}
                          </p>
                        )}
                        <div className="clinical-form-row clinical-form-row--three">
                          <label className="care-field"><span>Frequency</span><input required value={draft.frequency} onChange={(event) => setPrescriptionDrafts(prescriptionDrafts.map((item) => item.id === draft.id ? { ...item, frequency: event.target.value } : item))} placeholder="e.g. twice daily" /></label>
                          <label className="care-field"><span>Duration</span><input value={draft.duration} onChange={(event) => setPrescriptionDrafts(prescriptionDrafts.map((item) => item.id === draft.id ? { ...item, duration: event.target.value } : item))} placeholder="e.g. 5 days" /></label>
                          <label className="care-field"><span>Quantity</span><input required type="number" min="1" step="1" value={draft.quantity} onChange={(event) => setPrescriptionDrafts(prescriptionDrafts.map((item) => item.id === draft.id ? { ...item, quantity: event.target.value } : item))} placeholder="Whole units" /></label>
                        </div>
                        <label className="care-field"><span>Instructions <i>optional</i></span><input value={draft.instructions} onChange={(event) => setPrescriptionDrafts(prescriptionDrafts.map((item) => item.id === draft.id ? { ...item, instructions: event.target.value } : item))} placeholder="Additional dispensing instructions" /></label>
                      </article>
                    )
                  })}
                </div>
                {!pharmacyInventory.length && <p className="clinical-empty-note">Add medications in Pharmacy inventory before prescribing.</p>}
                <div className="clinical-form-actions"><button className="clinical-add-button" type="button" onClick={() => setPrescriptionDrafts([...prescriptionDrafts, newPrescriptionDraft()])}><Plus size={14} /> Add another medication</button><button className="clinical-add-button clinical-add-button--primary" type="submit"><Check size={14} /> Send {prescriptionDrafts.length} prescription{prescriptionDrafts.length === 1 ? '' : 's'}</button></div>
              </form>}

              {error && <p className="care-form-error" role="alert">{error}</p>}
              {canConsult && <div className="clinical-actions">
                <button className="button button--secondary" type="button" onClick={saveAndPause}><Save size={14} /> Save &amp; pause</button>
                <button className="button button--primary" type="button" disabled={waitingForResults} title={waitingForResults ? 'Wait for lab results before completing' : ''} onClick={completeConsultation}><Check size={14} /> Complete consultation</button>
              </div>}
              {canConsult && waitingForResults && <p className="clinical-awaiting-note"><Clock3 size={13} /> Complete is paused while lab results are outstanding. Save &amp; pause to attend another patient.</p>}
            </>
          ) : (
            <div className="clinical-workspace-empty">
              <span><Stethoscope size={22} /></span>
              <h2 id="clinical-workspace-title">Select a patient to begin</h2>
              <p>Choose a visit from the clinician queue to review nursing vitals, patient history, investigations and treatment.</p>
              <div><HeartPulse size={14} /> Vitals and past records are available in the patient chart.</div>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

function DepartmentQueuePage({ type, pageId, pageTitle: requestedPageTitle }) {
  const { hasPermission } = useRoleAccess()
  const canDispense = hasPermission('pharmacy.dispense')
  const canVerifyDispensing = hasPermission('pharmacy.verify')
  const canManageInventory = hasPermission('inventory.manage')
  const isLab = type === 'laboratory'
  const canEditInventory = canManageInventory || (isLab && pageId === 'test-catalogue' && hasPermission('lab.catalogue.manage'))
  const canEnterLabResults = hasPermission('lab.results.enter')
  const canVerifyLabResults = hasPermission('lab.results.verify')
  const careData = useCareSnapshot()
  const patients = useSyncExternalStore(subscribeToDemoPatients, getDemoPatients, getDemoPatients)
  const [resultForm, setResultForm] = useState({})
  const [search, setSearch] = useState('')
  const [inventoryForm, setInventoryForm] = useState(initialInventoryForm)
  const [selectedInventoryId, setSelectedInventoryId] = useState('')
  const [inventoryEditForm, setInventoryEditForm] = useState(null)
  const [inventorySearch, setInventorySearch] = useState('')
  const [showAllInventory, setShowAllInventory] = useState(false)
  const [stockError, setStockError] = useState('')
  const [stockNotice, setStockNotice] = useState('')
  const rows = isLab ? careData.labOrders : careData.prescriptions
  const inventory = careData.inventory.filter((item) => item.department === type)
  const matchingInventory = inventory.filter((item) =>
    `${item.name} ${item.itemCode} ${item.claimCode}`.toLowerCase().includes(inventorySearch.trim().toLowerCase()),
  )
  const isCatalogueView = pageId === 'test-catalogue'
  const isSpecimenView = pageId === 'specimens'
  const isCriticalView = pageId === 'critical-results'
  const isLabResultsView = pageId === 'lab-results'
  const isStockAlertsView = pageId === 'stock-alerts'
  const isStockView = ['stock-levels', 'pharmacy-inventory', 'lab-inventory', 'inventory-console'].includes(pageId)
  const isMappingView = pageId === 'formulary-mapping'
  const showInventory = isCatalogueView || isStockView || isStockAlertsView || isMappingView
  const showWorklist = !showInventory
  const inventoryForView = inventory.filter((item) => isStockAlertsView ? item.trackStock && item.reorderLevel > 0 && item.onHand <= item.reorderLevel : isMappingView ? !item.claimCode : true)
  const visibleInventory = (inventorySearch.trim() || showAllInventory ? matchingInventory : matchingInventory.slice(0, 24)).filter((item) => inventoryForView.some((candidate) => candidate.id === item.id))
  const term = search.trim().toLowerCase()
  const visible = rows.filter((item) => {
    const matchesSearch = `${item.patientName} ${item.patientId} ${isLab ? item.testName : item.medication}`.toLowerCase().includes(term)
    if (!matchesSearch) return false
    if (isSpecimenView) return Boolean(item.specimenId) && ['Processing', 'Result entered', 'Result ready'].includes(item.status)
    if (isCriticalView) return Boolean(item.critical) && item.status === 'Result ready'
    if (isLabResultsView) return ['Processing', 'Result entered'].includes(item.status)
    if (pageId === 'lab-worklist') return item.status === 'Requested'
    if (pageId === 'pharmacy-queue') return ['Requested', 'Sent to pharmacy'].includes(item.status)
    if (pageId === 'dispensing-panel') return item.status === 'Verified'
    return true
  })
  const pendingCount = rows.filter((item) => isLab ? item.status !== 'Result ready' : item.status !== 'Dispensed').length
  const completeCount = rows.length - pendingCount
  const pageTitle = requestedPageTitle || (isLab ? 'Laboratory' : 'Pharmacy')
  const selectedInventoryItem = inventory.find((item) => item.id === selectedInventoryId)
  const inventoryMovements = getInventoryMovements(careData).filter((movement) => movement.department === type).slice(0, 100)

  const patchRecord = (recordId, changes) => {
    updateCareData((current) => isLab
      ? { ...current, labOrders: current.labOrders.map((item) => item.id === recordId ? { ...item, ...changes } : item) }
      : { ...current, prescriptions: current.prescriptions.map((item) => item.id === recordId ? { ...item, ...changes } : item) })
  }

  const saveLabResult = (event, item) => {
    event.preventDefault()
    if (!canEnterLabResults) {
      setStockError('You do not have permission to enter laboratory results.')
      return
    }
    const result = resultForm[item.id]?.result?.trim()
    if (item.status !== 'Processing') {
      setStockError('Start processing this investigation before returning a result.')
      return
    }
    if (!result) {
      setStockError('Enter the verified result before returning it to the clinician.')
      return
    }
    patchRecord(item.id, {
      status: 'Result entered',
      result,
      critical: Boolean(resultForm[item.id]?.critical),
      resultNote: resultForm[item.id]?.resultNote?.trim() || '',
      enteredAt: currentTimestamp(),
    })
    setResultForm((current) => ({ ...current, [item.id]: { ...current[item.id], saved: true } }))
    setStockError('')
    setStockNotice('Result saved for verification; it has not yet been returned to the ordering clinician.')
  }

  const verifyLabResult = (item) => {
    if (!canVerifyLabResults) {
      setStockError('You do not have permission to verify laboratory results.')
      return
    }
    if (item.status !== 'Result entered' || !item.result?.trim()) {
      setStockError('Enter and save a result before verification.')
      return
    }
    patchRecord(item.id, {
      status: 'Result ready',
      completedAt: currentTimestamp(),
    })
    setStockError('')
    setStockNotice('Result returned to the ordering clinician.')
  }

  const startLabProcessing = (item) => {
    if (!hasPermission('lab.specimens.manage')) {
      setStockError('You do not have permission to start specimen processing.')
      return
    }
    let problem = ''
    updateCareData((current) => {
      const order = current.labOrders.find((row) => row.id === item.id)
      if (!order || order.status !== 'Requested') {
        problem = 'This request is no longer waiting to be processed.'
        return current
      }
      const stockItem = current.inventory.find((row) => row.id === order.inventoryItemId)
      if (!stockItem) {
        problem = 'The linked laboratory inventory item was not found. The request was not processed.'
        return current
      }
      if (stockItem.trackStock && stockItem.onHand < 1) {
        problem = `Insufficient stock for ${stockItem.name}; receive stock before processing.`
        return current
      }
      return {
        ...current,
        inventory: current.inventory.map((row) => row.id === stockItem.id && row.trackStock
          ? { ...row, onHand: row.onHand - 1 }
          : row),
        labOrders: current.labOrders.map((row) => row.id === item.id
          ? { ...row, status: 'Processing', startedAt: currentTimestamp(), specimenId: row.specimenId || `SP-${Date.now().toString(36).toUpperCase()}`, specimenCollectedAt: currentTimestamp(), stockDeducted: stockItem.trackStock }
          : row),
        inventoryMovements: stockItem.trackStock
          ? [createInventoryMovement({ item: stockItem, type: 'Lab issue', quantity: -1, balance: stockItem.onHand - 1, reference: order.id }), ...getInventoryMovements(current)]
          : getInventoryMovements(current),
      }
    })
    setStockError(problem)
    if (!problem) setStockNotice(`${item.testName} moved to processing; tracked stock was deducted once.`)
  }

  const verifyPrescription = (item) => {
    if (!canVerifyDispensing) {
      setStockError('You do not have permission to verify prescriptions.')
      return
    }
    let problem = ''
    updateCareData((current) => {
      const prescription = current.prescriptions.find((row) => row.id === item.id)
      if (!prescription || !['Requested', 'Sent to pharmacy'].includes(prescription.status)) {
        problem = 'This prescription is no longer waiting for verification.'
        return current
      }
      const quantity = Number(prescription.dispensedQty ?? prescription.quantity)
      if (!Number.isInteger(quantity) || quantity < 1) {
        problem = 'This prescription has no valid whole-number dispense quantity.'
        return current
      }
      const stockItem = current.inventory.find((row) => row.id === prescription.inventoryItemId)
      if (!stockItem) {
        problem = 'The linked pharmacy inventory item was not found. The prescription was not verified.'
        return current
      }
      if (stockItem.trackStock && stockItem.onHand < quantity) {
        problem = `Insufficient ${stockItem.unit} for ${stockItem.name}: ${stockItem.onHand} available, ${quantity} required.`
        return current
      }
      return {
        ...current,
        prescriptions: current.prescriptions.map((row) => row.id === item.id
          ? { ...row, status: 'Verified', verifiedAt: currentTimestamp() }
          : row),
      }
    })
    setStockError(problem)
    if (!problem) setStockNotice(`${item.medication} verified and ready for dispensing.`)
  }

  const dispensePrescription = (item) => {
    if (!canDispense) {
      setStockError('You do not have permission to dispense prescriptions.')
      return
    }
    let problem = ''
    updateCareData((current) => {
      const prescription = current.prescriptions.find((row) => row.id === item.id)
      if (!prescription || prescription.status !== 'Verified') {
        problem = 'Verify this prescription before dispensing; it may already be dispensed or no longer available.'
        return current
      }
      const stockItem = current.inventory.find((row) => row.id === prescription.inventoryItemId)
      const quantity = Number(prescription.dispensedQty ?? prescription.quantity)
      if (!Number.isInteger(quantity) || quantity < 1) {
        problem = 'This prescription has no valid whole-number dispense quantity.'
        return current
      }
      if (!stockItem) {
        problem = 'The linked pharmacy inventory item was not found. The prescription was not dispensed.'
        return current
      }
      if (stockItem.trackStock && stockItem.onHand < quantity) {
        problem = `Insufficient ${stockItem.unit} for ${stockItem.name}: ${stockItem.onHand} available, ${quantity} required.`
        return current
      }
      return {
        ...current,
        inventory: current.inventory.map((row) => row.id === stockItem.id && row.trackStock
          ? { ...row, onHand: row.onHand - quantity }
          : row),
        prescriptions: current.prescriptions.map((row) => row.id === item.id
          ? {
            ...row,
            status: 'Dispensed',
            dispensedAt: currentTimestamp(),
            stockDeducted: stockItem.trackStock,
            billing: calculatePrescriptionBilling({
              prescription: row,
              patient: patients.find((entry) => entry.id === row.patientId),
              serviceDate: today,
            }),
          }
          : row),
        inventoryMovements: stockItem.trackStock
          ? [createInventoryMovement({ item: stockItem, type: 'Dispense', quantity: -quantity, balance: stockItem.onHand - quantity, reference: prescription.id }), ...getInventoryMovements(current)]
          : getInventoryMovements(current),
      }
    })
    setStockError(problem)
    if (!problem) setStockNotice(`${item.medication} dispensed; tracked stock was deducted once.`)
  }

  const addInventoryItem = (event) => {
    event.preventDefault()
    if (!canEditInventory) {
      setStockError('You do not have permission to manage inventory.')
      return
    }
    const openingStock = Number(inventoryForm.onHand)
    const reorderLevel = Number(inventoryForm.reorderLevel || 0)
    const retailPrice = inventoryForm.retailPrice.trim() ? Number(inventoryForm.retailPrice) : null
    if (!inventoryForm.name.trim() || !inventoryForm.unit.trim() || !Number.isInteger(openingStock) || openingStock < 0 || !Number.isInteger(reorderLevel) || reorderLevel < 0) {
      setStockError('Enter an item name, unit, and valid whole-number opening and reorder quantities.')
      return
    }
    if (retailPrice !== null && (!Number.isFinite(retailPrice) || retailPrice < 0)) {
      setStockError('Enter a valid non-negative retail price, or leave it blank until confirmed.')
      return
    }
    const item = {
      id: createCareId(isLab ? 'LAB-STOCK' : 'RX-STOCK'),
      department: type,
      itemCode: createCareId(isLab ? 'LAB' : 'MED').toUpperCase(),
      name: inventoryForm.name.trim(),
      unit: inventoryForm.unit.trim(),
      onHand: openingStock,
      reorderLevel,
      trackStock: inventoryForm.trackStock,
      claimCode: inventoryForm.claimCode.trim().toUpperCase(),
      nhisPrice: null,
      nhisCategory: '',
      retailPrice,
      testTopUpCedis: null,
      pricingMode: 'verified-retail',
    }
    updateCareData((current) => ({
      ...current,
      inventory: [...current.inventory, item],
      inventoryMovements: openingStock > 0 && item.trackStock
        ? [createInventoryMovement({ item, type: 'Opening balance', quantity: openingStock, balance: openingStock }), ...(current.inventoryMovements || [])]
        : current.inventoryMovements || [],
    }))
    setInventoryForm(initialInventoryForm)
    setStockError('')
    setStockNotice(`${item.name} added to ${pageTitle} inventory.`)
  }

  const openInventoryEditor = (item) => {
    setSelectedInventoryId(item.id)
    setInventoryEditForm({
      name: item.name,
      unit: item.unit,
      onHand: String(item.onHand),
      receivedStock: '',
      reorderLevel: String(item.reorderLevel),
      trackStock: item.trackStock,
      claimCode: item.claimCode || '',
      retailPrice: item.retailPrice == null ? '' : String(item.retailPrice),
      retailPriceEdited: false,
    })
    setStockError('')
  }

  const saveInventoryEdits = (event) => {
    event.preventDefault()
    if (!canEditInventory) {
      setStockError('You do not have permission to manage this catalogue.')
      return
    }
    if (!selectedInventoryItem || !inventoryEditForm) return
    const onHand = Number(inventoryEditForm.onHand)
    const receivedStock = inventoryEditForm.receivedStock.trim() === '' ? 0 : Number(inventoryEditForm.receivedStock)
    const reorderLevel = Number(inventoryEditForm.reorderLevel || 0)
    const rawPrice = inventoryEditForm.retailPrice.trim()
    const retailPrice = rawPrice === '' ? null : Number(rawPrice)
    const claimCode = inventoryEditForm.claimCode.trim().toUpperCase()
    const priceChanged = inventoryEditForm.retailPriceEdited || retailPrice !== selectedInventoryItem.retailPrice
    if (!inventoryEditForm.name.trim() || !inventoryEditForm.unit.trim()
      || !Number.isSafeInteger(onHand) || onHand < 0
      || !Number.isSafeInteger(receivedStock) || receivedStock < 0
      || !Number.isSafeInteger(onHand + receivedStock)
      || !Number.isSafeInteger(reorderLevel) || reorderLevel < 0) {
      setStockError('Enter a name, unit, and valid whole-number stock and reorder quantities.')
      return
    }
    if (selectedInventoryItem.claimCode && !claimCode) {
      setStockError('Enter the official billing code before saving this mapping.')
      return
    }
    if (!inventoryEditForm.trackStock && receivedStock > 0) {
      setStockError('Enable stock tracking before receiving stock.')
      return
    }
    if (retailPrice !== null && (!Number.isFinite(retailPrice) || retailPrice < 0)) {
      setStockError('Enter a valid non-negative retail price, or leave it blank until confirmed.')
      return
    }
    const stockAdjustment = onHand - selectedInventoryItem.onHand
    updateCareData((current) => ({
      ...current,
      inventoryMovements: [
        ...(stockAdjustment !== 0 ? [createInventoryMovement({ item: selectedInventoryItem, type: 'Adjustment', quantity: stockAdjustment, balance: onHand })] : []),
        ...(receivedStock > 0 ? [createInventoryMovement({ item: selectedInventoryItem, type: 'Stock received', quantity: receivedStock, balance: onHand + receivedStock })] : []),
        ...(current.inventoryMovements || []),
      ],
      inventory: current.inventory.map((row) => row.id === selectedInventoryItem.id
        ? {
          ...row,
          name: inventoryEditForm.name.trim(),
          unit: inventoryEditForm.unit.trim(),
          onHand: onHand + receivedStock,
          reorderLevel,
          trackStock: inventoryEditForm.trackStock,
          claimCode,
          retailPrice: priceChanged ? retailPrice : row.retailPrice,
          testTopUpCedis: priceChanged ? null : row.testTopUpCedis,
          pricingMode: priceChanged ? retailPrice == null ? 'unconfigured' : 'verified-retail' : row.pricingMode,
        }
        : row),
    }))
    setSelectedInventoryId('')
    setInventoryEditForm(null)
    setStockError('')
    setStockNotice(receivedStock
      ? `${receivedStock} ${inventoryEditForm.unit.trim()} received for ${inventoryEditForm.name.trim()}; inventory updated.`
      : `${inventoryEditForm.name.trim()} inventory updated.`)
  }

  return (
    <section className="care-page" aria-labelledby={`${type}-title`}>
      <CarePageHeader
        icon={isLab ? FlaskConical : Pill}
        title={pageTitle}
        description={isLab ? isCatalogueView ? 'Maintain the laboratory test catalogue and linked billing codes.' : isSpecimenView ? 'Track specimen collection and processing by investigation order.' : isCriticalView ? 'Review results explicitly flagged as critical before clinical handoff.' : isLabResultsView ? 'Enter, verify and return investigation results to the ordering clinician.' : 'Receive clinician requests, process investigations and return verified results.' : isStockAlertsView ? 'Review medicines at or below their configured reorder level.' : isMappingView ? 'Resolve medicines without a CLAIM-it formulary code.' : isStockView ? 'Review stock levels, reorder thresholds and medicine catalogue details.' : 'Review prescriptions sent by clinicians and record medication dispensing.'}
        aside={<span className="care-shift-indicator"><i /> Department worklist</span>}
      />
      <section className="care-stats" aria-label={`${pageTitle} summary`}>
        <article><span>{isLab ? <FlaskConical size={15} /> : <Pill size={15} />} Total orders</span><strong>{rows.length}</strong></article>
        <article><span><Clock3 size={15} /> Awaiting action</span><strong>{pendingCount}</strong></article>
        <article><span><CheckCircle2 size={15} /> {isLab ? 'Results returned' : 'Dispensed'}</span><strong>{completeCount}</strong></article>
        <article><span><UserRound size={15} /> Patients</span><strong>{new Set(rows.map((item) => item.patientId)).size}</strong></article>
      </section>
      {stockError && !selectedInventoryId && <p className="care-form-error" role="alert">{stockError}</p>}
      {stockNotice && <div className="care-inline-notice" role="status"><CheckCircle2 size={15} />{stockNotice}</div>}
      {showInventory && <section className="content-panel department-inventory">
        <div className="care-panel-heading">
          <div><h2>{pageTitle} inventory</h2><p>{isLab ? 'Stock deductions occur at lab processing, and only for tracked items.' : 'Browse the medicine catalogue and review NHIS tariffs and full retail prices.'}</p></div>
          <span>{inventory.length} items · {inventory.filter((item) => item.trackStock && item.reorderLevel > 0 && item.onHand <= item.reorderLevel).length} low</span>
        </div>
        <label className="care-search department-inventory-search">
          <Search size={15} />
          <input type="search" aria-label={isLab ? 'Search laboratory catalogue' : 'Search pharmacy inventory'} placeholder={isLab ? 'Search tests by name or code' : 'Search medicines by name or code'} value={inventorySearch} onChange={(event) => { setInventorySearch(event.target.value); setShowAllInventory(false) }} />
        </label>
        <div className="department-inventory-grid">
          {visibleInventory.map((item) => (
            <button className="department-inventory-card" key={item.id} type="button" onClick={() => openInventoryEditor(item)} aria-label={`View ${item.name} details`}>
              <span className="department-inventory-card-heading">
                <strong>{item.name}</strong>
                <span className="department-inventory-card-code">{item.itemCode || item.id}</span>
              </span>
              <span className="department-inventory-card-nhis">
                <small>{isLab ? 'GDRG code' : 'NHIS tariff'}</small>
                <strong>{isLab ? (item.claimCode || 'Not mapped') : item.nhisPrice != null ? formatCurrency(item.nhisPrice) : 'Not mapped'}</strong>
              </span>
              <span className="department-inventory-card-price">
                <small>Full price</small>
                <strong>{item.retailPrice != null ? formatCurrency(item.retailPrice) : 'Not set'}</strong>
              </span>
            </button>
          ))}
          {!visibleInventory.length && <p className="clinical-empty-note">No matching inventory items. Adjust the search or add an item below.</p>}
        </div>
        {!inventorySearch.trim() && !showAllInventory && matchingInventory.length > visibleInventory.length && (
          <button className="clinical-add-button" type="button" onClick={() => setShowAllInventory(true)}>Show all {matchingInventory.length} {isLab ? 'tests' : 'medicines'}</button>
        )}
        {canEditInventory && <form className="department-inventory-form" onSubmit={addInventoryItem}>
          <div className="clinical-subheading"><h3><Plus size={14} /> Add inventory item</h3><span>{isLab ? 'Tests become selectable in Consultation' : 'Medications become selectable in Consultation'}</span></div>
          <div className="clinical-form-row clinical-form-row--three">
            <label className="care-field"><span>{isLab ? 'Test / item name' : 'Medication / item name'}</span><input required value={inventoryForm.name} onChange={(event) => setInventoryForm({ ...inventoryForm, name: event.target.value })} placeholder={isLab ? 'e.g. Full blood count' : 'Catalog medication name'} /></label>
            <label className="care-field"><span>Unit</span><input required value={inventoryForm.unit} onChange={(event) => setInventoryForm({ ...inventoryForm, unit: event.target.value })} placeholder={isLab ? 'tests' : 'tablets, packs, etc.'} /></label>
            <label className="care-field"><span>{isLab ? 'CLAIM-it GDRG' : 'CLAIM-it medicine code'} <i>from approved master</i></span><input value={inventoryForm.claimCode} onChange={(event) => setInventoryForm({ ...inventoryForm, claimCode: event.target.value })} placeholder={isLab ? 'Investigation GDRG' : 'Medicine code'} /></label>
          </div>
          <div className="clinical-form-row clinical-form-row--three">
            <label className="care-field"><span>Opening stock</span><input required type="number" min="0" step="1" value={inventoryForm.onHand} onChange={(event) => setInventoryForm({ ...inventoryForm, onHand: event.target.value })} /></label>
            <label className="care-field"><span>Reorder level</span><input type="number" min="0" step="1" value={inventoryForm.reorderLevel} onChange={(event) => setInventoryForm({ ...inventoryForm, reorderLevel: event.target.value })} /></label>
            {!isLab && <label className="care-field"><span>Full retail price <i>GH₵ · optional until verified</i></span><input type="number" min="0" step="0.01" value={inventoryForm.retailPrice} onChange={(event) => setInventoryForm({ ...inventoryForm, retailPrice: event.target.value })} /></label>}
            <label className="department-stock-toggle"><input type="checkbox" checked={inventoryForm.trackStock} onChange={(event) => setInventoryForm({ ...inventoryForm, trackStock: event.target.checked })} /><span>Track stock and block when insufficient</span></label>
          </div>
          <button className="clinical-add-button clinical-add-button--primary" type="submit"><Plus size={14} /> Add to {pageTitle} inventory</button>
          <p className="clinical-empty-note">{isLab ? 'The supplied price attachment does not include laboratory tariffs.' : 'Each imported medicine has a randomly generated GH₵5–30 add-on for synthetic testing only. Replace it with a verified retail price before real billing; test charges are excluded from CLAIM-it XML.'} CLAIM-it code mapping does not establish claim acceptance.</p>
        </form>}
        {selectedInventoryItem && inventoryEditForm && (
          <div className="department-inventory-modal-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedInventoryId('')
              setInventoryEditForm(null)
              setStockError('')
            }
          }}>
            <section className="department-inventory-modal department-inventory-modal--storefront" role="dialog" aria-modal="true" aria-labelledby="inventory-edit-title">
              <div className="department-inventory-modal-heading">
                <div>
                  <span className="department-inventory-modal-eyebrow">{isLab ? <FlaskConical size={14} /> : <Pill size={14} />} PRODUCT DETAILS</span>
                  <h2 id="inventory-edit-title">{selectedInventoryItem.name}</h2>
                  <p className="department-inventory-modal-code">{selectedInventoryItem.itemCode || selectedInventoryItem.id}{selectedInventoryItem.claimCode ? ` · ${selectedInventoryItem.claimCode}` : ''}</p>
                </div>
                <button className="icon-button" type="button" aria-label="Close inventory editor" onClick={() => { setSelectedInventoryId(''); setInventoryEditForm(null); setStockError('') }}>
                  <X size={18} />
                </button>
              </div>
              {!isLab && <div className="department-inventory-modal-pricing">
                <div><span>Full price</span><strong>{selectedInventoryItem.retailPrice != null ? formatCurrency(selectedInventoryItem.retailPrice) : 'Not set'}</strong></div>
                <div><span>NHIS tariff</span><strong>{selectedInventoryItem.nhisPrice != null ? formatCurrency(selectedInventoryItem.nhisPrice) : 'Not mapped'}</strong></div>
              </div>}
              <div className="department-inventory-modal-section-heading"><span>Product & inventory details</span><small>{canEditInventory ? "Catalogue information" : "Read-only product information"}</small></div>
              <form className="department-inventory-edit-form" onSubmit={saveInventoryEdits}>
                <div className="department-inventory-edit-grid">
                  <label className="care-field"><span>{isLab ? 'Test / item name' : 'Medication name'}</span><input required disabled={!canEditInventory} value={inventoryEditForm.name} onChange={(event) => setInventoryEditForm({ ...inventoryEditForm, name: event.target.value })} /></label>
                  <label className="care-field"><span>Unit</span><input required disabled={!canEditInventory} value={inventoryEditForm.unit} onChange={(event) => setInventoryEditForm({ ...inventoryEditForm, unit: event.target.value })} /></label>
                  <label className="care-field"><span>Current stock <i>whole number</i></span><input type="number" min="0" step="1" disabled={!canEditInventory || !inventoryEditForm.trackStock} value={inventoryEditForm.onHand} onChange={(event) => setInventoryEditForm({ ...inventoryEditForm, onHand: event.target.value })} /></label>
                  <label className="care-field"><span>Reorder level <i>whole number</i></span><input type="number" min="0" step="1" value={inventoryEditForm.reorderLevel} disabled={!canEditInventory} onChange={(event) => setInventoryEditForm({ ...inventoryEditForm, reorderLevel: event.target.value })} /></label>
                  <label className="care-field"><span>Receive stock <i>optional · whole number</i></span><input type="number" min="0" step="1" disabled={!canEditInventory || !inventoryEditForm.trackStock} value={inventoryEditForm.receivedStock} onChange={(event) => setInventoryEditForm({ ...inventoryEditForm, receivedStock: event.target.value })} placeholder="0" /></label>
                  <label className="care-field department-inventory-edit-code"><span>{isLab ? 'CLAIM-it GDRG code' : 'CLAIM-it medicine code'} <i>verify against current official master</i></span><input value={inventoryEditForm.claimCode} disabled={!canEditInventory} onChange={(event) => setInventoryEditForm({ ...inventoryEditForm, claimCode: event.target.value })} /></label>
                  {!isLab && <label className="care-field department-inventory-edit-price"><span>Full retail price <i>GH₵ · blank if unverified</i></span><input type="number" min="0" step="0.01" value={inventoryEditForm.retailPrice} disabled={!canEditInventory} onChange={(event) => setInventoryEditForm({ ...inventoryEditForm, retailPrice: event.target.value, retailPriceEdited: true })} placeholder="Not set" /></label>}
                </div>
                <label className="department-stock-toggle department-inventory-edit-toggle">
                  <input type="checkbox" checked={inventoryEditForm.trackStock} disabled={!canEditInventory} onChange={(event) => setInventoryEditForm({ ...inventoryEditForm, trackStock: event.target.checked })} />
                  <span>Track stock and block processing / dispensing when insufficient</span>
                </label>
                {selectedInventoryItem.nhisPrice != null && (
                  <div className="department-inventory-tariff-note">
                    <strong>NHIS tariff: {formatCurrency(selectedInventoryItem.nhisPrice)}</strong>
                    <span>{selectedInventoryItem.nhisCategory} · tariff is read-only and stays separate from retail pricing.</span>
                  </div>
                )}
                {stockError && <p className="care-form-error" role="alert">{stockError}</p>}
                <div className="department-inventory-modal-actions">
                  <button className="button button--secondary" type="button" onClick={() => { setSelectedInventoryId(""); setInventoryEditForm(null); setStockError("") }}>{canEditInventory ? "Cancel" : "Close"}</button>
                  {canEditInventory && <button className="button button--primary" type="submit"><Check size={14} /> Save changes</button>}
                </div>
              </form>
            </section>
          </div>
        )}
      </section>}
      {showInventory && ['pharmacy-inventory', 'lab-inventory', 'inventory-console'].includes(pageId) && <section className="content-panel department-worklist">
        <div className="care-panel-heading"><div><h2>Stock movement ledger</h2><p>Receipts, adjustments and issues recorded in this browser.</p></div><span>{inventoryMovements.length} recent movements</span></div>
        <div className="department-inventory-movement-table"><table><thead><tr><th>When</th><th>Item</th><th>Movement</th><th>Balance</th></tr></thead><tbody>{inventoryMovements.map((movement) => <tr key={movement.id}><td>{formatDateTime(movement.createdAt)}</td><td><strong>{movement.itemName}</strong><small>{movement.itemCode}</small></td><td><strong>{movement.type}</strong><small>{movement.quantity > 0 ? '+' : ''}{movement.quantity} {movement.unit} {movement.reference ? '· ' + movement.reference : ''}</small></td><td>{movement.balance} {movement.unit}</td></tr>)}</tbody></table>{!inventoryMovements.length && <p className="clinical-empty-note">No stock movements have been recorded yet. Future receipts, lab issues and dispensing activity will appear here.</p>}</div>
      </section>}
      {showWorklist && <section className="content-panel department-worklist">
        <div className="care-panel-heading">
          <div><h2>{isLab ? 'Investigation worklist' : 'Prescription queue'}</h2><p>{isLab ? 'Result updates are visible to the requesting clinician immediately.' : 'Dispensing updates appear in the patient’s medication history.'}</p></div>
          <label className="care-search"><Search size={15} /><input type="search" aria-label={`Search ${pageTitle.toLowerCase()} worklist`} placeholder="Search patient, ID or order" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        </div>
        {visible.length ? (
          <div className="department-order-list">
            {visible.map((item) => {
              const patient = patients.find((entry) => entry.id === item.patientId)
              const current = resultForm[item.id] || {}
              return (
                <article className="department-order-card" key={item.id}>
                  <div className="department-order-heading">
                    <div className="department-patient-avatar">{item.patientName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
                    <div className="department-order-patient">
                      <strong><PatientLink patientId={item.patientId}>{item.patientName}</PatientLink></strong>
                      <span>{item.patientId} · {patient?.phone || ''} · {item.department || 'Outpatient'}</span>
                    </div>
                    <span className={`care-status care-status--${item.status.toLowerCase().replaceAll(' ', '-')}`}>{item.status}</span>
                  </div>
                  {isLab ? (
                    <>
                      <div className="department-order-detail">
                        <div><span>Investigation</span><strong>{item.testName}</strong></div>
                        {item.specimenId && <div><span>Specimen ID</span><strong>{item.specimenId}</strong></div>}
                        <div><span>Priority</span><strong>{item.priority}</strong></div>
                        <div><span>Requested by</span><strong>{item.orderedBy}</strong></div>
                        <div><span>Requested</span><strong>{formatDateTime(item.requestedAt)}</strong></div>
                      </div>
                      <p className={item.claimGdrgCode ? 'department-claim-code' : 'department-claim-code department-claim-code--missing'}>{item.claimGdrgCode ? `CLAIM-it GDRG ${item.claimGdrgCode}` : 'Investigation GDRG mapping required before claim export'}</p>
                      {item.clinicalNote && <p className="department-clinical-note">Clinical note: {item.clinicalNote}</p>}
                      {item.status === 'Result ready' ? (
                        <div className="department-result-readback"><CheckCircle2 size={15} /><div><strong>{item.result}</strong>{item.resultNote && <span>{item.resultNote}</span>}<small>Returned {formatDateTime(item.completedAt)} · visible in Consultation</small></div></div>
                      ) : item.status === 'Requested' ? (
                        <div className="department-dispense-action"><span><Clock3 size={14} /> Awaiting lab processing · {item.stockDeducted ? 'stock already deducted' : 'stock not yet deducted'}</span>{hasPermission('lab.specimens.manage') && <button className="button button--primary" type="button" onClick={() => startLabProcessing(item)}><Check size={14} /> Start processing</button>}</div>
                      ) : item.status === 'Result entered' ? (
                        <div className="department-dispense-action"><span><Clock3 size={14} /> Result entered · awaiting verification</span>{canVerifyLabResults && <button className="button button--primary" type="button" onClick={() => verifyLabResult(item)}><Check size={14} /> Verify &amp; return result</button>}</div>
                      ) : (
                        <form className="department-result-form" onSubmit={(event) => saveLabResult(event, item)}>
                          <label className="care-field"><span>Result / value</span><input required value={current.result || ''} onChange={(event) => setResultForm({ ...resultForm, [item.id]: { ...current, result: event.target.value, saved: false } })} placeholder="Enter verified result or qualitative finding" /></label>
                          <label className="care-field"><span>Result note <i>optional</i></span><input value={current.resultNote || ''} onChange={(event) => setResultForm({ ...resultForm, [item.id]: { ...current, resultNote: event.target.value, saved: false } })} placeholder="Units, reference range, or interpretation" /></label>
                          <label className="department-stock-toggle"><input type="checkbox" checked={Boolean(current.critical)} onChange={(event) => setResultForm({ ...resultForm, [item.id]: { ...current, critical: event.target.checked, saved: false } })} /><span>Flag this result as critical for the critical-results inbox</span></label>
                          {canEnterLabResults && <button className="button button--primary" type="submit"><Check size={14} /> Save result for verification</button>}
                        </form>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="department-order-detail">
                        <div><span>Medication</span><strong>{item.medication} · {item.dose}</strong></div>
                        <div><span>Directions</span><strong>{item.frequency}{item.duration ? ` · ${item.duration}` : ''}</strong></div>
                        <div><span>Quantity</span><strong>{item.dispensedQty || item.quantity || 'Not specified'}</strong></div>
                        <div><span>Prescriber</span><strong>{item.prescribedBy}</strong></div>
                      </div>
                      {item.billing && (
                        <div className="department-billing-summary">
                          <strong>{item.billing.status === 'Retail price not configured' ? 'Patient charge not calculated' : `Retail total ${formatCurrency(item.billing.retailTotal)}`}</strong>
                          {item.billing.status === 'Retail price not configured'
                            ? <span>Set a verified full retail price in inventory. No top-up amount has been assumed.</span>
                            : <span>{item.billing.pricingMode === 'synthetic-test' ? `TEST ONLY add-on ${formatCurrency(item.billing.testTopUpCedis)} for this dispense · ` : ''}NHIS tariff covered {formatCurrency(item.billing.nhisCovered)} · Patient amount due {formatCurrency(item.billing.patientDue)}{item.billing.pricingMode === 'synthetic-test' ? ' · Not for real billing' : ''}</span>}
                        </div>
                      )}
                      <p className={item.medicineCode ? 'department-claim-code' : 'department-claim-code department-claim-code--missing'}>{item.medicineCode ? `CLAIM-it medicine code ${item.medicineCode}` : 'Medicine code mapping required before claim export'}</p>
                      {item.instructions && <p className="department-clinical-note">Instructions: {item.instructions}</p>}
                      {item.status === 'Dispensed' ? (
                        <div className="department-result-readback"><CheckCircle2 size={15} /><div><strong>Dispensed</strong><small>Recorded {formatDateTime(item.dispensedAt)} · visible in the patient chart</small></div></div>
                      ) : item.status === 'Verified' ? (
                        <div className="department-dispense-action">
                          <span><CheckCircle2 size={14} /> Verified {formatDateTime(item.verifiedAt)} · awaiting dispense</span>
                          {canDispense && <button className="button button--primary" type="button" onClick={() => dispensePrescription(item)}><Check size={14} /> Mark dispensed</button>}
                        </div>
                      ) : (
                        <div className="department-dispense-action">
                          <span><Clock3 size={14} /> Awaiting pharmacy dispensing{item.stockDeducted ? ' · stock deducted' : ''}</span>
                          {canVerifyDispensing && <button className="button button--primary" type="button" onClick={() => verifyPrescription(item)}><Check size={14} /> Verify prescription</button>}
                        </div>
                      )}
                    </>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <div className="care-empty-state department-empty">
            {isLab ? <FlaskConical size={22} /> : <Pill size={22} />}
            <strong>{rows.length ? 'No matching orders' : `No ${isLab ? 'lab requests' : 'prescriptions'} yet`}</strong>
            <span>{rows.length ? 'Try another search.' : `New ${isLab ? 'tests requested during consultation' : 'prescriptions from consultation'} will appear here.`}</span>
          </div>
        )}
      </section>}
    </section>
  )
}

export function LaboratoryPage({ pageId = 'lab-worklist', pageTitle }) {
  return <DepartmentQueuePage type="laboratory" pageId={pageId} pageTitle={pageTitle} />
}

export function PharmacyPage({ pageId = 'pharmacy-queue', pageTitle }) {
  return <DepartmentQueuePage type="pharmacy" pageId={pageId} pageTitle={pageTitle} />
}

export default ClinicalPage
