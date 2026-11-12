import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, MetricCard, PageHeader, SegmentedBar, StatusBadge } from '@ui'
import useAdminCollection from './useAdminCollection.js'
import useCashierWorkspace from '../cashier/useCashierWorkspace.js'
import useReceptionWorkspace from '../reception/useReceptionWorkspace.js'
import useLabWorkspace from '../lab/useLabWorkspace.js'
import usePharmacyWorkspace from '../pharmacy/usePharmacyWorkspace.js'
import useClaimsWorkspace from '../claims/useClaimsWorkspace.js'
import { uid } from '../cashier/CashierShared.jsx'
import { appendAuditEvent, exportLocalDatabase, importLocalDatabase, readDocument, writeDocument } from '@core/storage/localDatabase.js'
import {
  AUDIT_SEED,
  REFUNDS_SEED,
  SETTINGS_DEFAULTS,
} from './operationalData.js'
import './admin styles/adminoperations.css'

const tone = (value) => {
  if (['Active', 'Mapped', 'Approved', 'Completed', 'Ready', 'In stock', 'Success', 'Verified'].includes(value)) return 'success'
  if (['Pending', 'Invited', 'Needs review', 'Low stock', 'Warning', 'Near capacity'].includes(value)) return 'warning'
  if (['Suspended', 'Declined', 'Failed', 'Denied', 'Out of stock'].includes(value)) return 'critical'
  return 'neutral'
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="hms-admin-ops__search">
      <Icon name="search" size={17} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {value ? <button type="button" aria-label="Clear search" onClick={() => onChange('')}><Icon name="x" size={14} /></button> : null}
    </label>
  )
}

function CataloguePage({ menu }) {
  const { data, loaded, error } = useCashierWorkspace()
  const records = (data.cashier?.prices || []).map((item) => ({ ...item, price: Number(item.amount || 0), code: item.code || '', claimCode: item.claimCode || '', status: item.status || 'Active', category: item.category || 'Uncategorised' }))
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All services')
  const categories = ['All services', ...new Set(records.map((record) => record.category))]
  const filtered = records.filter((record) => `${record.name} ${record.code} ${record.claimCode} ${record.category}`.toLowerCase().includes(query.toLowerCase()) && (category === 'All services' || record.category === category))
  return (
    <>
      <PageHeader title={menu.label} description="Service prices used by the cashier are managed from this shared local catalogue." actions={<Link className="hms-admin-ops__primary-action" to="/admin/catalogue/new"><Icon name="plus" size={17} />Add service</Link>} />
      <div className="hms-admin-ops">
        {error ? <div className="hms-admin-ops__error" role="alert">{error}</div> : null}
        <div className="hms-admin-ops__metrics"><MetricCard label="Catalogue items" value={loaded ? records.length : '—'} icon="tag" caption="Configured local services" /><MetricCard label="Active services" value={records.filter((item) => item.status === 'Active').length} icon="checkCircle" caption="Available to cashier" /><MetricCard label="Mapping gaps" value={records.filter((item) => !item.claimCode).length} icon="link" caption="No claim code assigned" /><MetricCard label="Average price" value={records.length ? `GHS ${(records.reduce((sum,item)=>sum+item.price,0)/records.length).toFixed(2)}` : '—'} icon="creditCard" caption="Across configured services" /></div>
        <section className="hms-admin-ops__surface"><div className="hms-admin-ops__surface-head"><div><span className="hms-admin-ops__eyebrow">Shared billing configuration</span><h2>Service directory</h2><p>Adding or editing a service here changes the price list used by the cashier workspace.</p></div><StatusBadge tone="neutral">{filtered.length} shown</StatusBadge></div>
          <div className="hms-admin-ops__filters"><SearchBox value={query} onChange={setQuery} placeholder="Search service, code or tariff" /><select aria-label="Filter by category" value={category} onChange={(event)=>setCategory(event.target.value)}>{categories.map((item)=><option key={item}>{item}</option>)}</select></div>
          {!loaded ? <div className="hms-admin-ops__empty">Loading service catalogue…</div> : <div className="hms-admin-ops__table-wrap"><table className="hms-admin-ops__table"><thead><tr><th>Service</th><th>Category</th><th>Service code</th><th>Claims tariff</th><th>Price</th><th>Status</th><th /></tr></thead><tbody>{filtered.map((record)=><tr key={record.id}><td><Link className="hms-admin-ops__row-link" to={`/admin/catalogue/${record.id}`}>{record.name}</Link></td><td>{record.category}</td><td><code>{record.code || '—'}</code></td><td><code>{record.claimCode || '—'}</code></td><td className="hms-admin-ops__amount">GHS {record.price.toFixed(2)}</td><td><StatusBadge tone={tone(record.status)}>{record.status}</StatusBadge></td><td><Link className="hms-admin-ops__icon-link" to={`/admin/catalogue/${record.id}`} aria-label={`View ${record.name}`}><Icon name="chevronRight" size={17} /></Link></td></tr>)}</tbody></table>{filtered.length===0?<div className="hms-admin-ops__empty">No services configured. Add a service to establish the cashier price list.</div>:null}</div>}
        </section>
      </div>
    </>
  )
}

