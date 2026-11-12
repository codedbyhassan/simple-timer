import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Dialog, Icon, PageHeader, StatusBadge } from '@ui'
import { ClaimsError, ClaimsField, ClaimsNotice, ClaimsPanel, ClaimsEmpty, escapeXml, money, patientFor, patientName, statusTone, uid } from './ClaimsShared.jsx'
import './claims styles/shared.css'
import './claims styles/list.css'

function validate(record, data) {
  const patient = patientFor(data, record.patientId)
  const blockers = []
  const warnings = []
  if (!patient) blockers.push('Patient record is missing.')
  if (patient && !patient.dateOfBirth) blockers.push('Patient date of birth is missing.')
  if (patient && patient.coverage !== 'NHIS') blockers.push('No NHIS coverage is recorded for this claim.')
  if (patient?.coverage === 'NHIS' && !/^\d{8}$|^\d{10}$/.test(String(patient.memberNumber || ''))) blockers.push('NHIS member number must contain 8 or 10 digits.')
  if (!/^[A-Z]\d{2}(\.[A-Z0-9]{1,4})?$/.test(String(record.diagnosisCode || ''))) blockers.push('Encounter needs a coded diagnosis.')
  if (record.claimCheckCode && !/^\d{5}$/.test(record.claimCheckCode)) blockers.push('Claims Check Code must contain exactly 5 digits.')
  const encounter = data.queue.find((item) => item.id === record.encounterId)
  if (encounter) {
    const specialty = data.claims.mappings.find((item) => item.kind === 'Department specialty' && item.source === encounter.department)
    if (!specialty || specialty.status !== 'Mapped') blockers.push(`Department specialty mapping is missing for ${encounter.department}.`)
  }
  const dispensed = data.pharmacy.prescriptions
    .filter((prescription) => prescription.patientId === record.patientId && ['Dispensed', 'Partial'].includes(prescription.status))
    .flatMap((prescription) => prescription.items.filter((item) => Number(item.dispensedQuantity || 0) > 0))
  for (const item of dispensed) {
    const medicine = data.pharmacy.medicines.find((entry) => entry.id === item.medicineId)
    const mapping = data.claims.mappings.find((entry) => entry.kind === 'NHIA medicine tariff' && entry.source === medicine?.name)
    if (medicine && !medicine.nhiaCode && mapping?.status !== 'Mapped') blockers.push(`Dispensed medicine needs an NHIA tariff mapping: ${medicine.name}.`)
  }
  if (patient?.expiry && patient.expiry < new Date().toISOString().slice(0, 10)) warnings.push('NHIS membership expiry is in the past; verify eligibility at source.')
  if (!patient?.phone) warnings.push('Patient contact number is not recorded.')
  return { blockers, warnings }
}

