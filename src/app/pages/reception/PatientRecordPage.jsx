import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Dialog, Icon, PageHeader, StatusBadge } from '@ui'
import { useAccess } from '@core/access/AccessProvider.jsx'
import { EmptyResult, ErrorNotice, FormField, ageOf, formatDate, nameOf, patientFor, statusTone, initials } from './ReceptionShared.jsx'
import { TODAY } from './receptionData.js'
import useReceptionWorkspace from './useReceptionWorkspace.js'
import './reception styles/shared.css'
import './reception styles/patient-record.css'

const TABS = ['Overview', 'Vitals', 'Consultations', 'Laboratory', 'Medicines', 'Billing', 'Claims', 'Documents']
const TAB_PERMISSIONS = {
  Overview: ['patients.view', 'patients.search', 'clinical.consult', 'nursing.triage', 'nursing.observe', 'lab.process', 'pharmacy.dispense', 'finance.view', 'claims.view'],
  Vitals: ['nursing.triage', 'nursing.observe', 'clinical.consult'],
  Consultations: ['clinical.consult'],
  Laboratory: ['lab.process', 'clinical.consult', 'clinical.order'],
  Medicines: ['pharmacy.dispense', 'clinical.consult', 'clinical.prescribe'],
  Billing: ['finance.view', 'finance.collect'],
  Claims: ['claims.view', 'claims.build'],
  Documents: ['patients.view'],
}
const dateLabel = (value) => value ? formatDate(value.slice(0, 10)) : 'Not recorded'
const list = (value) => Array.isArray(value) ? value : []