function MappingsPage({ menu }) {
  const { data, loaded, error, commit } = useClaimsWorkspace()
  const records = data.claims?.mappings || []
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('All')
  const needsReview = records.filter((record) => record.status !== 'Mapped')
  const types = [...new Set(records.map((record) => record.type || record.kind || 'Other'))]
  const filtered = records.filter((record) => `${record.source} ${record.sourceCode} ${record.target} ${record.targetCode} ${record.type || record.kind}`.toLowerCase().includes(query.toLowerCase()) && (tab === 'All' || (tab === 'Needs review' ? record.status !== 'Mapped' : (record.type || record.kind) === tab)))
  const remove = async (record) => {
    if (!window.confirm(`Delete mapping for ${record.source}?`)) return
    await commit({ ...data, claims: { ...data.claims, mappings: records.filter((item) => item.id !== record.id) } })
  }
  return (
    <>
      <PageHeader title={menu.label} description="Reference mappings shared with claims preparation." actions={<Link className="hms-admin-ops__primary-action" to="/admin/mappings/new"><Icon name="plus" size={17} />Add mapping</Link>} />
      <div className="hms-admin-ops">
        {error ? <div className="hms-admin-ops__error" role="alert">{error}</div> : null}
        <div className="hms-admin-ops__mapping-hero"><div className="hms-admin-ops__mapping-copy"><span className="hms-admin-ops__eyebrow">Reference integrity</span><h2>Claims reference mappings</h2><p>These records are used by the claims workspace. Only mappings entered here are shown.</p></div><div className="hms-admin-ops__mapping-count"><strong>{needsReview.length}</strong><span>items need review</span></div><SegmentedBar label="Mapped and needs review" segments={[{label:'Mapped',value:records.length-needsReview.length,tone:'accent'},{label:'Needs review',value:needsReview.length,tone:'muted'}]} /></div>
        <section className="hms-admin-ops__surface"><div className="hms-admin-ops__surface-head"><div><span className="hms-admin-ops__eyebrow">Shared mapping library</span><h2>Reference mappings</h2></div><StatusBadge tone="neutral">{records.length-needsReview.length} mapped</StatusBadge></div>
          <div className="hms-admin-ops__tabs">{['All','Needs review',...types].map((item)=><button key={item} type="button" className={tab===item?'is-active':''} onClick={()=>setTab(item)}>{item}{item==='Needs review'?<b>{needsReview.length}</b>:null}</button>)}</div>
          <div className="hms-admin-ops__filters"><SearchBox value={query} onChange={setQuery} placeholder="Search source or target code" /><span className="hms-admin-ops__subtle">{filtered.length} mappings</span></div>
          {!loaded?<div className="hms-admin-ops__empty">Loading mappings…</div>:<div className="hms-admin-ops__mapping-list">{filtered.map((record)=><div key={record.id} className={`hms-admin-ops__mapping-row${record.status!=='Mapped'?' is-attention':''}`}><span className="hms-admin-ops__mapping-icon"><Icon name="link" size={18}/></span><span className="hms-admin-ops__mapping-source"><strong>{record.source}</strong><code>{record.sourceCode||'No source code'}</code></span><span className="hms-admin-ops__mapping-arrow"><Icon name="arrowUpRight" size={17}/></span><span className="hms-admin-ops__mapping-target"><strong>{record.target||'Target not assigned'}</strong><code>{record.targetCode||'—'}</code></span><span className="hms-admin-ops__mapping-meta">{record.type||record.kind||'Reference'}<small>{record.reviewed||'Not reviewed'}</small></span><StatusBadge tone={tone(record.status)}>{record.status||'Needs review'}</StatusBadge><Link to={`/admin/mappings/${record.id}`} aria-label={`Edit mapping ${record.source}`}><Icon name="edit" size={16}/></Link><button type="button" onClick={()=>remove(record)} aria-label={`Delete mapping ${record.source}`}><Icon name="trash" size={16}/></button></div>)}{filtered.length===0?<div className="hms-admin-ops__empty">No mappings configured. Add a mapping to prepare claims references.</div>:null}</div>}
        </section>
      </div>
    </>
  )
}

