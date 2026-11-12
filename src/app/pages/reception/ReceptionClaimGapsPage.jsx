import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, PageHeader, StatusBadge } from '@ui'
import { ErrorNotice, SearchField, EmptyResult, PatientIdentity, getClaimGaps, nameOf, patientPath } from './ReceptionShared.jsx'
import useHospitalSettings from '@core/storage/useHospitalSettings.js'
import './reception styles/shared.css'
import './reception styles/claim-gaps.css'

export default function ClaimGapsPage({ menu, data, error }) {
  const { settings } = useHospitalSettings()
  const expiryWarningDays = Math.max(0, Number(settings.nhis_expiry_warning) || 60)
  const [query, setQuery] = useState('')
  const [severity, setSeverity] = useState('All priorities')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const expirySoon = data.patients.flatMap((patient) => {
    if (patient.coverage !== 'NHIS' || !patient.expiry) return []
    const expiry = new Date(`${patient.expiry}T23:59:59`)
    const days = Math.ceil((expiry - today) / 86400000)
    return Number.isFinite(days) && days >= 0 && days <= expiryWarningDays ? [{ patient, label: `NHIS membership expires in ${days} day${days === 1 ? '' : 's'}`, severity: 'Needs attention' }] : []
  })
  const rows = [...data.patients.flatMap((patient) => getClaimGaps(patient).map((gap) => ({ patient, ...gap }))), ...expirySoon]
  const filtered = rows.filter((item) => (
    (severity === 'All priorities' || item.severity === severity)
    && `${nameOf(item.patient)} ${item.patient.id} ${item.patient.memberNumber} ${item.label}`.toLowerCase().includes(query.toLowerCase())
  ))
  const high = rows.filter((item) => item.severity === 'High priority').length
  const nhis = data.patients.filter((patient) => patient.coverage === 'NHIS').length
  const complete = nhis ? Math.round((data.patients.filter((patient) => patient.coverage === 'NHIS' && patient.memberNumber && patient.expiry && /^\d{8}(\d{2})?$/.test(patient.memberNumber)).length / nhis) * 100) : 100

  return (
    <>
      <PageHeader title={menu.label} description={`Find missing or invalid patient details and NHIS cover expiring within ${expiryWarningDays} days.`} actions={<Link className="hms-reception__button hms-reception__button--quiet" to="/reception/patients"><Icon name="users" size={16} />Patient directory</Link>} />
      <div className="hms-reception">
        <ErrorNotice error={error} />
        <section className="hms-reception__gap-summary"><div className="hms-reception__gap-score"><span className="hms-reception__eyebrow">NHIS profile completeness</span><strong>{complete}%</strong><p>Patient records with a membership number and expiry on file</p><div className="hms-reception__progress"><span style={{ width: `${complete}%` }} /></div></div><div><span className="hms-reception__eyebrow">Items requiring review</span><strong>{rows.length}</strong><small>across {new Set(rows.map((item) => item.patient.id)).size} patient records</small></div><div><span className="hms-reception__eyebrow">High priority</span><strong>{high}</strong><small>NHIS number, expiry or principal member gaps</small></div></section>
        <section className="hms-reception__panel">
          <header className="hms-reception__panel-head"><div><span className="hms-reception__eyebrow">Registration data quality</span><h2>Items to review</h2><p>Correct details on the patient record. Claim status is not validated against NHIA.</p></div><StatusBadge tone={high ? 'warning' : 'success'}>{filtered.length} items</StatusBadge></header>
          <div className="hms-reception__directory-tools"><SearchField value={query} onChange={setQuery} placeholder="Search patient or missing field" /><label className="hms-reception__select-filter"><Icon name="filter" size={16} /><select value={severity} onChange={(event) => setSeverity(event.target.value)} aria-label="Filter by priority">{['All priorities', 'High priority', 'Needs attention', 'Review'].map((item) => <option key={item}>{item}</option>)}</select></label></div>
          {filtered.length ? <div className="hms-reception__gaps-list">{filtered.map((item, index) => <article key={`${item.patient.id}-${item.label}-${index}`} className="hms-reception__gap-row"><span className={`hms-reception__gap-icon${item.severity === 'High priority' ? ' is-high' : ''}`}><Icon name="alertCircle" size={17} /></span><PatientIdentity patient={item.patient} /><span className="hms-reception__gap-reason"><strong>{item.label}</strong><small>{item.patient.coverage}{item.patient.memberNumber ? ` · ${item.patient.memberNumber}` : ''}</small></span><StatusBadge tone={item.severity === 'High priority' ? 'critical' : item.severity === 'Needs attention' ? 'warning' : 'neutral'}>{item.severity}</StatusBadge><Link className="hms-reception__button hms-reception__button--quiet" to={patientPath(item.patient.id)}><Icon name="edit" size={15} />Review</Link></article>)}</div> : <EmptyResult icon="checkCircle" title="No matching data gaps" />}
        </section>
      </div>
    </>
  )
}
