import { useMemo, useState } from 'react'
import { Icon, PageHeader, StatusBadge } from '@ui'
import useAdminCollection from './useAdminCollection.js'
import useNurseWorkspace from '../nurse/useNurseWorkspace.js'
import './admin styles/facilities.css'

const EMPTY_DEPARTMENTS = []
const TABS = [{ id: 'departments', label: 'Departments' }, { id: 'wards', label: 'Wards' }, { id: 'beds', label: 'Beds' }]
const newId = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now()}`
const tone = (status) => status === 'Occupied' ? 'warning' : status === 'Available' || status === 'Open' ? 'success' : status === 'Cleaning' || status === 'Maintenance' || status === 'Out of service' ? 'critical' : 'neutral'

export default function FacilitiesPage({ menu }) {
  const [tab, setTab] = useState('departments')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const { records: departments, loaded: departmentsLoaded, error: departmentsError, commit: commitDepartments } = useAdminCollection('facilities.departments', EMPTY_DEPARTMENTS)
  const { data, loaded, error: workspaceError, commit } = useNurseWorkspace()
  const nurse = data.nurse || { wards: [], beds: [], tasks: [], admissions: [], discharges: [], activity: [] }
  const wards = nurse.wards || []
  const beds = nurse.beds || []
  const rows = tab === 'departments' ? departments : tab === 'wards' ? wards : beds
  const filtered = useMemo(() => rows.filter((item) => {
    const searchable = tab === 'departments' ? [item.name, item.code, item.lead] : tab === 'wards' ? [item.name, item.type, item.departmentId] : [item.id, item.wardId, item.status, item.patientId]
    const state = tab === 'departments' ? item.status || 'Configured' : item.status || ''
    return searchable.join(' ').toLowerCase().includes(query.trim().toLowerCase()) && (status === 'all' || state === status)
  }), [rows, tab, query, status])
  const occupied = beds.filter((bed) => bed.status === 'Occupied').length
  const available = beds.filter((bed) => bed.status === 'Available').length
  const save = async (event) => {
    event.preventDefault()
    setError('')
    const name = form.name?.trim()
    if (!name) { setError('Enter a name before saving.'); return }
    if (form.kind === 'department') {
      const next = form.id ? departments.map((item) => item.id === form.id ? { ...form, name } : item) : [...departments, { ...form, id: newId('DEPT'), name }]
      const ok = await commitDepartments(next)
      if (ok) setForm(null)
      else setError(departmentsError || 'Unable to save department.')
      return
    }
    if (form.kind === 'ward') {
      const record = { ...form, name, status: form.status || 'Open', beds: Array.isArray(form.beds) ? form.beds : [] }
      const nextWards = form.id ? wards.map((item) => item.id === form.id ? record : item) : [...wards, { ...record, id: newId('WARD') }]
      const ok = await commit({ ...data, nurse: { ...nurse, wards: nextWards } })
      if (ok) setForm(null)
      else setError(workspaceError || 'Unable to save ward.')
      return
    }
    const record = { ...form, id: form.id || newId('BED'), status: form.status || 'Available', patientId: form.status === 'Occupied' ? form.patientId || '' : '', since: form.status === 'Occupied' ? form.since || new Date().toISOString() : '' }
    const nextBeds = form.id ? beds.map((item) => item.id === form.id ? record : item) : [...beds, record]
    const nextWards = wards.map((ward) => ({ ...ward, beds: ward.id === record.wardId ? [...new Set([...(ward.beds || []), record.id])] : (ward.beds || []).filter((id) => id !== record.id) }))
    const ok = await commit({ ...data, nurse: { ...nurse, beds: nextBeds, wards: nextWards } })
    if (ok) setForm(null)
    else setError(workspaceError || 'Unable to save bed.')
  }
  const remove = async (item) => {
    if (!window.confirm(`Delete ${item.name || item.id} from the facility directory?`)) return
    if (tab === 'departments') {
      if (wards.some((ward) => ward.departmentId === item.id)) { setError('Move or remove the wards assigned to this department first.'); return }
      const ok = await commitDepartments(departments.filter((row) => row.id !== item.id))
      if (!ok) setError(departmentsError || 'Unable to delete department.')
      return
    }
    if (tab === 'wards') {
      const wardBeds = beds.filter((bed) => bed.wardId === item.id)
      if (wardBeds.some((bed) => bed.status === 'Occupied' || bed.patientId)) { setError('A ward with occupied beds cannot be deleted. Discharge or reassign its patients first.'); return }
      const ok = await commit({ ...data, nurse: { ...nurse, wards: wards.filter((row) => row.id !== item.id), beds: beds.filter((bed) => bed.wardId !== item.id) } })
      if (!ok) setError(workspaceError || 'Unable to delete ward.')
      return
    }
    if (item.status === 'Occupied' || item.patientId) { setError('An occupied bed cannot be deleted. Release it first.'); return }
    const ok = await commit({ ...data, nurse: { ...nurse, beds: beds.filter((row) => row.id !== item.id), wards: wards.map((ward) => ({ ...ward, beds: (ward.beds || []).filter((id) => id !== item.id) })) } })
    if (!ok) setError(workspaceError || 'Unable to delete bed.')
  }
  const startNew = () => {
    setError('')
    setForm(tab === 'departments' ? { kind: 'department', name: '', code: '', lead: '' } : tab === 'wards' ? { kind: 'ward', name: '', type: 'General', departmentId: '', beds: [] } : { kind: 'bed', name: '', wardId: wards[0]?.id || '', status: 'Available', patientId: '' })
  }
  const ready = loaded && departmentsLoaded
  const title = TABS.find((item) => item.id === tab)?.label || 'Departments'

  return (
    <>
      <PageHeader title={menu.label} description="Configure departments, wards and beds for the hospital." actions={<button type="button" className="hms-facilities__add" onClick={startNew} disabled={!ready || (tab === 'wards' && !departments.length) || (tab === 'beds' && !wards.length)}><Icon name="plus" size={16} />Add {tab === 'departments' ? 'department' : tab === 'wards' ? 'ward' : 'bed'}</button>} />
      <div className="hms-facilities">
        <section className="hms-facilities__capacity" aria-label="Local bed capacity">
          <div className="hms-facilities__capacity-copy"><span className="hms-facilities__eyebrow">Configured capacity</span><h2>Bed status</h2><p>{occupied} occupied · {available} available · {beds.length} total beds</p></div>
          <div className="hms-facilities__capacity-score">{beds.length ? Math.round(occupied / beds.length * 100) : 0}<span>%</span></div>
          <div className="hms-facilities__capacity-bar" role="img" aria-label={`${occupied} of ${beds.length} configured beds occupied`}><span style={{ width: `${beds.length ? occupied / beds.length * 100 : 0}%` }} /></div>
          <div className="hms-facilities__capacity-legend"><span><i className="is-occupied" /> Occupied <strong>{occupied}</strong></span><span><i className="is-available" /> Available <strong>{available}</strong></span></div>
        </section>
        <section className="hms-facilities__directory" aria-label="Facility directory">
          <div className="hms-facilities__tabs" role="group" aria-label="Facility records">{TABS.map((item) => <button type="button" aria-pressed={tab === item.id} className={`hms-facilities__tab${tab === item.id ? ' is-active' : ''}`} key={item.id} onClick={() => { setTab(item.id); setStatus('all'); setQuery(''); setError(''); setForm(null) }}>{item.label}<span>{item.id === 'departments' ? departments.length : item.id === 'wards' ? wards.length : beds.length}</span></button>)}</div>
          <div className="hms-facilities__toolbar"><label className="hms-facilities__search"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} aria-label={`Search ${title.toLowerCase()}`} />{query ? <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><Icon name="x" size={14} /></button> : null}</label><label className="hms-facilities__filter"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status"><option value="all">All statuses</option>{(tab === 'beds' ? ['Occupied', 'Available', 'Cleaning', 'Maintenance', 'Out of service'] : tab === 'wards' ? ['Open', 'Closed'] : ['Configured']).map((item) => <option value={item} key={item}>{item}</option>)}</select></label><span className="hms-facilities__result-count">{filtered.length} {filtered.length === 1 ? 'record' : 'records'}</span></div>
          {error || departmentsError || workspaceError ? <div className="hms-facilities__error" role="alert">{error || departmentsError || workspaceError}</div> : null}
          {!ready ? <div className="hms-facilities__empty">Loading local facility records…</div> : (
            <div className="hms-facilities__table-wrap"><table className="hms-facilities__table"><thead><tr>{(tab === 'departments' ? ['Department', 'Code', 'Lead', 'Actions'] : tab === 'wards' ? ['Ward', 'Department', 'Type', 'Beds', 'Status', 'Actions'] : ['Bed', 'Ward', 'Patient reference', 'Status', 'Actions']).map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>
              {filtered.map((item) => <tr key={item.id}>
                {tab === 'departments' ? <><td>{item.name}</td><td>{item.code || '—'}</td><td>{item.lead || '—'}</td></> : null}
                {tab === 'wards' ? <><td>{item.name}</td><td>{departments.find((department) => department.id === item.departmentId)?.name || 'Not assigned'}</td><td>{item.type || 'General'}</td><td>{(item.beds || []).length || beds.filter((bed) => bed.wardId === item.id).length}</td><td><StatusBadge tone={tone(item.status || 'Open')}>{item.status || 'Open'}</StatusBadge></td></> : null}
                {tab === 'beds' ? <><td>{item.name || item.id}</td><td>{wards.find((ward) => ward.id === item.wardId)?.name || 'Unknown ward'}</td><td>{item.patientId || '—'}</td><td><StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge></td></> : null}
                <td><div className="hms-facilities__row-actions"><button type="button" onClick={() => setForm({ ...item, kind: tab === 'departments' ? 'department' : tab === 'wards' ? 'ward' : 'bed' })}>Edit</button><button type="button" onClick={() => remove(item)}>Delete</button></div></td>
              </tr>)}
            </tbody></table>{filtered.length === 0 ? <div className="hms-facilities__empty"><Icon name="building" size={20} /><strong>No {title.toLowerCase()} configured</strong><span>Add a record to establish the facility structure for this installation.</span></div> : null}</div>
          )}
        </section>
        {form ? <section className="hms-facilities__editor"><div className="hms-facilities__editor-head"><div><span className="hms-facilities__eyebrow">{form.id ? 'Edit record' : 'New record'}</span><h2>{form.kind === 'department' ? 'Department details' : form.kind === 'ward' ? 'Ward details' : 'Bed details'}</h2></div><button type="button" onClick={() => setForm(null)} aria-label="Close editor"><Icon name="x" size={18} /></button></div><form onSubmit={save} className="hms-facilities__editor-form">
          <label>Name or identifier<input value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          {form.kind === 'department' ? <><label>Department code<input value={form.code || ''} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label><label>Department lead<input value={form.lead || ''} onChange={(event) => setForm({ ...form, lead: event.target.value })} /></label></> : null}
          {form.kind === 'ward' ? <><label>Department<select value={form.departmentId || ''} onChange={(event) => setForm({ ...form, departmentId: event.target.value })}><option value="">Select department</option>{departments.map((department) => <option value={department.id} key={department.id}>{department.name}</option>)}</select></label><label>Ward type<input value={form.type || ''} onChange={(event) => setForm({ ...form, type: event.target.value })} /></label><label>Ward status<select value={form.status || 'Open'} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Open</option><option>Closed</option></select></label></> : null}
          {form.kind === 'bed' ? <><label>Ward<select value={form.wardId || ''} onChange={(event) => setForm({ ...form, wardId: event.target.value })} required><option value="">Select ward</option>{wards.map((ward) => <option value={ward.id} key={ward.id}>{ward.name}</option>)}</select></label><label>Bed status<select value={form.status || 'Available'} onChange={(event) => setForm({ ...form, status: event.target.value })}>{['Available', 'Occupied', 'Cleaning', 'Maintenance', 'Out of service'].map((item) => <option key={item}>{item}</option>)}</select></label>{form.status === 'Occupied' ? <label>Patient record ID<input value={form.patientId || ''} onChange={(event) => setForm({ ...form, patientId: event.target.value })} required /></label> : null}</> : null}
          <div className="hms-facilities__editor-actions"><button type="button" onClick={() => setForm(null)}>Cancel</button><button type="submit">Save {form.kind}</button></div>
        </form></section> : null}
      </div>
    </>
  )
}