function SettingsPage({ menu }) {
  const defaults = SETTINGS_DEFAULTS
  const [values, setValues] = useState({})
  const [savedValues, setSavedValues] = useState({})
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    readDocument('admin.settings').then((stored) => {
      if (!alive) return
      const next = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
      setValues(next); setSavedValues(next)
    }).catch((loadError) => alive && setError(loadError instanceof Error ? loadError.message : 'Unable to load local settings.')).finally(() => alive && setLoaded(true))
    return () => { alive = false }
  }, [])
  const groups = [...new Set(defaults.map((setting) => setting.group))]
  const valueOf = (setting) => values[setting.id] ?? setting.value
  const dirtyCount = defaults.filter((setting) => valueOf(setting) !== (savedValues[setting.id] ?? setting.value)).length
  const update = (id, value) => { setValues((current) => ({ ...current, [id]: value })); setSaved(false); setError('') }
  const save = async () => {
    if (saving) return
    const invalid = defaults.find((setting) => setting.type === 'number' && (!Number.isFinite(Number(valueOf(setting))) || Number(valueOf(setting)) < 0))
    if (invalid) { setError(`${invalid.label} must be a valid non-negative number.`); return }
    setSaving(true)
    try {
      const next = Object.fromEntries(defaults.map((setting) => [setting.id, valueOf(setting)]))
      await writeDocument('admin.settings', next)
      await appendAuditEvent({ action: 'Updated hospital settings', resource: 'Local operating preferences', category: 'Administration' })
      setValues(next); setSavedValues(next); setSaved(true); setError('')
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save local settings.') }
    finally { setSaving(false) }
  }
  const reset = () => { setValues(savedValues); setSaved(false); setError('') }
  return (
    <>
      <PageHeader title={menu.label} description={menu.summary} actions={<button type="button" className="hms-admin-ops__primary-action" onClick={save} disabled={!loaded || saving}><Icon name="check" size={16} />{saving ? 'Saving…' : 'Save settings'}</button>} />
      <div className="hms-admin-ops hms-admin-ops--settings">
        <div className="hms-admin-ops__settings-intro"><span className="hms-admin-ops__settings-icon"><Icon name="sliders" size={21} /></span><div><h2>Local operating preferences</h2><p>These values are stored in this installation. A setting only affects a workflow when that workflow explicitly reads it.</p></div><StatusBadge tone={dirtyCount ? 'warning' : 'neutral'}>{dirtyCount} unsaved changes</StatusBadge></div>
        {!loaded ? <div className="hms-admin-ops__empty">Loading local settings…</div> : groups.map((group) => <section className="hms-admin-ops__surface hms-admin-ops__settings-group" key={group}><div className="hms-admin-ops__surface-head"><div><span className="hms-admin-ops__eyebrow">Configuration</span><h2>{group}</h2></div></div>{defaults.filter((setting) => setting.group === group).map((setting) => <div className="hms-admin-ops__setting" key={setting.id}><div><strong>{setting.label}</strong><p>{setting.description}</p></div>{setting.type === 'toggle' ? <button type="button" role="switch" aria-checked={Boolean(valueOf(setting))} className={`hms-admin-ops__switch${valueOf(setting) ? ' is-on' : ''}`} onClick={() => update(setting.id, !valueOf(setting))}><span /></button> : <label className="hms-admin-ops__number"><input type="number" min="0" step="any" value={valueOf(setting)} onChange={(event) => update(setting.id, event.target.value)} aria-label={setting.label} /><span>{setting.unit}</span></label>}</div>)}</section>)}
        {error ? <div className="hms-admin-ops__error" role="alert">{error}</div> : null}
        {saved ? <div className="hms-admin-ops__success" role="status"><Icon name="checkCircle" size={16} />Settings saved in IndexedDB.</div> : null}
        <div className="hms-admin-ops__settings-actions"><button type="button" className="hms-admin-ops__quiet-action" onClick={reset} disabled={!loaded || !dirtyCount}>Discard changes</button><button type="button" className="hms-admin-ops__primary-action" onClick={save} disabled={!loaded || saving}><Icon name="check" size={16} />Save settings</button></div>
      </div>
    </>
  )
}

