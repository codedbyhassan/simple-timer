import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  ArrowLeft,
  Activity,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Download,
  Edit3,
  Eye,
  FileCheck2,
  FlaskConical,
  HeartPulse,
  Mail,
  Pill,
  Phone,
  Printer,
  ReceiptText,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Thermometer,
  UserRound,
  X,
} from 'lucide-react'
import { getAppointments, subscribeToAppointments } from '../front-desk/frontDeskStore.js'
import { getCareData, subscribeToCareData } from '../clinical/careStore.js'
import { buildClaimXml, createClaimFromEncounter, createClaimId, getClaimPatientDefaults, validateClaim } from '../clinical/claimXml.js'
import ClaimFormSheet from '../clinical/ClaimFormSheet.jsx'
import { getGeneratedClaimsSnapshot, saveGeneratedClaim, subscribeToGeneratedClaims } from '../clinical/claimsStore.js'
import { useRoleAccess } from '../../access/roleAccess.js'

const tabs = [
  { id: 'personal', label: 'Personal info', icon: UserRound },
  { id: 'vitals', label: 'Vitals', icon: HeartPulse },
  { id: 'consultations', label: 'Consultations', icon: Stethoscope },
  { id: 'labs', label: 'Labs', icon: FlaskConical },
  { id: 'drugs', label: 'Drugs', icon: Pill },
  { id: 'procedures', label: 'Procedures', icon: Syringe },
  { id: 'billing', label: 'Bills & receipts', icon: ReceiptText },
  { id: 'claims', label: 'NHIS claims', icon: FileCheck2 },
]

const historyContent = {
  consultations: {
    icon: Stethoscope,
    title: 'Consultations',
    description: 'Consultation history and clinical encounters',
    columns: ['Date & time', 'Clinician', 'Department', 'Visit type', 'Outcome'],
    rows: [
      ['28 Oct 2026 · 10:30', 'Dr. K. Mensah', 'General practice', 'Follow-up', 'Completed'],
      ['12 Oct 2026 · 09:15', 'Dr. A. Owusu', 'Outpatient', 'New visit', 'Completed'],
      ['30 Sep 2026 · 14:00', 'Dr. E. Addo', 'General practice', 'Review', 'Completed'],
    ],
  },
  labs: {
    icon: FlaskConical,
    title: 'Laboratory results',
    description: 'Investigations, specimen status and verified results',
    columns: ['Date', 'Investigation', 'Ordered by', 'Result', 'Status'],
    rows: [
      ['28 Oct 2026', 'Full blood count', 'Dr. K. Mensah', 'Within range', 'Verified'],
      ['28 Oct 2026', 'Fasting blood glucose', 'Dr. K. Mensah', '5.4 mmol/L', 'Verified'],
      ['12 Oct 2026', 'Lipid profile', 'Dr. A. Owusu', 'See report', 'Verified'],
    ],
  },
  drugs: {
    icon: Pill,
    title: 'Medications',
    description: 'Prescriptions and dispensing history',
    columns: ['Prescribed', 'Medication', 'Directions', 'Prescriber', 'Status'],
    rows: [
      ['28 Oct 2026', 'Paracetamol 500 mg', '1 tablet as needed', 'Dr. K. Mensah', 'Dispensed'],
      ['12 Oct 2026', 'Amoxicillin 500 mg', '1 capsule, 3 times daily', 'Dr. A. Owusu', 'Completed'],
      ['30 Sep 2026', 'Cetirizine 10 mg', '1 tablet nightly', 'Dr. E. Addo', 'Completed'],
    ],
  },
  procedures: {
    icon: Syringe,
    title: 'Procedures',
    description: 'Procedural care and treatment notes',
    columns: ['Date', 'Procedure', 'Performed by', 'Location', 'Status'],
    rows: [
      ['28 Oct 2026', 'Wound dressing', 'Nurse A. Tetteh', 'Treatment room 2', 'Completed'],
      ['12 Oct 2026', 'Vital signs assessment', 'Nurse J. Boateng', 'Outpatient', 'Completed'],
    ],
  },
  billing: {
    icon: ReceiptText,
    title: 'Bills & receipts',
    description: 'Patient charges, payments and receipts',
    columns: ['Date', 'Reference', 'Description', 'Amount', 'Payment'],
    rows: [
      ['28 Oct 2026', 'INV-2026-1842', 'Consultation and laboratory', 'GH₵ 245.00', 'Paid'],
      ['12 Oct 2026', 'INV-2026-1776', 'Outpatient consultation', 'GH₵ 120.00', 'Paid'],
      ['30 Sep 2026', 'INV-2026-1609', 'Consultation and medication', 'GH₵ 186.00', 'Part paid'],
    ],
  },
  claims: {
    icon: FileCheck2,
    title: 'NHIS claims',
    description: 'National Health Insurance Scheme claim submissions',
    columns: ['Submitted', 'Claim reference', 'Service period', 'Claim amount', 'Status'],
    rows: [
      ['29 Oct 2026', 'NHIS-CLM-28410', '28 Oct 2026', 'GH₵ 185.00', 'Submitted'],
      ['13 Oct 2026', 'NHIS-CLM-28092', '12 Oct 2026', 'GH₵ 95.00', 'Accepted'],
    ],
  },
}

