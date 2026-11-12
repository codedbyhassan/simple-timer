import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, PageHeader, StatusBadge } from '@ui'
import { PharmacyEmpty, PharmacyError, PharmacyPanel, availableQuantity, day, onHand } from './PharmacyShared.jsx'
import './pharmacy styles/shared.css'
import './pharmacy styles/levels.css'

const STOCK_FILTERS = ['All stock', 'Available', 'Low', 'Out of stock']

export default function PharmacyStockLevelsPage({ data, error }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All stock')
  const stock = useMemo(() => data.pharmacy.medicines.map((medicine) => {
    const quantity = availableQuantity(data, medicine.id)
    const batches = data.pharmacy.batches.filter((batch) => batch.medicineId === medicine.id && batch.quantity > 0)
      .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
    return { medicine, quantity, batches, nextExpiry: batches[0]?.expiresAt || '' }
  }).filter(({ medicine, quantity }) => {
    const matchesText = `${medicine.name} ${medicine.category} ${medicine.id} ${medicine.nhiaCode}`.toLowerCase().includes(query.toLowerCase().trim())
    const matchesFilter = filter === 'All stock' || (filter === 'Out of stock' ? quantity === 0 : filter === 'Low' ? quantity > 0 && quantity <= medicine.reorderLevel : quantity > medicine.reorderLevel)
    return matchesText && matchesFilter
  }), [data, filter, query])
  const counts = {
    all: data.pharmacy.medicines.length,
    available: data.pharmacy.medicines.filter((medicine) => availableQuantity(data, medicine.id) > medicine.reorderLevel).length,
    low: data.pharmacy.medicines.filter((medicine) => availableQuantity(data, medicine.id) > 0 && availableQuantity(data, medicine.id) <= medicine.reorderLevel).length,
    empty: data.pharmacy.medicines.filter((medicine) => availableQuantity(data, medicine.id) === 0).length,
  }

  return <>
    <PageHeader title="Stock levels" description="Browse on-hand quantities by medicine and batch, with expiry and reorder context." actions={<Link className="hms-pharmacy__button" to="/pharmacy/inventory"><Icon name="database" size={16} />Manage inventory</Link>} />
    <div className="hms-pharmacy">
      <PharmacyError error={error} />
      <div className="hms-pharmacy__stock-summary"><div><span>Tracked medicines</span><strong>{counts.all}</strong></div><div><span>Available</span><strong>{counts.available}</strong></div><div><span>Low stock</span><strong>{counts.low}</strong></div><div><span>Out of stock</span><strong>{counts.empty}</strong></div></div>
      <div className="hms-pharmacy__levels-toolbar"><label className="hms-pharmacy__search"><Icon name="search" size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search medicine, category or code" /></label><div className="hms-pharmacy__filters" aria-label="Filter stock">{STOCK_FILTERS.map((value) => <button type="button" className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)} key={value}>{value}</button>)}</div></div>
      <PharmacyPanel title="Medicine stock" description={`${stock.length} result${stock.length === 1 ? '' : 's'} · on-hand quantities aggregate all usable batches.`} className="hms-pharmacy__table-panel">
        {stock.length ? <div className="hms-pharmacy__table-wrap"><table className="hms-pharmacy__table"><thead><tr><th>Medicine</th><th>Usable stock</th><th>Physical on hand</th><th>Reorder at</th><th>Stock status</th><th>Available batches</th><th>Next expiry</th><th>NHIA code</th></tr></thead><tbody>{stock.map(({ medicine, quantity, batches, nextExpiry }) => <tr key={medicine.id}><td><strong>{medicine.name}</strong><small>{medicine.category} · {medicine.form}</small></td><td><strong>{quantity}</strong><small>{medicine.unit}s in unexpired batches</small></td><td>{onHand(data, medicine.id)}<small>includes expired batches</small></td><td>{medicine.reorderLevel}</td><td><StatusBadge tone={quantity === 0 ? 'critical' : quantity <= medicine.reorderLevel ? 'warning' : 'success'}>{quantity === 0 ? 'Out of stock' : quantity <= medicine.reorderLevel ? 'Low' : 'Available'}</StatusBadge></td><td>{batches.length}<small>{batches.slice(0, 2).map((batch) => batch.lot).join(', ') || 'No usable batches'}</small></td><td>{nextExpiry ? day(nextExpiry) : '—'}</td><td>{medicine.nhiaCode || <StatusBadge tone="warning">Unmapped</StatusBadge>}</td></tr>)}</tbody></table></div> : <PharmacyEmpty title="No stock matches">Try another search or stock filter.</PharmacyEmpty>}
      </PharmacyPanel>
    </div>
  </>
}
