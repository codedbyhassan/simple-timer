import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Dialog, Icon, PageHeader, StatusBadge } from '@ui'
import useAdminCollection from './useAdminCollection.js'
import useCashierWorkspace from '../cashier/useCashierWorkspace.js'
import useClaimsWorkspace from '../claims/useClaimsWorkspace.js'
import { CATALOGUE_SEED, MAPPINGS_SEED } from './operationalData.js'
import './admin styles/adminoperations.css'

const DETAILS = {
  catalogue: { key: 'hms.admin.catalogue.v1', defaults: CATALOGUE_SEED, id: 'id', title: (record) => record?.name || 'Add service' },
  mappings: { key: 'hms.admin.mappings.v1', defaults: MAPPINGS_SEED, id: 'id', title: (record) => record?.source || 'Mapping detail' },
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
  const local = useAdminCollection(detail.key, detail.defaults)
  const cashier = useCashierWorkspace()
  const claims = useClaimsWorkspace()
  const sharedRecords = module === 'catalogue'
    ? (cashier.data.cashier?.prices || []).map((item) => ({ ...item, price: Number(item.amount ?? item.price ?? 0), code: item.code || '', claimCode: item.claimCode || '', status: item.status || 'Active' }))
    : module === 'mappings' ? (claims.data.claims?.mappings || []) : local.records
  const records = sharedRecords
  const loaded = module === 'catalogue' ? cashier.loaded : module === 'mappings' ? claims.loaded : local.loaded
  const storageError = module === 'catalogue' ? cashier.error : module === 'mappings' ? claims.error : local.error
  const commit = async (next) => {
    if (module === 'catalogue') return await cashier.commit({ ...cashier.data, cashier: { ...cashier.data.cashier, prices: next.map((item) => ({ ...item, amount: Number(item.price ?? item.amount ?? 0), price: undefined, source: item.source || 'Service catalogue' })) } })
    if (module === 'mappings') return await claims.commit({ ...claims.data, claims: { ...claims.data.claims, mappings: next.map((item) => ({ ...item, kind: item.type || item.kind || 'Reference' })) } })
    return await local.commit(next)
  }
  const isNew = recordId === 'new'
  const record = useMemo(() => records.find((item) => item[detail.id] === recordId), [records, recordId, detail.id])
  const [editing, setEditing] = useState(isNew)
  const [formError, setFormError] = useState('')
  const title = detail.title(record)

  const save = async (values) => {
    if (module === 'catalogue' && (!values.name?.trim() || !values.category?.trim() || !values.code?.trim() || !Number.isFinite(Number(values.price)) || Number(values.price) < 0)) {
      setFormError('Enter a service name, category, code, and a non-negative price.')
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
        amount: Number(values.price),
        source: 'Service catalogue',
        status: values.claimCode?.trim() ? (values.status === 'Needs mapping' ? 'Active' : values.status) : 'Needs mapping',
        updated: new Date().toLocaleDateString(),
      } : {
        id: record?.id || `map-${globalThis.crypto?.randomUUID?.() || Date.now()}`,
        type: values.type || 'Reference',
        kind: values.type || 'Reference',
        status: values.targetCode?.trim() ? 'Mapped' : 'Needs review',
        reviewed: new Date().toLocaleDateString(),
      }),
    }
    const next = record ? records.map((item) => item.id === record.id ? updated : item) : [...records, updated]
    const success = await commit(next)
    if (success) navigate(`/admin/${module}/${encodeURIComponent(updated.id)}`, { replace: true })
    else setFormError(storageError || 'Unable to save this record.')
  }

  const remove = async () => {
    if (!window.confirm(`Remove ${title} from the ${module} list?`)) return
    const success = await commit(records.filter((item) => item.id !== record.id))
    if (success) navigate(`/admin/${module}`, { replace: true })
    else setFormError(storageError || 'Unable to delete this record.')
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
      <Dialog open={editing} title={isNew ? `Add ${module === 'catalogue' ? 'service' : 'mapping'}` : `Edit ${title}`} description="Update the shared local record." onClose={() => isNew ? navigate(`/admin/${module}`) : setEditing(false)} size="large">
        <RecordForm record={record || { name: '', category: '', code: '', claimCode: '', price: '', source: '', sourceCode: '', target: '', targetCode: '', type: 'Service tariff' }} module={module} onSave={save} onCancel={() => isNew ? navigate(`/admin/${module}`) : setEditing(false)} error={formError || storageError} />
      </Dialog>
    </>
  )
}

export default function AdminRecordDetailPage({ menu, module: moduleProp }) {
  const { module: routeModule } = useParams()
  const module = moduleProp || routeModule
  if (module === 'catalogue' || module === 'mappings') return <EditableRecord module={module} menu={menu} />
  return null
}
