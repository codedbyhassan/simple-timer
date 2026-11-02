import { Fragment, useMemo, useState, useSyncExternalStore } from 'react'
import {
  Activity,
  ArrowUpRight,
  BedDouble,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  HeartPulse,
  Plus,
  ReceiptText,
  Search,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { getAppointments, subscribeToAppointments } from '../front-desk/frontDeskStore.js'
import { getDemoPatients, subscribeToDemoPatients } from '../patients/patientStore.js'
import { createCareId, getCareData, subscribeToCareData } from '../clinical/careStore.js'
import { getGeneratedClaimsSnapshot, subscribeToGeneratedClaims } from '../clinical/claimsStore.js'
import PatientLink from '../patients/PatientLink.jsx'
import { createBrowserStore } from '../shared/browserStore.js'
import { getWorkspace, subscribeWorkspace, updateWorkspace } from '../admin/workspaceStore.js'
import { useRoleAccess } from '../../access/roleAccess.js'
import { formatClockTime, formatDateTime12 } from '../shared/TimeInput.jsx'
import './OperationsPages.css'

const currency = new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 })
const formatMoney = (value) => currency.format(value)
const formatDateTime = (value) => formatDateTime12(value)
const currentTimestamp = () => new Date().toISOString()
const todayDate = new Date()
const today = todayDate.toISOString().slice(0, 10)
const todayLabel = new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(todayDate)
const reportDays = Array.from({ length: 7 }, (_, index) => {
  const date = new Date(todayDate.getTime())
  date.setUTCDate(date.getUTCDate() - (6 - index))
  return {
    date: date.toISOString().slice(0, 10),
    label: new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(date),
  }
})

function usePatients() {
  return useSyncExternalStore(subscribeToDemoPatients, getDemoPatients, getDemoPatients)
}

function useCare() {
  return useSyncExternalStore(subscribeToCareData, getCareData, getCareData)
}

function useAppointments() {
  return useSyncExternalStore(subscribeToAppointments, getAppointments, getAppointments)
}

function useClaims() {
  return useSyncExternalStore(subscribeToGeneratedClaims, getGeneratedClaimsSnapshot, getGeneratedClaimsSnapshot)
}

