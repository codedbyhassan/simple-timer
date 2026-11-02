import { useMemo, useState, useSyncExternalStore } from 'react'
import { ArrowDownToLine, ArrowRight, CheckCircle2, FileCheck2, FileInput, Layers3, Plus, Search, Settings2 } from 'lucide-react'
import { useRoleAccess } from '../../access/roleAccess.js'
import { getGeneratedClaimsSnapshot, subscribeToGeneratedClaims } from './claimsStore.js'
import { getWorkspace, subscribeWorkspace, updateWorkspace } from '../admin/workspaceStore.js'
import './ClaimsWorkspacePage.css'

const batchKey = 'ascend-hms-claims-export-batches-v1'
const importKey = 'ascend-hms-claims-import-reports-v1'
const readList = (key) => {
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : [] } catch { return [] }
}
const saveList = (key, value) => localStorage.setItem(key, JSON.stringify(value))
const currency = (value) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(value)
const download = (name, content, type) => {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function parseCsv(text) {
  const rows = []
  let row = [], cell = '', quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1 }
    else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) { row.push(cell); cell = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell); if (row.some((value) => value.trim())) rows.push(row)
      row = []; cell = ''
    } else cell += char
  }
  row.push(cell); if (row.some((value) => value.trim())) rows.push(row)
  return rows
}
function pageHeading(title, description) {
  return <header className="claims-workspace-heading"><div><span><FileCheck2 size={15}/> Claims office</span><h1>{title}</h1><p>{description}</p></div><small>Local preview workflow</small></header>
}
export default function ClaimsWorkspacePage({ pageId, pageTitle }) {
  const { hasPermission, navigate } = useRoleAccess()
  const canExport = hasPermission('claims.export')
  const canMap = hasPermission('claims.mapping.manage')
  const archive = useSyncExternalStore(subscribeToGeneratedClaims, getGeneratedClaimsSnapshot, getGeneratedClaimsSnapshot)
  const workspace = useSyncExternalStore(subscribeWorkspace, getWorkspace, getWorkspace)
  const [batches, setBatches] = useState(() => readList(batchKey))
  const [imports, setImports] = useState(() => readList(importKey))
  const [selectedImport, setSelectedImport] = useState(null)
  const [selected, setSelected] = useState([])
  const [mappingForm, setMappingForm] = useState({ localCode: '', system: 'G-DRG', externalCode: '', note: '' })
  const [mappingError, setMappingError] = useState('')
  const [importError, setImportError] = useState('')
  const [importNotice, setImportNotice] = useState('')
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState('all')
  const months = [...new Set(archive.records.map((record) => record.generatedAt.slice(0, 7)))].sort().reverse()
  const filtered = archive.records.filter((record) => month === 'all' || record.generatedAt.slice(0, 7) === month)
  const monthGroups = useMemo(() => {
    const grouped = new Map()
    archive.records.forEach((record) => {
      const key = record.generatedAt.slice(0, 7)
      grouped.set(key, [...(grouped.get(key) || []), record])
    })
    return [...grouped.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [archive.records])
  const missingTariffs = archive.records.filter((record) => record.claim.medicine.some((item) => !Number.isFinite(item.nhisCovered))).length

  const createBatch = () => {
    if (!canExport || !selected.length) return
    const records = archive.records.filter((record) => selected.includes(record.id))
    if (!records.length) return
    const batch = { id: 'EXP-' + Date.now().toString(36).toUpperCase(), createdAt: new Date().toISOString(), claimIds: records.map((record) => record.claimID), count: records.length }
    const next = [batch, ...batches].slice(0, 50)
    setBatches(next); saveList(batchKey, next)
    const body = records.map((record) => record.xml.replaceAll(']]>', ']]]]><![CDATA[>')).map((xml) => '<Claim><![CDATA[' + xml + ']]></Claim>').join('\n')
    download(batch.id + '.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<ClaimsBatch id="' + batch.id + '" createdAt="' + batch.createdAt + '">' + body + '</ClaimsBatch>', 'application/xml;charset=utf-8')
    setSelected([])
  }
  const downloadBatch = (batch) => {
    if (!canExport) return
    const records = archive.records.filter((record) => batch.claimIds.includes(record.claimID))
    const body = records.map((record) => '<Claim><![CDATA[' + record.xml.replaceAll(']]>', ']]]]><![CDATA[>') + ']]></Claim>').join('\n')
    download(batch.id + '.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<ClaimsBatch id="' + batch.id + '">' + body + '</ClaimsBatch>', 'application/xml;charset=utf-8')
  }
  const importReport = async (event) => {
    const file = event.target.files?.[0]
    setImportError(''); setImportNotice('')
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setImportError('Choose a CSV file smaller than 2 MB.'); return }
    try {
      const rows = parseCsv(await file.text())
      if (rows.length < 2) throw new Error('The report must contain a header and at least one data row.')
      const headers = rows[0].map((value) => value.trim().toLowerCase().replaceAll(/[^a-z0-9]/g, ''))
      const claimColumn = headers.findIndex((value) => ['claimid', 'claimreference', 'claimref'].includes(value))
      const statusColumn = headers.indexOf('status')
      if (claimColumn < 0 || statusColumn < 0) throw new Error('Required CSV columns: Claim ID (or Claim Reference) and Status.')
      const data = rows.slice(1).map((row) => ({ claimId: row[claimColumn] || '', status: row[statusColumn] || '' })).filter((row) => row.claimId)
      const report = { id: 'IMP-' + Date.now().toString(36).toUpperCase(), fileName: file.name, importedAt: new Date().toISOString(), rowCount: data.length, rows: data.slice(0, 5000), statuses: [...new Set(data.map((row) => row.status).filter(Boolean))] }
      const next = [report, ...imports].slice(0, 50)
      setImports(next); saveList(importKey, next)
      setImportNotice(`${data.length} report rows validated and saved as an import report. Claim statuses were not automatically changed.`)
    } catch (error) { setImportError(error instanceof Error ? error.message : 'Could not read this report.') }
    event.target.value = ''
  }
  const addMapping = (event) => {
    event.preventDefault()
    if (!canMap) return
    if (!mappingForm.localCode.trim() || !mappingForm.externalCode.trim()) { setMappingError('Enter both local and external codes.'); return }
    const duplicate = workspace.mappings.some((item) => item.localCode.toLowerCase() === mappingForm.localCode.trim().toLowerCase() && item.system === mappingForm.system)
    if (duplicate) { setMappingError('A mapping for this local code and system already exists. Edit the existing row instead.'); return }
    updateWorkspace((current) => ({ ...current, mappings: [{ id: 'MAP-' + Date.now().toString(36).toUpperCase(), ...mappingForm, localCode: mappingForm.localCode.trim().toUpperCase(), externalCode: mappingForm.externalCode.trim().toUpperCase(), note: mappingForm.note.trim() }, ...current.mappings] }), { actor: 'Claims Officer', action: 'Reference mapping created', detail: mappingForm.localCode.trim() })
    setMappingForm({ localCode: '', system: 'G-DRG', externalCode: '', note: '' }); setMappingError('')
  }
  const removeMapping = (mapping) => updateWorkspace((current) => ({ ...current, mappings: current.mappings.filter((item) => item.id !== mapping.id) }), { actor: 'Claims Officer', action: 'Reference mapping removed', detail: mapping.localCode })

  if (pageId === 'claims-pipeline') return <section className="claims-workspace">
    {pageHeading(pageTitle, 'Track generated claim records through local validation and export preparation. External submission and adjudication are not connected.')}
    {archive.error && <p className="claims-workspace-error">{archive.error}</p>}
    <div className="claims-workspace-stats"><article><span>Generated archive</span><strong>{archive.records.length}</strong></article><article><span>XML available</span><strong>{archive.records.filter((item) => Boolean(item.xml)).length}</strong></article><article><span>Medicine tariff gaps</span><strong>{missingTariffs}</strong></article><article><span>External submissions</span><strong>Not connected</strong></article></div>
    <div className="claims-workspace-grid"><section className="claims-workspace-panel"><h2>Workflow stages</h2><div className="claims-stage-list"><div><span>01</span><strong>Generated</strong><small>{archive.records.length} claim sheets saved locally</small></div><div><span>02</span><strong>Review & mapping</strong><small>{missingTariffs} claims have incomplete medicine tariff data</small></div><div><span>03</span><strong>Export batch</strong><small>Build a local XML batch from selected saved claims</small></div><div><span>04</span><strong>Submission / adjudication</strong><small>Not integrated; no submission status is inferred</small></div></div></section><section className="claims-workspace-panel"><h2>Quick actions</h2><button className="button button--secondary" onClick={() => navigate('claims-list')} type="button">Open claims list <ArrowRight size={14}/></button><button className="button button--secondary" onClick={() => navigate('claims-mapping')} type="button">Review mappings <ArrowRight size={14}/></button><button className="button button--secondary" onClick={() => navigate('export-batches')} type="button">Prepare export batch <ArrowRight size={14}/></button></section></div>
  </section>

  if (pageId === 'claims-mapping') return <section className="claims-workspace">
    {pageHeading(pageTitle, 'Maintain local reference mapping records for claim preparation. These mappings are not automatically applied to saved claim XML.')}
    <section className="claims-workspace-panel"><h2>Add reference mapping</h2><form className="claims-mapping-form" onSubmit={addMapping}><label><span>Local code</span><input value={mappingForm.localCode} onChange={(event) => setMappingForm({ ...mappingForm, localCode: event.target.value })} required placeholder="e.g. LAB-FBC"/></label><label><span>Target system</span><select value={mappingForm.system} onChange={(event) => setMappingForm({ ...mappingForm, system: event.target.value })}><option>G-DRG</option><option>ICD-10</option><option>NHIS medicine</option></select></label><label><span>External code</span><input value={mappingForm.externalCode} onChange={(event) => setMappingForm({ ...mappingForm, externalCode: event.target.value })} required placeholder="Official code"/></label><label><span>Note</span><input value={mappingForm.note} onChange={(event) => setMappingForm({ ...mappingForm, note: event.target.value })} placeholder="Optional validation note"/></label><button className="button button--primary" type="submit" disabled={!canMap}><Plus size={14}/> Add mapping</button></form>{mappingError && <p className="claims-workspace-error">{mappingError}</p>}</section>
    <section className="claims-workspace-panel"><div className="claims-workspace-panel-heading"><div><h2>Configured mappings</h2><p>{workspace.mappings.length} mapping records in this browser.</p></div><label className="claims-workspace-search"><Search size={14}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search local or external code"/></label></div><div className="claims-workspace-table-wrap"><table><thead><tr><th>Local code</th><th>System</th><th>External code</th><th>Note</th><th>Action</th></tr></thead><tbody>{workspace.mappings.filter((item) => `${item.localCode} ${item.externalCode} ${item.system}`.toLowerCase().includes(search.toLowerCase())).map((item) => <tr key={item.id}><td>{item.localCode}</td><td>{item.system}</td><td>{item.externalCode}</td><td>{item.note || '—'}</td><td><button className="claims-text-action" type="button" disabled={!canMap} onClick={() => removeMapping(item)}>Remove</button></td></tr>)}</tbody></table>{!workspace.mappings.length && <p className="claims-workspace-empty">No reference mappings have been configured.</p>}</div></section>
  </section>

  if (pageId === 'export-batches') return <section className="claims-workspace">
    {pageHeading(pageTitle, 'Select saved claim sheets and package their XML into a downloadable batch. This does not submit claims to CLAIM-it.')}
    <section className="claims-workspace-panel"><div className="claims-workspace-panel-heading"><div><h2>Choose claims</h2><p>{selected.length} selected · {filtered.length} available in this period</p></div><select value={month} onChange={(event) => setMonth(event.target.value)}><option value="all">All months</option>{months.map((value) => <option key={value}>{value}</option>)}</select></div><div className="claims-workspace-table-wrap"><table><thead><tr><th>Select</th><th>Claim</th><th>Patient</th><th>Generated</th></tr></thead><tbody>{filtered.map((record) => <tr key={record.id}><td><input type="checkbox" checked={selected.includes(record.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, record.id] : current.filter((id) => id !== record.id))}/></td><td>{record.claimID}</td><td>{record.patientName || record.sourcePatientId}</td><td>{new Date(record.generatedAt).toLocaleString()}</td></tr>)}</tbody></table>{!filtered.length && <p className="claims-workspace-empty">No saved claims are available for export.</p>}</div><button className="button button--primary" type="button" disabled={!canExport || !selected.length} onClick={createBatch}><Layers3 size={14}/> Build and download XML batch</button></section>
    <section className="claims-workspace-panel"><h2>Export history</h2><div className="claims-workspace-table-wrap"><table><thead><tr><th>Batch</th><th>Created</th><th>Claims</th><th>Action</th></tr></thead><tbody>{batches.map((batch) => <tr key={batch.id}><td>{batch.id}</td><td>{new Date(batch.createdAt).toLocaleString()}</td><td>{batch.count}</td><td><button className="claims-text-action" type="button" disabled={!canExport} onClick={() => downloadBatch(batch)}>Download again</button></td></tr>)}</tbody></table>{!batches.length && <p className="claims-workspace-empty">No export batches have been created.</p>}</div></section>
  </section>

  if (pageId === 'import-reports') return <section className="claims-workspace">
    {pageHeading(pageTitle, 'Import a CSV reconciliation report containing claim references and statuses. The file is validated and summarized; claim records are not silently overwritten.')}
    <section className="claims-workspace-panel"><h2>Import reconciliation report</h2><p className="claims-workspace-copy">Required columns: <strong>Claim ID</strong> (or Claim Reference) and <strong>Status</strong>. Maximum file size: 2 MB.</p><label className="claims-import-picker"><FileInput size={18}/><span>Choose CSV report</span><input type="file" accept=".csv,text/csv" onChange={importReport}/></label>{importError && <p className="claims-workspace-error">{importError}</p>}{importNotice && <p className="claims-workspace-success"><CheckCircle2 size={15}/>{importNotice}</p>}</section>
    <section className="claims-workspace-panel"><h2>Import history</h2><div className="claims-workspace-table-wrap"><table><thead><tr><th>File</th><th>Imported</th><th>Rows</th><th>Statuses found</th></tr></thead><tbody>{imports.map((item) => <tr key={item.id}><td><button className="claims-text-action" type="button" onClick={() => setSelectedImport(item)}>{item.fileName}</button></td><td>{new Date(item.importedAt).toLocaleString()}</td><td>{item.rowCount}</td><td>{item.statuses.join(', ') || 'No status values'}</td></tr>)}</tbody></table>{!imports.length && <p className="claims-workspace-empty">No reports imported.</p>}</div></section>
    {selectedImport && <div className="claims-import-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedImport(null)}><section className="claims-import-modal" role="dialog" aria-modal="true" aria-labelledby="claims-import-modal-title"><div className="claims-workspace-panel-heading"><div><h2 id="claims-import-modal-title">{selectedImport.fileName}</h2><p>{selectedImport.rowCount} imported rows · {new Date(selectedImport.importedAt).toLocaleString()}</p></div><button className="button button--secondary" type="button" onClick={() => setSelectedImport(null)}>Close</button></div><div className="claims-workspace-table-wrap"><table><thead><tr><th>Claim reference</th><th>Reported status</th></tr></thead><tbody>{(selectedImport.rows || []).map((row, index) => <tr key={row.claimId + index}><td>{row.claimId}</td><td>{row.status || 'Not supplied'}</td></tr>)}</tbody></table></div><p className="claims-workspace-copy">Imported report data is retained as a separate reconciliation snapshot. It does not change generated claim records.</p></section></div>}
  </section>

  return <section className="claims-workspace">
    {pageHeading(pageTitle, 'Review monthly claim generation activity and the quality checks still requiring attention.')}
    <section className="claims-workspace-stats"><article><span>Months with activity</span><strong>{monthGroups.length}</strong></article><article><span>Saved claim sheets</span><strong>{archive.records.length}</strong></article><article><span>Tariff review needed</span><strong>{missingTariffs}</strong></article><article><span>External response data</span><strong>Unavailable</strong></article></section>
    <section className="claims-workspace-panel"><h2>Monthly progress</h2><div className="claims-month-list">{monthGroups.map(([key, records]) => <div className="claims-month-row" key={key}><span><strong>{new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(key + '-01T00:00:00'))}</strong><small>{records.length} generated claim sheets</small></span><strong>{records.filter((record) => record.claim.medicine.every((item) => Number.isFinite(item.nhisCovered))).length} tariff-complete</strong><button className="claims-text-action" type="button" onClick={() => { navigate('claims-list') }}>View claims</button></div>)}</div>{!monthGroups.length && <p className="claims-workspace-empty">No generated claims yet.</p>}</section>
  </section>
}
