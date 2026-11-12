import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChartCard, Dialog, Icon, PageHeader, PillBarChart, StatusBadge } from '@ui'
import useAdminCollection from './useAdminCollection.js'
import { BACKUP_JOBS, CATALOGUE_SEED, INVENTORY_SEED, MAPPINGS_SEED, REFUNDS_SEED, REPORTS } from './operationalData.js'
import './admin styles/adminoperations.css'

const DETAILS = {
  catalogue: { key: 'hms.admin.catalogue.v1', defaults: CATALOGUE_SEED, id: 'id', title: (record) => record?.name || 'Add service' },
  mappings: { key: 'hms.admin.mappings.v1', defaults: MAPPINGS_SEED, id: 'id', title: (record) => record?.source || 'Mapping detail' },
  refunds: { key: 'hms.admin.refunds.v1', defaults: REFUNDS_SEED, id: 'id', title: (record) => record?.reason || 'Refund request' },
  inventory: { key: 'hms.admin.inventory.v1', defaults: INVENTORY_SEED, id: 'id', title: (record) => record?.name || 'Inventory item' },
}

function DetailField({ label, value, onChange, type = 'text', options }) {
  return (
    <label className="hms-admin-ops__detail-field">
      <span>{label}</span>
      {options ? <select value={value ?? ''} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select> : <input type={type} value={value ?? ''} onChange={(event) => onChange(type === 'number' ? event.target.value : event.target.value)} />}
    </label>
  )
}

function RecordForm({ record, module, onSave, onCancel, error }) {
  const [values, setValues] = useState(record)
  const set = (key, value) => setValues((current) => ({ ...current, [key]: value }))
  const config = {
    catalogue: [
      ['name', 'Service name'], ['category', 'Category'], ['code', 'Internal service code'], ['claimCode', 'Claims tariff code'], ['price', 'Price (GHS)', 'number'],
    ],
    mappings: [
      ['source', 'Source name'], ['sourceCode', 'Source code'], ['target', 'Mapped reference'], ['targetCode', 'Target code'], ['type', 'Mapping type', null, ['Service tariff', 'Medicine tariff', 'Laboratory', 'Procedure', 'Diagnosis']],
    ],
  }[module] || []

  return (
    <form className="hms-admin-ops__detail-form" onSubmit={(event) => { event.preventDefault(); onSave(values) }}>
      <div className="hms-admin-ops__detail-grid">
        {config.map(([key, label, type, options]) => <DetailField key={key} label={label} type={type || 'text'} options={options} value={values[key]} onChange={(value) => set(key, value)} />)}
        {module === 'catalogue' ? <DetailField label="Status" value={values.status} options={['Active', 'Needs mapping', 'Inactive']} onChange={(value) => set('status', value)} /> : null}
      </div>
      {error ? <div className="hms-admin-ops__error" role="alert">{error}</div> : null}
      <div className="hms-admin-ops__detail-actions"><button type="button" className="hms-admin-ops__quiet-action" onClick={onCancel}>Cancel</button><button type="submit" className="hms-admin-ops__primary-action"><Icon name="check" size={16} />Save changes</button></div>
    </form>
  )
}