function PageHeading({ icon: Icon, eyebrow, title, description, aside }) {
  return (
    <header className="operations-heading">
      <div>
        <span className="operations-eyebrow"><Icon size={15} /> {eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {aside}
    </header>
  )
}

function MetricCard({ label, value, note, icon: Icon, tone = '' }) {
  return (
    <article className={`operations-metric ${tone ? `operations-metric--${tone}` : ''}`}>
      <span className="operations-metric-icon"><Icon size={16} /></span>
      <span className="operations-metric-label">{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  )
}

const defaultWards = [
  { id: 'medical', name: 'Medical ward', prefix: 'MW', total: 8 },
  { id: 'surgical', name: 'Surgical ward', prefix: 'SW', total: 6 },
  { id: 'paediatric', name: 'Paediatric ward', prefix: 'PW', total: 6 },
]
const defaultDepartments = ['General practice', 'Outpatient', 'Paediatrics', 'Cardiology', 'Dental']
const dischargeChecklistItems = [
  ['medicationReview', 'Medication reconciliation'],
  ['followUp', 'Follow-up plan'],
  ['patientEducation', 'Patient / caregiver education'],
  ['transport', 'Transport confirmed'],
]

function emptyDischargeChecklist() {
  return Object.fromEntries(dischargeChecklistItems.map(([id]) => [id, false]))
}

function initialBeds() {
  return defaultWards.flatMap((ward) => Array.from({ length: ward.total }, (_, index) => {
    const id = `${ward.prefix}-${String(index + 1).padStart(2, '0')}`
    const occupied = ['MW-01', 'MW-03', 'SW-02', 'PW-01'].includes(id)
    const cleaning = id === 'SW-01'
    return {
      id,
      ward: ward.id,
      status: occupied ? 'occupied' : cleaning ? 'cleaning' : 'available',
      patientId: occupied ? ({ 'MW-01': 'HMS-10482', 'MW-03': 'HMS-10483', 'SW-02': 'HMS-10485', 'PW-01': 'HMS-10484' })[id] : '',
    }
  }))
}

function initialAdmissions(patients) {
  const assignments = [
    { patientId: 'HMS-10482', bedId: 'MW-01', reason: 'Observation · medical review', since: '08:20' },
    { patientId: 'HMS-10483', bedId: 'MW-03', reason: 'Respiratory care', since: '09:05' },
    { patientId: 'HMS-10485', bedId: 'SW-02', reason: 'Post-operative monitoring', since: '07:45' },
    { patientId: 'HMS-10484', bedId: 'PW-01', reason: 'Paediatric observation', since: '09:22' },
  ]
  return assignments.map((item, index) => ({
    id: `ADM-DEMO-${index + 1}`,
    ...item,
    patientName: patients.find((patient) => patient.id === item.patientId)?.name || 'Patient record',
    status: 'Admitted',
    checklist: emptyDischargeChecklist(),
  }))
}

const inpatientStore = createBrowserStore({
  key: 'inpatient',
  seed: () => ({ departments: defaultDepartments, wards: defaultWards, beds: initialBeds(), admissions: initialAdmissions(getDemoPatients()), requests: [] }),
  validate: (value) => value && typeof value === 'object'
    && Array.isArray(value.beds)
    && Array.isArray(value.admissions),
})

export function InpatientPage({ pageId = 'ward-bed-board', pageTitle = 'Inpatient' }) {
  const patients = usePatients()
  const { hasPermission } = useRoleAccess()
  const canManageBeds = hasPermission('admin.facilities.manage')
  const canRequestAdmission = hasPermission('admission.request')
  const canCompleteDischargeChecklist = hasPermission('discharge.checklist')
  const inpatientData = useSyncExternalStore(inpatientStore.subscribe, inpatientStore.getSnapshot, inpatientStore.getSnapshot)
  const workspace = useSyncExternalStore(subscribeWorkspace, getWorkspace, getWorkspace)
  const { beds, admissions, requests = [] } = inpatientData
  const facilityWards = inpatientData.wards || defaultWards
  const facilityDepartments = workspace.departments || defaultDepartments
  const [wardFilter, setWardFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [admitOpen, setAdmitOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [selectedBedId, setSelectedBedId] = useState('')
  const [selectedRequestId, setSelectedRequestId] = useState('')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [departmentName, setDepartmentName] = useState('')
  const [wardName, setWardName] = useState('')
  const [wardPrefix, setWardPrefix] = useState('')
  const [wardBedCount, setWardBedCount] = useState('4')

  const activeAdmissions = admissions.filter((admission) => admission.status === 'Admitted')
  const availablePatients = patients.filter((patient) => !activeAdmissions.some((admission) => admission.patientId === patient.id))
  const requestablePatients = availablePatients.filter((patient) => !requests.some((request) => request.patientId === patient.id && request.status === 'Requested'))
  const visibleAdmissions = activeAdmissions.filter((admission) => {
    const matchesWard = wardFilter === 'all' || beds.find((bed) => bed.id === admission.bedId)?.ward === wardFilter
    const matchesQuery = `${admission.patientName} ${admission.patientId} ${admission.bedId} ${admission.reason}`.toLowerCase().includes(query.trim().toLowerCase())
    return matchesWard && matchesQuery
  })
  const occupied = beds.filter((bed) => bed.status === 'occupied').length
  const available = beds.filter((bed) => bed.status === 'available').length
  const cleaning = beds.filter((bed) => bed.status === 'cleaning').length

  const addDepartment = (event) => {
    event.preventDefault()
    const name = departmentName.trim()
    if (!canManageBeds || !name) return
    if (facilityDepartments.some((item) => item.toLowerCase() === name.toLowerCase())) { setFormError('This department already exists.'); return }
    updateWorkspace((current) => ({ ...current, departments: [...(current.departments || defaultDepartments), name] }), { actor: 'Hospital Administrator', action: 'Facility department created', detail: name })
    setDepartmentName(''); setFormError(''); setNotice(`${name} department added.`)
  }

  const addWard = (event) => {
    event.preventDefault()
    const name = wardName.trim()
    const prefix = wardPrefix.trim().toUpperCase().replaceAll(/[^A-Z0-9]/g, '').slice(0, 5)
    const total = Number(wardBedCount)
    if (!canManageBeds || !name || !prefix || !Number.isInteger(total) || total < 1 || total > 100) { setFormError('Enter a ward name, a short alphanumeric prefix and 1–100 beds.'); return }
    if (facilityWards.some((ward) => ward.prefix === prefix || ward.name.toLowerCase() === name.toLowerCase())) { setFormError('A ward with this name or bed prefix already exists.'); return }
    const wardId = `ward-${Date.now().toString(36)}`
    const newWard = { id: wardId, name, prefix, total }
    const newBeds = Array.from({ length: total }, (_, index) => ({ id: `${prefix}-${String(index + 1).padStart(2, '0')}`, ward: wardId, status: 'available', patientId: '' }))
    inpatientStore.update((current) => ({ ...current, wards: [...(current.wards || defaultWards), newWard], beds: [...current.beds, ...newBeds] }))
    setWardName(''); setWardPrefix(''); setWardBedCount('4'); setFormError(''); setNotice(`${name} added with ${total} available beds.`)
  }

  const admitPatient = (event) => {
    event.preventDefault()
    if (!canManageBeds) {
      setFormError('You do not have permission to assign beds.')
      return
    }
    const patient = patients.find((item) => item.id === selectedPatientId)
    const bed = beds.find((item) => item.id === selectedBedId)
    if (!patient || !bed || bed.status !== 'available') {
      setFormError('Choose a patient and an available bed.')
      return
    }
    if (activeAdmissions.some((admission) => admission.patientId === patient.id)) {
      setFormError('This patient already has an active admission.')
      return
    }
    inpatientStore.update((current) => ({
      admissions: [{
        id: `ADM-${Date.now()}`,
        patientId: patient.id,
        patientName: patient.name,
        bedId: bed.id,
        reason: reason.trim() || 'Inpatient admission',
        since: new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()),
        status: 'Admitted',
        checklist: emptyDischargeChecklist(),
      }, ...current.admissions],
      beds: current.beds.map((item) => item.id === bed.id ? { ...item, status: 'occupied', patientId: patient.id } : item),
      requests: (current.requests || []).map((request) => request.id === selectedRequestId
        ? { ...request, status: 'Assigned', assignedBedId: bed.id, assignedAt: new Date().toISOString() }
        : request),
    }))
    setAdmitOpen(false)
    setSelectedPatientId('')
    setSelectedBedId('')
    setSelectedRequestId('')
    setReason('')
    setFormError('')
    setNotice(`${patient.name} assigned to ${bed.id}.`)
  }

  const discharge = (admission) => {
    if (!canManageBeds) {
      setNotice('You do not have permission to discharge patients.')
      return
    }
    const currentAdmission = inpatientStore.getSnapshot().admissions.find((item) => item.id === admission.id)
    if (!currentAdmission || Object.values(currentAdmission.checklist || {}).some((checked) => !checked)) {
      setNotice('Complete every discharge checklist item before discharging this patient.')
      return
    }
    inpatientStore.update((current) => ({
      admissions: current.admissions.map((item) => item.id === admission.id ? { ...item, status: 'Discharged' } : item),
      beds: current.beds.map((item) => item.id === admission.bedId ? { ...item, status: 'cleaning', patientId: '' } : item),
    }))
    setNotice(`${admission.patientName} discharged. ${admission.bedId} moved to cleaning.`)
  }

  const requestAdmission = (event) => {
    event.preventDefault()
    if (!canRequestAdmission) {
      setFormError('You do not have permission to request an admission.')
      return
    }
    const patient = requestablePatients.find((item) => item.id === selectedPatientId)
    if (!patient) {
      setFormError('Choose an eligible patient without an active admission or pending request.')
      return
    }
    const request = {
      id: createCareId('AR'),
      patientId: patient.id,
      patientName: patient.name,
      reason: reason.trim() || 'Admission requested',
      requestedAt: currentTimestamp(),
      status: 'Requested',
    }
    inpatientStore.update((current) => ({ ...current, requests: [request, ...(current.requests || [])] }))
    setRequestOpen(false)
    setSelectedPatientId('')
    setReason('')
    setFormError('')
    setNotice(`Admission request submitted for ${patient.name}.`)
  }

  const updateDischargeChecklist = (admission, itemId, checked) => {
    if (!canCompleteDischargeChecklist) return
    inpatientStore.update((current) => ({
      ...current,
      admissions: current.admissions.map((item) => item.id === admission.id
        ? { ...item, checklist: { ...emptyDischargeChecklist(), ...(item.checklist || {}), [itemId]: checked } }
        : item),
    }))
  }

  const openRequestedAdmission = (request) => {
    if (!canManageBeds) return
    setSelectedPatientId(request.patientId)
    setSelectedRequestId(request.id)
    setReason(request.reason)
    setSelectedBedId('')
    setFormError('')
    setAdmitOpen(true)
  }

  const filteredBeds = wardFilter === 'all' ? beds : beds.filter((bed) => bed.ward === wardFilter)

  return (
    <section className="operations-page" aria-labelledby="inpatient-title">
      <PageHeading
        icon={BedDouble}
        eyebrow="Care operations"
        title={pageTitle}
        description={pageId === 'admission-requests' ? 'Review admission requests submitted by the nursing team and assign available beds.' : pageId === 'discharge-checklist' ? 'Complete discharge requirements for admitted patients before discharge.' : pageId === 'my-admissions' ? 'Review patients currently admitted under the clinical service.' : pageId === 'departments-wards' ? 'Review ward capacity and current bed assignments.' : 'Coordinate admissions, ward capacity, bed assignments and discharges.'}
        aside={canManageBeds
          ? <button className="button button--primary" type="button" onClick={() => { setSelectedPatientId(''); setSelectedRequestId(''); setReason(''); setAdmitOpen(true); setFormError(''); setNotice('') }} disabled={!availablePatients.length || !available}><Plus size={15} /> Admit patient</button>
          : canRequestAdmission && <button className="button button--primary" type="button" onClick={() => { setSelectedPatientId(''); setReason(''); setRequestOpen(true); setFormError(''); setNotice('') }} disabled={!requestablePatients.length}><Plus size={15} /> Request admission</button>}
      />

      <div className="operations-metrics operations-metrics--four">
        <MetricCard label="Active admissions" value={activeAdmissions.length} note="Across all wards" icon={Users} />
        <MetricCard label="Occupied beds" value={`${occupied} / ${beds.length}`} note={`${Math.round((occupied / beds.length) * 100)}% occupancy`} icon={BedDouble} tone="blue" />
        <MetricCard label="Available beds" value={available} note="Ready for assignment" icon={CheckCircle2} tone="green" />
        <MetricCard label="Cleaning" value={cleaning} note="Awaiting housekeeping" icon={Clock3} tone="amber" />
      </div>

      {notice && <p className="operations-status" role="status"><CheckCircle2 size={14} />{notice}</p>}

      {pageId === 'departments-wards' && canManageBeds && <section className="content-panel facility-configuration">
        <div className="operations-section-heading"><div><h2>Facility configuration</h2><p>Manage departments, wards and initial bed capacity in this browser.</p></div><BedDouble size={17}/></div>
        <div className="facility-config-grid">
          <form onSubmit={addDepartment}><h3>Add department</h3><label><span>Department name</span><input required value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} placeholder="e.g. Dermatology"/></label><button className="button button--secondary" type="submit"><Plus size={14}/> Add department</button></form>
          <form onSubmit={addWard}><h3>Add ward and beds</h3><label><span>Ward name</span><input required value={wardName} onChange={(event) => setWardName(event.target.value)} placeholder="e.g. Maternity ward"/></label><div className="facility-config-inline"><label><span>Bed prefix</span><input required maxLength={5} value={wardPrefix} onChange={(event) => setWardPrefix(event.target.value)} placeholder="MAT"/></label><label><span>Initial beds</span><input required type="number" min="1" max="100" value={wardBedCount} onChange={(event) => setWardBedCount(event.target.value)}/></label></div><button className="button button--primary" type="submit"><Plus size={14}/> Add ward</button></form>
        </div>
        {formError && <p className="operations-form-error" role="alert">{formError}</p>}
        <div className="facility-config-summary"><div><strong>{facilityDepartments.length}</strong><span>Departments</span></div><div><strong>{facilityWards.length}</strong><span>Wards</span></div><div><strong>{beds.length}</strong><span>Configured beds</span></div></div>
        <div className="facility-config-departments">{facilityDepartments.map((department) => <span key={department}>{department}</span>)}</div>
        <div className="facility-config-wards">{facilityWards.map((ward) => <div key={ward.id}><strong>{ward.name}</strong><span>{ward.prefix} · {beds.filter((bed) => bed.ward === ward.id).length} beds</span></div>)}</div>
      </section>}

      {(pageId === 'admission-requests' || (pageId === 'departments-wards' && requests.length > 0)) && <section className="content-panel inpatient-admissions">
        <div className="operations-section-heading">
          <div><h2>Admission requests</h2><p>{requests.filter((request) => request.status === 'Requested').length} awaiting bed assignment</p></div>
        </div>
        <div className="operations-table-wrap">
          <table className="operations-table">
            <thead><tr><th>Patient</th><th>Reason & status</th><th>Requested</th><th>Action</th></tr></thead>
            <tbody>{requests.map((request) => <tr key={request.id}>
              <td><strong><PatientLink patientId={request.patientId}>{request.patientName}</PatientLink></strong><span>{request.patientId}</span></td>
              <td>{request.reason}<span className="operations-subvalue">{request.status}</span></td>
              <td>{formatDateTime(request.requestedAt)}</td>
              <td>{canManageBeds && request.status === 'Requested' && <button className="operations-table-action" type="button" onClick={() => openRequestedAdmission(request)}>Assign bed</button>}</td>
            </tr>)}</tbody>
          </table>
          {!requests.length && <div className="operations-empty"><BedDouble size={20}/><strong>No admission requests</strong><span>New nursing handoffs will appear here for bed assignment.</span></div>}
        </div>
      </section>}

      {pageId !== 'admission-requests' && <div className="inpatient-layout">
        <section className="content-panel inpatient-wards" hidden={pageId === 'my-admissions' || pageId === 'discharge-checklist'}>
          <div className="operations-section-heading">
            <div><h2>Ward capacity</h2><p>Select a ward to filter beds and admissions.</p></div>
            <select aria-label="Filter by ward" value={wardFilter} onChange={(event) => setWardFilter(event.target.value)}>
              <option value="all">All wards</option>
              {facilityWards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name}</option>)}
            </select>
          </div>
          <div className="ward-bed-grid">
            {filteredBeds.map((bed) => {
              const ward = facilityWards.find((item) => item.id === bed.ward)
              const patient = patients.find((item) => item.id === bed.patientId)
              return (
                <article className={`ward-bed ward-bed--${bed.status}`} key={bed.id}>
                  <div><strong>{bed.id}</strong><span>{ward?.name}</span></div>
                  <span className={`bed-status bed-status--${bed.status}`}>{bed.status}</span>
                  {patient && <small><PatientLink patientId={patient.id}>{patient.name}</PatientLink> · {patient.id}</small>}
                  {canManageBeds && bed.status === 'cleaning' && <button type="button" onClick={() => inpatientStore.update((current) => ({
                    ...current,
                    beds: current.beds.map((item) => item.id === bed.id ? { ...item, status: 'available' } : item),
                  }))}><Check size={12} /> Mark ready</button>}
                </article>
              )
            })}
          </div>
        </section>

        <section className="content-panel inpatient-admissions" hidden={pageId === 'ward-bed-board' || pageId === 'departments-wards'}>
          <div className="operations-section-heading">
            <div><h2>Current admissions</h2><p>{activeAdmissions.length} patients currently assigned</p></div>
            <label className="operations-search"><Search size={14} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find patient or bed" aria-label="Search admissions" /></label>
          </div>
          <div className="operations-filter-row">
            <button type="button" className={wardFilter === 'all' ? 'operations-filter operations-filter--active' : 'operations-filter'} onClick={() => setWardFilter('all')}>All wards</button>
            {facilityWards.map((ward) => <button type="button" key={ward.id} className={wardFilter === ward.id ? 'operations-filter operations-filter--active' : 'operations-filter'} onClick={() => setWardFilter(ward.id)}>{ward.name}</button>)}
          </div>
          <div className="operations-table-wrap">
            <table className="operations-table">
              <thead><tr><th>Patient</th><th>Ward / bed</th><th>Since</th><th>Action</th></tr></thead>
              <tbody>{visibleAdmissions.map((admission) => (
                <Fragment key={admission.id}>
                  <tr>
                    <td><strong><PatientLink patientId={admission.patientId}>{admission.patientName}</PatientLink></strong><span>{admission.patientId}</span></td>
                    <td>{facilityWards.find((ward) => ward.id === beds.find((bed) => bed.id === admission.bedId)?.ward)?.name}<strong className="operations-subvalue">{admission.bedId}</strong><span className="operations-subvalue">{admission.reason}</span></td>
                    <td>{formatClockTime(admission.since)}</td>
                    <td>{canManageBeds && <button className="operations-table-action" type="button" onClick={() => discharge(admission)} disabled={Object.values(admission.checklist || emptyDischargeChecklist()).some((checked) => !checked)}>Discharge</button>}</td>
                  </tr>
                  <tr><td colSpan={4}>
                    <div className="inpatient-discharge-checklist">
                      <strong>Discharge checklist</strong>
                      {dischargeChecklistItems.map(([id, label]) => <label key={id}>
                        <input type="checkbox" checked={Boolean(admission.checklist?.[id])} disabled={!canCompleteDischargeChecklist} onChange={(event) => updateDischargeChecklist(admission, id, event.target.checked)} />
                        <span>{label}</span>
                      </label>)}
                      {canManageBeds && Object.values(admission.checklist || emptyDischargeChecklist()).some((checked) => !checked) && <small>Checklist must be complete before discharge.</small>}
                    </div>
                  </td></tr>
                </Fragment>
              ))}</tbody>
            </table>
            {!visibleAdmissions.length && <div className="operations-empty"><BedDouble size={20} /><strong>No active admissions match</strong><span>Adjust the ward filter or search.</span></div>}
          </div>
        </section>
      </div>}

      {admitOpen && <div className="operations-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setAdmitOpen(false)}>
        <section className="operations-modal" role="dialog" aria-modal="true" aria-labelledby="admit-modal-title">
          <div className="operations-modal-heading"><div><span><BedDouble size={14} /> Inpatient intake</span><h2 id="admit-modal-title">Admit patient</h2><p>{selectedRequestId ? 'Assign a bed to the selected admission request.' : 'Assign a patient to an available bed.'}</p></div><button className="icon-button" aria-label="Close admission dialog" type="button" onClick={() => setAdmitOpen(false)}><X size={17} /></button></div>
          <form onSubmit={admitPatient} className="operations-form">
            <label><span>Patient</span><select required value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.target.value)}><option value="">Select patient</option>{availablePatients.map((patient) => <option value={patient.id} key={patient.id}>{patient.name} · {patient.id}</option>)}</select></label>
            <label><span>Available ward bed</span><select required value={selectedBedId} onChange={(event) => setSelectedBedId(event.target.value)}><option value="">Select bed</option>{beds.filter((bed) => bed.status === 'available').map((bed) => <option value={bed.id} key={bed.id}>{facilityWards.find((ward) => ward.id === bed.ward)?.name} · {bed.id}</option>)}</select></label>
            <label className="operations-form-wide"><span>Admission note</span><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for admission (optional)" /></label>
            {formError && <p className="operations-form-error" role="alert">{formError}</p>}
            <div className="operations-modal-actions"><button className="button button--secondary" type="button" onClick={() => setAdmitOpen(false)}>Cancel</button><button className="button button--primary" type="submit"><Check size={14} /> Confirm admission</button></div>
          </form>
        </section>
      </div>}
      {requestOpen && <div className="operations-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setRequestOpen(false)}>
        <section className="operations-modal" role="dialog" aria-modal="true" aria-labelledby="request-admission-title">
          <div className="operations-modal-heading"><div><span><ClipboardList size={14} /> Nursing handoff</span><h2 id="request-admission-title">Request admission</h2><p>Submit a request for the bed manager to review and assign.</p></div><button className="icon-button" aria-label="Close admission request dialog" type="button" onClick={() => setRequestOpen(false)}><X size={17} /></button></div>
          <form onSubmit={requestAdmission} className="operations-form operations-form--single">
            <label><span>Patient</span><select required value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.target.value)}><option value="">Select patient</option>{requestablePatients.map((patient) => <option value={patient.id} key={patient.id}>{patient.name} · {patient.id}</option>)}</select></label>
            <label><span>Admission reason / handoff note</span><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for admission" /></label>
            {formError && <p className="operations-form-error" role="alert">{formError}</p>}
            <div className="operations-modal-actions"><button className="button button--secondary" type="button" onClick={() => setRequestOpen(false)}>Cancel</button><button className="button button--primary" type="submit"><Check size={14} /> Submit request</button></div>
          </form>
        </section>
      </div>}
    </section>
  )
}

