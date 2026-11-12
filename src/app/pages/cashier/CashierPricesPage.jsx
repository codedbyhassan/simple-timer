import { PageHeader, StatusBadge } from '@ui'
import { CashierError, CashierNotice, CashierPanel, money } from './CashierShared.jsx'
import './cashier styles/shared.css'
import './cashier styles/prices.css'

export default function CashierPricesPage({ data, error }) {
  const services = [
    ...data.cashier.prices.map((item) => ({ ...item, type: 'Service' })),
    ...data.lab.catalogue.map((item) => ({ id: item.id, name: item.name, category: item.category, amount: item.fee, source: 'Laboratory catalogue', type: 'Laboratory' })),
    ...data.pharmacy.medicines.map((item) => ({ id: item.id, name: item.name, category: item.category, amount: item.unitPrice, source: 'Pharmacy formulary', type: 'Medicine' })),
  ]
  return <>
    <PageHeader title="Price list" description="Browse service, laboratory, and medicine prices currently present in the shared workspace." />
    <div className="hms-cashier">
      <CashierError error={error} /><CashierNotice>This cashier page is read-only. Confirm approved prices with an authorised administrator.</CashierNotice>
      <CashierPanel title="Configured price references" description={`${services.length} service and item references`}>
        <div className="hms-cashier__table-wrap"><table className="hms-cashier__table"><thead><tr><th>Item</th><th>Category</th><th>Type</th><th>Unit price</th><th>Source</th><th>Status</th></tr></thead><tbody>{services.map((item) => <tr key={`${item.type}-${item.id}`}><td><strong>{item.name}</strong><small>{item.id}</small></td><td>{item.category}</td><td>{item.type}</td><td><strong>{money(item.amount)}</strong></td><td>{item.source}</td><td><StatusBadge tone="info">Reference</StatusBadge></td></tr>)}</tbody></table></div>
      </CashierPanel>
    </div>
  </>
}
