import { Link } from 'react-router-dom'
import { Icon, PageHeader, StatusBadge } from '@ui'
import useReceptionWorkspace from '../reception/useReceptionWorkspace.js'
import useNurseWorkspace from '../nurse/useNurseWorkspace.js'
import useLabWorkspace from '../lab/useLabWorkspace.js'
import usePharmacyWorkspace from '../pharmacy/usePharmacyWorkspace.js'
import useCashierWorkspace from '../cashier/useCashierWorkspace.js'
import useClaimsWorkspace from '../claims/useClaimsWorkspace.js'
import useHospitalSettings from '@core/storage/useHospitalSettings.js'
import useMinuteClock from '@core/storage/useMinuteClock.js'
import './admin styles/managementdashboard.css'

const Metric = ({ label, value, detail, icon }) => (
  <div className="hms-management__metric">
    <span className="hms-management__metric-icon"><Icon name={icon} size={18} /></span>
    <span className="hms-management__metric-label">{label}</span>
    <strong>{value}</strong>
    <small>{detail}</small>
  </div>
)

export default function ManagementDashboardPage({ menu }) {
  const reception = useReceptionWorkspace()
  const nursing = useNurseWorkspace()
  const laboratory = useLabWorkspace()
  const pharmacy = usePharmacyWorkspace()
  const cashier = useCashierWorkspace()
  const claims = useClaimsWorkspace()
  const { settings, loaded: settingsLoaded } = useHospitalSettings()
  const now = useMinuteClock()
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
  const waitLimit = Math.max(1, Number(settings.patient_wait_warning) || 25)
  const bedLimit = Math.min(100, Math.max(1, Number(settings.bed_occupancy_warning) || 85))
  const labLimit = Math.max(1, Number(settings.lab_turnaround_target) || 150)
  const waitingAlerts = openQueue.filter((item) => item.arrivedAt && Number.isFinite(Date.parse(item.arrivedAt)) && now - Date.parse(item.arrivedAt) >= waitLimit * 60000)
  const labAlerts = pendingLabs.filter((item) => item.orderedAt && Number.isFinite(Date.parse(item.orderedAt)) && now - Date.parse(item.orderedAt) >= labLimit * 60000)
  const occupancy = beds.length ? occupiedBeds / beds.length * 100 : 0
  const occupancyAlert = beds.length > 0 && occupancy >= bedLimit
  const loaded = [reception, nursing, laboratory, pharmacy, cashier, claims].every((item) => item.loaded) && settingsLoaded

  return (
    <>
      <PageHeader title={menu.label} description="Current totals calculated from records across the hospital." />
      <section className="hms-management">
        <div className="hms-management__notice"><span><Icon name="database" size={17} /></span><div><strong>Local data overview</strong><p>Figures update from IndexedDB records on this device. Nothing is synchronised with another installation.</p></div><StatusBadge tone="neutral">On this device</StatusBadge></div>
        <div className="hms-management__grid">
          <Metric label="Patient records" value={loaded ? data.patients.length : '—'} detail="Registered patients" icon="users" />
          <Metric label="Appointments today" value={loaded ? todayAppointments.length : '—'} detail={today} icon="calendar" />
          <Metric label="Open encounters" value={loaded ? openQueue.length : '—'} detail="Not yet closed" icon="clipboardList" />
          <Metric label="Beds occupied" value={loaded ? `${occupiedBeds}/${beds.length}` : '—'} detail="Current bed records" icon="bed" />
          <Metric label="Pending lab orders" value={loaded ? pendingLabs.length : '—'} detail="Awaiting verification or completion" icon="flask" />
          <Metric label="Open prescriptions" value={loaded ? pendingPrescriptions.length : '—'} detail="Awaiting dispensing" icon="pill" />
          <Metric label="Outstanding balance" value={loaded ? `GHS ${unpaid.toFixed(2)}` : '—'} detail="Calculated from saved invoices" icon="wallet" />
          <Metric label="Claims ready" value={loaded ? readyClaims : '—'} detail="Locally prepared records" icon="fileText" />
        </div>
        {loaded && (waitingAlerts.length > 0 || labAlerts.length > 0 || occupancyAlert) ? <section className="hms-management__attention" aria-label="Operational attention"><div><strong>Operational attention</strong><span>Based on the local thresholds in Operating settings.</span></div>{waitingAlerts.length ? <StatusBadge tone="warning">{waitingAlerts.length} waiting over {waitLimit} min</StatusBadge> : null}{labAlerts.length ? <StatusBadge tone="warning">{labAlerts.length} lab orders over {labLimit} min</StatusBadge> : null}{occupancyAlert ? <StatusBadge tone="critical">Bed occupancy {Math.round(occupancy)}%</StatusBadge> : null}</section> : null}
        {loaded && data.patients.length === 0 ? (
          <div className="hms-management__empty">
            <span><Icon name="users" size={22} /></span>
            <h2>No hospital records yet</h2>
            <p>This installation is empty. Sign out and select a Reception role profile to register the first patient. The dashboard will calculate figures as records are created.</p>
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
