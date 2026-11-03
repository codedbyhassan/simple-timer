import { useMemo, useState, useSyncExternalStore } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BedDouble,
  ClipboardList,
  FileCheck2,
  FlaskConical,
  KeyRound,
  PackageSearch,
  Plus,
  UserRound,
  Users,
} from 'lucide-react'
import { permissionCatalog, roleDefinitions, useRoleAccess } from '../../access/roleAccess.js'
import { getAppointments, subscribeToAppointments } from '../front-desk/frontDeskStore.js'
import { getCareData, subscribeToCareData } from '../clinical/careStore.js'
import { getGeneratedClaimsSnapshot, subscribeToGeneratedClaims } from '../clinical/claimsStore.js'
import { getDemoPatients, subscribeToDemoPatients } from '../patients/patientStore.js'
import { getWorkspace, subscribeWorkspace, updateWorkspace } from '../admin/workspaceStore.js'
import './RoleWorkspacePages.css'

const today = new Date().toISOString().slice(0, 10)

function ManagementDashboard() {
  const { hasPermission, navigate } = useRoleAccess()
  const appointments = useSyncExternalStore(subscribeToAppointments, getAppointments, getAppointments)
  const patients = useSyncExternalStore(subscribeToDemoPatients, getDemoPatients, getDemoPatients)
  const care = useSyncExternalStore(subscribeToCareData, getCareData, getCareData)
  const claims = useSyncExternalStore(subscribeToGeneratedClaims, getGeneratedClaimsSnapshot, getGeneratedClaimsSnapshot)
  const todayAppointments = appointments.filter((appointment) => appointment.date === today)
  const waiting = todayAppointments.filter((appointment) => ['Checked in', 'In triage'].includes(appointment.status)).length
  const awaitingLab = care.labOrders.filter((order) => order.status !== 'Result ready').length
  const awaitingPharmacy = care.prescriptions.filter((order) => order.status !== 'Dispensed').length
  const lowStock = care.inventory.filter((item) => item.trackStock && item.onHand <= item.reorderLevel)
  const thisMonthClaims = claims.records.filter((record) => record.generatedAt.slice(0, 7) === today.slice(0, 7)).length

  const metrics = [
    { label: 'Registered patients', value: patients.length, note: 'Patient directory', icon: Users },
    { label: "Today's appointments", value: todayAppointments.length, note: `${waiting} awaiting triage`, icon: ClipboardList },
    { label: 'Orders in progress', value: awaitingLab + awaitingPharmacy, note: `${awaitingLab} lab · ${awaitingPharmacy} pharmacy`, icon: Activity },
    { label: 'Claims this month', value: thisMonthClaims, note: 'Saved local previews', icon: FileCheck2 },
  ]

  return (
    <section className="role-workspace" aria-labelledby="management-dashboard-title">
      <header className="role-workspace-heading">
        <div>
          <span className="role-workspace-eyebrow"><Activity size={15} /> Management</span>
          <h1 id="management-dashboard-title">Management dashboard</h1>
          <p>Operational overview for this workspace.</p>
        </div>
      </header>
      <div className="role-metric-grid">
        {metrics.map(({ label, value, icon: Icon }) => (
          <article className="role-metric-card" key={label}>
            <span><Icon size={15} /> {label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="role-dashboard-columns">
        <section className="role-panel">
          <div className="role-panel-heading"><div><h2>Operational signals</h2><p>Current queues and stock exceptions</p></div><Activity size={17} /></div>
          <div className="role-signal-list">
            <div><span className="role-signal-icon role-signal-icon--amber"><AlertTriangle size={15} /></span><span><strong>{lowStock.length} low or out-of-stock items</strong><small>Based on tracked inventory reorder levels</small></span>{hasPermission('inventory.manage') && <button type="button" onClick={() => navigate('inventory-console')}>Review <ArrowRight size={13} /></button>}</div>
            <div><span className="role-signal-icon role-signal-icon--blue"><FlaskConical size={15} /></span><span><strong>{awaitingLab} laboratory orders awaiting results</strong><small>Urgent-result acknowledgement is not modeled yet</small></span>{hasPermission('lab.worklist.view') && <button type="button" onClick={() => navigate('lab-worklist')}>Review <ArrowRight size={13} /></button>}</div>
            <div><span className="role-signal-icon role-signal-icon--green"><BedDouble size={15} /></span><span><strong>Bed and admission workspace</strong><small>Bed assignments and requests sync across this browser’s tabs</small></span><button type="button" onClick={() => navigate('departments-wards')}>Review <ArrowRight size={13} /></button></div>
          </div>
        </section>
        <section className="role-panel">
          <div className="role-panel-heading"><div><h2>Claims performance</h2><p>Archive status for the current month</p></div><FileCheck2 size={17} /></div>
          <div className="role-claims-summary">
            <strong>{thisMonthClaims}</strong><span>claim previews saved</span>
          </div>
          <p className="role-panel-note">{claims.records.length} total local archive records. No submission/import status or shared reporting source is connected.</p>
          {claims.error && <p className="role-panel-error" role="alert">{claims.error}</p>}
          {hasPermission('claims.pipeline.view') && <button className="role-panel-link" type="button" onClick={() => navigate('claims-pipeline')}>Open claims archive <ArrowRight size={14} /></button>}
        </section>
      </div>
      <p className="role-security-caption">Connection monitoring, audit trails, backups and realtime service levels are not configured in this workspace.</p>
    </section>
  )
}

function PermissionSettingsPage() {
  const { roleGrants, setRoleGrants } = useRoleAccess()
  const workspace = useSyncExternalStore(subscribeWorkspace, getWorkspace, getWorkspace)
  const [activeTab, setActiveTab] = useState('staff')
  const [selectedRole, setSelectedRole] = useState(roleDefinitions[0].id)
  const [staffForm, setStaffForm] = useState({ name: '', email: '', staffId: '', department: '', roleId: roleDefinitions[0].id })
  const [staffError, setStaffError] = useState('')
  const selected = roleDefinitions.find((role) => role.id === selectedRole)
  const rolePermissions = roleGrants[selectedRole] || []
  const permissionRows = useMemo(() => permissionCatalog, [])
  const staff = workspace.staff || []

  const togglePermission = (permissionId, enabled) => {
    setRoleGrants((current) => {
      const currentPermissions = current[selectedRole] || []
      const nextPermissions = enabled
        ? [...new Set([...currentPermissions, permissionId])]
        : currentPermissions.filter((permission) => permission !== permissionId)
      return { ...current, [selectedRole]: nextPermissions }
    })
  }

  const addStaff = (event) => {
    event.preventDefault()
    const name = staffForm.name.trim()
    const email = staffForm.email.trim().toLowerCase()
    const staffId = staffForm.staffId.trim().toUpperCase()
    if (!name || !email || !staffId || !staffForm.department.trim()) {
      setStaffError('Complete the staff name, email, staff ID and department.')
      return
    }
    if (staff.some((person) => person.email.toLowerCase() === email || person.staffId.toLowerCase() === staffId.toLowerCase())) {
      setStaffError('A staff record with this email or staff ID already exists.')
      return
    }
    const record = { id: `STAFF-${Date.now().toString(36).toUpperCase()}`, ...staffForm, name, email, staffId, status: 'Active', createdAt: new Date().toISOString() }
    updateWorkspace((current) => ({ ...current, staff: [...(current.staff || []), record] }), { actor: 'Hospital Administrator', action: 'Staff directory record created', detail: staffId })
    setStaffForm({ name: '', email: '', staffId: '', department: '', roleId: staffForm.roleId })
    setStaffError('')
  }

  const updateStaff = (person, changes) => updateWorkspace(
    (current) => ({ ...current, staff: (current.staff || []).map((item) => item.id === person.id ? { ...item, ...changes } : item) }),
    { actor: 'Hospital Administrator', action: 'Staff directory record updated', detail: person.staffId },
  )

  return (
    <section className="role-workspace" aria-labelledby="permissions-title">
      <header className="role-workspace-heading">
        <div>
          <span className="role-workspace-eyebrow"><KeyRound size={15} /> Administration</span>
          <h1 id="permissions-title">Users, roles & permissions</h1>
          <p>Maintain the preview staff directory and role permission seeds.</p>
        </div>
      </header>
      <p className="role-security-caption">Staff records and permission controls are stored in this browser. They do not create login accounts or replace authenticated, server-side authorization.</p>
      <div className="role-admin-tabs" role="tablist" aria-label="User administration sections">
        <button type="button" role="tab" aria-selected={activeTab === 'staff'} className={activeTab === 'staff' ? 'role-admin-tab role-admin-tab--active' : 'role-admin-tab'} onClick={() => setActiveTab('staff')}><Users size={14}/> Staff directory</button>
        <button type="button" role="tab" aria-selected={activeTab === 'permissions'} className={activeTab === 'permissions' ? 'role-admin-tab role-admin-tab--active' : 'role-admin-tab'} onClick={() => setActiveTab('permissions')}><KeyRound size={14}/> Role permissions</button>
      </div>
      {activeTab === 'staff' ? (
        <>
          <section className="role-panel">
            <div className="role-panel-heading"><div><h2>Add staff record</h2><p>Directory entry only. No password or authentication account is created.</p></div><UserRound size={17}/></div>
            <form className="role-staff-form" onSubmit={addStaff}>
              <label><span>Full name</span><input required value={staffForm.name} onChange={(event) => setStaffForm({ ...staffForm, name: event.target.value })} placeholder="Staff member name"/></label>
              <label><span>Email address</span><input required type="email" value={staffForm.email} onChange={(event) => setStaffForm({ ...staffForm, email: event.target.value })} placeholder="name@hospital.com"/></label>
              <label><span>Staff ID</span><input required value={staffForm.staffId} onChange={(event) => setStaffForm({ ...staffForm, staffId: event.target.value })} placeholder="e.g. STF-001"/></label>
              <label><span>Department</span><input required value={staffForm.department} onChange={(event) => setStaffForm({ ...staffForm, department: event.target.value })} placeholder="e.g. Outpatient"/></label>
              <label><span>Workspace role</span><select value={staffForm.roleId} onChange={(event) => setStaffForm({ ...staffForm, roleId: event.target.value })}>{roleDefinitions.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
              <button className="button button--primary" type="submit"><Plus size={14}/> Add staff</button>
            </form>
            {staffError && <p className="role-panel-error" role="alert">{staffError}</p>}
          </section>
          <section className="role-panel">
            <div className="role-panel-heading"><div><h2>Staff directory</h2><p>{staff.length} staff records · preview only</p></div><Users size={17}/></div>
            <div className="role-staff-table-wrap"><table className="role-staff-table"><thead><tr><th>Staff member</th><th>Staff ID</th><th>Workspace role</th><th>Status</th></tr></thead><tbody>
              {staff.map((person) => <tr key={person.id}><td><strong>{person.name}</strong><small>{person.email} · {person.department}</small></td><td>{person.staffId}</td><td><select aria-label={`Role for ${person.name}`} value={person.roleId} onChange={(event) => updateStaff(person, { roleId: event.target.value })}>{roleDefinitions.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></td><td><button type="button" className={person.status === 'Active' ? 'role-staff-status role-staff-status--active' : 'role-staff-status'} onClick={() => updateStaff(person, { status: person.status === 'Active' ? 'Inactive' : 'Active' })}>{person.status} · change</button></td></tr>)}
            </tbody></table>{!staff.length && <p className="role-panel-note">No staff records yet. Add a staff member above to populate the directory.</p>}</div>
          </section>
        </>
      ) : (
        <section className="role-panel role-permission-panel">
          <label className="role-permission-role">
            <span>Role permission seed</span>
            <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
              {roleDefinitions.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
          </label>
          {selected && <p className="role-panel-note">{selected.description} · {rolePermissions.length} granted permissions</p>}
          <div className="role-permission-list">
            {permissionRows.map((permission) => (
              <label className="role-permission-row" key={permission.id}>
                <span><strong>{permission.label}</strong><small>{permission.id}</small></span>
                <input type="checkbox" checked={rolePermissions.includes(permission.id)} onChange={(event) => togglePermission(permission.id, event.target.checked)} aria-label={`${permission.label} for ${selected?.name || 'role'}`}/>
              </label>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}

function RoleModulePreview({ title, roleName }) {
  return (
    <section className="role-workspace" aria-labelledby="role-preview-title">
      <header className="role-workspace-heading">
        <div>
          <span className="role-workspace-eyebrow"><PackageSearch size={15} /> {roleName}</span>
          <h1 id="role-preview-title">{title}</h1>
          <p>This workspace is planned but is not yet available.</p>
        </div>
      </header>
      <section className="role-panel role-module-empty">
        <span className="role-module-empty-icon"><PackageSearch size={20} /></span>
        <h2>Workspace coming soon</h2>
        <p>This workspace will be available when its operational workflows and required integrations are complete.</p>
      </section>
    </section>
  )
}

export { ManagementDashboard, PermissionSettingsPage, RoleModulePreview }
