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
  ShieldAlert,
  Users,
} from 'lucide-react'
import { permissionCatalog, roleDefinitions, useRoleAccess } from '../../access/roleAccess.js'
import { getAppointments, subscribeToAppointments } from '../front-desk/frontDeskStore.js'
import { getCareData, subscribeToCareData } from '../clinical/careStore.js'
import { getGeneratedClaimsSnapshot, subscribeToGeneratedClaims } from '../clinical/claimsStore.js'
import { getDemoPatients, subscribeToDemoPatients } from '../patients/patientStore.js'
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
    { label: 'Registered patients', value: patients.length, note: 'Synthetic directory', icon: Users },
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
          <p>Operational overview from the current local preview session.</p>
        </div>
        <span className="role-preview-chip">Preview data · not live</span>
      </header>
      <div className="role-metric-grid">
        {metrics.map(({ label, value, note, icon: Icon }) => (
          <article className="role-metric-card" key={label}>
            <span><Icon size={15} /> {label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
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
      <div className="role-preview-warning"><ShieldAlert size={15} /> Connection, audit, backup, and realtime SLA signals require a backend and are not represented as healthy in this preview.</div>
    </section>
  )
}

function PermissionSettingsPage() {
  const { roleGrants, setRoleGrants } = useRoleAccess()
  const [selectedRole, setSelectedRole] = useState(roleDefinitions[0].id)
  const selected = roleDefinitions.find((role) => role.id === selectedRole)
  const rolePermissions = roleGrants[selectedRole] || []
  const permissionRows = useMemo(() => permissionCatalog, [])

  const togglePermission = (permissionId, enabled) => {
    setRoleGrants((current) => {
      const currentPermissions = current[selectedRole] || []
      const nextPermissions = enabled
        ? [...new Set([...currentPermissions, permissionId])]
        : currentPermissions.filter((permission) => permission !== permissionId)
      return { ...current, [selectedRole]: nextPermissions }
    })
  }

  return (
    <section className="role-workspace" aria-labelledby="permissions-title">
      <header className="role-workspace-heading">
        <div>
          <span className="role-workspace-eyebrow"><KeyRound size={15} /> Administration</span>
          <h1 id="permissions-title">Users, roles & permissions</h1>
          <p>Review and adjust seeded role grants in this browser preview.</p>
        </div>
        <span className="role-preview-chip">Local preview only</span>
      </header>
      <div className="role-preview-warning"><ShieldAlert size={15} /> These local controls demonstrate menu/action gating only. They are not authentication or server-side authorization.</div>
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
              <input
                type="checkbox"
                checked={rolePermissions.includes(permission.id)}
                onChange={(event) => togglePermission(permission.id, event.target.checked)}
                aria-label={`${permission.label} for ${selected?.name || 'role'}`}
              />
            </label>
          ))}
        </div>
      </section>
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
          <p>This menu is included in the approved workspace, but its operational screen is not implemented yet.</p>
        </div>
        <span className="role-preview-chip">Preview workspace</span>
      </header>
      <section className="role-panel role-module-empty">
        <span className="role-module-empty-icon"><PackageSearch size={20} /></span>
        <h2>Workflow screen not connected</h2>
        <p>No patient or operational action is simulated here. The underlying workflow and backend integration need to be implemented and tested before this page can be used.</p>
      </section>
    </section>
  )
}

export { ManagementDashboard, PermissionSettingsPage, RoleModulePreview }