function ReportsPage({ menu }) {
  const { data, loaded } = useReceptionWorkspace()
  const rows = [
    { label: 'Patient directory', count: data.patients.length, destination: '/reception/patients' },
    { label: 'Appointments', count: data.appointments.length, destination: '/reception/appointments' },
    { label: 'Encounters', count: data.queue.length, destination: '/reception/opd' },
  ]
  return (
    <>
      <PageHeader title={menu.label} description="Operational summaries calculated from records saved in this local installation." />
      <div className="hms-admin-ops"><section className="hms-admin-ops__surface"><div className="hms-admin-ops__surface-head"><div><span className="hms-admin-ops__eyebrow">Local reporting</span><h2>Available record summaries</h2><p>Only counts derived from saved records are shown. No sample charts or generated activity are included.</p></div></div>
        {!loaded ? <div className="hms-admin-ops__empty">Reading local records…</div> : <div className="hms-admin-ops__report-grid">{rows.map((item)=><Link to={item.destination} className="hms-admin-ops__report-card" key={item.label}><div className="hms-admin-ops__report-card-head"><span><Icon name="fileText" size={19}/></span><StatusBadge tone="neutral">Local records</StatusBadge></div><h3>{item.label}</h3><p>{item.count.toLocaleString()} saved records in this installation.</p><div className="hms-admin-ops__report-card-foot"><span>Calculated now</span><span>Open records <Icon name="chevronRight" size={14}/></span></div></Link>)}</div>}
      </section></div>
    </>
  )
}