function formatDateTime(value) {
  return value
    ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '—'
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(value)
}

function formatDate(value, options = {}) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
    ...options,
  }).format(new Date(`${value}T00:00:00Z`))
}

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function PersonalInformation({ patient, insuranceStatus }) {
  const isInsured = insuranceStatus === 'Insured'
  const isNearExpiry = insuranceStatus === 'Near expiry'
  const InsuranceIcon = isInsured ? BadgeCheck : ShieldAlert

  return (
    <div className="patient-detail-content-grid">
      <section className="content-panel patient-detail-panel">
        <div className="patient-detail-section-heading">
          <span className="patient-detail-section-icon"><UserRound size={17} /></span>
          <div><h2>Personal information</h2><p>Patient demographics and contact details</p></div>
        </div>
        <div className="patient-detail-fields">
          <div><span>Full name</span><strong>{patient.name}</strong></div>
          <div><span>Patient number</span><strong>{patient.id}</strong></div>
          <div><span>Date of birth</span><strong>{formatDate(patient.dob)}</strong></div>
          <div><span>Gender</span><strong>{patient.sex}</strong></div>
          <div><span>Phone number</span><strong><Phone size={14} /> {patient.phone}</strong></div>
          <div><span>Email address</span><strong><Mail size={14} /> {patient.email || 'Not provided'}</strong></div>
          <div><span>Registration date</span><strong><CalendarDays size={14} /> {formatDate(patient.registered)}</strong></div>
        </div>
      </section>

      <section className={`content-panel patient-insurance-panel patient-insurance-panel--${insuranceStatus.toLowerCase().replace(' ', '-')}`}>
        <div className="patient-detail-section-heading">
          <span className="patient-detail-section-icon"><ShieldCheck size={17} /></span>
          <div><h2>Insurance coverage</h2><p>Policy information and eligibility</p></div>
        </div>
        <div className="patient-insurance-card">
          <div className="patient-insurance-card-top">
            <span>{patient.insuranceProvider || 'INSURANCE COVERAGE'}</span>
            <InsuranceIcon size={19} />
          </div>
          <strong>{insuranceStatus}</strong>
          <span>{patient.insuranceMemberId || 'No active policy on file'}</span>
        </div>
        <div className="patient-insurance-fields">
          <div><span>Provider</span><strong>{patient.insuranceProvider || 'Not provided'}</strong></div>
          <div><span>Member number</span><strong>{patient.insuranceMemberId || 'Not provided'}</strong></div>
          <div><span>Coverage expiry</span><strong>{patient.insuranceExpires ? formatDate(patient.insuranceExpires) : 'Not provided'}</strong></div>
          <div><span>Coverage status</span><strong className={`patient-insurance-text patient-insurance-text--${insuranceStatus.toLowerCase().replace(' ', '-')}`}>{insuranceStatus}</strong></div>
        </div>
        {isNearExpiry && (
          <div className="patient-insurance-notice">
            <ShieldAlert size={15} />
            <span>Coverage expires within 30 days. Confirm renewal with the patient before the next visit.</span>
          </div>
        )}
        {!patient.insuranceProvider && (
          <div className="patient-insurance-notice">
            <ShieldAlert size={15} />
            <span>No active insurance provider is recorded for this patient.</span>
          </div>
        )}
      </section>
    </div>
  )
}

