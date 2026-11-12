import { useState } from 'react'
import { Dialog, Icon, PageHeader, StatusBadge } from '@ui'
import { CashierError, CashierField, CashierNotice, CashierPanel, dateLabel, money, patientFor, patientName, uid } from './CashierShared.jsx'
import './cashier styles/shared.css'
import './cashier styles/refunds.css'

export default function CashierRefundsPage({ data, error, commit, can }) {
  const [showForm, setShowForm] = useState(false)
  const paidInvoices = data.payments.filter((item) => Number(item.paid) > 0)
  const [invoiceId, setInvoiceId] = useState(paidInvoices[0]?.id || '')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const submit = (event) => {
    event.preventDefault()
    setMessage('')
    setActionError('')
    const invoice = data.payments.find((item) => item.id === invoiceId)
    const value = Number(amount)
    if (!can('finance.refund')) { setActionError('Your role does not have permission to request refunds.'); return }
    if (!invoice || !Number.isFinite(value) || value <= 0 || value > Number(invoice.paid)) { setActionError('Enter a refund amount greater than zero and no more than the amount already paid.'); return }
    if (!reason.trim()) { setActionError('A reason is required for every refund request.'); return }
    const now = new Date().toISOString()
    const request = { id: uid('REF'), invoiceId, patientId: invoice.patientId, amount: value, reason: reason.trim(), status: 'Pending approval', requestedAt: now, requestedBy: 'Cashier' }
    const cashier = { ...data.cashier, refunds: [request, ...data.cashier.refunds], activity: [{ id: uid('CACT'), message: `Refund request created for ${invoiceId}`, at: now }, ...data.cashier.activity] }
    if (commit({ ...data, cashier })) {
      setMessage(`${request.id} was recorded as a pending request. It has not been paid or approved.`)
      setAmount('')
      setReason('')
      setShowForm(false)
    }
  }
  return <>
    <PageHeader title="Refund requests" description="Create traceable refund requests. An authorised approver must review requests separately." actions={<button className="hms-cashier__button hms-cashier__button--primary" type="button" onClick={() => { setShowForm(true); setActionError('') }} disabled={!can('finance.refund')}><Icon name="plus" size={16} />New refund request</button>} />
    <div className="hms-cashier">
      <CashierError error={error} />{message ? <CashierNotice tone="success">{message}</CashierNotice> : null}{actionError ? <CashierNotice tone="error">{actionError}</CashierNotice> : null}
      <CashierNotice>Refund requests remain pending until an authorised approver records a decision. A request does not issue a payout.</CashierNotice>
      <div className="hms-cashier__refund-grid">
        <CashierPanel title="New refund request" description="Select the original invoice and enter a reason.">
          <button type="button" className="hms-cashier__button hms-cashier__button--primary" onClick={() => setShowForm(true)} disabled={!can('finance.refund')}><Icon name="plus" size={16} />New request</button>
          <Dialog open={showForm} title="New refund request" description="Select the original invoice and provide the reason for the request." onClose={() => setShowForm(false)}>
          <form className="hms-cashier__form" onSubmit={submit}>
            <CashierField label="Paid invoice" value={invoiceId} onChange={setInvoiceId} options={paidInvoices.map((item) => ({ value: item.id, label: `${patientName(patientFor(data, item.patientId))} · ${item.id}` }))} />
            <CashierField label="Refund amount (GHS)" value={amount} onChange={setAmount} type="number" min="0.01" max={data.payments.find((item) => item.id === invoiceId)?.paid || undefined} step="0.01" required />
            <label className="hms-cashier__field"><span>Reason</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows="3" required /></label>
            <button className="hms-cashier__button hms-cashier__button--primary" type="submit" disabled={!can('finance.refund')}><Icon name="undo" size={16} />Submit request</button>
            {!can('finance.refund') ? <small className="hms-cashier__muted">Refund-request permission is not assigned to this role.</small> : null}
          </form>
          </Dialog>
        </CashierPanel>
        <CashierPanel title="Request controls" description="A clear audit trail protects both staff and patients.">
          <ul className="hms-cashier__checklist"><li>Original payment remains unchanged.</li><li>Every request has an amount, reason, requester, and timestamp.</li><li>Approval and any payout must be recorded by an authorised finance approver.</li></ul>
        </CashierPanel>
      </div>
      <CashierPanel title="Refund request history" description="Requests and their latest status.">
        <div className="hms-cashier__table-wrap"><table className="hms-cashier__table"><thead><tr><th>Request / invoice</th><th>Patient</th><th>Reason</th><th>Amount</th><th>Requested</th><th>Status</th></tr></thead><tbody>{data.cashier.refunds.map((item) => <tr key={item.id}><td><strong>{item.id}</strong><small>{item.invoiceId}</small></td><td>{patientName(patientFor(data, item.patientId))}</td><td>{item.reason}</td><td>{money(item.amount)}</td><td>{dateLabel(item.requestedAt)}</td><td><StatusBadge tone={item.status === 'Pending approval' ? 'warning' : item.status === 'Approved' ? 'success' : item.status === 'Declined' ? 'critical' : 'neutral'}>{item.status}</StatusBadge></td></tr>)}</tbody></table>{!data.cashier.refunds.length ? <div className="hms-cashier__empty">No refund requests.</div> : null}</div>
      </CashierPanel>
    </div>
  </>
}