function RefundsPage({ menu }) {
  const { records, loaded, error, commit } = useAdminCollection('hms.admin.refunds.v1', REFUNDS_SEED)
  const { data: workspace, error: workspaceError, commit: commitWorkspace } = useCashierWorkspace()
  const [filter, setFilter] = useState('Pending')
  const [query, setQuery] = useState('')
  const sharedRefunds = workspace.cashier.refunds.map((refund) => ({
    ...refund,
    patient: `${workspace.patients.find((patient) => patient.id === refund.patientId)?.firstName || 'Patient'} ${workspace.patients.find((patient) => patient.id === refund.patientId)?.lastName || 'record'}`,
    invoice: refund.invoiceId,
    requestedAt: new Date(refund.requestedAt).toLocaleString(),
    status: refund.status === 'Pending approval' ? 'Pending' : refund.status,
    source: 'cashier',
  }))
  const allRecords = [...sharedRefunds, ...records]
  const filtered = allRecords.filter((refund) => (filter === 'All' || refund.status === filter) && `${refund.id} ${refund.patient} ${refund.invoice} ${refund.reason}`.toLowerCase().includes(query.toLowerCase()))
  const updateStatus = (refund, status) => {
    if (!window.confirm(`${status} refund ${refund.id}?`)) return
    if (refund.source === 'cashier') {
      const now = new Date().toISOString()
      const cashier = {
        ...workspace.cashier,
        refunds: workspace.cashier.refunds.map((item) => item.id === refund.id ? { ...item, status, reviewedAt: now, reviewedBy: 'Administrator' } : item),
        activity: [{ id: uid('CACT'), message: `Refund request ${refund.id} ${status.toLowerCase()} in the admin queue.`, at: now }, ...workspace.cashier.activity],
      }
      commitWorkspace({ ...workspace, cashier })
      return
    }
    commit(records.map((item) => item.id === refund.id ? { ...item, status, reviewedAt: new Date().toLocaleString() } : item))
  }
  const pendingAmount = allRecords.filter((refund) => refund.status === 'Pending').reduce((sum, refund) => sum + Number(refund.amount), 0)

  return (
    <>
      <PageHeader title={menu.label} description={menu.summary} />
      <div className="hms-admin-ops">
        {error || workspaceError ? <div className="hms-admin-ops__error" role="alert">{error || workspaceError}</div> : null}
        <div className="hms-admin-ops__refund-summary">
          <div><span className="hms-admin-ops__eyebrow">Awaiting decision</span><strong>{allRecords.filter((item) => item.status === 'Pending').length}</strong><small>requests</small></div>
          <div><span className="hms-admin-ops__eyebrow">Pending amount</span><strong>GHS {pendingAmount.toFixed(2)}</strong><small>requires review</small></div>
          <div><span className="hms-admin-ops__eyebrow">Review standard</span><p>Confirm the original payment and reason before approving a refund. Approval records a decision; payout must be handled through the authorised finance process.</p></div>
        </div>
        <section className="hms-admin-ops__surface">
          <div className="hms-admin-ops__surface-head"><div><span className="hms-admin-ops__eyebrow">Finance controls</span><h2>Refund requests</h2></div></div>
          <div className="hms-admin-ops__tabs">{['Pending', 'Approved', 'Declined', 'All'].map((item) => <button type="button" key={item} className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{item}{item === 'Pending' ? <b>{allRecords.filter((refund) => refund.status === 'Pending').length}</b> : null}</button>)}</div>
          <div className="hms-admin-ops__filters"><SearchBox value={query} onChange={setQuery} placeholder="Search refund, patient or invoice" /><span className="hms-admin-ops__subtle">{filtered.length} requests</span></div>
          {!loaded ? <div className="hms-admin-ops__empty">Loading refund requests…</div> : (
            <div className="hms-admin-ops__refund-list">
              {filtered.map((refund) => (
                <article className="hms-admin-ops__refund-card" key={refund.id}>
                  <div className="hms-admin-ops__refund-icon"><Icon name="undo" size={18} /></div>
                  <div className="hms-admin-ops__refund-main"><div className="hms-admin-ops__refund-title">{refund.source === 'cashier' ? <strong>{refund.reason}</strong> : <Link to={`/admin/refunds/${refund.id}`}>{refund.reason}</Link>}<StatusBadge tone={tone(refund.status)}>{refund.status}</StatusBadge></div><p>{refund.patient} · Invoice {refund.invoice}</p><small>{refund.source === 'cashier' ? `${refund.id} · ` : ''}{refund.requestedAt} · Requested by {refund.requestedBy}</small></div>
                  <strong className="hms-admin-ops__refund-amount">GHS {Number(refund.amount).toFixed(2)}</strong>
                  {refund.status === 'Pending' ? <div className="hms-admin-ops__refund-actions"><button type="button" className="hms-admin-ops__quiet-action" onClick={() => updateStatus(refund, 'Declined')}>Decline</button><button type="button" className="hms-admin-ops__primary-action" onClick={() => updateStatus(refund, 'Approved')}>Approve</button></div> : null}
                </article>
              ))}
              {filtered.length === 0 ? <div className="hms-admin-ops__empty">No refund requests match this view.</div> : null}
            </div>
          )}
        </section>
      </div>
    </>
  )
}

