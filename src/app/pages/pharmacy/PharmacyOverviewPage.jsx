import { Link } from 'react-router-dom'
import { Icon, MetricCard, PageHeader, StatusBadge } from '@ui'
import { PharmacyEmpty, PharmacyError, PharmacyMenuLink, PharmacyNotice, PharmacyPanel, PharmacyPatient, ageLabel, availableQuantity, patientFor, statusTone, when } from './PharmacyShared.jsx'
import './pharmacy styles/shared.css'
import './pharmacy styles/overview.css'

export default function PharmacyOverviewPage({ data, error }) {
  const { pharmacy } = data
  const waiting = pharmacy.prescriptions.filter((rx) => rx.status !== 'Dispensed')
  const alerts = pharmacy.medicines.filter((medicine) => availableQuantity(data, medicine.id) <= medicine.reorderLevel).length
  const mappings = pharmacy.medicines.filter((medicine) => !medicine.nhiaCode).length
  const dispensedToday = pharmacy.activity.filter((item) => item.type === 'Dispense' && new Date(item.at).toDateString() === new Date().toDateString()).length
  const queueByStatus = ['New', 'In progress', 'Partial'].map((status) => ({ status, count: waiting.filter((rx) => rx.status === status).length }))
  const recent = [...pharmacy.activity].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5)

  return <>
    <PageHeader title="Pharmacy overview" description="Prescription workload, stock health, and formulary follow-up for this pharmacy workspace." actions={<Link className="hms-pharmacy__button hms-pharmacy__button--primary" to="/pharmacy/queue"><Icon name="listOrdered" size={16} />Open prescription queue</Link>} />
    <div className="hms-pharmacy">
      <PharmacyError error={error} />
      <PharmacyNotice tone="info">Confirm all clinical details, stock, and patient identifiers in the patient chart before acting.</PharmacyNotice>
      <div className="hms-pharmacy__metrics">
        <MetricCard label="Prescriptions to process" value={waiting.length} icon="pill" caption={`${queueByStatus.find((item) => item.status === 'New')?.count || 0} new · ${queueByStatus.find((item) => item.status === 'Partial')?.count || 0} partial`} />
        <MetricCard label="Dispensed today" value={dispensedToday} icon="checkCircle" caption="Recorded dispensing activity" />
        <MetricCard label="Stock alerts" value={alerts} icon="alertTriangle" caption="At or below reorder level" />
        <MetricCard label="Mapping flags" value={mappings} icon="link" caption="Missing NHIA medicine code" />
      </div>
      <div className="hms-pharmacy__overview-grid">
        <PharmacyPanel title="Prescription queue" description="Work by urgency and status." actions={<PharmacyMenuLink to="/pharmacy/queue">View queue</PharmacyMenuLink>}>
          <div className="hms-pharmacy__queue-summary">{queueByStatus.map((item) => <div key={item.status}><span>{item.status}</span><strong>{item.count}</strong></div>)}</div>
          <div className="hms-pharmacy__list">
            {waiting.slice(0, 4).map((rx) => <Link className="hms-pharmacy__overview-rx" to="/pharmacy/dispensing" state={{ prescriptionId: rx.id }} key={rx.id}><div><strong>{rx.id}</strong><PharmacyPatient patient={patientFor(data, rx.patientId)} secondary={rx.encounterId || 'No encounter linked'} /></div><div className="hms-pharmacy__rx-meta"><StatusBadge tone={statusTone(rx.priority)}>{rx.priority}</StatusBadge><small>{ageLabel(rx.prescribedAt)} ago</small></div></Link>)}
            {!waiting.length ? <PharmacyEmpty title="Queue is clear">New prescriptions will appear here.</PharmacyEmpty> : null}
          </div>
        </PharmacyPanel>
        <PharmacyPanel title="Stock health" description="Prioritise low, unavailable, and near-expiry stock." actions={<PharmacyMenuLink to="/pharmacy/alerts">Review alerts</PharmacyMenuLink>}>
          <div className="hms-pharmacy__stock-glance">{pharmacy.medicines.map((medicine) => {
          const quantity = availableQuantity(data, medicine.id)
            const ratio = Math.min(100, Math.round(quantity / Math.max(1, medicine.reorderLevel * 2) * 100))
            return <div className="hms-pharmacy__stock-glance-row" key={medicine.id}><div><span><strong>{medicine.name}</strong><small>{quantity} {medicine.unit}s · reorder at {medicine.reorderLevel}</small></span><StatusBadge tone={quantity === 0 ? 'critical' : quantity <= medicine.reorderLevel ? 'warning' : 'success'}>{quantity === 0 ? 'Out of stock' : quantity <= medicine.reorderLevel ? 'Low' : 'Available'}</StatusBadge></div><div className="hms-pharmacy__stock-bar"><i style={{ width: `${ratio}%` }} /></div></div>
          })}</div>
        </PharmacyPanel>
        <PharmacyPanel title="Recent activity" description="Latest pharmacy events." actions={<PharmacyMenuLink to="/pharmacy/inventory">Open inventory</PharmacyMenuLink>}>
          {recent.length ? <div className="hms-pharmacy__activity">{recent.map((item) => <div key={item.id}><span className="hms-pharmacy__activity-icon"><Icon name={item.type === 'Dispense' ? 'pill' : item.type === 'Mapping' ? 'link' : 'packageBox'} size={15} /></span><span><strong>{item.message}</strong><small>{when(item.at)}</small></span></div>)}</div> : <PharmacyEmpty title="No activity yet">Workspace activity will appear here.</PharmacyEmpty>}
        </PharmacyPanel>
        <PharmacyPanel title="Quick access" description="Open the modules used most by the pharmacy team.">
          <div className="hms-pharmacy__quick-links"><PharmacyMenuLink to="/pharmacy/dispensing"><Icon name="pill" size={16} />Dispensing panel</PharmacyMenuLink><PharmacyMenuLink to="/pharmacy/levels"><Icon name="packageBox" size={16} />Stock levels</PharmacyMenuLink><PharmacyMenuLink to="/pharmacy/formulary"><Icon name="link" size={16} />Formulary mappings</PharmacyMenuLink></div>
        </PharmacyPanel>
      </div>
    </div>
  </>
}