const sampleInvoices = [
  { id: 'INV-2048', patientIndex: 0, service: 'Outpatient consultation', total: 180, covered: 120, paid: 60, dateOffset: 0 },
  { id: 'INV-2047', patientIndex: 1, service: 'Laboratory · FBC', total: 95, covered: 0, paid: 95, dateOffset: 0 },
  { id: 'INV-2046', patientIndex: 2, service: 'Paediatric review', total: 260, covered: 180, paid: 0, dateOffset: -1 },
  { id: 'INV-2045', patientIndex: 3, service: 'Pharmacy dispense', total: 74.5, covered: 38, paid: 36.5, dateOffset: -1 },
  { id: 'INV-2044', patientIndex: 4, service: 'Outpatient consultation', total: 150, covered: 0, paid: 0, dateOffset: -2 },
  { id: 'INV-2043', patientIndex: 5, service: 'Diagnostic services', total: 210, covered: 145, paid: 65, dateOffset: -2 },
]

function buildInvoices(patients) {
  return sampleInvoices.map((invoice) => {
    const date = new Date()
    date.setUTCDate(date.getUTCDate() + invoice.dateOffset)
    return {
      ...invoice,
      patientId: patients[invoice.patientIndex]?.id || `HMS-${10482 + invoice.patientIndex}`,
      patientName: patients[invoice.patientIndex]?.name || 'Patient record',
      date: date.toISOString().slice(0, 10),
    }
  })
}