function claimXmlPreview(record, patient) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<claimsBatch>\n  <claim id="${escapeXml(record.id)}">\n    <member>${escapeXml(patient?.memberNumber)}</member>\n    <dateOfBirth>${escapeXml(patient?.dateOfBirth)}</dateOfBirth>\n    <service>${escapeXml(record.service)}</service>\n    <diagnosisCode>${escapeXml(record.diagnosisCode)}</diagnosisCode>\n    <physicianID>${escapeXml(record.physicianId)}</physicianID>\n    <claimCheckCode>${escapeXml(record.claimCheckCode)}</claimCheckCode>\n    <preauthorisationCode>${escapeXml(record.preauthorisationCode)}</preauthorisationCode>\n  </claim>\n</claimsBatch>`
}

export default function ClaimsListPage({ data, error, commit, can }) {
  const location = useLocation()
  const records = data.claims.records
  const initialFilter = location.state?.status || 'All'
  const initialClaim = records.find((item) => item.id === location.state?.claimId)
    || records.find((item) => initialFilter === 'All' || item.status === initialFilter)
    || records[0]
  const [selectedId, setSelectedId] = useState(initialClaim?.id || '')
  const [filter, setFilter] = useState(initialFilter)
  const [query, setQuery] = useState('')
  const [ccc, setCcc] = useState(initialClaim?.claimCheckCode || '')
  const [preauth, setPreauth] = useState(initialClaim?.preauthorisationCode || '')
  const [physician, setPhysician] = useState(initialClaim?.physicianId || '')
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [showOfficeFields, setShowOfficeFields] = useState(false)
  const selected = records.find((item) => item.id === selectedId)
  const patient = selected ? patientFor(data, selected.patientId) : null
  const filtered = useMemo(() => records.filter((claim) => {
    const person = patientFor(data, claim.patientId)
    const matchesStatus = filter === 'All' || claim.status === filter
    const matchesQuery = `${claim.id} ${claim.invoiceId} ${person?.firstName || ''} ${person?.lastName || ''}`.toLowerCase().includes(query.toLowerCase())
    return matchesStatus && matchesQuery
  }), [records, data, filter, query])
  const selectClaim = (claim) => {
    setSelectedId(claim.id)
    setCcc(claim.claimCheckCode || '')
    setPreauth(claim.preauthorisationCode || '')
    setPhysician(claim.physicianId || '')
    setMessage('')
    setActionError('')
  }

  const refreshSnapshots = async () => {
    setMessage('')
    setActionError('')
    if (!can('claims.build')) { setActionError('Your role cannot build or refresh claim snapshots.'); return }
    const existing = new Set(records.map((item) => item.invoiceId))
    const newRecords = data.payments.filter((invoice) => !existing.has(invoice.id) && patientFor(data, invoice.patientId)?.coverage === 'NHIS').map((invoice, index) => ({
      id: uid(`CLM-${Date.now().toString(36)}-${index}`), invoiceId: invoice.id, patientId: invoice.patientId,
      encounterId: data.queue.find((entry) => entry.patientId === invoice.patientId)?.id || '',
      month: invoice.date?.slice(0, 7) || new Date().toISOString().slice(0, 7), service: invoice.description,
      billed: Number(invoice.billed || 0), claimCost: null, status: 'Not ready', blockers: [], warnings: [],
      claimCheckCode: '', preauthorisationCode: '', physicianId: '',
      diagnosisCode: data.doctor?.finalized?.encounterId === data.queue.find((entry) => entry.patientId === invoice.patientId)?.id ? data.doctor.finalized.diagnosisCode || '' : '',
      snapshotVersion: 1,
      updatedAt: new Date().toISOString(), importResult: '',
    }))
    const refreshed = [...records, ...newRecords].map((claim) => {
      const { blockers, warnings } = validate(claim, data)
      return { ...claim, blockers, warnings, status: blockers.length ? 'Not ready' : 'Ready', snapshotVersion: claim.snapshotVersion + 1, updatedAt: new Date().toISOString() }
    })
    const now = new Date().toISOString()
    const claims = { ...data.claims, records: refreshed, activity: [{ id: uid('CACT'), message: `Refreshed ${refreshed.length} claim snapshot(s).`, at: now }, ...data.claims.activity] }
    if (await commit({ ...data, claims })) {
      setMessage(`${newRecords.length} new eligible invoice(s) added; ${refreshed.length} snapshot(s) validated from current records.`)
    }
  }

  const saveFields = async () => {
    setMessage('')
    setActionError('')
    if (!selected || !can('claims.enter_ccc')) { setActionError('Your role cannot update claim office fields.'); return }
    if (ccc && !/^\d{5}$/.test(ccc)) { setActionError('Claims Check Code is optional, but when entered it must contain exactly 5 digits.'); return }
    const next = { ...selected, claimCheckCode: ccc.trim(), preauthorisationCode: preauth.trim(), physicianId: physician.trim(), updatedAt: new Date().toISOString() }
    const { blockers, warnings } = validate(next, data)
    const updated = { ...next, blockers, warnings, status: blockers.length ? 'Not ready' : 'Ready', snapshotVersion: selected.snapshotVersion + 1 }
    const claims = { ...data.claims, records: records.map((item) => item.id === selected.id ? updated : item), activity: [{ id: uid('CACT'), message: `Office fields saved for ${selected.id}.`, at: new Date().toISOString() }, ...data.claims.activity] }
    if (await commit({ ...data, claims })) { setMessage('Claims office fields saved to the current snapshot.'); setShowOfficeFields(false) }
  }

  return <>
    <PageHeader title="Claims list and detail" description="Review validation, inspect read-only source fields, and update claim-office-only fields." actions={<button className="hms-claims__button hms-claims__button--primary" type="button" onClick={refreshSnapshots} disabled={!can('claims.build')}><Icon name="refresh" size={16} />Build / refresh snapshots</button>} />
    <div className="hms-claims">
      <ClaimsError error={error} />{message ? <ClaimsNotice tone="success">{message}</ClaimsNotice> : null}{actionError ? <ClaimsNotice tone="error">{actionError}</ClaimsNotice> : null}
      <ClaimsNotice>Patient and clinical data shown here are read-only. Fix source problems in the originating workspace; this local XML preview is illustrative and not verified for CLAIM-it import.</ClaimsNotice>
      <div className="hms-claims__claim-layout">
        <ClaimsPanel title="Saved claims" description={`${filtered.length} matching record(s)`} className="hms-claims__claim-list-panel">
          <div className="hms-claims__filters"><label className="hms-claims__field"><span>Search claims</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Claim, invoice, or patient" /></label><label className="hms-claims__field"><span>Readiness</span><select value={filter} onChange={(event) => setFilter(event.target.value)}>{['All', 'Not ready', 'Ready', 'Exported', 'Import passed', 'Warned', 'Failed'].map((status) => <option key={status}>{status}</option>)}</select></label></div>
          <div className="hms-claims__claim-rows">{filtered.map((claim) => <button type="button" className={`hms-claims__claim-row${selectedId === claim.id ? ' is-selected' : ''}`} key={claim.id} onClick={() => selectClaim(claim)}><span><strong>{patientName(patientFor(data, claim.patientId))}</strong><small>{claim.id} · {claim.month}</small></span><span><StatusBadge tone={statusTone(claim.status)}>{claim.status}</StatusBadge><small>{money(claim.billed)} billed</small></span><small>{claim.blockers.length} blocker(s)</small></button>)}{!filtered.length ? <ClaimsEmpty>No claims match this filter.</ClaimsEmpty> : null}</div>
        </ClaimsPanel>
        {selected ? <div className="hms-claims__claim-detail">
          <ClaimsPanel title={selected.id} description={`${selected.service} · Snapshot v${selected.snapshotVersion}`} actions={<StatusBadge tone={statusTone(selected.status)}>{selected.status}</StatusBadge>}>
            <div className="hms-claims__detail-grid"><span>Patient<strong>{patientName(patient)}</strong></span><span>Invoice<strong>{selected.invoiceId}</strong></span><span>Month<strong>{selected.month}</strong></span><span>Hospital billed<strong>{money(selected.billed)}</strong></span><span>CLAIM-it cost<strong>{selected.claimCost === null ? 'Not returned' : money(selected.claimCost)}</strong></span><span>Member number<strong>{patient?.memberNumber || 'Missing'}</strong></span><span>Date of birth<strong>{patient?.dateOfBirth || 'Missing'}</strong></span><span>Diagnosis<strong>{selected.diagnosisCode || 'Missing'}</strong></span></div>
            <div className="hms-claims__source-links"><Link to={`/patient/${selected.patientId}`}>Fix patient data at source <Icon name="arrowUpRight" size={14} /></Link><Link to="/doctor/consultation" state={{ encounterId: selected.encounterId }}>Fix diagnosis at source <Icon name="arrowUpRight" size={14} /></Link></div>
            <h3>Validation</h3>
            {selected.blockers.map((item) => <div className="hms-claims__validation is-blocker" key={item}><Icon name="alertTriangle" size={15} />{item}</div>)}
            {selected.warnings.map((item) => <div className="hms-claims__validation is-warning" key={item}><Icon name="info" size={15} />{item}</div>)}
            {!selected.blockers.length && !selected.warnings.length ? <ClaimsEmpty>No blockers or warnings on this snapshot.</ClaimsEmpty> : null}
            <h3>Claims office fields</h3>
            <button type="button" className="hms-claims__button" onClick={() => setShowOfficeFields(true)} disabled={!can('claims.enter_ccc')}><Icon name="edit" size={15} />Edit office fields</button>
            <h3>Illustrative XML preview</h3><pre className="hms-claims__xml-preview">{claimXmlPreview(selected, patient)}</pre>
          </ClaimsPanel>
          <Dialog open={showOfficeFields} title="Claims office fields" description="Update claims-only references for this snapshot." onClose={() => setShowOfficeFields(false)}>
            <div className="hms-claims__office-fields"><ClaimsField label="Claims Check Code (optional · 5 digits)" value={ccc} onChange={setCcc} maxLength={5} inputMode="numeric" /><ClaimsField label="Pre-authorisation code" value={preauth} onChange={setPreauth} /><ClaimsField label="Physician ID" value={physician} onChange={setPhysician} /></div>
            <button type="button" className="hms-claims__button" onClick={saveFields} disabled={!can('claims.enter_ccc')}><Icon name="checkCircle" size={15} />Save office fields</button>
          </Dialog>
        </div> : <ClaimsPanel title="Claim detail"><ClaimsEmpty>Select a saved claim to review its details.</ClaimsEmpty></ClaimsPanel>}
      </div>
    </div>
  </>
}
