import { useRef, useState } from 'react'
import { Icon, PageHeader, StatusBadge } from '@ui'
import { ClaimsError, ClaimsNotice, ClaimsPanel, dateLabel, uid } from './ClaimsShared.jsx'
import './claims styles/shared.css'
import './claims styles/imports.css'

function parseReport(text, knownClaims) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (!lines.length) throw new Error('The selected report is empty.')
  const rows = []
  for (const [index, line] of lines.entries()) {
    if (index === 0 && /claim.?id/i.test(line)) continue
    const columns = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)|\t/).map((cell) => cell.trim().replace(/^"|"$/g, ''))
    const claimId = columns[0] || ''
    const raw = `${columns[1] || ''} ${columns.slice(2).join(' ')}`.trim()
    if (!claimId) continue
    if (!knownClaims.has(claimId)) {
      rows.push({ claimId, result: 'Unmatched', message: raw || 'Claim was not found in the local workspace.' })
      continue
    }
    const normalized = raw.toLowerCase()
    const result = /fail|error|reject/.test(normalized) ? 'Failed' : /warn/.test(normalized) ? 'Warned' : /pass|success|accept|saved/.test(normalized) ? 'Import passed' : 'Unrecognized'
    rows.push({ claimId, result, message: raw || 'No recognized result status was provided.' })
  }
  if (!rows.length) throw new Error('No claim result rows could be read from this file.')
  return rows
}

export default function ClaimsImportsPage({ data, error, commit, can }) {
  const inputRef = useRef(null)
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [processing, setProcessing] = useState(false)
  const importFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setMessage('')
    setActionError('')
    if (!can('claims.import_report')) { setActionError('Your role cannot process import reports.'); event.target.value = ''; return }
    setProcessing(true)
    try {
      const text = await file.text()
      const rows = parseReport(text, new Set(data.claims.records.map((item) => item.id)))
      const now = new Date().toISOString()
      const report = { id: uid('IMP'), fileName: file.name, importedAt: now, rows }
      const reports = { ...data.claims, reports: [report, ...data.claims.reports], records: data.claims.records.map((claim) => {
        const row = rows.find((item) => item.claimId === claim.id)
        return row && ['Import passed', 'Warned', 'Failed'].includes(row.result) ? { ...claim, status: row.result, importResult: row.message, updatedAt: now } : claim
      }), activity: [{ id: uid('CACT'), message: `Import report ${file.name} reviewed (${rows.length} row(s)).`, at: now }, ...data.claims.activity] }
      if (await commit({ ...data, claims: reports })) setMessage(`Read ${rows.length} report row(s) from ${file.name}. Results were matched locally where claim IDs were found; unmatched rows are retained for review.`)
    } catch (readError) {
      setActionError(readError instanceof Error ? readError.message : 'Unable to read the selected import report.')
    } finally {
      setProcessing(false)
      event.target.value = ''
    }
  }
  return <>
    <PageHeader title="Import reports" description="Review a CLAIM-it result report and match each row to a saved local claim snapshot." actions={<button type="button" className="hms-claims__button hms-claims__button--primary" onClick={() => inputRef.current?.click()} disabled={!can('claims.import_report') || processing}><Icon name="upload" size={16} />{processing ? 'Reading report…' : 'Choose report file'}</button>} />
    <div className="hms-claims">
      <input ref={inputRef} className="hms-claims__file-input" type="file" accept=".csv,.tsv,.txt" onChange={importFile} />
      <ClaimsError error={error} />{message ? <ClaimsNotice tone="success">{message}</ClaimsNotice> : null}{actionError ? <ClaimsNotice tone="error">{actionError}</ClaimsNotice> : null}
      <ClaimsNotice>Files are parsed locally in this browser and are not uploaded to a server. Expected columns: claim ID, result, message. This parser is not a full CLAIM-it report adapter.</ClaimsNotice>
      <ClaimsPanel title="Imported report history" description="Rows are retained with their import filename and timestamp.">
        <div className="hms-claims__report-list">{data.claims.reports.map((report) => <article className="hms-claims__report" key={report.id}><header><span><strong>{report.fileName}</strong><small>{report.id} · {dateLabel(report.importedAt)}</small></span><StatusBadge tone="info">{report.rows.length} row(s)</StatusBadge></header><div className="hms-claims__table-wrap"><table className="hms-claims__table"><thead><tr><th>Claim ID</th><th>Result</th><th>Message</th></tr></thead><tbody>{report.rows.map((row, index) => <tr key={`${report.id}-${row.claimId}-${index}`}><td>{row.claimId}</td><td><StatusBadge tone={row.result === 'Failed' ? 'critical' : row.result === 'Warned' ? 'warning' : row.result === 'Import passed' ? 'success' : 'neutral'}>{row.result}</StatusBadge></td><td>{row.message}</td></tr>)}</tbody></table></div></article>)}{!data.claims.reports.length ? <div className="hms-claims__empty"><Icon name="info" size={18} />No import reports have been read.</div> : null}</div>
      </ClaimsPanel>
    </div>
  </>
}
