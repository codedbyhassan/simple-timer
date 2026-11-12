import { Link } from 'react-router-dom'
import { Icon, PageHeader, StatusBadge } from '@ui'
import { balance, CashierError, CashierNotice, money, patientFor, patientName } from './CashierShared.jsx'
import './cashier styles/shared.css'
import './cashier styles/charges.css'

export default function CashierChargesPage({ data, error }) {
  const invoices = data.payments.filter((item) => balance(item) > 0).sort((a, b) => b.date.localeCompare(a.date))
  return <>
    <PageHeader title="Pending charges" description="Review patient invoices from registration, laboratory, pharmacy, and other services." actions={<Link className="hms-cashier__button hms-cashier__button--primary" to="/cashier/payments"><Icon name="receipt" size={16} />Open payment panel</Link>} />
    <div className="hms-cashier">
      <CashierError error={error} /><CashierNotice>Outstanding amounts are calculated from recorded invoices and payments. This page does not determine NHIS coverage.</CashierNotice>
      <div className="hms-cashier__table-wrap"><table className="hms-cashier__table"><thead><tr><th>Patient / invoice</th><th>Charge source</th><th>Billed</th><th>Paid</th><th>Balance</th><th>Status</th><th /></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id}><td><strong>{patientName(patientFor(data, invoice.patientId))}</strong><small>{invoice.id} · {invoice.date}</small></td><td>{invoice.source || invoice.description}</td><td>{money(invoice.billed)}</td><td>{money(invoice.paid)}</td><td><strong>{money(balance(invoice))}</strong></td><td><StatusBadge tone={invoice.paid ? 'warning' : 'critical'}>{invoice.paid ? 'Part-paid' : 'Unpaid'}</StatusBadge></td><td><Link className="hms-cashier__button hms-cashier__button--small" to="/cashier/payments" state={{ invoiceId: invoice.id }}>Collect <Icon name="arrowUpRight" size={14} /></Link></td></tr>)}</tbody></table>
        {!invoices.length ? <div className="hms-cashier__empty"><Icon name="checkCircle" size={20} />All recorded charges are settled.</div> : null}
      </div>
    </div>
  </>
}
