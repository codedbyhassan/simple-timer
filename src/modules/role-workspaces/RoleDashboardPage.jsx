import { useMemo, useSyncExternalStore } from 'react'
import { Activity, ArrowRight, CalendarDays, CheckCircle2, ClipboardList, FileCheck2, FlaskConical, Pill, ReceiptText, Users, Wallet } from 'lucide-react'
import { roleDefinitions, useRoleAccess } from '../../access/roleAccess.js'
import { getAppointments, subscribeToAppointments } from '../front-desk/frontDeskStore.js'
import { getCareData, subscribeToCareData } from '../clinical/careStore.js'
import { getGeneratedClaimsSnapshot, subscribeToGeneratedClaims } from '../clinical/claimsStore.js'
import { getDemoPatients, subscribeToDemoPatients } from '../patients/patientStore.js'
import './RoleWorkspacePages.css'

const today = new Date().toISOString().slice(0, 10)
const workflows = {
  reception: [['Appointments', 'appointments'], ['OPD queue', 'opd-queue'], ['Patients', 'patients']],
  nurse: [['Triage queue', 'triage-queue'], ['Admission requests', 'admission-requests'], ['Ward & bed board', 'ward-bed-board']],
  doctor: [['My queue', 'doctor-queue'], ['Consultation', 'consultation'], ['Results inbox', 'results-inbox']],
  lab: [['Worklist', 'lab-worklist'], ['Specimens', 'specimens'], ['Result entry & verification', 'lab-results'], ['Critical results', 'critical-results'], ['Test catalogue', 'test-catalogue']],
  pharmacy: [['Prescription queue', 'pharmacy-queue'], ['Dispensing panel', 'dispensing-panel'], ['Stock alerts', 'stock-alerts'], ['Formulary mapping', 'formulary-mapping'], ['Inventory', 'pharmacy-inventory']],
  cashier: [['Pending charges', 'pending-charges'], ['Payment history', 'payments-receipts'], ['My till & shift', 'till-shift'], ['Refunds', 'refunds']],
  claims: [['Claims pipeline', 'claims-pipeline'], ['Claims list', 'claims-list'], ['Mapping queue', 'claims-mapping'], ['Export batches', 'export-batches'], ['Month progress', 'month-progress']],
}