function ClaimsXmlPanel({ patient, careData }) {
  const { hasPermission } = useRoleAccess()
  const canViewClaims = hasPermission('claims.view')
  const canGenerateClaims = hasPermission('claims.generate')
  const canExportClaims = hasPermission('claims.export')
  const consultations = useMemo(
    () => careData.consultations
      .filter((item) => item.patientId === patient.id && item.status === 'Completed')
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [careData.consultations, patient.id],
  )
  const archive = useSyncExternalStore(subscribeToGeneratedClaims, getGeneratedClaimsSnapshot, getGeneratedClaimsSnapshot)
  const [selectedConsultationId, setSelectedConsultationId] = useState(() => consultations[0]?.id || '')
  const [claimId, setClaimId] = useState(createClaimId)
  const [fields, setFields] = useState(() => getClaimPatientDefaults(patient))
  const [notice, setNotice] = useState('')
  const [panelError, setPanelError] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [previewRecord, setPreviewRecord] = useState(null)
  const effectiveConsultationId = consultations.some((item) => item.id === selectedConsultationId)
    ? selectedConsultationId
    : consultations[0]?.id || ''
  const selectedConsultation = consultations.find((item) => item.id === effectiveConsultationId)
  const labOrders = selectedConsultation
    ? careData.labOrders.filter((item) => item.consultationId === selectedConsultation.id)
    : []
  const prescriptions = selectedConsultation
    ? careData.prescriptions.filter((item) => item.consultationId === selectedConsultation.id)
    : []
  const claim = selectedConsultation
    ? createClaimFromEncounter({ patient, consultation: selectedConsultation, labOrders, prescriptions, fields: { ...fields, claimID: claimId } })
    : null
  const savedClaim = selectedConsultation
    ? archive.records.find((record) => record.sourcePatientId === patient.id && record.sourceEncounterId === selectedConsultation.id) || null
    : null
  const activeClaim = savedClaim?.claim || claim
  const validation = activeClaim
    ? validateClaim(activeClaim)
    : { errors: [{ field: 'consultation', message: 'A completed consultation is required to prepare a claim.' }], warnings: [] }
  const xml = savedClaim?.xml || (claim && !validation.errors.length ? buildClaimXml(claim) : '')
  const principalGdrgOptions = activeClaim
    ? [...new Set([...activeClaim.diagnosis, ...activeClaim.investigation].map((item) => item.gdrgCode).filter(Boolean))]
    : []

  useEffect(() => {
    const closeDialogs = (event) => {
      if (event.key === 'Escape') {
        setDetailsOpen(false)
        setPreviewRecord(null)
      }
    }
    window.addEventListener('keydown', closeDialogs)
    return () => window.removeEventListener('keydown', closeDialogs)
  }, [])

  const downloadClaim = () => {
    if (!xml || validation.errors.length) return
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${activeClaim.claimID}.xml`
    link.click()
    URL.revokeObjectURL(url)
    setNotice(savedClaim ? 'Saved CLAIM-it XML downloaded from the local archive.' : 'Validated CLAIM-it XML downloaded. Check code-master warnings before submission.')
  }

  const generateClaim = () => {
    if (!claim || !xml || validation.errors.length || !selectedConsultation) return
    const generatedAt = new Date().toISOString()
    const record = {
      id: claim.claimID,
      claimID: claim.claimID,
      sourcePatientId: patient.id,
      patientName: patient.name,
      sourceEncounterId: selectedConsultation.id,
      encounterDate: claim.dateOfService[0] || selectedConsultation.updatedAt.slice(0, 10),
      generatedAt,
      claim: JSON.parse(JSON.stringify(claim)),
      xml,
    }
    try {
      const saved = saveGeneratedClaim(record)
      setNotice(saved.skipped
        ? 'This encounter already has a generated claim. Duplicate generation was skipped; the saved claim is unchanged.'
        : 'Claim sheet and matching XML saved to the Claims dashboard.')
      setPanelError('')
      setClaimId(saved.record.claimID)
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : String(error))
    }
  }

  const openPreview = (record = savedClaim) => {
    if (record) {
      setPreviewRecord(record)
      return
    }
    if (activeClaim && xml && !validation.errors.length) {
      setPreviewRecord({
        id: activeClaim.claimID,
        claimID: activeClaim.claimID,
        generatedAt: '',
        claim: activeClaim,
        xml,
      })
    }
  }

  return (
    <section className="content-panel patient-history-panel patient-claim-export" aria-labelledby="claim-export-heading">
      <div className="patient-history-heading">
        <div className="patient-detail-section-heading">
          <span className="patient-detail-section-icon"><FileCheck2 size={17} /></span>
          <div><h2 id="claim-export-heading">NHIS claim sheet</h2><p>Validate an encounter, then archive its paper-style sheet and matching XML.</p></div>
        </div>
        {(canViewClaims || canGenerateClaims) && <div className="patient-claim-actions">
          {canGenerateClaims && <button className="button button--secondary" type="button" onClick={() => setDetailsOpen(true)} disabled={!consultations.length}><Settings2 size={14} /> Claim details</button>}
          {canViewClaims && <button className="button button--secondary" type="button" onClick={() => openPreview()} disabled={!xml || validation.errors.length > 0}><Eye size={14} /> {savedClaim ? 'View saved sheet' : 'Preview sheet'}</button>}
          {canGenerateClaims && !savedClaim && <button className="button button--primary" type="button" onClick={generateClaim} disabled={!xml || validation.errors.length > 0}>
            <FileCheck2 size={14} />Generate & save
          </button>}
          {canExportClaims && savedClaim && <button className="button button--primary" type="button" onClick={downloadClaim} disabled={!xml || validation.errors.length > 0}>
            <Download size={14} />Download XML
          </button>}
        </div>}
      </div>
      <p className="claim-export-disclaimer">Local preview only. Age-specific diagnosis and procedure codes are checked against age on the service date; format checks do not verify official NHIA/NHIS code-master membership or coverage. Generated claims are immutable, duplicate encounters are skipped, and nothing is submitted to CLAIM-it.</p>
      {selectedConsultation ? (
        <div className="patient-claim-encounter">
          <div><span>Encounter</span><strong>{new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(selectedConsultation.updatedAt))} · {selectedConsultation.department}</strong></div>
          <div><span>Claim reference</span><strong>{activeClaim?.claimID || '—'}</strong></div>
          {activeClaim && <div><span>Claim contents</span><strong>{activeClaim.diagnosis.length} diagnoses · {activeClaim.investigation.length} investigations · {activeClaim.medicine.length} medicines</strong></div>}
          <span className={`patient-claim-state${savedClaim ? ' patient-claim-state--saved' : ''}`}>{savedClaim ? 'Generated · duplicate skipped' : 'Not generated'}</span>
        </div>
      ) : <p className="patient-history-footnote"><ShieldAlert size={14} /> Complete a consultation before preparing its claim.</p>}
      {archive.error && <p className="care-form-error" role="alert">{archive.error}</p>}
      {panelError && <p className="care-form-error" role="alert">{panelError}</p>}
      <div className={validation.errors.length ? 'claim-validation claim-validation--invalid' : 'claim-validation claim-validation--valid'} aria-live="polite">
        <strong>{validation.errors.length ? `Cannot export · ${validation.errors.length} validation error${validation.errors.length === 1 ? '' : 's'}` : 'Schema checks passed'}</strong>
        {validation.errors.length > 0 && <ul>{validation.errors.map((item) => <li key={`${item.field}-${item.message}`}><strong>{item.field}</strong> — {item.message}</li>)}</ul>}
        {validation.warnings.length > 0 && <ul className="claim-validation-warnings">{validation.warnings.map((item) => <li key={`${item.field}-${item.message}`}>{item.message}</li>)}</ul>}
      </div>
      {notice && <p className="patient-history-footnote" role="status"><CheckCircle2 size={14} />{notice}</p>}
      {archive.records.some((record) => record.sourcePatientId === patient.id) && (
        <div className="patient-claim-archive-list">
          <strong>Saved claims for this patient</strong>
          {archive.records.filter((record) => record.sourcePatientId === patient.id).map((record) => (
            <div key={record.id}><span>{record.claimID} · {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(record.generatedAt))}</span><button type="button" onClick={() => openPreview(record)}><Eye size={13} /> View saved sheet</button></div>
          ))}
        </div>
      )}
      {detailsOpen && (
        <div className="patient-claim-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDetailsOpen(false)}>
          <section className="patient-claim-modal" role="dialog" aria-modal="true" aria-labelledby="claim-details-title">
            <div className="patient-claim-modal-heading"><div><span><Settings2 size={14} /> Claim preparation</span><h3 id="claim-details-title">Review claim details</h3><p>{savedClaim ? 'This encounter is already archived. Select another encounter to prepare a new claim.' : 'These details are validated and saved with the claim snapshot.'}</p></div><button className="icon-button" type="button" aria-label="Close claim details" onClick={() => setDetailsOpen(false)}><X size={17} /></button></div>
            <div className="claim-export-fields">
              <label className="care-field patient-claim-field-wide"><span>Completed consultation</span><select value={effectiveConsultationId} onChange={(event) => { setSelectedConsultationId(event.target.value); setClaimId(createClaimId()); setNotice(''); setPanelError('') }}><option value="">Select a completed consultation</option>{consultations.map((item) => {
                const alreadyGenerated = archive.records.some((record) => record.sourcePatientId === patient.id && record.sourceEncounterId === item.id)
                return <option key={item.id} value={item.id}>{new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(item.updatedAt))} · {item.department}{alreadyGenerated ? ' · Already generated (will be skipped)' : ''}</option>
              })}</select></label>
              <label className="care-field"><span>NHIS member number <i>8 or 10 digits</i></span><input disabled={Boolean(savedClaim)} inputMode="numeric" maxLength="10" value={fields.memberNo} onChange={(event) => setFields({ ...fields, memberNo: event.target.value.replace(/\D/g, '') })} placeholder="Enter verified member number" /></label>
              <label className="care-field"><span>Hospital record number</span><input disabled={Boolean(savedClaim)} value={fields.hospitalRecNo} onChange={(event) => setFields({ ...fields, hospitalRecNo: event.target.value })} /></label>
              <label className="care-field"><span>Service type</span><select disabled={Boolean(savedClaim)} value={fields.typeOfService} onChange={(event) => setFields({ ...fields, typeOfService: event.target.value, principalGDRG: '' })}><option value="OPD">OPD</option><option value="IPD">IPD</option><option value="DIA">DIA</option><option value="PHC">PHC</option></select></label>
              <label className="care-field"><span>Dependant status</span><select disabled={Boolean(savedClaim)} value={fields.isDependant} onChange={(event) => setFields({ ...fields, isDependant: event.target.value })}><option value="">Select status</option><option value="0">Member (0)</option><option value="1">Dependant (1)</option></select></label>
              <label className="care-field"><span>Claims check code <i>optional · 5 digits</i></span><input disabled={Boolean(savedClaim)} inputMode="numeric" maxLength="5" value={fields.claimCheckCode} onChange={(event) => setFields({ ...fields, claimCheckCode: event.target.value.replace(/\D/g, '') })} placeholder="Optional" /></label>
              {fields.typeOfService === 'IPD' && (
                <>
                  <label className="care-field"><span>Admission date</span><input disabled={Boolean(savedClaim)} type="date" value={fields.admissionDate} onChange={(event) => setFields({ ...fields, admissionDate: event.target.value })} /></label>
                  <label className="care-field"><span>Discharge date</span><input disabled={Boolean(savedClaim)} type="date" value={fields.dischargeDate} onChange={(event) => setFields({ ...fields, dischargeDate: event.target.value })} /></label>
                  <label className="care-field"><span>Principal GDRG</span><select disabled={Boolean(savedClaim)} value={fields.principalGDRG} onChange={(event) => setFields({ ...fields, principalGDRG: event.target.value })}><option value="">Select principal GDRG</option>{principalGdrgOptions.map((code) => <option key={code}>{code}</option>)}</select></label>
                </>
              )}
            </div>
            <div className="patient-claim-modal-actions"><button className="button button--secondary" type="button" onClick={() => setDetailsOpen(false)}>Close</button><button className="button button--primary" type="button" onClick={() => setDetailsOpen(false)}>Apply details</button></div>
          </section>
        </div>
      )}
      {previewRecord && (
        <div className="patient-claim-modal-backdrop patient-claim-preview-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setPreviewRecord(null)}>
          <section className="patient-claim-preview-modal" role="dialog" aria-modal="true" aria-labelledby="claim-sheet-preview-title">
            <div className="patient-claim-preview-heading"><div><span><FileCheck2 size={14} /> {previewRecord.generatedAt ? 'Saved claim sheet' : 'Claim sheet preview'}</span><h3 id="claim-sheet-preview-title">{previewRecord.claimID}</h3></div><div><button className="button button--secondary" type="button" onClick={() => window.print()}><Printer size={14} /> Print sheet</button><button className="button button--secondary" type="button" onClick={() => { const blob = new Blob([previewRecord.xml || xml], { type: 'application/xml;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${previewRecord.claimID}.xml`; link.click(); URL.revokeObjectURL(url) }}><Download size={14} /> Download XML</button><button className="icon-button" type="button" aria-label="Close claim preview" onClick={() => setPreviewRecord(null)}><X size={17} /></button></div></div>
            <ClaimFormSheet claim={previewRecord.claim} generatedAt={previewRecord.generatedAt} />
          </section>
        </div>
      )}
    </section>
  )
}

