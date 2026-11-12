import { Link } from 'react-router-dom'
import { Icon, MetricCard, PageHeader, StatusBadge } from '@ui'
import { balance, CashierError, CashierNotice, CashierPanel, money, patientFor, patientName } from './CashierShared.jsx'
import './cashier styles/shared.css'
import './cashier styles/overview.css'

export default function CashierOverviewPage({ data, error }) {
  const pending = data.payments.filter((invoice) => balance(invoice) > 0)
  const today = new Date().toISOString().slice(0, 10)
  const transactions = data.cashier.transactions.filter((item) => item.recordedAt?.slice(0, 10) === today)
  const collected = transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const methods = ['Cash', 'Mobile money', 'Card', 'Insurance co-payment']
  const max = Math.max(1, ...methods.map((method) => transactions.filter((item) => item.method === method).reduce((sum, item) => sum + item.amount, 0)))

  return <>
    <PageHeader title="Cashier overview" description="Daily billing queue, collections, till activity, and claims reconciliation." actions={<Link className="hms-cashier__button hms-cashier__button--primary" to="/cashier/charges"><Icon name="creditCard" size={16} />Review charges</Link>} />
    <div className="hms-cashier">
      <CashierError error={error} />
      <CashierNotice>Payments and receipts are stored in this browser only. Confirm actual balances and accepted payment methods in the hospital finance system.</CashierNotice>
      <div className="hms-cashier__metrics">
        <MetricCard label="Open balances" value={pending.length} icon="creditCard" caption={`${money(pending.reduce((sum, item) => sum + balance(item), 0))} outstanding`} />
        <MetricCard label="Collected today" value={money(collected)} icon="wallet" caption={`${transactions.length} recorded transaction${transactions.length === 1 ? '' : 's'}`} />
        <MetricCard label="Awaiting payment" value={pending.filter((item) => !item.paid).length} icon="clock" caption="Unpaid patient invoices" />
        <MetricCard label="Refund requests" value={data.cashier.refunds.filter((item) => item.status === 'Pending approval').length} icon="undo" caption="Awaiting authorised review" />
      </div>
      <div className="hms-cashier__overview-grid">
        <CashierPanel title="Pending charges" description="Balances that may need cashier review." actions={<Link className="hms-cashier__link" to="/cashier/charges">All charges <Icon name="arrowUpRight" size={14} /></Link>}>
          <div className="hms-cashier__charge-list">{pending.slice(0, 5).map((invoice) => {
            const patient = patientFor(data, invoice.patientId)
            return <Link key={invoice.id} to="/cashier/payments" state={{ invoiceId: invoice.id }} className="hms-cashier__charge-row"><span><strong>{patientName(patient)}</strong><small>{invoice.id} · {invoice.description}</small></span><span className="hms-cashier__charge-amount"><strong>{money(balance(invoice))}</strong><StatusBadge tone={invoice.paid ? 'warning' : 'critical'}>{invoice.paid ? 'Part-paid' : 'Unpaid'}</StatusBadge></span></Link>
          })}{!pending.length ? <p className="hms-cashier__empty">No outstanding charges.</p> : null}</div>
        </CashierPanel>
        <CashierPanel title="Collections by method" description="Today’s recorded transactions.">
          <div className="hms-cashier__bar-list">{methods.map((method) => {
            const amount = transactions.filter((item) => item.method === method).reduce((sum, item) => sum + Number(item.amount || 0), 0)
            return <div key={method}><span><small>{method}</small><strong>{money(amount)}</strong></span><div className="hms-cashier__bar-track"><i style={{ width: `${Math.round(amount / max * 100)}%` }} /></div></div>
          })}</div>
        </CashierPanel>
        <CashierPanel title="Quick access" description="Continue a cashier workflow.">
          <div className="hms-cashier__quick-links"><Link to="/cashier/payments"><Icon name="receipt" size={16} />Payment panel and receipts<Icon name="arrowUpRight" size={14} /></Link><Link to="/cashier/till"><Icon name="clock" size={16} />My till and shift<Icon name="arrowUpRight" size={14} /></Link><Link to="/cashier/reconciliation"><Icon name="scale" size={16} />Shift reconciliation<Icon name="arrowUpRight" size={14} /></Link></div>
        </CashierPanel>
        <CashierPanel title="Billing and claims" description="Compare billed amounts with claims records prepared by the Claims workspace." actions={<Link className="hms-cashier__link" to="/cashier/billed-vs-claimed">View comparison <Icon name="arrowUpRight" size={14} /></Link>}>
          <p className="hms-cashier__muted">{data.claims?.records?.length ? `${data.claims.records.length} claim snapshots available for comparison.` : 'No claim snapshots are available yet. Claims staff can build them in the Claims workspace.'}</p>
        </CashierPanel>
      </div>
    </div>
  </>
}
