import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, PageHeader, PatientCard, StatusBadge } from '@ui'
import { ErrorNotice, SearchField, EmptyResult, nameOf, formatDate, ageOf, patientPath } from './ReceptionShared.jsx'
import './reception styles/shared.css'
import './reception styles/patients.css'

export default function PatientsPage({ menu, data, error }) {
  const [query, setQuery] = useState('')
  const [coverage, setCoverage] = useState('All coverage')
  const patients = data.patients.filter((patient) => `${nameOf(patient)} ${patient.id} ${patient.phone} ${patient.memberNumber}`.toLowerCase().includes(query.toLowerCase()) && (coverage === 'All coverage' || patient.coverage === coverage))

  return (
    <>
      <PageHeader title={menu.label} description="Find patient records using the identifiers available to the front desk." actions={<Link className="hms-reception__button hms-reception__button--primary" to="/reception/desk"><Icon name="userPlus" size={16} />Register patient</Link>} />
      <div className="hms-reception">
        <ErrorNotice error={error} />
        <div className="hms-reception__directory-tools"><SearchField value={query} onChange={setQuery} /><label className="hms-reception__select-filter"><Icon name="filter" size={16} /><select value={coverage} onChange={(event) => setCoverage(event.target.value)} aria-label="Filter by coverage">{['All coverage', 'NHIS', 'Private insurance', 'Self-pay'].map((item) => <option key={item}>{item}</option>)}</select></label><StatusBadge tone="neutral">{patients.length} records</StatusBadge></div>
        {patients.length ? <div className="hms-reception__patient-grid">{patients.map((patient) => {
          const documents = data.documents.filter((doc) => doc.patientId === patient.id).length
          const visits = data.queue.filter((entry) => entry.patientId === patient.id).length
          const insurance = patient.coverage === 'NHIS' ? patient.memberNumber ? 'insured' : 'near-expiry' : 'non-insured'
          return <PatientCard key={patient.id} to={patientPath(patient.id)} name={nameOf(patient)} meta={`${ageOf(patient.dateOfBirth) ?? 'Age not recorded'} yrs · ${patient.sex || 'Sex not recorded'}`} reference={patient.id} status={insurance} stats={[{ icon: 'stethoscope', value: visits, label: 'Visits' }, { icon: 'folder', value: documents, label: 'Documents' }]} footnote={patient.lastVisit ? `Last visit ${formatDate(patient.lastVisit)}` : 'No visits recorded'} />
        })}</div> : <EmptyResult icon="users" title="No patient records match your search" />}
      </div>
    </>
  )
}