export default function RoleDashboardPage({ roleId }) {
  const { navigate } = useRoleAccess()
  const appointments = useSyncExternalStore(subscribeToAppointments, getAppointments, getAppointments)
  const patients = useSyncExternalStore(subscribeToDemoPatients, getDemoPatients, getDemoPatients)
  const care = useSyncExternalStore(subscribeToCareData, getCareData, getCareData)
  const claims = useSyncExternalStore(subscribeToGeneratedClaims, getGeneratedClaimsSnapshot, getGeneratedClaimsSnapshot)
  const role = roleDefinitions.find((item) => item.id === roleId)
  const todaysAppointments = useMemo(() => appointments.filter((item) => item.date === today), [appointments])
  const arrivals = todaysAppointments.filter((item) => ['Checked in', 'In triage'].includes(item.status))
  const clinicalQueue = todaysAppointments.filter((item) => ['With clinician', 'In consultation'].includes(item.status))
  const openLabs = care.labOrders.filter((item) => item.status !== 'Result ready')
  const unverifiedLabs = care.labOrders.filter((item) => item.status === 'Result entered')
  const criticalResults = care.labOrders.filter((item) => item.critical && item.status === 'Result ready')
  const openPrescriptions = care.prescriptions.filter((item) => item.status !== 'Dispensed')
  const stockDepartment = roleId === 'lab' ? 'laboratory' : 'pharmacy'
  const lowStock = care.inventory.filter((item) => item.department === stockDepartment && item.trackStock && item.onHand <= item.reorderLevel)
  const missingMappings = care.inventory.filter((item) => item.department === 'pharmacy' && !item.claimCode)
  const monthClaims = claims.records.filter((item) => item.generatedAt.slice(0, 7) === today.slice(0, 7))

  const stats = {
    reception: [
      ['Today’s appointments', todaysAppointments.length, 'Scheduled for today', CalendarDays],
      ['Arrivals waiting', arrivals.length, 'Checked in or in triage', Users],
      ['Registered patients', patients.length, 'Patient directory', Users],
      ['Completed visits', todaysAppointments.filter((item) => item.status === 'Completed').length, 'Today', CheckCircle2],
    ],
    nurse: [
      ['Awaiting triage', arrivals.length, 'Checked in or in triage', Activity],
      ['Ready for clinician', clinicalQueue.length, 'Visits handed over', CheckCircle2],
      ['Today’s visits', todaysAppointments.length, 'Outpatient activity', CalendarDays],
      ['Patient directory', patients.length, 'Available records', Users],
    ],
    doctor: [
      ['My clinical queue', clinicalQueue.length, 'Patients handed over by Nursing', Users],
      ['Results to review', care.labOrders.filter((item) => item.status === 'Result ready' && !item.reviewedAt).length, 'Verified results awaiting review', FlaskConical],
      ['Awaiting laboratory', openLabs.length, 'Open investigations', Activity],
      ['Prescriptions pending', openPrescriptions.length, 'At Pharmacy', Pill],
    ],
    lab: [
      ['Open investigations', openLabs.length, 'Awaiting processing or verification', FlaskConical],
      ['Results for verification', unverifiedLabs.length, 'Entered, not yet verified', CheckCircle2],
      ['Critical results', criticalResults.length, 'Flagged results', Activity],
      ['Stock alerts', lowStock.length, 'At or below reorder level', ReceiptText],
    ],
    pharmacy: [
      ['Prescription queue', openPrescriptions.length, 'Awaiting dispensing', Pill],
      ['Dispensed prescriptions', care.prescriptions.filter((item) => item.status === 'Dispensed').length, 'Recorded in this browser', CheckCircle2],
      ['Stock alerts', lowStock.length, 'At or below reorder level', ReceiptText],
      ['Mapping gaps', missingMappings.length, 'Missing formulary codes', FileCheck2],
    ],
    cashier: [
      ['Appointments today', todaysAppointments.length, 'Activity requiring billing review', CalendarDays],
      ['Dispensed prescriptions', care.prescriptions.filter((item) => item.status === 'Dispensed').length, 'Potential charge sources', Pill],
      ['Registered patients', patients.length, 'Patient directory', Users],
      ['Claims archive', claims.records.length, 'Generated claim sheets', FileCheck2],
    ],
    claims: [
      ['Saved claims', claims.records.length, 'Local archive', FileCheck2],
      ['Generated this month', monthClaims.length, 'By generation date', CalendarDays],
      ['Medicine tariff gaps', claims.records.filter((item) => item.claim.medicine.some((medicine) => !Number.isFinite(medicine.nhisCovered))).length, 'Require tariff review', Wallet],
      ['Export-ready records', claims.records.length, 'Saved claim XML available', ReceiptText],
    ],
  }[roleId] || []

  const recent = roleId === 'lab'
    ? openLabs.slice(0, 5).map((item) => ({ title: item.testName, meta: item.patientName, status: item.status, route: 'lab-worklist' }))
    : roleId === 'pharmacy'
      ? openPrescriptions.slice(0, 5).map((item) => ({ title: item.medication, meta: item.patientName, status: item.status, route: 'pharmacy-queue' }))
      : roleId === 'doctor'
        ? clinicalQueue.slice(0, 5).map((item) => ({ title: item.patientName, meta: item.department + ' · ' + item.time, status: item.status, route: 'doctor-queue' }))
        : roleId === 'claims'
          ? claims.records.slice(0, 5).map((item) => ({ title: item.claimID, meta: item.patientName || item.sourcePatientId, status: 'Saved', route: 'claims-list' }))
          : todaysAppointments.slice(0, 5).map((item) => ({ title: item.patientName, meta: item.department + ' · ' + item.time, status: item.status, route: roleId === 'nurse' ? 'triage-queue' : 'appointments' }))

  return (
    <section className="role-workspace" aria-labelledby="role-overview-title">
      <header className="role-workspace-heading">
        <div>
          <span className="role-workspace-eyebrow"><Activity size={15} /> {role?.name || 'Workspace'}</span>
          <h1 id="role-overview-title">{role?.name || 'Role'} overview</h1>
          <p>Operational snapshot from the records available in this browser.</p>
        </div>
        <span className="role-preview-chip">Local preview data</span>
      </header>
      <div className="role-metric-grid">
        {stats.map(([label, value, note, Icon]) => (
          <article className="role-metric-card" key={label}>
            <span><Icon size={15} /> {label}</span><strong>{value}</strong><small>{note}</small>
          </article>
        ))}
      </div>
      <div className="role-dashboard-grid">
        <section className="role-panel">
          <div className="role-panel-heading"><div><h2>{roleId === 'claims' ? 'Recently generated claims' : roleId === 'lab' ? 'Open laboratory work' : roleId === 'pharmacy' ? 'Prescription queue' : roleId === 'doctor' ? 'Clinical queue' : roleId === 'nurse' ? 'Today’s triage activity' : 'Today’s appointments'}</h2><p>Open a record in its operational workspace.</p></div><ClipboardList size={17} /></div>
          <div className="role-dashboard-list">
            {recent.length ? recent.map((item, index) => (
              <div className="role-dashboard-row" key={item.title + index}>
                <span><strong>{item.title}</strong><small>{item.meta} · {item.status}</small></span>
                <button className="role-panel-link" type="button" onClick={() => navigate(item.route)}>Open <ArrowRight size={13} /></button>
              </div>
            )) : <div className="role-dashboard-empty">No matching activity is recorded yet.</div>}
          </div>
        </section>
        <section className="role-panel">
          <div className="role-panel-heading"><div><h2>Quick access</h2><p>Go directly to a role workflow.</p></div><ArrowRight size={17} /></div>
          <div className="role-dashboard-actions">
            {(workflows[roleId] || []).map(([label, route]) => <button className="button button--secondary" type="button" key={route} onClick={() => navigate(route)}>{label}</button>)}
          </div>
          <p className="role-panel-note" style={{ marginTop: 16 }}>Figures are derived from browser-local preview records. They are not a live multi-user hospital report.</p>
        </section>
      </div>
    </section>
  )
}
