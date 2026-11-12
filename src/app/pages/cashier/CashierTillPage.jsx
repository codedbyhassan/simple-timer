import { Link } from 'react-router-dom'
import { Icon, MetricCard, PageHeader, StatusBadge } from '@ui'
import { CashierError, CashierNotice, CashierPanel, dateLabel, money } from './CashierShared.jsx'
import './cashier styles/shared.css'
import './cashier styles/till.css'

export default function CashierTillPage({ data, error }) {
  const today = new Date().toISOString().slice(0, 10)
  const shift = data.cashier.shift
  const transactions = data.cashier.transactions.filter((item) => item.recordedAt?.slice(0, 10) === today)
  const methods = ['Cash', 'Mobile money', 'Card', 'Insurance co-payment']
  const total = transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const cash = transactions.filter((item) => item.method === 'Cash').reduce((sum, item) => sum + Number(item.amount || 0), 0)
  return <>
    <PageHeader title="My till and shift" description="Review your current shift, payment activity, and collections by method." actions={<Link className="hms-cashier__button" to="/cashier/reconciliation"><Icon name="scale" size={16} />Reconcile shift</Link>} />
    <div className="hms-cashier">
      <CashierError error={error} /><CashierNotice>Opening float and transaction totals are stored in this browser; reconcile them against the actual cash drawer.</CashierNotice>
      <div className="hms-cashier__metrics"><MetricCard label="Shift status" value={shift.status} icon="clock" caption={`Started ${dateLabel(shift.openedAt)}`} /><MetricCard label="Opening float" value={money(shift.openingFloat)} icon="wallet" caption="Shift opening amount" /><MetricCard label="Collected today" value={money(total)} icon="receipt" caption={`${transactions.length} transactions`} /><MetricCard label="Cash collected" value={money(cash)} icon="wallet" caption="Before reconciliation" /></div>
      <div className="hms-cashier__till-grid">
        <CashierPanel title="Collections by method" description="Transactions recorded during today’s shift.">
          <div className="hms-cashier__method-grid">{methods.map((method) => {
            const value = transactions.filter((item) => item.method === method).reduce((sum, item) => sum + Number(item.amount || 0), 0)
            return <article key={method}><small>{method}</small><strong>{money(value)}</strong><span>{transactions.filter((item) => item.method === method).length} transaction(s)</span></article>
          })}</div>
        </CashierPanel>
        <CashierPanel title="Shift actions" description="Complete the count and record any difference.">
          <div className="hms-cashier__quick-links"><Link to="/cashier/reconciliation"><Icon name="scale" size={16} />Open shift reconciliation<Icon name="arrowUpRight" size={14} /></Link><Link to="/cashier/refunds"><Icon name="undo" size={16} />Review refund requests<Icon name="arrowUpRight" size={14} /></Link></div>
          <p className="hms-cashier__muted">Current shift: <strong>{shift.id.replace(/^SHIFT-DEMO-/, 'SHIFT-')}</strong> · <StatusBadge tone={shift.status === 'Open' ? 'info' : 'success'}>{shift.status}</StatusBadge></p>
        </CashierPanel>
      </div>
      <CashierPanel title="Shift transactions" description="Most recent payment records for the current day.">
        <div className="hms-cashier__table-wrap"><table className="hms-cashier__table"><thead><tr><th>Reference</th><th>Invoice</th><th>Method</th><th>Amount</th><th>Time</th></tr></thead><tbody>{transactions.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.invoiceId}</td><td>{item.method}</td><td><strong>{money(item.amount)}</strong></td><td>{dateLabel(item.recordedAt)}</td></tr>)}</tbody></table>{!transactions.length ? <div className="hms-cashier__empty">No transactions recorded today.</div> : null}</div>
      </CashierPanel>
    </div>
  </>
}
