import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Dialog, Icon, PageHeader, StatusBadge } from '@ui'
import { balance, CashierError, CashierField, CashierNotice, CashierPanel, dateLabel, money, patientFor, patientName, uid } from './CashierShared.jsx'
import './cashier styles/shared.css'
import './cashier styles/payments.css'

const METHODS = ['Cash', 'Mobile money', 'Card', 'Insurance co-payment']

export default function CashierPaymentsPage({ data, error, commit, can }) {
  const location = useLocation()
  const [showPayment, setShowPayment] = useState(Boolean(location.state?.invoiceId))
  const available = useMemo(() => data.payments.filter((item) => balance(item) > 0), [data.payments])
  const [invoiceId, setInvoiceId] = useState(location.state?.invoiceId || available[0]?.id || '')
  const [amount, setAmount] = useState(String(balance(available.find((item) => item.id === invoiceId))))
  const [method, setMethod] = useState('Cash')
  const [reference, setReference] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const invoice = data.payments.find((item) => item.id === invoiceId)

  const recordPayment = (event) => {
    event.preventDefault()
    setMessage('')
    setActionError('')
    const paidAmount = Number(amount)
    if (!can('finance.collect')) { setActionError('Your role cannot record payments.'); return }
    if (!invoice || balance(invoice) <= 0) { setActionError('Select an invoice with an outstanding balance.'); return }
    if (!Number.isFinite(paidAmount) || paidAmount <= 0 || paidAmount > balance(invoice)) { setActionError('Enter an amount greater than zero and no more than the displayed balance.'); return }
    if (!METHODS.includes(method)) { setActionError('Select a supported payment method.'); return }
    if (method !== 'Cash' && !reference.trim()) { setActionError('Add the transaction reference for non-cash payments.'); return }
    const now = new Date().toISOString()
    const nextPaid = Number((Number(invoice.paid || 0) + paidAmount).toFixed(2))
    const nextInvoice = { ...invoice, paid: nextPaid, method, status: nextPaid >= Number(invoice.billed) ? 'Settled' : 'Part-paid' }
    const transaction = { id: uid('RCT'), invoiceId: invoice.id, patientId: invoice.patientId, amount: paidAmount, method, reference: reference.trim() || uid('CASH'), recordedAt: now, cashier: 'Cashier' }
    const cashier = { ...data.cashier, transactions: [transaction, ...data.cashier.transactions], activity: [{ id: uid('CACT'), message: `Payment recorded for ${invoice.id} · ${money(paidAmount)}`, at: now }, ...data.cashier.activity] }
    if (commit({ ...data, payments: data.payments.map((item) => item.id === invoice.id ? nextInvoice : item), cashier })) {
      setReceipt({ ...transaction, invoice: nextInvoice, patient: patientFor(data, invoice.patientId) })
      setMessage('Payment saved locally. Confirm settlement through the hospital finance system before issuing an official receipt.')
      setReference('')
      setShowPayment(false)
    }
  }

  return <>
    <PageHeader title="Payment panel and receipts" description="Record full or partial payments against an outstanding patient invoice." />
    <div className="hms-cashier">
      <CashierError error={error} />{message ? <CashierNotice tone="success">{message}</CashierNotice> : null}{actionError ? <CashierNotice tone="error">{actionError}</CashierNotice> : null}
      <CashierNotice>Payments recorded here are stored locally. Confirm settlement through the hospital finance system before issuing an official receipt.</CashierNotice>
      <div className="hms-cashier__payment-grid">
        <CashierPanel title="Record a payment" description="Apply a full or partial payment to an outstanding invoice." actions={available.length ? <button className="hms-cashier__button hms-cashier__button--primary" type="button" onClick={() => setShowPayment(true)}><Icon name="plus" size={16} />Record payment</button> : null}>
          {!available.length ? <div className="hms-cashier__empty"><Icon name="checkCircle" size={20} />No pending invoices are available for payment.</div> : null}
          <Dialog open={showPayment} title="Record a payment" description="Apply a full or partial payment to an outstanding invoice." onClose={() => setShowPayment(false)}>
          {available.length ? <form className="hms-cashier__form" onSubmit={recordPayment}>
            <CashierField label="Patient invoice" value={invoiceId} onChange={(value) => { setInvoiceId(value); setAmount(String(balance(data.payments.find((item) => item.id === value)))) }} options={available.map((item) => ({ value: item.id, label: `${patientName(patientFor(data, item.patientId))} · ${item.id}` }))} />
            {invoice ? <div className="hms-cashier__balance-card"><span>Outstanding balance</span><strong>{money(balance(invoice))}</strong><small>{invoice.description} · billed {money(invoice.billed)} · paid {money(invoice.paid)}</small></div> : null}
            <CashierField label="Amount (GHS)" value={amount} onChange={setAmount} type="number" min="0.01" max={invoice ? balance(invoice) : undefined} step="0.01" required />
            <CashierField label="Payment method" value={method} onChange={setMethod} options={METHODS} />
            {method !== 'Cash' ? <CashierField label="Transaction reference" value={reference} onChange={setReference} placeholder="Provider or terminal reference" required /> : null}
            <button className="hms-cashier__button hms-cashier__button--primary" type="submit" disabled={!can('finance.collect')}><Icon name="checkCircle" size={16} />Record payment</button>
          </form> : null}
          </Dialog>
        </CashierPanel>
        {receipt ? <CashierPanel title="Payment receipt" description="Locally recorded receipt · retain the reference for reconciliation." className="hms-cashier__receipt-panel" actions={<button className="hms-cashier__button hms-cashier__button--small" type="button" onClick={() => window.print()}><Icon name="printer" size={14} />Print</button>}>
          <div className="hms-cashier__receipt" id="cashier-receipt"><strong>ASCEND HOSPITAL</strong><small>PAYMENT RECEIPT</small><hr /><span>Receipt reference<strong>{receipt.id}</strong></span><span>Patient<strong>{patientName(receipt.patient)}</strong></span><span>Invoice<strong>{receipt.invoice.id}</strong></span><span>Payment time<strong>{dateLabel(receipt.recordedAt)}</strong></span><span>Method<strong>{receipt.method}</strong></span><span>Amount paid<strong>{money(receipt.amount)}</strong></span><span>Remaining balance<strong>{money(balance(receipt.invoice))}</strong></span><hr /><em>Not a tax invoice or server-confirmed receipt.</em></div>
        </CashierPanel> : null}
      </div>
      <CashierPanel title="Recent receipts" description="Latest locally recorded cashier transactions.">
        <div className="hms-cashier__table-wrap"><table className="hms-cashier__table"><thead><tr><th>Reference</th><th>Patient / invoice</th><th>Method</th><th>Amount</th><th>Recorded</th><th>Status</th></tr></thead><tbody>{data.cashier.transactions.slice(0, 8).map((item) => <tr key={item.id}><td><strong>{item.id}</strong></td><td>{patientName(patientFor(data, item.patientId))}<small>{item.invoiceId}</small></td><td>{item.method}</td><td>{money(item.amount)}</td><td>{dateLabel(item.recordedAt)}</td><td><StatusBadge tone="success">Recorded</StatusBadge></td></tr>)}</tbody></table></div>
      </CashierPanel>
    </div>
  </>
}