export default function PatientRecordPage() {
  const { patientId, id } = useParams()
  const { data, error, commit } = useReceptionWorkspace()
  const { can } = useAccess()
  const visibleTabs = TABS.filter((tab) => TAB_PERMISSIONS[tab].some(can))
  const [activeTab, setActiveTab] = useState(visibleTabs[0] || 'Overview')
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState(null)
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const patient = patientFor(data, patientId || id)

  if (!patient) return <><PageHeader title="Patient record not found" /><div className="hms-reception"><Link to="/reception/patients" className="hms-reception__button hms-reception__button--quiet"><Icon name="arrowLeft" size={16} />Back to patients</Link></div></>
  if (!visibleTabs.length) return <><PageHeader title="Patient chart access required" /><div className="hms-reception"><p>Your role does not have permission to view this patient chart.</p></div></>

  const encounters = list(data.queue).filter((entry) => entry.patientId === patient.id).sort((a, b) => new Date(b.arrivedAt || 0) - new Date(a.arrivedAt || 0))
  const vitals = encounters.flatMap((entry) => entry.triage ? [{ ...entry.triage, encounterId: entry.id, reason: entry.reason, stage: entry.stage }] : [])
  const consultations = list(data.doctor?.drafts).filter((entry) => entry.patientId === patient.id).sort((a, b) => new Date(b.finalisedAt || b.updatedAt || 0) - new Date(a.finalisedAt || a.updatedAt || 0))
  const orders = list(data.lab?.orders).filter((entry) => entry.patientId === patient.id)
  const prescriptions = list(data.pharmacy?.prescriptions).filter((entry) => entry.patientId === patient.id)
  const invoices = list(data.payments).filter((entry) => entry.patientId === patient.id)
  const claims = list(data.claims?.records).filter((entry) => entry.patientId === patient.id)
  const documents = list(data.documents).filter((entry) => entry.patientId === patient.id)
  const openEdit = () => { setValues({ ...patient }); setEditing(true); setFormError(''); setMessage('') }
  const save = (event) => {
    event.preventDefault()
    if (!can('patients.update')) { setFormError('Your role does not have permission to update patient records.'); return }
    if (values.coverage === 'NHIS' && values.memberNumber && !/^\d{8}(\d{2})?$/.test(values.memberNumber)) { setFormError('NHIS membership numbers must contain 8 or 10 digits.'); return }
    if (commit({ ...data, patients: data.patients.map((item) => item.id === patient.id ? values : item) })) {
      setEditing(false)
      setMessage('Patient details updated.')
      setFormError('')
    }
  }
  const visitLink = encounters.find((entry) => ['Waiting for clinician', 'In consultation', 'Investigations'].includes(entry.stage))

  return <>
    <PageHeader title={nameOf(patient)} description={`Patient chart · ${patient.id}`} actions={<div className="hms-reception__button-row"><Link className="hms-reception__button hms-reception__button--quiet" to="/reception/patients"><Icon name="arrowLeft" size={16} />All patients</Link>{visitLink ? <Link className="hms-reception__button hms-reception__button--quiet" to={`/doctor/consultation?patientId=${encodeURIComponent(patient.id)}`}><Icon name="stethoscope" size={16} />Open consultation</Link> : null}{can('patients.update') ? <button className="hms-reception__button hms-reception__button--primary" type="button" onClick={openEdit}><Icon name="edit" size={16} />Edit details</button> : null}</div>} />
    <div className="hms-reception hms-patient-record">
      <ErrorNotice error={error} />
      {message ? <div className="hms-reception__notice hms-reception__notice--success" role="status"><Icon name="checkCircle" size={17} />{message}</div> : null}
      {formError ? <div className="hms-reception__notice hms-reception__notice--error" role="alert"><Icon name="alertTriangle" size={17} />{formError}</div> : null}
      <section className="hms-patient-record__banner">
        <span className="hms-reception__avatar hms-reception__avatar--large">{initials(patient)}</span>
        <div><span className="hms-reception__eyebrow">Patient chart</span><h2>{nameOf(patient)}</h2><p>{patient.id} · {patient.sex || 'Sex not recorded'} · {ageOf(patient.dateOfBirth) ?? 'Age not recorded'} years</p></div>
        {can('patients.view') || can('patients.search') ? <StatusBadge tone={patient.coverage === 'NHIS' && patient.memberNumber ? 'success' : patient.coverage === 'NHIS' ? 'warning' : 'neutral'}>{patient.coverage}</StatusBadge> : null}
        {can('encounters.open') ? <Link className="hms-reception__button hms-reception__button--quiet" to="/reception/desk">Check in <Icon name="arrowUpRight" size={15} /></Link> : null}
      </section>
      <nav className="hms-patient-record__tabs" role="tablist" aria-label="Patient chart sections">
        {visibleTabs.map((tab) => <button key={tab} type="button" role="tab" id={`patient-tab-${tab.toLowerCase()}`} aria-selected={activeTab === tab} aria-controls="patient-tab-panel" onClick={() => setActiveTab(tab)}>{tab}<span>{tab === 'Vitals' ? vitals.length : tab === 'Consultations' ? consultations.length : tab === 'Laboratory' ? orders.length : tab === 'Medicines' ? prescriptions.length : tab === 'Billing' ? invoices.length : tab === 'Claims' ? claims.length : tab === 'Documents' ? documents.length : null}</span></button>)}
      </nav>
      <section id="patient-tab-panel" className="hms-patient-record__panel" role="tabpanel" aria-labelledby={`patient-tab-${activeTab.toLowerCase()}`}>
        {activeTab === 'Overview' ? <div className="hms-patient-record__grid">
          <section className="hms-reception__panel"><header className="hms-reception__panel-head"><div><span className="hms-reception__eyebrow">Recent activity</span><h2>Encounters</h2></div></header>
            {encounters.length ? <div className="hms-reception__appointment-list">{encounters.map((entry) => <article className="hms-reception__visit-row" key={entry.id}><span className="hms-reception__visit-icon"><Icon name="stethoscope" size={16} /></span><span><strong>{entry.department}</strong><small>{entry.reason || 'No presenting concern'} · {dateLabel(entry.arrivedAt)}</small></span><StatusBadge tone={statusTone(entry.stage)}>{entry.stage}</StatusBadge></article>)}</div> : <EmptyResult icon="stethoscope" title="No visits recorded" />}</section>
          <section className="hms-reception__panel"><header className="hms-reception__panel-head"><div><span className="hms-reception__eyebrow">Identity and contact</span><h2>Patient information</h2></div></header><dl className="hms-patient-record__facts">{[['Phone', patient.phone], ['Address', patient.address], ['Date of birth', dateLabel(patient.dateOfBirth)], ['Coverage', patient.coverage], ['Membership number', patient.memberNumber], ['Next of kin', patient.nextOfKin]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not recorded'}</dd></div>)}</dl></section>
        </div> : null}
        {activeTab === 'Vitals' ? <section className="hms-reception__panel"><header className="hms-reception__panel-head"><div><span className="hms-reception__eyebrow">Nursing observations</span><h2>Vitals history</h2></div></header>{vitals.length ? <div className="hms-patient-record__table-wrap"><table className="hms-patient-record__table"><thead><tr><th>Recorded</th><th>Blood pressure</th><th>Pulse</th><th>Temp.</th><th>Resp.</th><th>SpO₂</th><th>Weight</th><th>Glucose</th><th>Priority</th></tr></thead><tbody>{vitals.map((item) => <tr key={item.encounterId}><td>{dateLabel(item.recordedAt)}</td><td>{item.systolic || '—'} / {item.diastolic || '—'} mmHg</td><td>{item.pulse || '—'} bpm</td><td>{item.temperature || '—'} °C</td><td>{item.respiratoryRate || '—'} /min</td><td>{item.oxygenSaturation || '—'}%</td><td>{item.weight || '—'} kg</td><td>{item.glucose || '—'} {item.glucoseType || ''}</td><td>{item.priority || '—'}</td></tr>)}</tbody></table></div> : <EmptyResult icon="activity" title="No vitals recorded" />}</section> : null}
        {activeTab === 'Consultations' ? <section className="hms-reception__panel"><header className="hms-reception__panel-head"><div><span className="hms-reception__eyebrow">Clinical notes</span><h2>Consultation history</h2></div></header>{consultations.length ? <div className="hms-patient-record__stack">{consultations.map((entry) => <article className="hms-patient-record__clinical-card" key={entry.encounterId}><header><div><strong>{entry.diagnosisCode ? `${entry.diagnosisCode} · ${entry.diagnosisDescription}` : 'Consultation notes'}</strong><small>{entry.encounterId} · {dateLabel(entry.finalisedAt || entry.updatedAt)}</small></div><StatusBadge tone={entry.status === 'Finalised' ? 'success' : 'warning'}>{entry.status || 'Draft'}</StatusBadge></header><dl>{[['Presenting complaints', entry.complaints], ['Relevant history', entry.history], ['Examination and assessment', entry.examination], ['Disposition', entry.disposition]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></article>)}</div> : <EmptyResult icon="clipboard" title="No consultation notes" />}</section> : null}
        {activeTab === 'Laboratory' ? <section className="hms-reception__panel"><header className="hms-reception__panel-head"><div><span className="hms-reception__eyebrow">Investigations</span><h2>Laboratory orders and results</h2></div></header>{orders.length ? <div className="hms-patient-record__stack">{orders.map((order) => { const test = list(data.lab?.catalogue).find((item) => item.id === order.testId); return <article className="hms-patient-record__clinical-card" key={order.id}><header><div><strong>{test?.name || order.testId}</strong><small>{order.id} · {dateLabel(order.orderedAt)} · {order.orderedBy || 'Provider not recorded'}</small></div><StatusBadge tone={statusTone(order.status)}>{order.status}</StatusBadge></header>{order.resultValues && Object.keys(order.resultValues).length ? <dl>{Object.entries(order.resultValues).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl> : <p>No result values recorded.</p>}</article> })}</div> : <EmptyResult icon="flask" title="No laboratory orders" />}</section> : null}
        {activeTab === 'Medicines' ? <section className="hms-reception__panel"><header className="hms-reception__panel-head"><div><span className="hms-reception__eyebrow">Medication history</span><h2>Prescriptions and dispensing</h2></div></header>{prescriptions.length ? <div className="hms-patient-record__stack">{prescriptions.map((rx) => <article className="hms-patient-record__clinical-card" key={rx.id}><header><div><strong>{rx.id}</strong><small>{rx.prescribedBy || 'Prescriber not recorded'} · {dateLabel(rx.prescribedAt)}</small></div><StatusBadge tone={statusTone(rx.status)}>{rx.status}</StatusBadge></header><ul>{list(rx.items).map((item) => { const medicine = list(data.pharmacy?.medicines).find((row) => row.id === item.medicineId); return <li key={item.id}><strong>{medicine?.name || item.medicineId}</strong><span>{item.dose} · {item.frequency} · {item.durationDays} days</span><small>Prescribed {item.prescribedQuantity} · dispensed {item.dispensedQuantity || 0}</small></li> })}</ul></article>)}</div> : <EmptyResult icon="pill" title="No prescriptions" />}</section> : null}
        {activeTab === 'Billing' ? <section className="hms-reception__panel"><header className="hms-reception__panel-head"><div><span className="hms-reception__eyebrow">Financial record</span><h2>Invoices and payments</h2></div></header>{invoices.length ? <div className="hms-patient-record__table-wrap"><table className="hms-patient-record__table"><thead><tr><th>Invoice</th><th>Date</th><th>Description</th><th>Billed</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>{invoices.map((item) => <tr key={item.id}><td>{item.id}</td><td>{dateLabel(item.date)}</td><td>{item.description}</td><td>GHS {Number(item.billed).toFixed(2)}</td><td>GHS {Number(item.paid).toFixed(2)}</td><td>GHS {Math.max(0, Number(item.billed) - Number(item.paid)).toFixed(2)}</td><td><StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge></td></tr>)}</tbody></table></div> : <EmptyResult icon="creditCard" title="No invoices" />}</section> : null}
        {activeTab === 'Claims' ? <section className="hms-reception__panel"><header className="hms-reception__panel-head"><div><span className="hms-reception__eyebrow">Claims activity</span><h2>Claim records</h2></div></header>{claims.length ? <div className="hms-patient-record__table-wrap"><table className="hms-patient-record__table"><thead><tr><th>Claim</th><th>Invoice</th><th>Created</th><th>Readiness</th><th>Status</th></tr></thead><tbody>{claims.map((claim) => <tr key={claim.id}><td>{claim.id}</td><td>{claim.invoiceId}</td><td>{dateLabel(claim.createdAt)}</td><td>{claim.readiness || claim.validationStatus || 'Review'}</td><td>{claim.status || 'Draft'}</td></tr>)}</tbody></table></div> : <EmptyResult icon="fileText" title="No claims records" />}</section> : null}
        {activeTab === 'Documents' ? <section className="hms-reception__panel"><header className="hms-reception__panel-head"><div><span className="hms-reception__eyebrow">Patient file</span><h2>Documents</h2></div></header>{documents.length ? <div className="hms-patient-record__stack">{documents.map((doc) => <article className="hms-patient-record__document" key={doc.id}><Icon name="fileText" size={18} /><span><strong>{doc.name}</strong><small>{doc.category} · {doc.fileName} · {dateLabel(doc.addedAt)}</small></span></article>)}</div> : <EmptyResult icon="folder" title="No documents" />}</section> : null}
      </section>
    </div>
    <Dialog open={editing} title="Edit patient details" description={`Update administrative details for ${nameOf(patient)}.`} onClose={() => setEditing(false)} size="large">
      {values ? <form className="hms-reception__form-grid hms-reception__patient-edit" onSubmit={save}>
        <FormField label="First name" value={values.firstName} onChange={(value) => setValues((current) => ({ ...current, firstName: value }))} required />
        <FormField label="Last name" value={values.lastName} onChange={(value) => setValues((current) => ({ ...current, lastName: value }))} required />
        <FormField label="Sex" value={values.sex} onChange={(value) => setValues((current) => ({ ...current, sex: value }))} options={['Female', 'Male', 'Other', 'Prefer not to say']} />
        <FormField label="Date of birth" type="date" max={TODAY} value={values.dateOfBirth} onChange={(value) => setValues((current) => ({ ...current, dateOfBirth: value }))} />
        <FormField label="Phone" type="tel" value={values.phone} onChange={(value) => setValues((current) => ({ ...current, phone: value }))} />
        <FormField label="Address" value={values.address} onChange={(value) => setValues((current) => ({ ...current, address: value }))} />
        <FormField label="Coverage" value={values.coverage} onChange={(value) => setValues((current) => ({ ...current, coverage: value }))} options={['Self-pay', 'NHIS', 'Private insurance']} />
        <FormField label="NHIS / membership number" value={values.memberNumber} onChange={(value) => setValues((current) => ({ ...current, memberNumber: value.replace(/\D/g, '').slice(0, 10) }))} />
        <FormField label="Coverage expiry" type="date" value={values.expiry} onChange={(value) => setValues((current) => ({ ...current, expiry: value }))} />
        <FormField label="Next of kin" value={values.nextOfKin} onChange={(value) => setValues((current) => ({ ...current, nextOfKin: value }))} />
        {formError ? <p className="hms-reception__field--wide" role="alert">{formError}</p> : null}
        <div className="hms-reception__form-actions hms-reception__field--wide"><button type="button" className="hms-reception__button hms-reception__button--quiet" onClick={() => setEditing(false)}>Cancel</button><button className="hms-reception__button hms-reception__button--primary" type="submit"><Icon name="check" size={16} />Save details</button></div>
      </form> : null}
    </Dialog>
  </>
}