function HistoryPanel({ tabId, patientId, patient }) {
  const careData = useSyncExternalStore(subscribeToCareData, getCareData, getCareData)
  if (tabId === 'claims') return <ClaimsXmlPanel key={`${patient.id}-${patient.insuranceProvider}-${patient.insuranceMemberId}-${patient.isDependant}`} patient={patient} careData={careData} />
  const record = historyContent[tabId]
  const PanelIcon = record.icon
  const liveRows = tabId === 'consultations'
    ? careData.consultations
      .filter((item) => item.patientId === patientId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((item) => [
        formatDateTime(item.updatedAt),
        item.clinician,
        item.department,
        item.diagnoses?.map((diagnosis) => diagnosis.diagnosis).filter(Boolean).join('; ') ||
          item.diagnosis ||
          item.chiefComplaint ||
          'Draft in progress',
        item.status,
      ])
    : tabId === 'labs'
      ? careData.labOrders
        .filter((item) => item.patientId === patientId)
        .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))
        .map((item) => [
          formatDateTime(item.requestedAt),
          item.testName,
          item.orderedBy,
          item.result || 'Awaiting result',
          item.status,
        ])
      : tabId === 'drugs'
        ? careData.prescriptions
          .filter((item) => item.patientId === patientId)
          .sort((left, right) => right.prescribedAt.localeCompare(left.prescribedAt))
          .map((item) => [
            formatDateTime(item.prescribedAt),
            `${item.medication} · ${item.dose}`,
            `${item.frequency}${item.duration ? ` · ${item.duration}` : ''}`,
            item.prescribedBy,
            item.status,
          ])
        : tabId === 'billing'
          ? careData.prescriptions
            .filter((item) => item.patientId === patientId && item.status === 'Dispensed')
            .sort((left, right) => (right.dispensedAt || '').localeCompare(left.dispensedAt || ''))
            .map((item) => [
              formatDateTime(item.dispensedAt),
              item.id,
              `${item.medication} · ${item.dispensedQty || item.quantity || 0} dispensed${item.billing?.nhisCovered > 0 ? ` · NHIS ${formatCurrency(item.billing.nhisCovered)}` : ''}`,
              item.billing?.patientDue == null ? 'Not calculated' : formatCurrency(item.billing.patientDue),
              item.billing?.status || 'Pricing unavailable',
            ])
        : []
  const rows = liveRows.length ? liveRows : record.rows
  const hasLiveRecords = liveRows.length > 0
  const columns = hasLiveRecords && tabId === 'consultations'
    ? ['Date & time', 'Clinician', 'Department', 'Diagnosis', 'Status']
    : record.columns

  return (
    <>
    <section className="content-panel patient-history-panel" aria-labelledby={`${tabId}-heading`}>
      <div className="patient-history-heading">
        <div className="patient-detail-section-heading">
          <span className="patient-detail-section-icon"><PanelIcon size={17} /></span>
          <div>
            <h2 id={`${tabId}-heading`}>{record.title}</h2>
            <p>{record.description} · {patientId}</p>
          </div>
        </div>
        <span className="patient-history-demo-label">{hasLiveRecords ? 'Session records' : 'Example records'}</span>
      </div>
      <div className="patient-history-table-wrap">
        <table className="patient-history-table">
          <thead>
            <tr>{columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[1]}>
                {row.map((cell, index) => (
                  <td key={`${row[1]}-${index}`}>
                    {index === row.length - 1
                      ? <span className={`patient-record-status patient-record-status--${cell.toLowerCase().replaceAll(' ', '-')}`}>{cell}</span>
                      : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="patient-history-footnote">
        <CheckCircle2 size={14} />
        {hasLiveRecords
          ? `${record.title} are linked to this patient’s visit and available for this browser session only.`
          : `This panel previews the planned ${record.title.toLowerCase()} workflow. The rows shown are synthetic design examples, not clinical or financial records.`}
      </div>
    </section>
    </>
  )
}

function VitalsHistory({ patientId }) {
  const appointments = useSyncExternalStore(subscribeToAppointments, getAppointments, getAppointments)
  const records = useMemo(
    () => appointments
      .filter((appointment) => appointment.patientId === patientId && appointment.vitals)
      .sort((left, right) => (right.vitals.recordedAt || '').localeCompare(left.vitals.recordedAt || '')),
    [appointments, patientId],
  )

  const formatRecordedAt = (value) => value
    ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : 'Date not recorded'

  return (
    <section className="content-panel patient-history-panel patient-vitals-panel" aria-labelledby="vitals-heading">
      <div className="patient-history-heading">
        <div className="patient-detail-section-heading">
          <span className="patient-detail-section-icon"><HeartPulse size={17} /></span>
          <div>
            <h2 id="vitals-heading">Vitals history</h2>
            <p>Nursing observations recorded for this patient · {patientId}</p>
          </div>
        </div>
        <span className="patient-history-demo-label">Session preview</span>
      </div>

      {records.length ? (
        <div className="patient-vitals-record-list">
          {records.map((appointment) => {
            const vitals = appointment.vitals
            return (
              <article className="patient-vitals-record" key={appointment.id}>
                <div className="patient-vitals-record-heading">
                  <div>
                    <strong>{appointment.department}</strong>
                    <span>{appointment.visitType} · {appointment.clinician}</span>
                  </div>
                  <time dateTime={vitals.recordedAt}>{formatRecordedAt(vitals.recordedAt)}</time>
                </div>
                <div className="patient-vitals-grid">
                  <div><span><Thermometer size={13} /> Temperature</span><strong>{vitals.temperature} °C</strong></div>
                  <div><span><HeartPulse size={13} /> Pulse</span><strong>{vitals.pulse} bpm</strong></div>
                  <div><span><Activity size={13} /> Respiratory rate</span><strong>{vitals.respiratoryRate} /min</strong></div>
                  <div><span><Activity size={13} /> Blood pressure</span><strong>{vitals.systolic}/{vitals.diastolic} mmHg</strong></div>
                  <div><span><Activity size={13} /> Oxygen saturation</span><strong>{vitals.oxygenSaturation}%</strong></div>
                  {vitals.weight != null && <div><span>Weight</span><strong>{vitals.weight} kg</strong></div>}
                  {vitals.height != null && <div><span>Height</span><strong>{vitals.height} cm</strong></div>}
                  {vitals.painScore != null && <div><span>Pain score</span><strong>{vitals.painScore} / 10</strong></div>}
                </div>
                {vitals.notes && (
                  <div className="patient-vitals-notes">
                    <span>Nursing notes</span>
                    <p>{vitals.notes}</p>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="patient-vitals-empty">
          <HeartPulse size={22} />
          <strong>No vitals recorded</strong>
          <span>Observations recorded at the Nursing station will appear here.</span>
        </div>
      )}
      <div className="patient-history-footnote">
        <CheckCircle2 size={14} />
        Vitals shown are linked to this patient’s visit and are retained only for the current browser session.
      </div>
    </section>
  )
}

function PatientDetailPage({ patient, insuranceStatus, onBack, onEdit, canEdit }) {
  const [activeTab, setActiveTab] = useState('personal')

  const selectTabByKeyboard = (event, currentIndex) => {
    let nextIndex = currentIndex
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = tabs.length - 1
    else return
    event.preventDefault()
    setActiveTab(tabs[nextIndex].id)
    document.getElementById(`patient-tab-${tabs[nextIndex].id}`)?.focus()
  }

  return (
    <section className="patient-detail-page" aria-labelledby="patient-detail-heading">
      <button className="patient-detail-back" type="button" onClick={onBack}>
        <ArrowLeft size={16} /> Back to patient directory <ChevronRight className="patient-detail-breadcrumb-chevron" size={13} /> {patient.id}
      </button>

      <div className="patient-detail-banner">
        <div className="patient-detail-identity">
          <span className="patient-detail-avatar">{initials(patient.name)}</span>
          <div>
            <div className="patients-eyebrow"><UserRound size={14} /> Patient profile</div>
            <h1 id="patient-detail-heading">{patient.name}</h1>
            <p>{patient.id} <i /> {patient.sex} <i /> DOB {formatDate(patient.dob, { month: 'short' })}</p>
          </div>
        </div>
        <div className="patient-detail-actions">
          <span className={`patients-insurance-status patients-insurance-status--${insuranceStatus.toLowerCase().replace(' ', '-')}`}>
            {insuranceStatus === 'Insured' ? <BadgeCheck size={14} /> : <ShieldAlert size={14} />}
            {insuranceStatus}
          </span>
          {canEdit && <button className="button button--primary" type="button" onClick={onEdit}>
            <Edit3 size={15} /> Edit patient
          </button>}
        </div>
      </div>

      <div className="patient-detail-quick-info" aria-label="Patient quick information">
        <span><Phone size={14} /> {patient.phone}</span>
        <span><CreditCard size={14} /> {patient.insuranceProvider || 'No insurance provider'}</span>
        <span><CalendarDays size={14} /> Registered {formatDate(patient.registered, { month: 'short' })}</span>
      </div>

      <div className="patient-detail-tabs" role="tablist" aria-label="Patient record sections">
        {tabs.map(({ id, label, icon: Icon }, index) => (
          <button
            type="button"
            role="tab"
            id={`patient-tab-${id}`}
            aria-selected={activeTab === id}
            aria-controls="patient-tab-panel"
            tabIndex={activeTab === id ? 0 : -1}
            className={`patient-detail-tab ${activeTab === id ? 'patient-detail-tab--active' : ''}`}
            key={id}
            onClick={() => setActiveTab(id)}
            onKeyDown={(event) => selectTabByKeyboard(event, index)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div id="patient-tab-panel" role="tabpanel" aria-labelledby={`patient-tab-${activeTab}`} tabIndex={0} className="patient-detail-tab-panel">
        {activeTab === 'personal' ? (
          <PersonalInformation patient={patient} insuranceStatus={insuranceStatus} />
        ) : activeTab === 'vitals' ? (
          <VitalsHistory patientId={patient.id} />
        ) : (
          <HistoryPanel tabId={activeTab} patientId={patient.id} patient={patient} />
        )}
      </div>

      <div className="patient-detail-demo-note">
        <ShieldAlert size={15} />
        Synthetic preview only. Nursing vitals, consultation notes, lab requests/results and prescriptions are shared for this browser session; other patient history, procedures, payments and claims are sample records.
      </div>
    </section>
  )
}

export default PatientDetailPage