const financeStore = createBrowserStore({
  key: 'finance',
  seed: () => buildInvoices(getDemoPatients()),
  validate: (value) => Array.isArray(value) && value.every((invoice) => invoice
    && typeof invoice.id === 'string'
    && typeof invoice.patientId === 'string'
    && Number.isFinite(invoice.total)
    && Number.isFinite(invoice.covered)
    && Number.isFinite(invoice.paid)),
})

const paymentReceiptsStore = createBrowserStore({
  key: 'payment-receipts',
  seed: () => [],
  validate: (value) => Array.isArray(value) && value.every((receipt) => receipt && typeof receipt.id === 'string' && typeof receipt.invoiceId === 'string' && Number.isFinite(receipt.amount)),
})

export function FinancePage({ pageId = 'pending-charges', pageTitle = 'Finance' }) {
  const claims = useClaims()
  const care = useCare()
  const { hasPermission } = useRoleAccess()
  const canRecordPayments = hasPermission('cashier.payment.record')
  const storedInvoices = useSyncExternalStore(financeStore.subscribe, financeStore.getSnapshot, financeStore.getSnapshot)
  const receipts = useSyncExternalStore(paymentReceiptsStore.subscribe, paymentReceiptsStore.getSnapshot, paymentReceiptsStore.getSnapshot)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const invoices = useMemo(() => {
    const storedById = new Map(storedInvoices.map((invoice) => [invoice.id, invoice]))
    const dispenseInvoices = care.prescriptions
      .filter((prescription) => prescription.status === 'Dispensed'
        && Number.isFinite(prescription.billing?.retailTotal)
        && Number.isFinite(prescription.billing?.nhisCovered))
      .map((prescription) => {
        const id = `RX-${prescription.id}`
        const saved = storedById.get(id)
        return {
          id,
          patientId: prescription.patientId,
          patientName: prescription.patientName,
          service: `Pharmacy dispense · ${prescription.medication}`,
          total: prescription.billing.retailTotal,
          covered: prescription.billing.nhisCovered,
          paid: saved?.paid || 0,
          date: (prescription.dispensedAt || prescription.prescribedAt || today).slice(0, 10),
        }
      })
    const dispenseIds = new Set(dispenseInvoices.map((invoice) => invoice.id))
    return [...dispenseInvoices, ...storedInvoices.filter((invoice) => !dispenseIds.has(invoice.id))]
  }, [care.prescriptions, storedInvoices])

  const outstanding = (invoice) => Math.max(0, invoice.total - invoice.covered - invoice.paid)
  const totals = invoices.reduce((result, invoice) => ({
    billed: result.billed + invoice.total,
    covered: result.covered + invoice.covered,
    collected: result.collected + invoice.paid,
    due: result.due + outstanding(invoice),
  }), { billed: 0, covered: 0, collected: 0, due: 0 })
  const visibleInvoices = invoices.filter((invoice) => {
    const balance = outstanding(invoice)
    if (['pending-charges', 'payment-status'].includes(pageId) && balance <= 0) return false
    if (pageId === 'payments-receipts' && invoice.paid <= 0) return false
    const status = balance === 0 ? 'settled' : invoice.paid > 0 ? 'partial' : 'due'
    return (filter === 'all' || filter === status)
      && `${invoice.id} ${invoice.patientName} ${invoice.patientId} ${invoice.service}`.toLowerCase().includes(query.trim().toLowerCase())
  })
  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId)
  const estimatedDrugCoverage = claims.records.reduce((sum, record) => sum + (record.claim.medicine || []).reduce((value, medicine) => value + (Number.isFinite(medicine.nhisCovered) ? medicine.nhisCovered : 0), 0), 0)
  const claimsMissingTariffs = claims.records.filter((record) => (record.claim.medicine || []).some((medicine) => !Number.isFinite(medicine.nhisCovered))).length

  const recordPayment = (event) => {
    event.preventDefault()
    const payment = Number(amount)
    if (!canRecordPayments) {
      setError('You do not have permission to record payments.')
      return
    }
    if (!selectedInvoice || !Number.isFinite(payment) || payment <= 0) {
      setError('Enter an amount greater than zero and no more than the remaining balance.')
      return
    }
    let updated = false
    financeStore.update((current) => {
      const savedInvoice = current.find((invoice) => invoice.id === selectedInvoice.id)
      const invoice = savedInvoice || selectedInvoice
      if (payment > outstanding(invoice)) return current
      updated = true
      return savedInvoice
        ? current.map((item) => item.id === selectedInvoice.id ? { ...item, paid: item.paid + payment } : item)
        : [...current, { ...selectedInvoice, paid: selectedInvoice.paid + payment }]
    })
    if (!updated) {
      setError('The invoice balance changed or the payment exceeds the remaining amount. Review the current balance.')
      return
    }
    const receipt = {
      id: `RCT-${Date.now().toString(36).toUpperCase()}`,
      invoiceId: selectedInvoice.id,
      patientId: selectedInvoice.patientId,
      patientName: selectedInvoice.patientName,
      amount: payment,
      method: paymentMethod,
      issuedAt: currentTimestamp(),
    }
    paymentReceiptsStore.update((current) => [receipt, ...current])
    setNotice(`${formatMoney(payment)} payment recorded for ${selectedInvoice.id}. Receipt ${receipt.id} issued.`)
    setSelectedInvoiceId('')
    setAmount('')
    setPaymentMethod('Cash')
    setError('')
  }

  return (
    <section className="operations-page" aria-labelledby="finance-title">
      <PageHeading icon={Wallet} eyebrow="Revenue cycle" title={pageTitle} description={pageId === 'pending-charges' ? 'Review invoices with an outstanding patient balance and record payments.' : pageId === 'payments-receipts' ? 'Review recorded payments and receipt references.' : pageId === 'payment-status' ? 'Check patient payment balances and invoice status.' : pageId === 'billed-vs-claimed' ? 'Compare billed service totals with generated claim records and available tariff estimates.' : 'Review invoices, dispensed medication charges, patient balances and NHIS estimates.'} aside={<span className="operations-date-badge"><CalendarDays size={14} /> {todayLabel}</span>} />
      {claims.error && <div className="operations-error" role="alert">{claims.error}</div>}

      <div className="operations-metrics operations-metrics--four">
        <MetricCard label="Gross billed" value={formatMoney(totals.billed)} note={`${invoices.length} invoices in this workspace`} icon={FileText} />
        <MetricCard label="NHIS tariff amounts" value={formatMoney(totals.covered)} note="Tariff-based allocations" icon={FileCheck2} tone="blue" />
        <MetricCard label="Collected" value={formatMoney(totals.collected)} note="Payments recorded in this workspace" icon={CheckCircle2} tone="green" />
        <MetricCard label="Patient balances" value={formatMoney(totals.due)} note="Outstanding balances" icon={Wallet} tone="amber" />
      </div>

      {notice && <p className="operations-status" role="status"><CheckCircle2 size={14} />{notice}</p>}

      <section className="content-panel finance-claim-estimate">
        <div className="finance-claim-icon"><FileCheck2 size={18} /></div>
        <div><span>Generated claims · known medicine tariffs</span><strong>{formatMoney(estimatedDrugCoverage)}</strong><small>{claimsMissingTariffs ? `${claimsMissingTariffs} claim(s) have missing tariff data. ` : ''}Based on archived dispensed quantities where an NHIS tariff was saved. G-DRG diagnosis and investigation prices are not configured.</small></div>
        <span className="finance-estimate-label">Estimate only</span>
      </section>

      {pageId === 'payments-receipts' && <section className="content-panel finance-ledger">
        <div className="operations-section-heading"><div><h2>Receipt register</h2><p>{receipts.length} receipts issued in this browser.</p></div></div>
        <div className="operations-table-wrap"><table className="operations-table"><thead><tr><th>Receipt</th><th>Invoice / patient</th><th>Amount / method</th><th>Issued</th></tr></thead><tbody>{receipts.map((receipt) => <tr key={receipt.id}><td><strong>{receipt.id}</strong></td><td>{receipt.invoiceId}<span>{receipt.patientName} · {receipt.patientId}</span></td><td><strong>{formatMoney(receipt.amount)}</strong><span>{receipt.method}</span></td><td>{formatDateTime(receipt.issuedAt)}</td></tr>)}</tbody></table>{!receipts.length && <div className="operations-empty"><ReceiptText size={20}/><strong>No receipts issued yet</strong><span>Recorded payments will create receipt references here.</span></div>}</div>
      </section>}
      <section className="content-panel finance-ledger">
        <div className="operations-section-heading">
          <div><h2>{pageId === 'pending-charges' ? 'Outstanding charges' : pageId === 'payments-receipts' ? 'Payment history' : pageId === 'payment-status' ? 'Patient payment status' : pageId === 'billed-vs-claimed' ? 'Billed versus claimed' : 'Invoice ledger'}</h2><p>Dispensed medication charges and invoice transactions · GH₵.</p></div>
          <label className="operations-search"><Search size={14} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Patient, service or invoice" aria-label="Search invoice ledger" /></label>
        </div>
        <div className="operations-filter-row">
          {[['all', 'All invoices'], ['due', 'Outstanding'], ['partial', 'Part paid'], ['settled', 'Settled']].map(([value, label]) => <button type="button" key={value} className={filter === value ? 'operations-filter operations-filter--active' : 'operations-filter'} onClick={() => setFilter(value)}>{label}</button>)}
        </div>
        <div className="operations-table-wrap">
          <table className="operations-table finance-table">
            <thead><tr><th>Invoice</th><th>Patient</th><th>Balance</th><th>Action</th></tr></thead>
            <tbody>{visibleInvoices.map((invoice) => {
              const balance = outstanding(invoice)
              const status = balance === 0 ? 'Settled' : invoice.paid > 0 ? 'Part paid' : 'Outstanding'
              return <tr key={invoice.id}>
                <td><strong>{invoice.id}</strong><span>{new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(`${invoice.date}T00:00:00Z`))} · {invoice.service}</span></td>
                <td><strong><PatientLink patientId={invoice.patientId}>{invoice.patientName}</PatientLink></strong><span>{invoice.patientId}</span></td>
                <td><strong>{formatMoney(balance)}</strong><span>{status} · gross {formatMoney(invoice.total)} · NHIS {formatMoney(invoice.covered)}</span></td>
                <td>{balance > 0 && canRecordPayments ? <button className="operations-table-action" type="button" onClick={() => { setSelectedInvoiceId(invoice.id); setAmount(balance.toFixed(2)); setError('') }}>Record payment</button> : <span className="operations-muted">{balance > 0 ? 'View only' : 'Complete'}</span>}</td>
              </tr>
            })}</tbody>
          </table>
          {!visibleInvoices.length && <div className="operations-empty"><Search size={20} /><strong>No invoices match</strong><span>Try a different search or status.</span></div>}
        </div>
      </section>

      {selectedInvoice && <div className="operations-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedInvoiceId('')}>
        <section className="operations-modal operations-modal--compact" role="dialog" aria-modal="true" aria-labelledby="payment-title">
          <div className="operations-modal-heading"><div><span><Wallet size={14} /> Payment preview</span><h2 id="payment-title">Record a payment</h2><p>{selectedInvoice.patientName} · {selectedInvoice.id} · balance {formatMoney(outstanding(selectedInvoice))}</p></div><button className="icon-button" aria-label="Close payment dialog" type="button" onClick={() => setSelectedInvoiceId('')}><X size={17} /></button></div>
          <form className="operations-form operations-form--single" onSubmit={recordPayment}>
            <label><span>Payment amount (GH₵)</span><input required type="number" min="0.01" max={outstanding(selectedInvoice).toFixed(2)} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
            <label><span>Payment method</span><select required value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option>Cash</option><option>Mobile Money</option><option>Card</option><option>Bank transfer</option></select></label>
            {error && <p className="operations-form-error" role="alert">{error}</p>}
            <div className="operations-modal-actions"><button className="button button--secondary" type="button" onClick={() => setSelectedInvoiceId('')}>Cancel</button><button className="button button--primary" type="submit"><Check size={14} /> Record payment</button></div>
          </form>
        </section>
      </div>}
    </section>
  )
}