function InventoryPage({ menu }) {
  const lab = useLabWorkspace()
  const pharmacy = usePharmacyWorkspace()
  const labItems = (lab.data.lab?.stock || []).map((item)=>({id:item.id,name:item.name,category:item.category||'Laboratory',location:'Laboratory',onHand:Number(item.quantity||0),reorder:Number(item.reorderLevel||item.reorder||0),unit:item.unit||'units',unitCost:Number(item.unitCost||0)}))
  const pharmacyItems = (pharmacy.data.pharmacy?.medicines || []).map((medicine)=>({id:medicine.id,name:medicine.name,category:medicine.category||'Medicine',location:'Pharmacy',onHand:(pharmacy.data.pharmacy?.batches||[]).filter((batch)=>batch.medicineId===medicine.id).reduce((sum,batch)=>sum+Number(batch.quantity||0),0),reorder:Number(medicine.reorderLevel||0),unit:medicine.unit||'units',unitCost:Number(medicine.unitPrice||0)}))
  const records=[...labItems,...pharmacyItems].map((item)=>({...item,status:item.onHand<=0?'Out of stock':item.reorder>0&&item.onHand<=item.reorder?'Low stock':'In stock'}))
  const [query,setQuery]=useState('')
  const [filter,setFilter]=useState('All stock')
  const filtered=records.filter((item)=>`${item.name} ${item.id} ${item.location} ${item.category}`.toLowerCase().includes(query.toLowerCase())&&(filter==='All stock'||item.status===filter))
  const low=records.filter((item)=>item.status!=='In stock')
  const valuation=records.reduce((sum,item)=>sum+item.onHand*item.unitCost,0)
  const loaded=lab.loaded&&pharmacy.loaded
  return (
    <>
      <PageHeader title={menu.label} description="Inventory totals derived from laboratory stock and pharmacy batches stored in IndexedDB." />
      <div className="hms-admin-ops"><div className="hms-admin-ops__metrics hms-admin-ops__metrics--three"><MetricCard label="Inventory lines" value={loaded?records.length:'—'} icon="packageBox" caption="Configured lab and pharmacy items"/><MetricCard label="Reorder attention" value={loaded?low.length:'—'} icon="alertTriangle" caption="Low or unavailable"/><MetricCard label="Stock valuation" value={loaded?`GHS ${valuation.toFixed(2)}`:'—'} icon="creditCard" caption="Where unit cost is recorded"/></div>
        <section className="hms-admin-ops__surface"><div className="hms-admin-ops__surface-head"><div><span className="hms-admin-ops__eyebrow">Shared stock records</span><h2>Inventory items</h2><p>Stock changes are made in the responsible laboratory or pharmacy workspace.</p></div><StatusBadge tone={low.length?'warning':'neutral'}>{low.length} need attention</StatusBadge></div>
          <div className="hms-admin-ops__filters"><SearchBox value={query} onChange={setQuery} placeholder="Search item, ID or location"/><select aria-label="Filter inventory" value={filter} onChange={(event)=>setFilter(event.target.value)}>{['All stock','In stock','Low stock','Out of stock'].map((item)=><option key={item}>{item}</option>)}</select></div>
          {!loaded?<div className="hms-admin-ops__empty">Loading local stock…</div>:<div className="hms-admin-ops__table-wrap"><table className="hms-admin-ops__table"><thead><tr><th>Item</th><th>Location</th><th>On hand</th><th>Reorder at</th><th>Unit cost</th><th>Status</th></tr></thead><tbody>{filtered.map((item)=><tr key={item.id}><td><strong>{item.name}</strong><small className="hms-admin-ops__cell-sub">{item.id} · {item.category}</small></td><td>{item.location}</td><td className="hms-admin-ops__amount">{item.onHand} {item.unit}</td><td>{item.reorder||'—'}</td><td>{item.unitCost?`GHS ${item.unitCost.toFixed(2)}`:'—'}</td><td><StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge></td></tr>)}</tbody></table>{filtered.length===0?<div className="hms-admin-ops__empty">No inventory records are configured. Add stock in the laboratory or pharmacy workspace.</div>:null}</div>}
        </section>
      </div>
    </>
  )
}

function AuditPage({ menu }) {
  const { records, loaded, error } = useAdminCollection('audit', AUDIT_SEED)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All activity')
  const filtered = records.filter((event) => `${event.id} ${event.time} ${event.actor} ${event.action} ${event.resource} ${event.category}`.toLowerCase().includes(query.toLowerCase()) && (category === 'All activity' || event.category === category))
  const categories = ['All activity', ...new Set(records.map((event) => event.category))]

  return (
    <>
      <PageHeader title={menu.label} description={menu.summary} actions={<button type="button" className="hms-admin-ops__quiet-action" onClick={() => window.print()}><Icon name="download" size={16} />Print view</button>} />
      <div className="hms-admin-ops">
        {error ? <div className="hms-admin-ops__error" role="alert">{error}</div> : null}
        <div className="hms-admin-ops__audit-banner"><span><Icon name="shieldCheck" size={19} /></span><div><strong>Administrative activity trail</strong><p>Chronological record of changes saved by this local installation.</p></div><StatusBadge tone="neutral">Local history</StatusBadge></div>
        <section className="hms-admin-ops__surface">
          <div className="hms-admin-ops__surface-head"><div><span className="hms-admin-ops__eyebrow">Governance</span><h2>Event history</h2></div><span className="hms-admin-ops__subtle">{filtered.length} events</span></div>
          <div className="hms-admin-ops__filters"><SearchBox value={query} onChange={setQuery} placeholder="Search actor, event or record" /><select aria-label="Filter audit category" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
          {!loaded ? <div className="hms-admin-ops__empty">Loading audit events…</div> : (
            <div className="hms-admin-ops__audit-list">{filtered.map((event) => (
              <article className="hms-admin-ops__audit-event" key={event.id}>
                <span className={`hms-admin-ops__audit-dot is-${tone(event.outcome)}`}><Icon name={event.category === 'Access' ? 'keyRound' : event.category === 'Finance' ? 'creditCard' : event.category === 'Inventory' ? 'packageBox' : 'activity'} size={16} /></span>
                <div className="hms-admin-ops__audit-event-main"><div><strong>{event.action}</strong><StatusBadge tone={tone(event.outcome)}>{event.outcome}</StatusBadge></div><p>{event.resource}</p><small>{event.actor} · {event.category}</small></div>
                <time>{event.time}</time>
              </article>
            ))}{filtered.length === 0 ? <div className="hms-admin-ops__empty">No matching events.</div> : null}</div>
          )}
        </section>
      </div>
    </>
  )
}

