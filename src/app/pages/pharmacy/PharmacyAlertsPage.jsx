import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, PageHeader, StatusBadge } from '@ui'
import { PharmacyEmpty, PharmacyError, PharmacyNotice, PharmacyPanel, availableQuantity, day } from './PharmacyShared.jsx'
import useHospitalSettings from '@core/storage/useHospitalSettings.js'
import './pharmacy styles/shared.css'
import './pharmacy styles/alerts.css'

const EXPIRY_WINDOW_DAYS = 30

export default function PharmacyAlertsPage({ data, error, commit }) {
  const [message, setMessage] = useState('')
  const { settings } = useHospitalSettings()
  const lowStockEnabled = settings.low_stock_alerts !== false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const alerts = data.pharmacy.medicines.flatMap((medicine) => {
    const quantity = availableQuantity(data, medicine.id)
    const low = quantity <= medicine.reorderLevel
    const batches = data.pharmacy.batches.filter((batch) => batch.medicineId === medicine.id && batch.quantity > 0)
    const expiring = batches.filter((batch) => {
      const expiry = new Date(`${batch.expiresAt}T00:00:00`)
      const daysLeft = Math.ceil((expiry - today) / 86_400_000)
      return daysLeft >= 0 && daysLeft <= EXPIRY_WINDOW_DAYS
    })
    const expired = batches.filter((batch) => new Date(`${batch.expiresAt}T00:00:00`) < today)
    return [
      ...(lowStockEnabled && low ? [{ id: `${medicine.id}:stock`, kind: quantity === 0 ? 'Out of stock' : 'Low stock', medicine, quantity }] : []),
      ...expiring.map((batch) => ({ id: `${batch.id}:expiry`, kind: 'Near expiry', medicine, batch, quantity: batch.quantity })),
      ...expired.map((batch) => ({ id: `${batch.id}:expired`, kind: 'Expired stock', medicine, batch, quantity: batch.quantity })),
    ]
  })
  const active = alerts.filter((alert) => !data.pharmacy.reviewedAlerts.includes(alert.id))
  const acknowledgedCount = alerts.length - active.length

  const markReviewed = async (alert) => {
    const pharmacy = { ...data.pharmacy, reviewedAlerts: [...new Set([...data.pharmacy.reviewedAlerts, alert.id])] }
    if (await commit({ ...data, pharmacy })) setMessage(`${alert.medicine.name} alert marked reviewed.`)
  }

  return <>
    <PageHeader title="Stock alerts" description="Prioritise out-of-stock medicines, items below their reorder level, and batches nearing expiry." actions={<Link className="hms-pharmacy__button" to="/pharmacy/inventory"><Icon name="database" size={16} />Open inventory</Link>} />
    <div className="hms-pharmacy">
      <PharmacyError error={error} />
      {message ? <PharmacyNotice tone="success">{message}</PharmacyNotice> : null}
      <div className="hms-pharmacy__alert-counts"><div><span>Needs review</span><strong>{active.length}</strong></div><div><span>Out of stock</span><strong>{active.filter((alert) => alert.kind === 'Out of stock').length}</strong></div><div><span>Low stock</span><strong>{active.filter((alert) => alert.kind === 'Low stock').length}</strong></div><div><span>Expired / near expiry</span><strong>{active.filter((alert) => ['Expired stock', 'Near expiry'].includes(alert.kind)).length}</strong></div></div>
      <PharmacyPanel title="Active alerts" description={`Expiry window: ${EXPIRY_WINDOW_DAYS} days. Low-stock alerts are ${lowStockEnabled ? 'enabled' : 'disabled'} in Operating settings.`}>
        {active.length ? <div className="hms-pharmacy__alert-list">{active.map((alert) => <article className={`hms-pharmacy__alert-card${['Out of stock', 'Expired stock'].includes(alert.kind) ? ' is-critical' : alert.kind === 'Near expiry' ? ' is-warning' : ''}`} key={alert.id}><span className="hms-pharmacy__alert-icon"><Icon name={alert.kind === 'Near expiry' ? 'clock' : 'alertTriangle'} size={18} /></span><div className="hms-pharmacy__alert-copy"><div><strong>{alert.medicine.name}</strong><StatusBadge tone={['Out of stock', 'Expired stock'].includes(alert.kind) ? 'critical' : 'warning'}>{alert.kind}</StatusBadge></div><p>{alert.kind === 'Expired stock' ? `Batch ${alert.batch.lot} has ${alert.batch.quantity} ${alert.medicine.unit}s past expiry (${day(alert.batch.expiresAt)}). It is excluded from dispensing.` : alert.kind === 'Near expiry' ? `Batch ${alert.batch.lot} has ${alert.batch.quantity} ${alert.medicine.unit}s remaining and expires ${day(alert.batch.expiresAt)}.` : alert.kind === 'Out of stock' ? 'No unexpired stock is available. Review replenishment before processing prescriptions.' : `${alert.quantity} unexpired ${alert.medicine.unit}s available; reorder level is ${alert.medicine.reorderLevel}.`}</p><small>{alert.medicine.category} · {alert.medicine.id}</small></div><div className="hms-pharmacy__alert-actions"><Link className="hms-pharmacy__button hms-pharmacy__button--quiet" to="/pharmacy/levels">View stock</Link><button type="button" className="hms-pharmacy__button" onClick={() => markReviewed(alert)}>Mark reviewed</button></div></article>)}</div> : <PharmacyEmpty title="No stock alerts need review">All tracked items are above reorder level and have no batches expiring in the next {EXPIRY_WINDOW_DAYS} days.</PharmacyEmpty>}
      </PharmacyPanel>
      {acknowledgedCount > 0 ? <PharmacyNotice tone="info">{acknowledgedCount} current alert{acknowledgedCount === 1 ? '' : 's'} marked reviewed. Review does not change stock levels or expiry dates.</PharmacyNotice> : null}
    </div>
  </>
}
