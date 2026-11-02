import { useMemo, useState, useSyncExternalStore } from 'react'
import { ClipboardList, Download, Plus, ShieldAlert, Trash2 } from 'lucide-react'
import { useRoleAccess } from '../../access/roleAccess.js'
import { getAppointments, subscribeToAppointments } from '../front-desk/frontDeskStore.js'
import { getCareData, subscribeToCareData } from '../clinical/careStore.js'
import { getDemoPatients, subscribeToDemoPatients } from '../patients/patientStore.js'
import { addRecord, getWorkspace, patchRecord, priceFor, removeRecord, subscribeWorkspace, updateWorkspace } from './workspaceStore.js'
import '../role-workspaces/RoleWorkspacePages.css'
import './WorkspacePages.css'

const useWs = () => useSyncExternalStore(subscribeWorkspace, getWorkspace, getWorkspace)
const usePatients = () => useSyncExternalStore(subscribeToDemoPatients, getDemoPatients, getDemoPatients)
const useCare = () => useSyncExternalStore(subscribeToCareData, getCareData, getCareData)
const useAppts = () => useSyncExternalStore(subscribeToAppointments, getAppointments, getAppointments)
const today = () => new Date().toISOString().slice(0, 10)
const money = (n) => `GH₵ ${Number(n || 0).toFixed(2)}`
const fmt = (iso) => iso ? new Date(iso).toLocaleString() : '—'

