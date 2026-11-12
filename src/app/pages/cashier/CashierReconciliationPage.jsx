import { useState } from 'react'
import { Dialog, Icon, MetricCard, PageHeader, StatusBadge } from '@ui'
import { CashierError, CashierField, CashierNotice, CashierPanel, dateLabel, money, uid } from './CashierShared.jsx'
import './cashier styles/shared.css'
import './cashier styles/reconciliation.css'

export default function CashierReconciliationPage({ data, error, commit, can }) {
  const [counted, setCounted] = useState('')
  const [openingFloat, setOpeningFloat] = useState(String(data.cashier.shift.openingFloat || 0))
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [showReconcile, setShowReconcile] = useState(false)
  const [showNewShift, setShowNewShift] = useState(false)
  const shift = data.cashier.shift
  const today = new Date().toISOString().slice(0, 10)
  const todays = data.cashier.transactions.filter((item) => item.recordedAt?.slice(0, 10) === today)
  const cashCollected = todays.filter((item) => item.method === 'Cash').reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const expected = Number(shift.openingFloat || 0) + cashCollected

  const reconcile = async (event) => {
    event.preventDefault()
    setMessage('')
    setActionError('')
    const countedValue = Number(counted)
    if (!can('finance.reconcile')) { setActionError('Your role cannot reconcile the cashier shift.'); return }
    if (shift.status !== 'Open') { setActionError('This shift is already reconciled. Open a new shift to continue.'); return }
    if (!Number.isFinite(countedValue) || countedValue < 0) { setActionError('Enter the physical cash count as a non-negative amount.'); return }
    const at = new Date().toISOString()
    const entry = { id: uid('REC'), shiftId: shift.id, openingFloat: Number(shift.openingFloat || 0), cashCollected, expected, counted: countedValue, variance: Number((countedValue - expected).toFixed(2)), at, reconciledBy: 'Cashier' }
    const cashier = { ...data.cashier, shift: { ...shift, status: 'Reconciled', countedCash: countedValue, reconciledAt: at, reconciliations: [entry, ...(shift.reconciliations || [])] } }
    if (await commit({ ...data, cashier })) {
      setMessage(`Reconciliation saved. Variance: ${money(entry.variance)}. Any difference must be reviewed through the actual finance process.`)
      setCounted('')
      setShowReconcile(false)
    }
  }
  const openNext = async () => {
    setMessage('')
    setActionError('')
    const value = Number(openingFloat)
    if (!can('finance.reconcile')) { setActionError('Your role cannot open a new cashier shift.'); return }
    if (shift.status === 'Open') { setActionError('Reconcile the current shift before opening another.'); return }
    if (!Number.isFinite(value) || value < 0) { setActionError('Opening float must be a non-negative amount.'); return }
    const cashier = { ...data.cashier, shift: { id: uid('SHIFT'), status: 'Open', openedAt: new Date().toISOString(), openingFloat: value, countedCash: null, reconciliations: shift.reconciliations || [] } }
    if (await commit({ ...data, cashier })) { setMessage('A new cashier shift was opened.'); setShowNewShift(false) }
  }

  return <>
    <PageHeader title="Shift reconciliation" description="Compare the expected cash drawer with the physical count and record any variance." />
    <div className="hms-cashier">
      <CashierError error={error} />{message ? <CashierNotice tone="success">{message}</CashierNotice> : null}{actionError ? <CashierNotice tone="error">{actionError}</CashierNotice> : null}
      <CashierNotice>Reconciliation entries are stored locally and do not replace the authorised finance close or audit ledger.</CashierNotice>
      <div className="hms-cashier__metrics"><MetricCard label="Shift" value={shift.id.replace(/^SHIFT-DEMO-/, 'SHIFT-')} icon="clock" caption={<StatusBadge tone={shift.status === 'Open' ? 'info' : 'success'}>{shift.status}</StatusBadge>} /><MetricCard label="Opening float" value={money(shift.openingFloat)} icon="wallet" caption="Recorded at shift start" /><MetricCard label="Cash collected" value={money(cashCollected)} icon="wallet" caption="Cash transactions today" /><MetricCard label="Expected cash" value={money(expected)} icon="scale" caption="Opening float + cash collected" /></div>
      {shift.status === 'Open' ? <CashierPanel title="Count and reconcile" description="Enter the counted cash. The variance is calculated against the current shift total.">
        <button type="button" className="hms-cashier__button hms-cashier__button--primary" onClick={() => setShowReconcile(true)} disabled={!can('finance.reconcile')}><Icon name="checkCircle" size={16} />Count and reconcile</button>
      </CashierPanel> : <CashierPanel title="Shift reconciled" description={`Counted ${money(shift.countedCash)} · ${dateLabel(shift.reconciledAt)}`}>
        <button className="hms-cashier__button hms-cashier__button--primary" type="button" onClick={() => setShowNewShift(true)} disabled={!can('finance.reconcile')}><Icon name="plus" size={16} />Open next shift</button>
      </CashierPanel>}
      <Dialog open={showReconcile} title="Count and reconcile shift" description="Compare the physical drawer count against expected cash." onClose={() => setShowReconcile(false)}>
        <form className="hms-cashier__reconcile-form" onSubmit={reconcile}><CashierField label="Physical cash count (GHS)" value={counted} onChange={setCounted} type="number" min="0" step="0.01" required /><div className="hms-cashier__variance"><span>Expected</span><strong>{money(expected)}</strong><small>Variance preview: {counted !== '' && Number.isFinite(Number(counted)) ? money(Number(counted) - expected) : '—'}</small></div><button className="hms-cashier__button hms-cashier__button--primary" disabled={!can('finance.reconcile')}><Icon name="checkCircle" size={16} />Save reconciliation</button></form>
      </Dialog>
      <Dialog open={showNewShift} title="Open a new cashier shift" description="Set the opening cash float for the next shift." onClose={() => setShowNewShift(false)}>
        <div className="hms-cashier__new-shift"><CashierField label="Opening float (GHS)" value={openingFloat} onChange={setOpeningFloat} type="number" min="0" step="0.01" /><button className="hms-cashier__button hms-cashier__button--primary" type="button" onClick={openNext} disabled={!can('finance.reconcile')}><Icon name="plus" size={16} />Open next shift</button></div>
      </Dialog>
      <CashierPanel title="Reconciliation history" description="Recorded counts and differences.">
        <div className="hms-cashier__table-wrap"><table className="hms-cashier__table"><thead><tr><th>Reference</th><th>Expected</th><th>Counted</th><th>Variance</th><th>Reconciled at</th></tr></thead><tbody>{(shift.reconciliations || []).map((item) => <tr key={item.id}><td>{item.shiftId.replace(/^SHIFT-DEMO-/, 'SHIFT-')}</td><td>{money(item.expected)}</td><td>{money(item.counted)}</td><td><strong>{money(item.variance)}</strong></td><td>{dateLabel(item.at)}</td></tr>)}</tbody></table>{!(shift.reconciliations || []).length ? <div className="hms-cashier__empty"><Icon name="info" size={18} />No reconciliations have been recorded.</div> : null}</div>
      </CashierPanel>
    </div>
  </>
}
