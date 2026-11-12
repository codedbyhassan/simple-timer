import { useState } from 'react'
import { Icon, PageHeader, StatusBadge } from '@ui'
import { ClaimsError, ClaimsNotice, ClaimsPanel, dateLabel, escapeXml, money, uid } from './ClaimsShared.jsx'
import './claims styles/shared.css'
import './claims styles/exports.css'

function batchXml(records, data) {
  const claims = records.map((claim) => {
    const patient = data.patients.find((item) => item.id === claim.patientId)
    return `  <claim id="${escapeXml(claim.id)}">\n    <memberNo>${escapeXml(patient?.memberNumber)}</memberNo>\n    <surname>${escapeXml(patient?.lastName)}</surname>\n    <otherNames>${escapeXml(patient?.firstName)}</otherNames>\n    <dateOfBirth>${escapeXml(patient?.dateOfBirth)}</dateOfBirth>\n    <hospitalRecNo>${escapeXml(patient?.id)}</hospitalRecNo>\n    <diagnosisCode>${escapeXml(claim.diagnosisCode)}</diagnosisCode>\n    <claimCheckCode>${escapeXml(claim.claimCheckCode)}</claimCheckCode>\n    <preAuthorizationCodes>${escapeXml(claim.preauthorisationCode)}</preAuthorizationCodes>\n    <physicianID>${escapeXml(claim.physicianId)}</physicianID>\n  </claim>`
  }).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- PREVIEW: NOT CERTIFIED OR VERIFIED AGAINST CLAIM-it XML v2.1 -->\n<claimsBatch>\n${claims}\n</claimsBatch>\n`
}

async function sha256(value) {
  if (!globalThis.crypto?.subtle) throw new Error('Secure SHA-256 is unavailable in this browser context; no export was recorded.')
  const bytes = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, '0')).join('')
}
function download(xml, name) {
  const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default async function ClaimsExportsPage({ data, error, commit, can }) {
  const ready = data.claims.records.filter((claim) => claim.status === 'Ready')
  const [selected, setSelected] = useState([])
  const [actionError, setActionError] = useState('')
  const [message, setMessage] = useState('')
  const toggle = (claimId) => setSelected((current) => current.includes(claimId) ? current.filter((id) => id !== claimId) : [...current, claimId])
  const exportBatch = async () => {
    setMessage('')
    setActionError('')
    if (!can('claims.export')) { setActionError('Your role cannot export claims.'); return }
    const chosen = ready.filter((claim) => selected.includes(claim.id))
    if (!chosen.length) { setActionError('Select at least one ready claim. Claims with blockers cannot be exported.'); return }
    try {
      const xml = batchXml(chosen, data)
      const fileHash = await sha256(xml)
      const now = new Date().toISOString()
      const batch = { id: uid('EXP'), month: new Date().toISOString().slice(0, 7), claimIds: chosen.map((claim) => claim.id), count: chosen.length, fileHash, createdAt: now, status: 'Downloaded', xml }
      const claims = {
        ...data.claims,
        records: data.claims.records.map((claim) => chosen.some((item) => item.id === claim.id) ? { ...claim, status: 'Exported', updatedAt: now } : claim),
        batches: [batch, ...data.claims.batches],
        activity: [{ id: uid('CACT'), message: `Export batch ${batch.id} prepared for download (${batch.count} claim(s)).`, at: now }, ...data.claims.activity],
      }
      if (await commit({ ...data, claims })) {
        download(xml, `${batch.id}.xml`)
        setSelected([])
        setMessage(`Downloaded XML for ${batch.count} claim(s). SHA-256: ${fileHash}. This file is not certified for CLAIM-it.`)
      }
    } catch (exportError) {
      setActionError(exportError instanceof Error ? exportError.message : 'Unable to prepare the export.')
    }
  }
  const downloadAgain = (batch) => {
    if (!batch.xml) { setActionError('This historical batch has no stored XML snapshot to redownload.'); return }
    download(batch.xml, `${batch.id}.xml`)
  }

  return <>
    <PageHeader title="Export batches" description="Select validated snapshots, generate a local XML file, and review batch history." />
    <div className="hms-claims">
      <ClaimsError error={error} />{message ? <ClaimsNotice tone="success">{message}</ClaimsNotice> : null}{actionError ? <ClaimsNotice tone="error">{actionError}</ClaimsNotice> : null}
      <ClaimsNotice>Export uses only ready snapshots and records a SHA-256 hash. This payload is not CLAIM-it XML v2.1-complete or import-certified. No payer submission occurs.</ClaimsNotice>
      <ClaimsPanel title="Ready claims" description={`${ready.length} snapshot(s) have no current blockers.`} actions={<button type="button" className="hms-claims__button hms-claims__button--primary" onClick={exportBatch} disabled={!can('claims.export') || !ready.length}><Icon name="download" size={16} />Generate and download</button>}>
        <div className="hms-claims__table-wrap"><table className="hms-claims__table"><thead><tr><th><input aria-label="Select all ready claims" type="checkbox" checked={ready.length > 0 && selected.length === ready.length} onChange={(event) => setSelected(event.target.checked ? ready.map((item) => item.id) : [])} /></th><th>Claim</th><th>Invoice</th><th>Period</th><th>Hospital billed</th><th>Status</th></tr></thead><tbody>{ready.map((claim) => <tr key={claim.id}><td><input aria-label={`Select ${claim.id}`} type="checkbox" checked={selected.includes(claim.id)} onChange={() => toggle(claim.id)} /></td><td><strong>{claim.id}</strong></td><td>{claim.invoiceId}</td><td>{claim.month}</td><td>{money(claim.billed)}</td><td><StatusBadge tone="success">Ready</StatusBadge></td></tr>)}</tbody></table>{!ready.length ? <div className="hms-claims__empty">No export-ready claims. Resolve blockers in the claim list first.</div> : null}</div>
      </ClaimsPanel>
      <ClaimsPanel title="Export history" description="Local batch metadata, stored snapshot hash, and download actions.">
        <div className="hms-claims__table-wrap"><table className="hms-claims__table"><thead><tr><th>Batch</th><th>Month</th><th>Claims</th><th>SHA-256</th><th>Created</th><th>Status</th><th /></tr></thead><tbody>{data.claims.batches.map((batch) => <tr key={batch.id}><td><strong>{batch.id}</strong></td><td>{batch.month}</td><td>{batch.count}</td><td><code>{batch.fileHash}</code></td><td>{dateLabel(batch.createdAt)}</td><td><StatusBadge tone="info">{batch.status}</StatusBadge></td><td><button className="hms-claims__button hms-claims__button--small" type="button" onClick={() => downloadAgain(batch)}><Icon name="download" size={14} />Download</button></td></tr>)}</tbody></table></div>
      </ClaimsPanel>
    </div>
  </>
}