function BackupPage({ menu }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [lastExport, setLastExport] = useState('')
  const downloadBackup = async () => {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      const backup = await exportLocalDatabase()
      await appendAuditEvent({ action: 'Exported local backup', resource: `${backup.documents.length} data collections`, category: 'Backup' })
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = `ascend-hms-local-backup-${new Date().toISOString().slice(0,10)}.json`; anchor.click()
      URL.revokeObjectURL(url)
      setLastExport(new Date().toLocaleString())
      setMessage(`${backup.documents.length} local data collections exported. Store the file somewhere safe.`)
    } catch (exportError) { setError(exportError instanceof Error ? exportError.message : 'Unable to export local data.') }
    finally { setBusy(false) }
  }
  const restoreBackup = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file || busy) return
    if (!window.confirm('Restore this backup? All current local Ascend HMS records and profiles will be replaced. Export the current data first if you need to keep it.')) return
    setBusy(true); setError(''); setMessage('')
    try {
      const backup = JSON.parse(await file.text())
      await importLocalDatabase(backup)
      await appendAuditEvent({ action: 'Restored local backup', resource: `${backup.documents.length} data collections`, category: 'Backup' })
      setMessage(`Restored ${backup.documents.length} local data collections. Reload the application to refresh every screen.`)
    } catch (restoreError) { setError(restoreError instanceof Error ? restoreError.message : 'Unable to restore this backup.') }
    finally { setBusy(false) }
  }
  return (
    <>
      <PageHeader title={menu.label} description="Create and restore a backup of this browser or desktop installation." />
      <div className="hms-admin-ops"><section className="hms-admin-ops__surface"><div className="hms-admin-ops__surface-head"><div><span className="hms-admin-ops__eyebrow">Local data protection</span><h2>Backup and restore</h2><p>Ascend HMS does not run scheduled or cloud backups. Export a local backup file and store it outside this device.</p></div></div>
        <div className="hms-admin-ops__backup-grid"><article className="hms-admin-ops__surface"><span className="hms-admin-ops__settings-icon"><Icon name="download" size={21}/></span><h3>Export local data</h3><p>Download an archive containing IndexedDB records, local staff profiles, preferences and application data.</p><button type="button" className="hms-admin-ops__primary-action" onClick={downloadBackup} disabled={busy}><Icon name="download" size={16}/>{busy?'Working…':'Download backup'}</button>{lastExport?<small>Last exported: {lastExport}</small>:null}</article>
          <article className="hms-admin-ops__surface"><span className="hms-admin-ops__settings-icon"><Icon name="upload" size={21}/></span><h3>Restore from file</h3><p>Replace the local database with a previously exported Ascend HMS backup file.</p><label className="hms-admin-ops__primary-action"><Icon name="upload" size={16}/>Choose backup file<input type="file" accept="application/json,.json" onChange={restoreBackup} disabled={busy} hidden/></label></article></div>
        {error?<div className="hms-admin-ops__error" role="alert">{error}</div>:null}{message?<div className="hms-admin-ops__success" role="status"><Icon name="checkCircle" size={16}/>{message}</div>:null}
        <p className="hms-admin-ops__subtle">Exported JSON files are not encrypted by this application. Protect backup files with appropriate device and file security.</p>
      </section></div>
    </>
  )
}

export default function AdminOperationsPage({ menu }) {
  const pages = {
    catalogue: CataloguePage,
    mappings: MappingsPage,
    settings: SettingsPage,
    reports: ReportsPage,
    refunds: RefundsPage,
    inventory: InventoryPage,
    audit: AuditPage,
    backup: BackupPage,
  }
  const Page = pages[menu.slug]
  return Page ? <Page menu={menu} /> : null
}