export function ReportsPage() {
  const patients = usePatients()
  const appointments = useAppointments()
  const care = useCare()
  const claims = useClaims()
  const [report, setReport] = useState('operations')
  const lastSevenDays = useMemo(() => reportDays.map((day) => ({
    ...day,
    count: appointments.filter((appointment) => appointment.date === day.date).length,
  })), [appointments])
  const maxVisits = Math.max(1, ...lastSevenDays.map((item) => item.count))
  const activeVisits = appointments.filter((appointment) => ['With clinician', 'In consultation', 'In triage', 'Checked in'].includes(appointment.status))
  const completedConsultations = care.consultations.filter((item) => item.status === 'Completed').length
  const pendingLabs = care.labOrders.filter((item) => item.status !== 'Result ready').length
  const dispensed = care.prescriptions.filter((item) => item.status === 'Dispensed').length
  const readyClaims = claims.records.length
  const rows = report === 'claims'
    ? claims.records.map((record) => ({ ref: record.claimID, subject: record.patientName || record.claim.memberNo, type: 'Generated claim', date: record.generatedAt, status: 'Archived' }))
    : report === 'clinical'
      ? [
        ...care.consultations.map((item) => ({ ref: item.id, subject: item.patientName, type: 'Consultation', date: item.updatedAt, status: item.status })),
        ...care.labOrders.map((item) => ({ ref: item.id, subject: item.patientName, type: `Lab · ${item.testName}`, date: item.requestedAt, status: item.status })),
        ...care.prescriptions.map((item) => ({ ref: item.id, subject: item.patientName, type: `Prescription · ${item.medication}`, date: item.prescribedAt, status: item.status })),
      ]
      : appointments.map((item) => ({ ref: item.id, subject: item.patientName, type: item.department, date: `${item.date}T${item.time}:00`, status: item.status }))

  const downloadReport = () => {
    const csvRows = [['Reference', 'Patient', 'Type', 'Date', 'Status'], ...rows.map((row) => [row.ref, row.subject, row.type, row.date, row.status])]
    const csv = csvRows.map((row) => row.map((field) => `"${String(field || '').replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `ascend-hms-${report}-report.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const coverage = patients.filter((patient) => patient.insuranceProvider && patient.insuranceExpires >= today).length

  return (
    <section className="operations-page" aria-labelledby="reports-title">
      <PageHeading icon={Activity} eyebrow="Insights & analytics" title="Reports" description="Review patient access, clinical activity and generated claims for this session." aside={<button className="button button--secondary" type="button" onClick={downloadReport}><Download size={15} /> Export CSV</button>} />
      {claims.error && <div className="operations-error" role="alert">{claims.error}</div>}

      <div className="operations-metrics operations-metrics--four">
        <MetricCard label="Registered patients" value={patients.length} note="Patient directory" icon={Users} />
        <MetricCard label="Appointments today" value={appointments.filter((item) => item.date === today).length} note={`${activeVisits.length} active in care flow`} icon={CalendarDays} tone="blue" />
        <MetricCard label="Completed consultations" value={completedConsultations} note={`${pendingLabs} lab requests still processing`} icon={HeartPulse} tone="green" />
        <MetricCard label="Claims archived" value={readyClaims} note={`${dispensed} prescriptions dispensed this session`} icon={FileCheck2} tone="amber" />
      </div>

      <div className="reports-grid">
        <section className="content-panel reports-trend">
          <div className="operations-section-heading"><div><h2>Appointment activity</h2><p>Appointments by service date · last seven days</p></div><span className="reports-trend-total">{lastSevenDays.reduce((sum, item) => sum + item.count, 0)} visits</span></div>
          <div className="reports-bars" role="img" aria-label={`Appointment activity for the last seven days, ${lastSevenDays.map((item) => `${item.label}: ${item.count}`).join(', ')}.`}>
            {lastSevenDays.map((item) => <div className="reports-bar-column" key={item.date}><span>{item.count}</span><div className="reports-bar-track"><i style={{ height: `${(item.count / maxVisits) * 100}%` }} /></div><small>{item.label}</small></div>)}
          </div>
          <div className="reports-chart-caption"><i /> Appointments in the front-desk schedule</div>
        </section>

        <section className="content-panel reports-snapshot">
          <div className="operations-section-heading"><div><h2>Coverage snapshot</h2><p>Patient directory policy status</p></div><ArrowUpRight size={16} /></div>
          <div className="reports-coverage-value"><strong>{coverage}</strong><span>of {patients.length} records have unexpired coverage details</span></div>
          <div className="reports-coverage-track"><span style={{ width: `${patients.length ? (coverage / patients.length) * 100 : 0}%` }} /></div>
          <div className="reports-snapshot-row"><span>Active care visits</span><strong>{activeVisits.length}</strong></div>
          <div className="reports-snapshot-row"><span>Lab orders awaiting results</span><strong>{pendingLabs}</strong></div>
          <div className="reports-snapshot-row"><span>Generated claims</span><strong>{readyClaims}</strong></div>
        </section>
      </div>

      <section className="content-panel reports-table-panel">
        <div className="operations-section-heading">
          <div><h2>Activity report</h2><p>Choose an operational dataset to inspect or export.</p></div>
          <div className="reports-select-wrap"><ClipboardList size={14} /><select aria-label="Select report" value={report} onChange={(event) => setReport(event.target.value)}><option value="operations">Appointments</option><option value="clinical">Clinical activity</option><option value="claims">Generated claims</option></select></div>
        </div>
        <div className="operations-table-wrap">
          <table className="operations-table">
            <thead><tr><th>Reference</th><th>Patient</th><th>Activity</th><th>Date</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.ref}><td><strong>{row.ref}</strong></td><td>{row.subject}</td><td>{row.type}<span className="operations-subvalue"><span className="report-status">{row.status}</span></span></td><td>{row.date && !Number.isNaN(new Date(row.date).getTime()) ? formatDateTime12(row.date) : '—'}</td></tr>)}</tbody>
          </table>
          {!rows.length && <div className="operations-empty"><FileText size={20} /><strong>No activity in this report</strong><span>No activity has been recorded yet. Complete a patient visit or workflow to populate this report.</span></div>}
        </div>
      </section>
    </section>
  )
}
