import { Link } from 'react-router-dom'
import { Icon, PageHeader, StatusBadge } from '@ui'
import useReceptionWorkspace from '../reception/useReceptionWorkspace.js'
import useNurseWorkspace from '../nurse/useNurseWorkspace.js'
import useLabWorkspace from '../lab/useLabWorkspace.js'
import usePharmacyWorkspace from '../pharmacy/usePharmacyWorkspace.js'
import useCashierWorkspace from '../cashier/useCashierWorkspace.js'
import useClaimsWorkspace from '../claims/useClaimsWorkspace.js'
import './admin styles/managementdashboard.css'

const Metric = ({ label, value, detail, to, icon }) => (
  <Link className="hms-management__metric" to={to}>
    <span className="hms-management__metric-icon"><Icon name={icon} size={18} /></span>
    <span className="hms-management__metric-label">{label}</span>
    <strong>{value}</strong>
    <small>{detail}</small>
  </Link>
)

export default function ManagementDashboardPage({ menu }) {
  const reception = useReceptionWorkspace()
  const nursing = useNurseWorkspace()
  const laboratory = useLabWorkspace()
  const pharmacy = usePharmacyWorkspace()
  const cashier = useCashierWorkspace()
  const claims = useClaimsWorkspace()
  const data = reception.data
  const today = new Date().toISOString().slice(0, 10)
  const todayAppointments = data.appointments.filter((item) => item.date === today)
  const openQueue = data.queue.filter((item) => !['Completed', 'Closed', 'Discharged'].includes(item.stage))
  const pendingLabs = (laboratory.data.lab?.orders || []).filter((item) => !['Verified', 'Cancelled'].includes(item.status))
  const pendingPrescriptions = (pharmacy.data.pharmacy?.prescriptions || []).filter((item) => !['Dispensed', 'Cancelled'].includes(item.status))
  const unpaid = data.payments.reduce((sum, item) => sum + Math.max(0, Number(item.billed || 0) - Number(item.paid || 0)), 0)
  const readyClaims = (claims.data.claims?.records || []).filter((item) => item.status === 'Ready').length
  const beds = nursing.data.nurse?.beds || []
  const occupiedBeds = beds.filter((item) => item.status === 'Occupied').length
  const loaded = [reception, nursing, laboratory, pharmacy, cashier, claims].every((item) => item.loaded)

  return (
    <>
      <PageHeader title={menu.label} description="Current totals calculated from records saved in this local installation." />
      <section className="hms-management">
        <div className="hms-management__notice"><span><Icon name="database" size={17} /></span><div><strong>Local data overview</strong><p>Figures update from IndexedDB records on this device. Nothing is synchronised with another installation.</p></div><StatusBadge tone="neutral">On this device</StatusBadge></div>
        <div className="hms-management__grid">
          <Metric label="Patient records" value={loaded ? data.patients.length : '—'} detail="Registered patients" to="/reception/patients" icon="users" />
          <Metric label="Appointments today" value={loaded ? todayAppointments.length : '—'} detail={today} to="/reception/appointments" icon="calendar" />
          <Metric label="Open encounters" value={loaded ? openQueue.length : '—'} detail="Not yet closed" to="/reception/opd" icon="clipboardList" />
          <Metric label="Beds occupied" value={loaded ? `${occupiedBeds}/${beds.length}` : '—'} detail="Current bed records" to="/nurse/wards" icon="bed" />
          <Metric label="Pending lab orders" value={loaded ? pendingLabs.length : '—'} detail="Awaiting verification or completion" to="/lab/worklist" icon="flask" />
          <Metric label="Open prescriptions" value={loaded ? pendingPrescriptions.length : '—'} detail="Awaiting dispensing" to="/pharmacy/queue" icon="pill" />
          <Metric label="Outstanding balance" value={loaded ? `GHS ${unpaid.toFixed(2)}` : '—'} detail="Calculated from saved invoices" to="/cashier/charges" icon="wallet" />
          <Metric label="Claims ready" value={loaded ? readyClaims : '—'} detail="Locally prepared records" to="/claims/list" icon="fileText" />
        </div>
        {loaded && data.patients.length === 0 ? (
          <div className="hms-management__empty">
            <span><Icon name="users" size={22} /></span>
            <h2>No hospital records yet</h2>
            <p>This installation is empty. Add your first patient to begin a local workflow. The dashboard will calculate figures as records are created.</p>
            <Link to="/reception/desk">Register a patient <Icon name="arrowRight" size={15} /></Link>
          </div>
        ) : null}
        <div className="hms-management__links">
          <Link to="/admin/users"><Icon name="users" size={17} />Manage local staff profiles <Icon name="arrowUpRight" size={15} /></Link>
          <Link to="/admin/facilities"><Icon name="building" size={17} />Configure hospital facilities <Icon name="arrowUpRight" size={15} /></Link>
          <Link to="/admin/backup"><Icon name="download" size={17} />Export or restore local data <Icon name="arrowUpRight" size={15} /></Link>
        </div>
      </section>
    </>
  )
}
