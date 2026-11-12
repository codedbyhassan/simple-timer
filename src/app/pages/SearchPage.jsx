import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon, PageHeader } from '@ui'
import useReceptionWorkspace from './reception/useReceptionWorkspace.js'
import useLabWorkspace from './lab/useLabWorkspace.js'
import usePharmacyWorkspace from './pharmacy/usePharmacyWorkspace.js'
import useClaimsWorkspace from './claims/useClaimsWorkspace.js'
import './search-page.css'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') || '')
  const { data, loaded } = useReceptionWorkspace()
  const lab = useLabWorkspace()
  const pharmacy = usePharmacyWorkspace()
  const claims = useClaimsWorkspace()
  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return []
    const patientName = (id) => {
      const patient = data.patients.find((item) => item.id === id)
      return patient ? [patient.firstName, patient.lastName].filter(Boolean).join(' ') : 'Patient record'
    }
    const matches = (value) => String(value ?? '').toLowerCase().includes(term)
    return [
      ...data.patients.filter((item) => matches([item.id, item.firstName, item.lastName, item.phone, item.memberNumber].join(' '))).map((item) => ({ id: item.id, type: 'Patient', title: [item.firstName, item.lastName].filter(Boolean).join(' '), detail: [item.id, item.phone].filter(Boolean).join(' · '), to: `/reception/patients/${encodeURIComponent(item.id)}` })),
      ...data.appointments.filter((item) => matches([item.id, item.department, item.reason, patientName(item.patientId)].join(' '))).map((item) => ({ id: item.id, type: 'Appointment', title: patientName(item.patientId), detail: [item.id, item.department, item.date, item.status].filter(Boolean).join(' · '), to: '/reception/appointments' })),
      ...data.queue.filter((item) => matches([item.id, item.department, item.reason, patientName(item.patientId)].join(' '))).map((item) => ({ id: item.id, type: 'Encounter', title: patientName(item.patientId), detail: [item.id, item.stage, item.department].filter(Boolean).join(' · '), to: '/reception/opd' })),
      ...(lab.data.lab?.orders || []).filter((item) => matches([item.id, item.testId, item.status, patientName(item.patientId)].join(' '))).map((item) => ({ id: item.id, type: 'Laboratory order', title: item.testId || item.id, detail: [item.id, patientName(item.patientId), item.status].join(' · '), to: '/lab/worklist' })),
      ...(pharmacy.data.pharmacy?.prescriptions || []).filter((item) => matches([item.id, item.status, patientName(item.patientId)].join(' '))).map((item) => ({ id: item.id, type: 'Prescription', title: item.id, detail: [patientName(item.patientId), item.status].join(' · '), to: '/pharmacy/queue' })),
      ...(claims.data.claims?.records || []).filter((item) => matches([item.id, item.invoiceId, item.status, patientName(item.patientId)].join(' '))).map((item) => ({ id: item.id, type: 'Claim', title: item.id, detail: [patientName(item.patientId), item.invoiceId, item.status].join(' · '), to: '/claims/list' })),
    ]
  }, [query, data, lab.data, pharmacy.data, claims.data])
  const isLoaded = loaded && lab.loaded && pharmacy.loaded && claims.loaded

  return (
    <>
      <PageHeader title="Search records" description="Find patients and operational records stored on this device." />
      <section className="hms-search-page">
        <label className="hms-search-page__field">
          <Icon name="search" size={19} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient, ID, appointment, order or claim" autoFocus aria-label="Search local hospital records" />
          {query ? <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><Icon name="x" size={16} /></button> : null}
        </label>
        {!isLoaded ? <p className="hms-search-page__message">Loading local records…</p> : !query.trim() ? <p className="hms-search-page__message">Enter a name, record number or reference to search this installation.</p> : results.length ? (
          <div className="hms-search-page__results" aria-live="polite">
            <p>{results.length} matching records</p>
            {results.map((result) => <Link to={result.to} className="hms-search-page__result" key={`${result.type}-${result.id}`}><span className="hms-search-page__result-icon"><Icon name="fileText" size={17} /></span><span><strong>{result.title}</strong><small>{result.type} · {result.detail}</small></span><Icon name="chevronRight" size={17} /></Link>)}
          </div>
        ) : <div className="hms-search-page__empty"><Icon name="searchX" size={22} /><strong>No matching records</strong><span>Try a different name, ID or reference.</span></div>}
      </section>
    </>
  )
}