function Shell({ eyebrow, title, description, children }) {
  return (
    <section className="role-workspace">
      <header className="role-workspace-heading">
        <div>
          <span className="role-workspace-eyebrow"><ClipboardList size={15} /> {eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <span className="role-preview-chip">Saved in this browser</span>
      </header>
      {children}
    </section>
  )
}

function Panel({ title = '', children }) {
  return <section className="role-panel ws-panel">{title && <h2 className="ws-title">{title}</h2>}{children}</section>
}

function Table({ columns, rows, empty = 'Nothing here yet.' }) {
  if (!rows.length) return <p className="role-panel-note">{empty}</p>
  return (
    <div className="ws-table-wrap">
      <table className="ws-table">
        <thead><tr>{columns.map((c) => <th key={c.label}>{c.label}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={r.id || i}>{columns.map((c) => <td key={c.label}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

function Field({ label, children }) {
  return <label className="ws-field"><span>{label}</span>{children}</label>
}

function useForm(initial) {
  const [form, setForm] = useState(initial)
  const bind = (key, type = 'text') => ({
    type,
    value: form[key] ?? '',
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  })
  return [form, setForm, bind]
}

function PatientSelect({ value, onChange }) {
  const patients = usePatients()
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select patient…</option>
      {patients.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.id}</option>)}
    </select>
  )
}

function useActor() {
  const { roleIds } = useRoleAccess()
  return (roleIds || []).join(', ') || 'unknown'
}

/* ---------- Reception ---------- */

function DocumentsPage() {
  const ws = useWs()
  const actor = useActor()
  const patients = usePatients()
  const [form, setForm, bind] = useForm({ patientId: '', type: 'Referral letter', note: '' })
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const save = () => {
    if (!form.patientId || !file) return setError('Choose a patient and a file.')
    if (file.size > 800_000) return setError('Files over 800 KB cannot be stored in this browser preview.')
    const reader = new FileReader()
    reader.onload = () => {
      try {
        addRecord('documents', { ...form, fileName: file.name, size: file.size, dataUrl: reader.result },
          { actor, action: 'Document uploaded', detail: `${file.name} for ${form.patientId}` })
        setForm({ patientId: '', type: 'Referral letter', note: '' }); setFile(null); setError('')
      } catch (e) { setError(e.message) }
    }
    reader.readAsDataURL(file)
  }
  const name = (pid) => patients.find((p) => p.id === pid)?.name || pid
  return (
    <Shell eyebrow="Reception" title="Documents" description="Attach scanned referrals, ID cards and reports to a patient record.">
      <Panel title="Upload document">
        <div className="ws-form">
          <Field label="Patient"><PatientSelect value={form.patientId} onChange={(v) => setForm((f) => ({ ...f, patientId: v }))} /></Field>
          <Field label="Type"><select {...bind('type')}>{['Referral letter', 'ID / NHIS card', 'Lab report', 'Consent form', 'Other'].map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="File"><input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Field>
          <Field label="Note"><input {...bind('note')} /></Field>
        </div>
        {error && <p className="role-panel-error">{error}</p>}
        <button className="button button--primary" type="button" onClick={save}><Plus size={14} /> Save document</button>
      </Panel>
      <Panel title="Stored documents">
        <Table rows={ws.documents} columns={[
          { label: 'Patient', render: (r) => name(r.patientId) },
          { label: 'Type', key: 'type' },
          { label: 'File', render: (r) => <a href={r.dataUrl} download={r.fileName}>{r.fileName}</a> },
          { label: 'Added', render: (r) => fmt(r.createdAt) },
          { label: '', render: (r) => <button type="button" className="ws-icon" aria-label="Delete" onClick={() => removeRecord('documents', r.id, { actor, action: 'Document deleted', detail: r.fileName })}><Trash2 size={14} /></button> },
        ]} />
      </Panel>
    </Shell>
  )
}

function ClaimDataGapsPage() {
  const patients = usePatients()
  const care = useCare()
  const { navigate } = useRoleAccess()
  const gaps = useMemo(() => {
    const rows = []
    const t = today()
    patients.forEach((p) => {
      if (!p.insuranceProvider) return
      const issues = []
      if (!p.insuranceMemberId) issues.push('Missing member ID')
      if (!p.insuranceExpires) issues.push('Missing expiry date')
      else if (p.insuranceExpires < t) issues.push('Insurance expired')
      if (!p.dob) issues.push('Missing date of birth')
      if (p.insuranceProvider === 'NHIS' && p.insuranceMemberId && !/^[A-Z0-9-]{6,}$/i.test(p.insuranceMemberId)) issues.push('Member ID format looks invalid')
      const done = care.consultations.filter((c) => c.patientId === p.id && c.status === 'Completed')
      if (done.some((c) => !(c.diagnoses || []).length)) issues.push('Completed visit without diagnosis')
      if (issues.length) rows.push({ id: p.id, name: p.name, provider: p.insuranceProvider, issues })
    })
    return rows
  }, [patients, care])
  return (
    <Shell eyebrow="Reception" title="Claim data gaps" description="Insured patients whose records would block or weaken a claim.">
      <Panel title={`${gaps.length} patients need attention`}>
        <Table rows={gaps} empty="No gaps found." columns={[
          { label: 'Patient', render: (r) => <button type="button" className="ws-link" onClick={() => navigate('patient-detail', { patientId: r.id })}>{r.name}</button> },
          { label: 'ID', key: 'id' },
          { label: 'Insurer', key: 'provider' },
          { label: 'Issues', render: (r) => r.issues.join(' · ') },
        ]} />
      </Panel>
    </Shell>
  )
}

/* ---------- Nursing ---------- */

function NursingTasksPage() {
  const ws = useWs()
  const care = useCare()
  const actor = useActor()
  const patients = usePatients()
  const [form, setForm, bind] = useForm({ patientId: '', type: 'Medication', detail: '', due: '' })
  const dispensed = care.prescriptions.filter((p) => p.status === 'Dispensed')
  const tasks = ws.nursingTasks
  const name = (pid) => patients.find((p) => p.id === pid)?.name || pid
  const add = () => {
    if (!form.patientId || !form.detail.trim()) return
    addRecord('nursingTasks', { ...form, status: 'Pending' }, { actor, action: 'Nursing task created', detail: form.detail })
    setForm({ patientId: '', type: 'Medication', detail: '', due: '' })
  }
  const addFromRx = (rx) => addRecord('nursingTasks', {
    patientId: rx.patientId, type: 'Medication', detail: `${rx.medication || 'Medicine'} ${rx.dose || ''} ${rx.frequency || ''} ${rx.duration || ''}`.trim(), due: '', status: 'Pending', prescriptionId: rx.id,
  }, { actor, action: 'MAR task created', detail: rx.id })
  const complete = (t, status) => patchRecord('nursingTasks', t.id, { status, doneAt: new Date().toISOString(), doneBy: actor }, { actor, action: `Nursing task ${status.toLowerCase()}`, detail: t.detail })
  return (
    <Shell eyebrow="Nursing" title="Nursing tasks" description="Medication administration (MAR), vitals rounds, dressings and IV checks.">
      <Panel title="New task">
        <div className="ws-form">
          <Field label="Patient"><PatientSelect value={form.patientId} onChange={(v) => setForm((f) => ({ ...f, patientId: v }))} /></Field>
          <Field label="Type"><select {...bind('type')}>{['Medication', 'Vitals round', 'Wound dressing', 'IV fluids', 'Other'].map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Detail"><input {...bind('detail')} /></Field>
          <Field label="Due"><input {...bind('due', 'datetime-local')} /></Field>
        </div>
        <button className="button button--primary" type="button" onClick={add}><Plus size={14} /> Add task</button>
      </Panel>
      {dispensed.some((rx) => !tasks.some((t) => t.prescriptionId === rx.id)) && (
        <Panel title="Dispensed medicines without a MAR task">
          <Table rows={dispensed.filter((rx) => !tasks.some((t) => t.prescriptionId === rx.id))} columns={[
            { label: 'Patient', render: (r) => r.patientName || name(r.patientId) },
            { label: 'Medicine', render: (r) => r.medication || r.medicineName || r.name || r.itemCode },
            { label: '', render: (r) => <button type="button" className="button" onClick={() => addFromRx(r)}>Add to MAR</button> },
          ]} />
        </Panel>
      )}
      <Panel title="Task list">
        <Table rows={tasks} columns={[
          { label: 'Patient', render: (r) => name(r.patientId) },
          { label: 'Type', key: 'type' },
          { label: 'Detail', key: 'detail' },
          { label: 'Due', render: (r) => r.due ? fmt(r.due) : '—' },
          { label: 'Status', render: (r) => <span className={`ws-badge ws-badge--${r.status.toLowerCase()}`}>{r.status}</span> },
          { label: '', render: (r) => r.status === 'Pending' ? <span className="ws-actions"><button type="button" className="button" onClick={() => complete(r, 'Done')}>Done</button><button type="button" className="button" onClick={() => complete(r, 'Missed')}>Missed</button></span> : <small>{fmt(r.doneAt)}</small> },
        ]} />
      </Panel>
    </Shell>
  )
}

/* ---------- Cashier ---------- */

function useServiceCharges() {
  const care = useCare()
  const ws = useWs()
  return useMemo(() => {
    const rows = []
    care.consultations.filter((c) => c.status === 'Completed').forEach((c) => rows.push({
      id: `CONS-${c.id}`, patientId: c.patientId, patientName: c.patientName, service: 'Consultation', code: 'OPD-GP', amount: priceFor(ws.catalogue, 'OPD-GP'), date: (c.completedAt || c.updatedAt || c.createdAt || '').slice(0, 10),
    }))
    care.labOrders.filter((o) => o.status !== 'Cancelled').forEach((o) => rows.push({
      id: `LABC-${o.id}`, patientId: o.patientId, patientName: o.patientName, service: o.testName, code: o.inventoryItemId ? care.inventory.find((i) => i.id === o.inventoryItemId)?.itemCode : '', amount: 0, date: (o.requestedAt || '').slice(0, 10),
    }))
    return rows.map((r) => r.service === 'Consultation' ? r : { ...r, amount: priceFor(ws.catalogue, r.code) })
  }, [care, ws.catalogue])
}

function TillShiftPage() {
  const ws = useWs()
  const actor = useActor()
  const charges = useServiceCharges()
  const [float, setFloat] = useState('')
  const [pay, setPay, bindPay] = useForm({ chargeId: '', method: 'Cash', amount: '' })
  const [error, setError] = useState('')
  const open = ws.tills.find((t) => t.status === 'Open' && t.actor === actor)
  const paidIds = new Set(ws.tills.flatMap((t) => t.payments || []).map((p) => p.chargeId))
  const unpaid = charges.filter((c) => !paidIds.has(c.id))
  const openTill = () => {
    const n = Number(float)
    if (!Number.isFinite(n) || n < 0) return setError('Enter a valid opening float.')
    addRecord('tills', { actor, status: 'Open', openingFloat: n, openedAt: new Date().toISOString(), payments: [] }, { actor, action: 'Till opened', detail: money(n) })
    setFloat(''); setError('')
  }
  const record = () => {
    const charge = charges.find((c) => c.id === pay.chargeId)
    const amount = Number(pay.amount || charge?.amount)
    if (!charge || !Number.isFinite(amount) || amount <= 0) return setError('Pick a charge and amount.')
    patchRecord('tills', open.id, { payments: [...open.payments, { id: `PAY-${Date.now()}`, chargeId: charge.id, patientName: charge.patientName, service: charge.service, method: pay.method, amount, at: new Date().toISOString() }] },
      { actor, action: 'Payment recorded', detail: `${money(amount)} ${pay.method} · ${charge.service}` })
    setPay({ chargeId: '', method: 'Cash', amount: '' }); setError('')
  }
  const total = (open?.payments || []).reduce((s, p) => s + p.amount, 0)
  return (
    <Shell eyebrow="Cashier" title="My till & shift" description="Open a till, take payments for consultations and lab services, then close for reconciliation.">
      {!open ? (
        <Panel title="Open till">
          <div className="ws-form"><Field label="Opening float (GH₵)"><input type="number" value={float} onChange={(e) => setFloat(e.target.value)} /></Field></div>
          {error && <p className="role-panel-error">{error}</p>}
          <button className="button button--primary" type="button" onClick={openTill}>Open till</button>
        </Panel>
      ) : (
        <>
          <Panel title={`Till open since ${fmt(open.openedAt)} · float ${money(open.openingFloat)} · taken ${money(total)}`}>
            <div className="ws-form">
              <Field label="Charge"><select {...bindPay('chargeId')}><option value="">Select…</option>{unpaid.map((c) => <option key={c.id} value={c.id}>{c.patientName} · {c.service} · {money(c.amount)}</option>)}</select></Field>
              <Field label="Method"><select {...bindPay('method')}>{['Cash', 'Mobile money', 'Card'].map((m) => <option key={m}>{m}</option>)}</select></Field>
              <Field label="Amount (blank = full)"><input {...bindPay('amount', 'number')} /></Field>
            </div>
            {error && <p className="role-panel-error">{error}</p>}
            <span className="ws-actions">
              <button className="button button--primary" type="button" onClick={record}>Record payment</button>
              <button className="button" type="button" onClick={() => patchRecord('tills', open.id, { status: 'Closed', closedAt: new Date().toISOString() }, { actor, action: 'Till closed', detail: money(total) })}>Close till</button>
            </span>
          </Panel>
          <Panel title="Payments this shift">
            <Table rows={open.payments} columns={[{ label: 'Time', render: (r) => fmt(r.at) }, { label: 'Patient', key: 'patientName' }, { label: 'Service', key: 'service' }, { label: 'Method', key: 'method' }, { label: 'Amount', render: (r) => money(r.amount) }]} />
          </Panel>
        </>
      )}
      <Panel title={`Outstanding service charges (${unpaid.length})`}>
        <Table rows={unpaid} empty="No outstanding charges from consultations or lab." columns={[{ label: 'Patient', key: 'patientName' }, { label: 'Service', key: 'service' }, { label: 'Date', key: 'date' }, { label: 'Amount', render: (r) => money(r.amount) }]} />
      </Panel>
    </Shell>
  )
}

function ShiftReconciliationPage() {
  const ws = useWs()
  const actor = useActor()
  const [counted, setCounted] = useState({})
  const closed = ws.tills.filter((t) => t.status !== 'Open')
  const reconcile = (t) => {
    const n = Number(counted[t.id])
    if (!Number.isFinite(n)) return
    const expected = t.openingFloat + t.payments.filter((p) => p.method === 'Cash').reduce((s, p) => s + p.amount, 0)
    patchRecord('tills', t.id, { status: 'Reconciled', countedCash: n, variance: n - expected, reconciledBy: actor }, { actor, action: 'Shift reconciled', detail: `variance ${money(n - expected)}` })
  }
  return (
    <Shell eyebrow="Cashier" title="Shift reconciliation" description="Compare counted cash against expected totals per closed till.">
      <Panel title="Closed shifts">
        <Table rows={closed} empty="No closed tills yet." columns={[
          { label: 'Cashier', key: 'actor' },
          { label: 'Closed', render: (r) => fmt(r.closedAt) },
          { label: 'By method', render: (r) => ['Cash', 'Mobile money', 'Card'].map((m) => `${m}: ${money(r.payments.filter((p) => p.method === m).reduce((s, p) => s + p.amount, 0))}`).join(' · ') },
          { label: 'Expected cash', render: (r) => money(r.openingFloat + r.payments.filter((p) => p.method === 'Cash').reduce((s, p) => s + p.amount, 0)) },
          { label: 'Counted', render: (r) => r.status === 'Reconciled' ? `${money(r.countedCash)} (var ${money(r.variance)})` : <span className="ws-actions"><input className="ws-small" type="number" value={counted[r.id] || ''} onChange={(e) => setCounted({ ...counted, [r.id]: e.target.value })} /><button type="button" className="button" onClick={() => reconcile(r)}>Reconcile</button></span> },
        ]} />
      </Panel>
    </Shell>
  )
}

function RefundsPage() {
  const ws = useWs()
  const actor = useActor()
  const { hasPermission } = useRoleAccess()
  const [form, setForm, bind] = useForm({ patientId: '', amount: '', reason: '' })
  const submit = () => {
    const amount = Number(form.amount)
    if (!form.patientId || !(amount > 0) || !form.reason.trim()) return
    addRecord('refunds', { ...form, amount, status: 'Requested', requestedBy: actor }, { actor, action: 'Refund requested', detail: money(amount) })
    setForm({ patientId: '', amount: '', reason: '' })
  }
  const decide = (r, status) => patchRecord('refunds', r.id, { status, decidedBy: actor, decidedAt: new Date().toISOString() }, { actor, action: `Refund ${status.toLowerCase()}`, detail: money(r.amount) })
  const canApprove = hasPermission('cashier.refund.approve')
  return (
    <Shell eyebrow="Cashier" title="Refunds" description="Request refunds and record supervisor approval.">
      <Panel title="New refund request">
        <div className="ws-form">
          <Field label="Patient"><PatientSelect value={form.patientId} onChange={(v) => setForm((f) => ({ ...f, patientId: v }))} /></Field>
          <Field label="Amount (GH₵)"><input {...bind('amount', 'number')} /></Field>
          <Field label="Reason"><input {...bind('reason')} /></Field>
        </div>
        <button className="button button--primary" type="button" onClick={submit}>Submit request</button>
      </Panel>
      <Panel title="Requests">
        <Table rows={ws.refunds} columns={[
          { label: 'Patient', key: 'patientId' }, { label: 'Amount', render: (r) => money(r.amount) }, { label: 'Reason', key: 'reason' },
          { label: 'Status', render: (r) => <span className={`ws-badge ws-badge--${r.status.toLowerCase()}`}>{r.status}</span> },
          { label: '', render: (r) => r.status === 'Requested' && canApprove ? <span className="ws-actions"><button type="button" className="button" onClick={() => decide(r, 'Approved')}>Approve</button><button type="button" className="button" onClick={() => decide(r, 'Rejected')}>Reject</button></span> : <small>{r.decidedBy || ''}</small> },
        ]} />
      </Panel>
    </Shell>
  )
}

function PriceListPage() {
  const ws = useWs()
  const [q, setQ] = useState('')
  const rows = ws.catalogue.filter((s) => `${s.name} ${s.code} ${s.category}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <Shell eyebrow="Cashier" title="Price list" description="Current hospital service prices (edited by the administrator).">
      <Panel>
        <input className="ws-search" placeholder="Search services…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Table rows={rows} columns={[{ label: 'Category', key: 'category' }, { label: 'Code', key: 'code' }, { label: 'Service', key: 'name' }, { label: 'Price', render: (r) => money(r.price) }]} />
      </Panel>
    </Shell>
  )
}

/* ---------- Administrator ---------- */

function HospitalProfilePage() {
  const ws = useWs()
  const actor = useActor()
  const [form, , bind] = useForm(ws.profile)
  const [saved, setSaved] = useState(false)
  const save = () => { updateWorkspace((c) => ({ ...c, profile: form }), { actor, action: 'Hospital profile updated', detail: form.name }); setSaved(true) }
  return (
    <Shell eyebrow="Administration" title="Hospital profile" description="Facility details used on claims and receipts.">
      <Panel>
        <div className="ws-form">
          {[['name', 'Facility name'], ['nhisProviderNo', 'NHIS provider number'], ['region', 'Region'], ['address', 'Address'], ['phone', 'Phone'], ['email', 'Email']].map(([k, l]) => <Field key={k} label={l}><input {...bind(k)} /></Field>)}
        </div>
        <button className="button button--primary" type="button" onClick={save}>Save profile</button>
        {saved && <p className="role-panel-note">Saved.</p>}
      </Panel>
    </Shell>
  )
}

function EditableList({ listKey, fields, title, description, eyebrow = 'Administration' }) {
  const ws = useWs()
  const actor = useActor()
  const blank = Object.fromEntries(fields.map((f) => [f.key, '']))
  const [form, setForm, bind] = useForm(blank)
  const add = () => {
    if (fields.some((f) => f.required && !String(form[f.key]).trim())) return
    const rec = Object.fromEntries(fields.map((f) => [f.key, f.type === 'number' ? Number(form[f.key]) : form[f.key]]))
    addRecord(listKey, rec, { actor, action: `${title}: added`, detail: rec[fields[0].key] })
    setForm(blank)
  }
  const edit = (r, key, value, type) => patchRecord(listKey, r.id, { [key]: type === 'number' ? Number(value) : value })
  return (
    <Shell eyebrow={eyebrow} title={title} description={description}>
      <Panel title="Add entry">
        <div className="ws-form">{fields.map((f) => <Field key={f.key} label={f.label}><input {...bind(f.key, f.type)} /></Field>)}</div>
        <button className="button button--primary" type="button" onClick={add}><Plus size={14} /> Add</button>
      </Panel>
      <Panel title="Entries">
        <Table rows={ws[listKey]} columns={[
          ...fields.map((f) => ({ label: f.label, render: (r) => <input className="ws-inline" type={f.type || 'text'} value={r[f.key] ?? ''} onChange={(e) => edit(r, f.key, e.target.value, f.type)} onBlur={() => updateWorkspace((c) => c, { actor, action: `${title}: edited`, detail: r[fields[0].key] })} /> })),
          { label: '', render: (r) => <button type="button" className="ws-icon" aria-label="Delete" onClick={() => removeRecord(listKey, r.id, { actor, action: `${title}: removed`, detail: r[fields[0].key] })}><Trash2 size={14} /></button> },
        ]} />
      </Panel>
    </Shell>
  )
}

function ThresholdsPage() {
  const ws = useWs()
  const actor = useActor()
  const [form, , bind] = useForm(ws.thresholds)
  const [saved, setSaved] = useState(false)
  const labels = { triageWaitMinutes: 'Triage wait target (min)', doctorWaitMinutes: 'Doctor wait target (min)', labTurnaroundMinutes: 'Lab turnaround target (min)', pharmacyWaitMinutes: 'Pharmacy wait target (min)', insuranceExpiryWarningDays: 'Insurance expiry warning (days)', defaultReorderLevel: 'Default reorder level' }
  const save = () => {
    const next = Object.fromEntries(Object.keys(labels).map((k) => [k, Math.max(0, Number(form[k]) || 0)]))
    updateWorkspace((c) => ({ ...c, thresholds: next }), { actor, action: 'Thresholds updated', detail: '' }); setSaved(true)
  }
  return (
    <Shell eyebrow="Administration" title="Thresholds & settings" description="Targets used by the realtime SLA monitor and alerts.">
      <Panel>
        <div className="ws-form">{Object.entries(labels).map(([k, l]) => <Field key={k} label={l}><input {...bind(k, 'number')} /></Field>)}</div>
        <button className="button button--primary" type="button" onClick={save}>Save</button>
        {saved && <p className="role-panel-note">Saved.</p>}
      </Panel>
    </Shell>
  )
}

function AuditViewerPage() {
  const ws = useWs()
  const [q, setQ] = useState('')
  const rows = ws.audit.filter((a) => `${a.actor} ${a.action} ${a.detail}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <Shell eyebrow="Administration" title="Audit viewer" description="Chronological log of actions recorded in this browser.">
      <Panel>
        <input className="ws-search" placeholder="Filter by user, action or detail…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Table rows={rows} empty="No audited actions yet." columns={[{ label: 'When', render: (r) => fmt(r.at) }, { label: 'Role', key: 'actor' }, { label: 'Action', key: 'action' }, { label: 'Detail', key: 'detail' }]} />
      </Panel>
    </Shell>
  )
}

function BreakGlassReviewPage() {
  const ws = useWs()
  const actor = useActor()
  const review = (r, outcome) => patchRecord('breakGlass', r.id, { outcome, reviewedBy: actor, reviewedAt: new Date().toISOString() }, { actor, action: `Break-glass ${outcome.toLowerCase()}`, detail: r.reason })
  return (
    <Shell eyebrow="Administration" title="Break-glass review" description="Emergency access events raised from the header button.">
      <Panel>
        <Table rows={ws.breakGlass} empty="No break-glass events." columns={[
          { label: 'When', render: (r) => fmt(r.createdAt) }, { label: 'Role', key: 'actor' }, { label: 'Patient', key: 'patientId' }, { label: 'Reason', key: 'reason' },
          { label: 'Review', render: (r) => r.outcome ? `${r.outcome} · ${r.reviewedBy}` : <span className="ws-actions"><button type="button" className="button" onClick={() => review(r, 'Justified')}>Justified</button><button type="button" className="button" onClick={() => review(r, 'Flagged')}>Flag</button></span> },
        ]} />
      </Panel>
    </Shell>
  )
}

const storeKeys = ['patients', 'appointments', 'care', 'finance', 'inpatient', 'workspace']

function SyncConflictsPage() {
  const ws = useWs()
  const actor = useActor()
  const scan = () => {
    const found = []
    storeKeys.forEach((k) => {
      const key = `ascend-hms-preview-${k}-v1`
      const raw = localStorage.getItem(key)
      if (raw === null) return
      try { JSON.parse(raw) } catch { found.push({ store: k, issue: 'Saved data is unreadable' }) }
    })
    const appts = getAppointments()
    const ids = new Set(getDemoPatients().map((p) => p.id))
    appts.filter((a) => !ids.has(a.patientId)).forEach((a) => found.push({ store: 'appointments', issue: `Appointment ${a.id} points to unknown patient ${a.patientId}` }))
    found.forEach((f) => addRecord('conflicts', { ...f, status: 'Open' }))
    updateWorkspace((c) => c, { actor, action: 'Sync scan run', detail: `${found.length} issues` })
  }
  return (
    <Shell eyebrow="Administration" title="Sync conflicts" description="Check saved data for unreadable or inconsistent records between workstations (tabs).">
      <Panel>
        <button className="button button--primary" type="button" onClick={scan}>Run consistency scan</button>
        <Table rows={ws.conflicts} empty="No conflicts recorded." columns={[
          { label: 'Found', render: (r) => fmt(r.createdAt) }, { label: 'Area', key: 'store' }, { label: 'Issue', key: 'issue' }, { label: 'Status', key: 'status' },
          { label: '', render: (r) => r.status === 'Open' && <button type="button" className="button" onClick={() => patchRecord('conflicts', r.id, { status: 'Resolved' }, { actor, action: 'Conflict resolved', detail: r.issue })}>Mark resolved</button> },
        ]} />
      </Panel>
    </Shell>
  )
}

function RealtimeSlaPage() {
  const ws = useWs()
  const appts = useAppts()
  const care = useCare()
  const [, tick] = useState(0)
  const t = ws.thresholds
  const nowMin = (() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() })()
  const toMin = (hhmm) => { const [h, m] = String(hhmm || '').split(':').map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : null }
  const queues = [
    { name: 'Triage', target: t.triageWaitMinutes, items: appts.filter((a) => a.date === today() && a.status === 'Checked in').map((a) => ({ label: a.patientName, wait: nowMin - (toMin(a.checkedInAt) ?? nowMin) })) },
    { name: 'Doctor', target: t.doctorWaitMinutes, items: appts.filter((a) => a.date === today() && a.status === 'In triage').map((a) => ({ label: a.patientName, wait: nowMin - (toMin(a.checkedInAt) ?? nowMin) })) },
    { name: 'Laboratory', target: t.labTurnaroundMinutes, items: care.labOrders.filter((o) => o.status !== 'Result ready').map((o) => ({ label: `${o.patientName} · ${o.testName}`, wait: Math.round((Date.now() - new Date(o.requestedAt).getTime()) / 60000) })) },
    { name: 'Pharmacy', target: t.pharmacyWaitMinutes, items: care.prescriptions.filter((p) => p.status !== 'Dispensed').map((p) => ({ label: p.patientName, wait: Math.round((Date.now() - new Date(p.prescribedAt || p.requestedAt || Date.now()).getTime()) / 60000) })) },
  ]
  return (
    <Shell eyebrow="Administration" title="Realtime SLA monitor" description="Waiting times against the targets set in Thresholds & settings.">
      <button className="button" type="button" onClick={() => tick((n) => n + 1)}>Refresh</button>
      <div className="role-metric-grid">
        {queues.map((q) => {
          const breaches = q.items.filter((i) => i.wait > q.target).length
          return <article className="role-metric-card" key={q.name}><span>{q.name}</span><strong>{q.items.length}</strong><small className={breaches ? 'ws-bad' : ''}>{breaches} over {q.target} min target</small></article>
        })}
      </div>
      {queues.map((q) => q.items.some((i) => i.wait > q.target) && (
        <Panel key={q.name} title={`${q.name} breaches`}>
          <Table rows={q.items.filter((i) => i.wait > q.target)} columns={[{ label: 'Item', key: 'label' }, { label: 'Waiting (min)', key: 'wait' }]} />
        </Panel>
      ))}
    </Shell>
  )
}

function BackupStatusPage() {
  const ws = useWs()
  const actor = useActor()
  const [error, setError] = useState('')
  const exportAll = () => {
    const data = Object.fromEntries(storeKeys.map((k) => [k, localStorage.getItem(`ascend-hms-preview-${k}-v1`)]))
    data.claims = localStorage.getItem('ascend-hms-generated-claims-v1')
    const text = JSON.stringify({ exportedAt: new Date().toISOString(), data })
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = `ascend-hms-backup-${today()}.json`; a.click(); URL.revokeObjectURL(url)
    addRecord('backups', { kind: 'Export', size: text.length, by: actor }, { actor, action: 'Backup exported', detail: `${text.length} bytes` })
  }
  const restore = (file) => {
    if (!file) return
    file.text().then((text) => {
      const parsed = JSON.parse(text)
      if (!parsed?.data) throw new Error('Not an Ascend HMS backup file.')
      if (!window.confirm('Restore will replace all data in this browser. Continue?')) return
      Object.entries(parsed.data).forEach(([k, v]) => {
        const key = k === 'claims' ? 'ascend-hms-generated-claims-v1' : `ascend-hms-preview-${k}-v1`
        if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, v)
      })
      window.location.reload()
    }).catch((e) => setError(e.message))
  }
  const sizes = storeKeys.map((k) => ({ id: k, store: k, bytes: (localStorage.getItem(`ascend-hms-preview-${k}-v1`) || '').length }))
  return (
    <Shell eyebrow="Administration" title="Backup status" description="Export or restore all data held in this browser.">
      <Panel title="Actions">
        <span className="ws-actions">
          <button className="button button--primary" type="button" onClick={exportAll}><Download size={14} /> Export backup</button>
          <label className="button">Restore from file<input hidden type="file" accept="application/json" onChange={(e) => restore(e.target.files?.[0])} /></label>
        </span>
        {error && <p className="role-panel-error">{error}</p>}
      </Panel>
      <Panel title="Stored data"><Table rows={sizes} columns={[{ label: 'Area', key: 'store' }, { label: 'Size', render: (r) => r.bytes ? `${(r.bytes / 1024).toFixed(1)} KB` : 'Not yet saved' }]} /></Panel>
      <Panel title="Backup history"><Table rows={ws.backups} empty="No backups exported yet." columns={[{ label: 'When', render: (r) => fmt(r.createdAt) }, { label: 'By', key: 'by' }, { label: 'Size', render: (r) => `${(r.size / 1024).toFixed(1)} KB` }]} /></Panel>
    </Shell>
  )
}

export function BreakGlassDialog({ onClose }) {
  const actor = useActor()
  const [patientId, setPatientId] = useState('')
  const [reason, setReason] = useState('')
  const submit = () => {
    if (!patientId || reason.trim().length < 10) return
    addRecord('breakGlass', { actor, patientId, reason: reason.trim() }, { actor, action: 'Break-glass access', detail: `${patientId}: ${reason.trim()}` })
    onClose(patientId)
  }
  return (
    <div className="ws-modal" role="dialog" aria-modal="true" aria-label="Break-glass access">
      <div className="role-panel ws-modal-card">
        <h2 className="ws-title"><ShieldAlert size={16} /> Emergency access</h2>
        <p className="role-panel-note">This access is logged and reviewed by the administrator.</p>
        <Field label="Patient"><PatientSelect value={patientId} onChange={setPatientId} /></Field>
        <Field label="Reason (min 10 characters)"><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} /></Field>
        <span className="ws-actions">
          <button className="button button--primary" type="button" disabled={!patientId || reason.trim().length < 10} onClick={submit}>Open record</button>
          <button className="button" type="button" onClick={() => onClose('')}>Cancel</button>
        </span>
      </div>
    </div>
  )
}

const pages = {
  documents: DocumentsPage,
  'claim-data-gaps': ClaimDataGapsPage,
  'nursing-tasks': NursingTasksPage,
  'till-shift': TillShiftPage,
  refunds: RefundsPage,
  'shift-reconciliation': ShiftReconciliationPage,
  'price-list': PriceListPage,
  'hospital-profile': HospitalProfilePage,
  'service-catalogue': () => <EditableList listKey="catalogue" title="Service catalogue & prices" description="Services and prices used for cashier charges." fields={[{ key: 'name', label: 'Service', required: true }, { key: 'code', label: 'Code', required: true }, { key: 'category', label: 'Category' }, { key: 'price', label: 'Price (GH₵)', type: 'number', required: true }]} />,
  'reference-mappings': () => <EditableList listKey="mappings" title="Reference mappings" description="Map local service codes to G-DRG, ICD-10 or NHIS codes." fields={[{ key: 'localCode', label: 'Local code', required: true }, { key: 'system', label: 'System', required: true }, { key: 'externalCode', label: 'External code', required: true }, { key: 'note', label: 'Note' }]} />,
  'thresholds-settings': ThresholdsPage,
  'audit-viewer': AuditViewerPage,
  'break-glass-review': BreakGlassReviewPage,
  'sync-conflicts': SyncConflictsPage,
  'realtime-sla': RealtimeSlaPage,
  'backup-status': BackupStatusPage,
}

export function WorkspacePage({ pageId }) {
  const Page = pages[pageId]
  return Page ? <Page /> : null
}

export const workspacePageIds = Object.keys(pages)