function RecordDetails({ module, record }) {
  const entries = module === 'catalogue'
    ? [['Service name', record.name], ['Category', record.category], ['Internal code', record.code], ['Claims tariff', record.claimCode || 'Not mapped'], ['Price', `GHS ${Number(record.price).toFixed(2)}`], ['Status', record.status], ['Last updated', record.updated]]
    : [['Source', record.source], ['Source code', record.sourceCode], ['Mapped reference', record.target || 'Not mapped'], ['Target code', record.targetCode || 'Not mapped'], ['Mapping type', record.type], ['Status', record.status], ['Last reviewed', record.reviewed]]
  return <dl className="hms-admin-ops__detail-facts">{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
}

function EditableRecord({ module, menu }) {
  const { recordId } = useParams()
  const navigate = useNavigate()
  const detail = DETAILS[module]
  const { records, loaded, error: storageError, commit } = useAdminCollection(detail.key, detail.defaults)
  const isNew = recordId === 'new'
  const record = useMemo(() => records.find((item) => item[detail.id] === recordId), [records, recordId, detail.id])
  const [editing, setEditing] = useState(isNew)
  const [formError, setFormError] = useState('')
  const title = detail.title(record)

  const save = (values) => {
    if (module === 'catalogue' && (!values.name?.trim() || !values.category?.trim() || !values.code?.trim() || !Number.isFinite(Number(values.price)))) {
      setFormError('Enter a service name, category, code, and valid price.')
      return
    }
    if (module === 'mappings' && (!values.source?.trim() || !values.sourceCode?.trim())) {
      setFormError('Source name and source code are required.')
      return
    }
    const updated = {
      ...values,
      ...(module === 'catalogue' ? {
        id: record?.id || `svc-${globalThis.crypto?.randomUUID?.() || Date.now()}`,
        price: Number(values.price),
        status: values.claimCode?.trim() ? values.status === 'Needs mapping' ? 'Active' : values.status : 'Needs mapping',
        updated: new Date().toLocaleDateString(),
      } : {
        id: record?.id || `map-${globalThis.crypto?.randomUUID?.() || Date.now()}`,
        status: values.targetCode?.trim() ? 'Mapped' : 'Needs review',
        reviewed: new Date().toLocaleDateString(),
      }),
    }
    const next = record ? records.map((item) => item.id === record.id ? updated : item) : [...records, updated]
    if (commit(next)) navigate(`/admin/${module}/${encodeURIComponent(updated.id)}`, { replace: true })
  }

  const remove = () => {
    if (!window.confirm(`Remove ${title} from this browser's ${module} list?`)) return
    if (commit(records.filter((item) => item.id !== record.id))) navigate(`/admin/${module}`, { replace: true })
  }

  if (!loaded) return <div className="hms-admin-ops__empty">Loading record…</div>
  if (storageError) return <div className="hms-admin-ops__error" role="alert">{storageError}</div>
  if (!isNew && !record) return <><PageHeader title="Record not found" /><div className="hms-admin-ops__empty"><Link to={`/admin/${module}`}>Return to {menu.label}</Link></div></>

  return (
    <>
      <PageHeader title={isNew ? `Add ${module === 'catalogue' ? 'service' : 'mapping'}` : title} description={menu.summary} actions={<div className="hms-admin-ops__detail-actions"><Link className="hms-admin-ops__quiet-action" to={`/admin/${module}`}><Icon name="arrowLeft" size={16} />Back to {menu.label}</Link>{!editing && !isNew ? <button className="hms-admin-ops__primary-action" type="button" onClick={() => setEditing(true)}><Icon name="edit" size={16} />Edit</button> : null}{!isNew && !editing ? <button className="hms-admin-ops__quiet-action is-danger" type="button" onClick={remove}><Icon name="trash" size={16} />Delete</button> : null}</div>} />
      <div className="hms-admin-ops">
        <section className="hms-admin-ops__surface hms-admin-ops__record-detail">
          <div className="hms-admin-ops__record-heading"><span className="hms-admin-ops__record-icon"><Icon name={module === 'catalogue' ? 'tag' : 'link'} size={21} /></span><div><span className="hms-admin-ops__eyebrow">{module === 'catalogue' ? record?.category || 'New service' : record?.type || 'New mapping'}</span><h2>{title}</h2><p>{record?.code || record?.sourceCode || 'New record'}</p></div>{record?.status ? <StatusBadge tone={record.status === 'Mapped' || record.status === 'Active' ? 'success' : 'warning'}>{record.status}</StatusBadge> : null}</div>
          {record ? <RecordDetails module={module} record={record} /> : null}
        </section>
      </div>
      <Dialog open={editing} title={isNew ? `Add ${module === 'catalogue' ? 'service' : 'mapping'}` : `Edit ${title}`} description="Update the record details." onClose={() => isNew ? navigate(`/admin/${module}`) : setEditing(false)} size="large">
        <RecordForm record={record || { name: '', category: '', code: '', claimCode: '', price: '', source: '', sourceCode: '', target: '', targetCode: '', type: 'Service tariff' }} module={module} onSave={save} onCancel={() => isNew ? navigate(`/admin/${module}`) : setEditing(false)} error={formError || storageError} />
      </Dialog>
    </>
  )
}

function RefundDetail({ menu }) {
  const { recordId } = useParams()
  const navigate = useNavigate()
  const { records, loaded, error, commit } = useAdminCollection('hms.admin.refunds.v1', REFUNDS_SEED)
  const refund = records.find((item) => item.id === recordId)
  const decide = (status) => {
    if (!window.confirm(`${status} refund ${refund.id}?`)) return
    if (commit(records.map((item) => item.id === refund.id ? { ...item, status, reviewedAt: new Date().toLocaleString() } : item))) navigate('/admin/refunds')
  }
  if (!loaded) return <div className="hms-admin-ops__empty">Loading refund…</div>
  if (error) return <div className="hms-admin-ops__error" role="alert">{error}</div>
  if (!refund) return <><PageHeader title="Refund not found" /><div className="hms-admin-ops__empty"><Link to="/admin/refunds">Return to refund approvals</Link></div></>
  return (
    <>
      <PageHeader title={refund.reason} description={`${refund.id} · ${menu.label}`} actions={<Link className="hms-admin-ops__quiet-action" to="/admin/refunds"><Icon name="arrowLeft" size={16} />All refund requests</Link>} />
      <div className="hms-admin-ops"><section className="hms-admin-ops__surface hms-admin-ops__record-detail">
        <div className="hms-admin-ops__record-heading"><span className="hms-admin-ops__record-icon"><Icon name="undo" size={21} /></span><div><span className="hms-admin-ops__eyebrow">Refund request</span><h2>GHS {Number(refund.amount).toFixed(2)}</h2><p>Invoice {refund.invoice}</p></div><StatusBadge tone={refund.status === 'Pending' ? 'warning' : refund.status === 'Approved' ? 'success' : 'critical'}>{refund.status}</StatusBadge></div>
        <dl className="hms-admin-ops__detail-facts">{[['Patient', refund.patient], ['Reason', refund.reason], ['Payment method', refund.method], ['Requested by', refund.requestedBy], ['Requested at', refund.requestedAt], ['Review status', refund.status], ['Notes', refund.notes]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        {refund.status === 'Pending' ? <div className="hms-admin-ops__detail-actions"><button className="hms-admin-ops__quiet-action is-danger" type="button" onClick={() => decide('Declined')}>Decline request</button><button className="hms-admin-ops__primary-action" type="button" onClick={() => decide('Approved')}><Icon name="check" size={16} />Approve refund</button></div> : null}
      </section></div>
    </>
  )
}

function InventoryDetail({ menu }) {
  const { recordId } = useParams()
  const { records, loaded, error, commit } = useAdminCollection('hms.admin.inventory.v1', INVENTORY_SEED)
  const item = records.find((record) => record.id === recordId)
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [showAdjustment, setShowAdjustment] = useState(false)
  const adjust = (event) => {
    event.preventDefault()
    const change = Number(quantity)
    if (!Number.isFinite(change) || change === 0 || !reason.trim()) {
      setMessage('Enter a non-zero quantity and a reason for the adjustment.')
      return
    }
    const onHand = Number(item.onHand) + change
    if (onHand < 0) {
      setMessage('Adjustment cannot reduce the available quantity below zero.')
      return
    }
    const status = onHand === 0 ? 'Out of stock' : onHand <= Number(item.reorder) ? 'Low stock' : 'In stock'
    const next = records.map((record) => record.id === item.id ? { ...record, onHand, status, updated: new Date().toLocaleString(), lastAdjustment: { change, reason: reason.trim(), date: new Date().toLocaleString() } } : record)
    if (commit(next)) { setMessage('Inventory quantity updated on this device.'); setQuantity(''); setReason(''); setShowAdjustment(false) }
  }
  if (!loaded) return <div className="hms-admin-ops__empty">Loading inventory item…</div>
  if (error) return <div className="hms-admin-ops__error" role="alert">{error}</div>
  if (!item) return <><PageHeader title="Inventory item not found" /><div className="hms-admin-ops__empty"><Link to="/admin/inventory">Return to inventory</Link></div></>

  return (
    <>
      <PageHeader title={item.name} description={`${item.id} · ${item.category}`} actions={<div className="hms-admin-ops__detail-actions"><Link className="hms-admin-ops__quiet-action" to="/admin/inventory"><Icon name="arrowLeft" size={16} />Inventory console</Link><button className="hms-admin-ops__primary-action" type="button" onClick={() => setShowAdjustment(true)}><Icon name="edit" size={16} />Record adjustment</button></div>} />
      <div className="hms-admin-ops hms-admin-ops--detail-grid">
        <section className="hms-admin-ops__surface hms-admin-ops__record-detail">
          <div className="hms-admin-ops__record-heading"><span className="hms-admin-ops__record-icon"><Icon name="packageBox" size={21} /></span><div><span className="hms-admin-ops__eyebrow">{item.location}</span><h2>{item.name}</h2><p>{item.id} · {item.category}</p></div><StatusBadge tone={item.status === 'In stock' ? 'success' : item.status === 'Low stock' ? 'warning' : 'critical'}>{item.status}</StatusBadge></div>
          <dl className="hms-admin-ops__detail-facts">{[['On hand', `${item.onHand} ${item.unit}`], ['Reorder level', `${item.reorder} ${item.unit}`], ['Unit cost', `GHS ${Number(item.unitCost).toFixed(2)}`], ['Stock value', `GHS ${(Number(item.onHand) * Number(item.unitCost)).toFixed(2)}`], ['Location', item.location], ['Last updated', item.updated]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          {item.lastAdjustment ? <div className="hms-admin-ops__last-adjustment"><strong>Latest adjustment</strong><span>{item.lastAdjustment.change > 0 ? '+' : ''}{item.lastAdjustment.change} {item.unit} · {item.lastAdjustment.reason}</span><small>{item.lastAdjustment.date}</small></div> : null}
        </section>
        <section className="hms-admin-ops__surface hms-admin-ops__adjustment">
          <span className="hms-admin-ops__eyebrow">Stock ledger</span><h2>Stock adjustment</h2><p>Add or remove stock with a reason for traceability.</p><button className="hms-admin-ops__primary-action" type="button" onClick={() => setShowAdjustment(true)}><Icon name="edit" size={16} />Record adjustment</button>
          {message ? <p className={message.startsWith('Inventory') ? 'hms-admin-ops__success' : 'hms-admin-ops__error'} role="status">{message}</p> : null}
        </section>
      </div>
      <Dialog open={showAdjustment} title="Record stock adjustment" description={`${item.name} · current stock ${item.onHand} ${item.unit}`} onClose={() => setShowAdjustment(false)}>
        <form onSubmit={adjust}><label><span>Quantity change</span><input type="number" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="e.g. 12 or -3" /></label><label><span>Reason</span><select value={reason} onChange={(event) => setReason(event.target.value)}><option value="">Choose reason</option><option>Physical count correction</option><option>Damaged or expired stock</option><option>Stock receipt correction</option><option>Other approved adjustment</option></select></label><button className="hms-admin-ops__primary-action" type="submit"><Icon name="check" size={16} />Apply adjustment</button></form>
      </Dialog>
    </>
  )
}

function ReportDetail({ menu }) {
  const { recordId } = useParams()
  const report = REPORTS.find((item) => item.id === recordId)
  const [range, setRange] = useState('7 days')
  if (!report) return <><PageHeader title="Report not found" /><div className="hms-admin-ops__empty"><Link to="/admin/reports">Return to reports</Link></div></>
  const points = range === '30 days' ? [...report.values, 61, 75, 58, 88, 91, 73, 84] : report.values
  const download = () => {
    const csv = ['Period,Index', ...points.map((value, index) => `${index + 1},${value}`)].join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${report.id}-${range.replace(' ', '-')}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  return (
    <>
      <PageHeader title={report.name} description={report.description} actions={<div className="hms-admin-ops__detail-actions"><Link className="hms-admin-ops__quiet-action" to="/admin/reports"><Icon name="arrowLeft" size={16} />Reports</Link><button type="button" className="hms-admin-ops__primary-action" onClick={download}><Icon name="download" size={16} />Export CSV</button></div>} />
      <div className="hms-admin-ops">
        <div className="hms-admin-ops__report-detail-bar"><StatusBadge tone="neutral">{report.category}</StatusBadge><span>Updated today at 08:52</span><label>Period <select value={range} onChange={(event) => setRange(event.target.value)}><option>7 days</option><option>30 days</option></select></label></div>
        <ChartCard eyebrow={`${report.category} analytics`} title={`${report.name} · ${range}`}>
          <PillBarChart label={`${report.name} ${range} index`} unit="index" height={220} data={points.map((value, index) => ({ label: range === '7 days' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index] : `Day ${index + 1}`, value }))} />
        </ChartCard>
        <div className="hms-admin-ops__report-kpis"><div><span>Current period</span><strong>{points.at(-1)}<small> index</small></strong></div><div><span>Previous period</span><strong>{points.at(-2)}<small> index</small></strong></div><div><span>Period change</span><strong>{points.at(-1) - points.at(-2) >= 0 ? '+' : ''}{points.at(-1) - points.at(-2)}<small> index</small></strong></div></div>
      </div>
    </>
  )
}

function BackupDetail({ menu }) {
  const { recordId } = useParams()
  const job = BACKUP_JOBS.find((item) => item.id === recordId)
  if (!job) return <><PageHeader title="Backup job not found" /><div className="hms-admin-ops__empty"><Link to="/admin/backup">Return to backup status</Link></div></>
  return (
    <>
      <PageHeader title={job.type} description={`${job.id} · ${menu.label}`} actions={<Link to="/admin/backup" className="hms-admin-ops__quiet-action"><Icon name="arrowLeft" size={16} />All backup jobs</Link>} />
      <div className="hms-admin-ops"><section className="hms-admin-ops__surface hms-admin-ops__record-detail"><div className="hms-admin-ops__record-heading"><span className="hms-admin-ops__record-icon"><Icon name="database" size={21} /></span><div><span className="hms-admin-ops__eyebrow">Backup job {job.id}</span><h2>{job.status}</h2><p>{job.started}</p></div><StatusBadge tone={job.status === 'Completed' ? 'success' : 'critical'}>{job.status}</StatusBadge></div><dl className="hms-admin-ops__detail-facts">{[['Job type', job.type], ['Started', job.started], ['Duration', job.duration], ['Backup size', job.size], ['Destination', job.destination], ['Integrity check', job.checksum], ['Retention class', job.type.startsWith('Full') ? 'Full · retained 30 days' : 'Incremental · retained 30 days']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section></div>
    </>
  )
}

export default function AdminRecordDetailPage({ menu, module: moduleProp }) {
  const { module: routeModule } = useParams()
  const module = moduleProp || routeModule
  if (module === 'catalogue' || module === 'mappings') return <EditableRecord module={module} menu={menu} />
  if (module === 'refunds') return <RefundDetail menu={menu} />
  if (module === 'inventory') return <InventoryDetail menu={menu} />
  if (module === 'reports') return <ReportDetail menu={menu} />
  if (module === 'backup') return <BackupDetail menu={menu} />
  return null
}
