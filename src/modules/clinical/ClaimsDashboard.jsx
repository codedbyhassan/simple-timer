import { useState, useSyncExternalStore } from 'react'
import { CalendarDays, Download, Eye, FileCheck2, Printer, Search, X } from 'lucide-react'
import ClaimFormSheet from './ClaimFormSheet.jsx'
import { getGeneratedClaimsSnapshot, subscribeToGeneratedClaims } from './claimsStore.js'
import { useRoleAccess } from '../../access/roleAccess.js'
import { formatDateTime12 } from '../shared/TimeInput.jsx'
import './ClaimsDashboard.css'

const monthNames = new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' })
const currentDate = new Date()
const currentYear = String(currentDate.getFullYear())
const currentMonth = String(currentDate.getMonth() + 1)

function downloadXml(record) {
  const blob = new Blob([record.xml], { type: 'application/xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${record.claimID}.xml`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function dateLabel(value, withTime = false) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en', withTime
      ? { dateStyle: 'medium', timeStyle: 'short', hour12: true }
      : { dateStyle: 'medium', timeZone: 'UTC' }).format(date)
}

function getPatientName(record) {
  return record.patientName || [record.claim.otherNames, record.claim.surname].filter(Boolean).join(' ')
}

function getMedicineCoverage(record) {
  const medicines = record.claim.medicine || []
  if (medicines.some((item) => !Number.isFinite(item.nhisCovered))) return null
  return medicines.reduce((total, item) => total + item.nhisCovered, 0)
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(value)
}

export default function ClaimsDashboard() {
  const { hasPermission } = useRoleAccess()
  const canViewClaims = hasPermission('claims.view')
  const canExportClaims = hasPermission('claims.export')
  const archive = useSyncExternalStore(subscribeToGeneratedClaims, getGeneratedClaimsSnapshot, getGeneratedClaimsSnapshot)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [search, setSearch] = useState('')
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonth)
  const years = [...new Set([currentYear, ...archive.records.map((record) => record.generatedAt.slice(0, 4))])].sort().reverse()
  const yearRecords = archive.records.filter((record) => record.generatedAt.slice(0, 4) === year)
  const monthRecords = yearRecords.filter((record) => month === 'all' || Number(record.generatedAt.slice(5, 7)) === Number(month))
  const knownMedicineCoverage = monthRecords.reduce((total, record) => total + (getMedicineCoverage(record) || 0), 0)
  const recordsMissingMedicineTariffs = monthRecords.filter((record) => getMedicineCoverage(record) === null).length
  const searchTerm = search.trim().toLowerCase()
  const visibleRecords = monthRecords.filter((record) =>
    `${record.claimID} ${getPatientName(record)} ${record.sourcePatientId} ${record.claim.memberNo}`
      .toLowerCase().includes(searchTerm),
  )

  return (
    <section className="claims-dashboard" aria-labelledby="claims-dashboard-title">
      <header className="claims-dashboard-heading">
        <div>
          <span className="claims-dashboard-eyebrow"><FileCheck2 size={15} /> Revenue cycle</span>
          <h1 id="claims-dashboard-title">Claims</h1>
          <p>Browse saved claim sheets and their matching CLAIM-it XML by generation month.</p>
        </div>
        <span className="claims-local-badge">Local archive · not submitted</span>
      </header>

      <div className="claims-dashboard-notice">
        <FileCheck2 size={16} />
        <p>Generated claims are kept in this browser’s local storage and can be reopened or downloaded here. This preview archive is not shared across devices and does not submit claims to CLAIM-it. Expected coverage below estimates only dispensed-medicine NHIS tariffs; diagnosis and investigation G-DRG tariffs are not configured.</p>
      </div>

      {archive.error && <div className="claims-dashboard-error" role="alert">{archive.error}</div>}

      <div className="claims-dashboard-stats" aria-label="Claims archive summary">
        <article><span>Saved claims</span><strong>{archive.records.length}</strong></article>
        <article><span>In {year}</span><strong>{yearRecords.length}</strong></article>
        <article><span>Selected period</span><strong>{monthRecords.length}</strong></article>
        <article className="claims-coverage-estimate"><span>Expected NHIS medicine coverage</span><strong>{formatCurrency(knownMedicineCoverage)}{recordsMissingMedicineTariffs > 0 && <sup>*</sup>}</strong><small>{recordsMissingMedicineTariffs > 0 ? `${recordsMissingMedicineTariffs} claim(s) missing medicine tariff data` : 'Known medicine tariffs in selected period'}</small></article>
        <article><span>Encounter duplicate protection</span><strong>On</strong></article>
      </div>

      <section className="claims-dashboard-list content-panel" aria-label="Saved claim sheets">
        <div className="claims-dashboard-list-heading">
          <div><h2>Generated claim sheets</h2><p>Archive period is based on the claim generation date.</p></div>
          <div className="claims-dashboard-filters">
            <label><CalendarDays size={14} /><span className="sr-only">Filter by year</span><select aria-label="Filter claims by year" value={year} onChange={(event) => setYear(event.target.value)}>{years.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label><CalendarDays size={14} /><span className="sr-only">Filter by month</span><select aria-label="Filter claims by month" value={month} onChange={(event) => setMonth(event.target.value)}><option value="all">All months</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={String(index + 1)}>{monthNames.format(new Date(Date.UTC(2020, index, 1)))}</option>)}</select></label>
            <label className="claims-dashboard-search"><Search size={14} /><input type="search" aria-label="Search saved claims" placeholder="Search patient or claim ID" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          </div>
        </div>

        {!canViewClaims ? (
          <div className="claims-dashboard-empty"><FileCheck2 size={22} /><strong>Claim detail access is not granted</strong><span>Your current role can view pipeline summaries but not saved claim details.</span></div>
        ) : visibleRecords.length ? (
          <div className="claims-table-wrap">
            <table className="claims-table">
              <thead><tr><th>Claim reference</th><th>Patient</th><th>Encounter date</th><th>Generated</th><th>Lines</th><th>Est. NHIS drug cover</th><th>Actions</th></tr></thead>
              <tbody>{visibleRecords.map((record) => (
                <tr key={record.id}>
                  <td><strong>{record.claimID}</strong><span>{record.sourcePatientId}</span></td>
                  <td>{getPatientName(record)}</td>
                  <td>{dateLabel(record.encounterDate)}</td>
                  <td>{dateLabel(record.generatedAt, true)}</td>
                  <td>{record.claim.diagnosis.length + record.claim.investigation.length + record.claim.procedure.length + record.claim.medicine.length}</td>
                  <td>{getMedicineCoverage(record) === null ? <span className="claims-coverage-unavailable">Tariff unavailable</span> : formatCurrency(getMedicineCoverage(record))}</td>
                  <td><div className="claims-row-actions">
                    <button className="button button--secondary" type="button" onClick={() => setSelectedRecord(record)}><Eye size={14} /> View sheet</button>
                    {canExportClaims && <button className="claims-icon-action" type="button" aria-label={`Download XML for ${record.claimID}`} title="Download XML" onClick={() => downloadXml(record)}><Download size={15} /></button>}
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : archive.records.length ? (
          <div className="claims-dashboard-empty"><FileCheck2 size={22} /><strong>No claims for this period</strong><span>Try another month, year, or search term.</span></div>
        ) : (
          <div className="claims-dashboard-empty"><FileCheck2 size={22} /><strong>No claims have been generated</strong><span>Validate and save a completed encounter’s claim from the patient’s NHIS claims tab. Generated encounters are automatically skipped if you try again.</span></div>
        )}
        {monthRecords.length > 0 && <p className="claims-coverage-footnote">* Estimate includes known NHIS medicine tariffs for dispensed quantities only. It excludes diagnosis and investigation G-DRG tariffs, which are not configured, and is not a reimbursement guarantee.</p>}
      </section>

      {selectedRecord && (
        <div className="claims-sheet-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedRecord(null)}>
          <section className="claims-sheet-modal" role="dialog" aria-modal="true" aria-labelledby="saved-claim-title">
            <div className="claims-sheet-modal-header">
              <div><span className="claims-dashboard-eyebrow"><FileCheck2 size={14} /> Saved claim · {dateLabel(selectedRecord.generatedAt, true)}</span><h2 id="saved-claim-title">{getPatientName(selectedRecord)} · {selectedRecord.claimID}</h2></div>
              <div className="claims-sheet-modal-actions">
                {canExportClaims && <button className="button button--secondary" type="button" onClick={() => window.print()}><Printer size={14} /> Print sheet</button>}
                {canExportClaims && <button className="button button--secondary" type="button" onClick={() => downloadXml(selectedRecord)}><Download size={14} /> Download XML</button>}
                <button className="icon-button" type="button" aria-label="Close saved claim" onClick={() => setSelectedRecord(null)}><X size={17} /></button>
              </div>
            </div>
            <ClaimFormSheet claim={selectedRecord.claim} generatedAt={selectedRecord.generatedAt} />
          </section>
        </div>
      )}
    </section>
  )
}
