import { useState } from 'react'
import { Dialog, Icon, PageHeader, StatusBadge } from '@ui'
import { LabEmpty, LabError, LabField, LabNotice, LabPanel, dateOnly, uid } from './LabShared.jsx'
import './lab styles/shared.css'
import './lab styles/inventory.css'

const EMPTY_RECEIPT = { name: '', category: 'Collection supplies', unit: 'unit', quantity: '', reorderLevel: '', lot: '', expiresAt: '', reason: '' }

export default function LabInventoryPage({ data, error, commit, can }) {
  const [receipt, setReceipt] = useState(EMPTY_RECEIPT)
  const [adjustment, setAdjustment] = useState({ stockId: '', quantity: '', reason: '' })
  const [issue, setIssue] = useState({ stockId: '', quantity: '', reference: '', reason: '' })
  const [filter, setFilter] = useState('All')
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [showReceipt, setShowReceipt] = useState(false)
  const [showIssue, setShowIssue] = useState(false)
  const [showAdjustment, setShowAdjustment] = useState(false)
  const selectedStock = data.lab.stock.find((item) => item.id === adjustment.stockId)
  const movements = [...data.lab.movements].filter((movement) => filter === 'All' || movement.type === filter).sort((a, b) => b.at.localeCompare(a.at))
  const alerts = data.lab.stock.filter((item) => item.quantity <= item.reorderLevel).length

  const writeMovement = (nextStock, movement, activityMessage) => {
    const now = movement.at
    const lab = {
      ...data.lab,
      stock: nextStock,
      movements: [movement, ...data.lab.movements],
      activity: [{ id: uid('LACT'), kind: 'Stock', message: activityMessage, at: now }, ...data.lab.activity],
    }
    if (commit({ ...data, lab })) { setMessage(activityMessage); setActionError('') }
  }

  const receive = (event) => {
    event.preventDefault()
    setMessage('')
    setActionError('')
    const quantity = Number(receipt.quantity)
    if (!can('inventory.receive')) { setActionError('Your role cannot receive inventory.'); return }
    if (!receipt.name.trim() || !receipt.lot.trim() || !Number.isInteger(quantity) || quantity <= 0 || !receipt.reason.trim()) { setActionError('Enter an item, lot, positive whole-number quantity, and receipt reason.'); return }
    if (receipt.expiresAt && receipt.expiresAt < new Date().toISOString().slice(0, 10)) { setActionError('Expiry date cannot be in the past.'); return }
    const now = new Date().toISOString()
    const item = { id: uid('LST'), name: receipt.name.trim(), category: receipt.category, unit: receipt.unit.trim() || 'unit', quantity, reorderLevel: Math.max(0, Number(receipt.reorderLevel) || 0), lot: receipt.lot.trim(), expiresAt: receipt.expiresAt }
    const movement = { id: uid('LMOV'), stockId: item.id, type: 'Receipt', quantity, reference: item.lot, reason: receipt.reason.trim(), at: now }
    const lab = { ...data.lab, stock: [item, ...data.lab.stock], movements: [movement, ...data.lab.movements], activity: [{ id: uid('LACT'), kind: 'Stock', message: `${quantity} ${item.unit}(s) received · ${item.name}`, at: now }, ...data.lab.activity] }
    if (commit({ ...data, lab })) { setReceipt(EMPTY_RECEIPT); setMessage(`${item.name} receipt recorded.`); setShowReceipt(false) }
  }

  const adjust = (event) => {
    event.preventDefault()
    setMessage('')
    setActionError('')
    const delta = Number(adjustment.quantity)
    if (!can('inventory.adjust')) { setActionError('Your role cannot adjust laboratory inventory.'); return }
    if (!selectedStock || !Number.isInteger(delta) || delta === 0 || !adjustment.reason.trim()) { setActionError('Select an item, enter a non-zero whole-number change, and provide a reason.'); return }
    if (selectedStock.quantity + delta < 0) { setActionError('An adjustment cannot reduce inventory below zero.'); return }
    const now = new Date().toISOString()
    const movement = { id: uid('LMOV'), stockId: selectedStock.id, type: 'Adjustment', quantity: delta, reference: selectedStock.lot || selectedStock.id, reason: adjustment.reason.trim(), at: now }
    writeMovement(data.lab.stock.map((item) => item.id === selectedStock.id ? { ...item, quantity: item.quantity + delta } : item), movement, `Stock adjusted by ${delta} · ${selectedStock.name}`)
    setAdjustment({ stockId: '', quantity: '', reason: '' })
    setShowAdjustment(false)
  }

  const issueStock = (event) => {
    event.preventDefault()
    setMessage('')
    setActionError('')
    const quantity = Number(issue.quantity)
    const item = data.lab.stock.find((stock) => stock.id === issue.stockId)
    if (!can('lab.process')) { setActionError('Your role cannot issue laboratory stock.'); return }
    if (!item || !Number.isInteger(quantity) || quantity <= 0 || quantity > item.quantity || !issue.reason.trim()) { setActionError('Choose an item, enter a positive quantity within available stock, and provide an issue reason.'); return }
    const now = new Date().toISOString()
    const movement = { id: uid('LMOV'), stockId: item.id, type: 'Issue', quantity: -quantity, reference: issue.reference.trim() || 'Laboratory use', reason: issue.reason.trim(), at: now }
    writeMovement(data.lab.stock.map((stock) => stock.id === item.id ? { ...stock, quantity: stock.quantity - quantity } : stock), movement, `${quantity} ${item.unit}(s) issued · ${item.name}`)
    setIssue({ stockId: '', quantity: '', reference: '', reason: '' })
    setShowIssue(false)
  }

  return <>
    <PageHeader title="Laboratory inventory" description="Monitor reagents and collection supplies, receive stock, issue materials, and document corrections." actions={<div className="hms-lab__action-row">{can('inventory.receive') ? <button className="hms-lab__button hms-lab__button--primary" type="button" onClick={() => setShowReceipt(true)}><Icon name="plus" size={15} />Receive stock</button> : null}{can('lab.process') ? <button className="hms-lab__button" type="button" onClick={() => setShowIssue(true)}><Icon name="packageBox" size={15} />Issue stock</button> : null}{can('inventory.adjust') ? <button className="hms-lab__button" type="button" onClick={() => setShowAdjustment(true)}><Icon name="edit" size={15} />Adjust stock</button> : null}</div>} />
    <div className="hms-lab">
      <LabError error={error} />
      {message ? <LabNotice tone="success">{message}</LabNotice> : null}
      {actionError ? <LabNotice tone="error">{actionError}</LabNotice> : null}
      <div className="hms-lab__inventory-summary"><div><span>Tracked items</span><strong>{data.lab.stock.length}</strong></div><div><span>Stock alerts</span><strong>{alerts}</strong></div><div><span>Movement records</span><strong>{data.lab.movements.length}</strong></div></div>
      <Dialog open={showReceipt} title="Receive laboratory stock" description="Add a traceable inventory item and receipt movement." onClose={() => setShowReceipt(false)} size="large"><form className="hms-lab__inventory-form" onSubmit={receive}><div className="hms-lab__form-grid"><LabField label="Supply / reagent" value={receipt.name} onChange={(value) => setReceipt((current) => ({ ...current, name: value }))} placeholder="Item name" maxLength="80" /><LabField label="Category" value={receipt.category} onChange={(value) => setReceipt((current) => ({ ...current, category: value }))} options={['Collection supplies', 'Haematology reagent', 'Biochemistry reagent', 'Rapid test', 'Microbiology reagent', 'Other']} /><LabField label="Unit" value={receipt.unit} onChange={(value) => setReceipt((current) => ({ ...current, unit: value }))} placeholder="tube, kit, pack" maxLength="24" /><LabField label="Quantity" type="number" min="1" step="1" value={receipt.quantity} onChange={(value) => setReceipt((current) => ({ ...current, quantity: value }))} /><LabField label="Reorder level" type="number" min="0" step="1" value={receipt.reorderLevel} onChange={(value) => setReceipt((current) => ({ ...current, reorderLevel: value }))} /><LabField label="Lot / batch" value={receipt.lot} onChange={(value) => setReceipt((current) => ({ ...current, lot: value }))} placeholder="Supplier lot reference" maxLength="60" /><LabField label="Expiry date (optional)" type="date" min={new Date().toISOString().slice(0, 10)} value={receipt.expiresAt} onChange={(value) => setReceipt((current) => ({ ...current, expiresAt: value }))} /><LabField label="Receipt reason / reference" value={receipt.reason} onChange={(value) => setReceipt((current) => ({ ...current, reason: value }))} placeholder="Delivery note or reason" maxLength="180" /></div><button className="hms-lab__button hms-lab__button--primary"><Icon name="plus" size={15} />Record receipt</button></form></Dialog>
      <Dialog open={showIssue} title="Issue laboratory stock" description="Record materials used for an investigation or service." onClose={() => setShowIssue(false)}><form className="hms-lab__inventory-form" onSubmit={issueStock}><LabField label="Item" value={issue.stockId} onChange={(value) => setIssue((current) => ({ ...current, stockId: value }))} options={[{ value: '', label: 'Choose item' }, ...data.lab.stock.map((item) => ({ value: item.id, label: `${item.name} · ${item.quantity} ${item.unit}(s)` }))]} /><div className="hms-lab__form-grid"><LabField label="Quantity" type="number" min="1" step="1" value={issue.quantity} onChange={(value) => setIssue((current) => ({ ...current, quantity: value }))} /><LabField label="Order / reference" value={issue.reference} onChange={(value) => setIssue((current) => ({ ...current, reference: value }))} placeholder="Optional order reference" maxLength="60" /></div><LabField label="Issue reason" value={issue.reason} onChange={(value) => setIssue((current) => ({ ...current, reason: value }))} placeholder="Document intended use" maxLength="180" /><button className="hms-lab__button"><Icon name="packageBox" size={15} />Record issue</button></form></Dialog>
      <Dialog open={showAdjustment} title="Adjust laboratory stock" description="Adjustments require an auditable reason and cannot make stock negative." onClose={() => setShowAdjustment(false)}><form className="hms-lab__inventory-form" onSubmit={adjust}><LabField label="Item" value={adjustment.stockId} onChange={(value) => setAdjustment((current) => ({ ...current, stockId: value }))} options={[{ value: '', label: 'Choose item' }, ...data.lab.stock.map((item) => ({ value: item.id, label: `${item.name} · ${item.quantity} ${item.unit}(s)` }))]} /><div className="hms-lab__form-grid"><LabField label="Quantity change (+ or −)" type="number" step="1" value={adjustment.quantity} onChange={(value) => setAdjustment((current) => ({ ...current, quantity: value }))} placeholder="e.g., 4 or -2" /><LabField label="Adjustment reason" value={adjustment.reason} onChange={(value) => setAdjustment((current) => ({ ...current, reason: value }))} placeholder="Document stocktake variance" maxLength="180" /></div>{selectedStock ? <LabNotice>Current stock: {selectedStock.quantity} · after adjustment: {selectedStock.quantity + (Number(adjustment.quantity) || 0)}</LabNotice> : null}<button className="hms-lab__button"><Icon name="checkCircle" size={15} />Record adjustment</button></form></Dialog>
      <LabPanel title="Stock levels" description="Items at or below reorder level need replenishment review.">
        <div className="hms-lab__stock-table-wrap"><table className="hms-lab__table"><thead><tr><th>Item</th><th>Category</th><th>On hand</th><th>Reorder at</th><th>Lot</th><th>Expiry</th><th>Status</th></tr></thead><tbody>{data.lab.stock.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.unit}</small></td><td>{item.category}</td><td>{item.quantity}</td><td>{item.reorderLevel}</td><td>{item.lot || '—'}</td><td>{dateOnly(item.expiresAt)}</td><td><StatusBadge tone={item.quantity === 0 ? 'critical' : item.quantity <= item.reorderLevel ? 'warning' : 'success'}>{item.quantity === 0 ? 'Out of stock' : item.quantity <= item.reorderLevel ? 'Low stock' : 'Available'}</StatusBadge></td></tr>)}</tbody></table></div>
      </LabPanel>
      <LabPanel title="Stock movement ledger" description="Signed movements show receipts, issues, and adjustments." actions={<label className="hms-lab__ledger-filter">Type<select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All</option><option>Receipt</option><option>Issue</option><option>Adjustment</option></select></label>}>
        {movements.length ? <div className="hms-lab__stock-table-wrap"><table className="hms-lab__table"><thead><tr><th>Time</th><th>Item</th><th>Movement</th><th>Change</th><th>Reference</th><th>Reason</th></tr></thead><tbody>{movements.map((item) => <tr key={item.id}><td>{new Date(item.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td>{data.lab.stock.find((stock) => stock.id === item.stockId)?.name || item.stockId}</td><td><StatusBadge tone={item.type === 'Receipt' ? 'success' : item.type === 'Issue' ? 'accent' : 'warning'}>{item.type}</StatusBadge></td><td className={item.quantity < 0 ? 'is-negative' : 'is-positive'}>{item.quantity > 0 ? '+' : ''}{item.quantity}</td><td>{item.reference || '—'}</td><td>{item.reason}</td></tr>)}</tbody></table></div> : <LabEmpty title="No movements recorded">Inventory movements will be shown here.</LabEmpty>}
      </LabPanel>
      <LabNotice>Inventory changes are stored in this browser. Production receipts, issues, and adjustments require server-side authorization and transaction-level audit logging.</LabNotice>
    </div>
  </>
}
