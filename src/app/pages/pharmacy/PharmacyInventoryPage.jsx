import { useState } from 'react'
import { Dialog, Icon, PageHeader, StatusBadge } from '@ui'
import { PharmacyEmpty, PharmacyError, PharmacyField, PharmacyNotice, PharmacyPanel, medicineFor, uid, when } from './PharmacyShared.jsx'
import './pharmacy styles/shared.css'
import './pharmacy styles/inventory.css'

const dateFromToday = (offset) => {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

export default async async function PharmacyInventoryPage({ data, error, commit, can }) {
  const [receive, setReceive] = useState({ medicineId: data.pharmacy.medicines[0]?.id || '', lot: '', quantity: '', expiresAt: dateFromToday(180), reason: '' })
  const [adjust, setAdjust] = useState({ batchId: '', quantity: '', reason: '' })
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [filter, setFilter] = useState('All')
  const [showReceipt, setShowReceipt] = useState(false)
  const [showAdjustment, setShowAdjustment] = useState(false)
  const medicines = data.pharmacy.medicines
  const batches = data.pharmacy.batches
  const selectedMedicine = medicines.find((medicine) => medicine.id === receive.medicineId)
  const selectedBatch = batches.find((batch) => batch.id === adjust.batchId)
  const movements = [...data.pharmacy.movements].filter((movement) => filter === 'All' || movement.type === filter).sort((a, b) => b.at.localeCompare(a.at))

  const addReceipt = (event) => {
    event.preventDefault()
    setMessage('')
    setActionError('')
    if (!can('inventory.receive')) { setActionError('Your role cannot receive inventory.'); return }
    const quantity = Number(receive.quantity)
    if (!selectedMedicine || !Number.isInteger(quantity) || quantity <= 0 || !receive.lot.trim() || !receive.expiresAt || !receive.reason.trim()) {
      setActionError('Choose a medicine and enter a lot, positive whole-number quantity, expiry date, and receipt reason.')
      return
    }
    if (receive.expiresAt < new Date().toISOString().slice(0, 10)) { setActionError('The batch expiry date cannot be in the past.'); return }
    const now = new Date().toISOString()
    const batchId = uid('BAT')
    const movement = { id: uid('MOV'), medicineId: selectedMedicine.id, batchId, type: 'Receipt', quantity, reference: receive.lot.trim(), reason: receive.reason.trim(), at: now }
    const pharmacy = {
      ...data.pharmacy,
      batches: [{ id: batchId, medicineId: selectedMedicine.id, lot: receive.lot.trim(), quantity, expiresAt: receive.expiresAt, receivedAt: now }, ...data.pharmacy.batches],
      movements: [movement, ...data.pharmacy.movements],
      activity: [{ id: uid('ACT-PH'), type: 'Stock', message: `${quantity} ${selectedMedicine.unit}(s) received · ${selectedMedicine.name}`, at: now }, ...data.pharmacy.activity],
    }
    if (await commit({ ...data, pharmacy })) {
      setReceive((current) => ({ ...current, lot: '', quantity: '', reason: '' }))
      setMessage(`${selectedMedicine.name} receipt recorded.`)
      setShowReceipt(false)
    }
  }

  const saveAdjustment = (event) => {
    event.preventDefault()
    setMessage('')
    setActionError('')
    if (!can('inventory.adjust')) { setActionError('Your role cannot adjust inventory.'); return }
    const delta = Number(adjust.quantity)
    if (!selectedBatch || !Number.isInteger(delta) || delta === 0 || !adjust.reason.trim()) {
      setActionError('Select a batch, enter a non-zero whole-number adjustment, and provide a reason.')
      return
    }
    if (selectedBatch.quantity + delta < 0) { setActionError('The adjustment cannot reduce a batch below zero.'); return }
    const now = new Date().toISOString()
    const movement = { id: uid('MOV'), medicineId: selectedBatch.medicineId, batchId: selectedBatch.id, type: 'Adjustment', quantity: delta, reference: selectedBatch.lot, reason: adjust.reason.trim(), at: now }
    const pharmacy = {
      ...data.pharmacy,
      batches: data.pharmacy.batches.map((batch) => batch.id === selectedBatch.id ? { ...batch, quantity: batch.quantity + delta } : batch),
      movements: [movement, ...data.pharmacy.movements],
      activity: [{ id: uid('ACT-PH'), type: 'Stock', message: `Stock adjusted by ${delta} for ${medicineFor(data, selectedBatch.medicineId)?.name || selectedBatch.id}`, at: now }, ...data.pharmacy.activity],
    }
    if (await commit({ ...data, pharmacy })) {
      setAdjust({ batchId: '', quantity: '', reason: '' })
      setMessage('Stock adjustment recorded in the ledger.')
      setShowAdjustment(false)
    }
  }

  return <>
    <PageHeader title="Pharmacy inventory" description="Receive batches, document stock corrections, and review the auditable movement ledger." actions={<div className="hms-pharmacy__action-row">{can('inventory.receive') ? <button className="hms-pharmacy__button hms-pharmacy__button--primary" type="button" onClick={() => setShowReceipt(true)}><Icon name="plus" size={16} />Receive stock</button> : null}{can('inventory.adjust') ? <button className="hms-pharmacy__button" type="button" onClick={() => setShowAdjustment(true)}><Icon name="edit" size={16} />Adjust stock</button> : null}</div>} />
    <div className="hms-pharmacy">
      <PharmacyError error={error} />
      {message ? <PharmacyNotice tone="success">{message}</PharmacyNotice> : null}
      {actionError ? <PharmacyNotice tone="error">{actionError}</PharmacyNotice> : null}
      <div className="hms-pharmacy__inventory-grid">
        <Dialog open={showReceipt} title="Receive pharmacy stock" description="Create a traceable batch record with its lot and expiry details." onClose={() => setShowReceipt(false)} size="large">
          <form className="hms-pharmacy__inventory-form" onSubmit={addReceipt}>
            <PharmacyField label="Medicine" value={receive.medicineId} onChange={(value) => setReceive((current) => ({ ...current, medicineId: value }))} options={medicines.map((medicine) => ({ value: medicine.id, label: medicine.name }))} disabled={!can('inventory.receive')} />
            <div className="hms-pharmacy__form-row"><PharmacyField label="Lot / batch number" value={receive.lot} onChange={(value) => setReceive((current) => ({ ...current, lot: value }))} placeholder="Supplier lot reference" maxLength="60" disabled={!can('inventory.receive')} /><PharmacyField label={`Quantity (${selectedMedicine?.unit || 'units'})`} type="number" min="1" step="1" value={receive.quantity} onChange={(value) => setReceive((current) => ({ ...current, quantity: value }))} disabled={!can('inventory.receive')} /></div>
            <div className="hms-pharmacy__form-row"><PharmacyField label="Expiry date" type="date" min={new Date().toISOString().slice(0, 10)} value={receive.expiresAt} onChange={(value) => setReceive((current) => ({ ...current, expiresAt: value }))} disabled={!can('inventory.receive')} /><PharmacyField label="Receipt reason / reference" value={receive.reason} onChange={(value) => setReceive((current) => ({ ...current, reason: value }))} placeholder="Delivery note or receipt reference" maxLength="180" disabled={!can('inventory.receive')} /></div>
            <button type="submit" className="hms-pharmacy__button hms-pharmacy__button--primary" disabled={!can('inventory.receive')}><Icon name="plus" size={16} />Record receipt</button>
            {!can('inventory.receive') ? <small className="hms-pharmacy__permission-hint">Read-only for your role.</small> : null}
          </form>
        </Dialog>
        <Dialog open={showAdjustment} title="Adjust pharmacy stock" description="Corrections require a signed delta and a reason; stock cannot go below zero." onClose={() => setShowAdjustment(false)}>
          <form className="hms-pharmacy__inventory-form" onSubmit={saveAdjustment}>
            <PharmacyField label="Batch" value={adjust.batchId} onChange={(value) => setAdjust((current) => ({ ...current, batchId: value }))} options={[{ value: '', label: 'Choose batch' }, ...batches.map((batch) => ({ value: batch.id, label: `${medicineFor(data, batch.medicineId)?.name || batch.medicineId} · ${batch.lot} · ${batch.quantity} on hand` }))]} disabled={!can('inventory.adjust')} />
            <div className="hms-pharmacy__form-row"><PharmacyField label="Quantity change (+ or −)" type="number" step="1" value={adjust.quantity} onChange={(value) => setAdjust((current) => ({ ...current, quantity: value }))} placeholder="e.g. 5 or -2" disabled={!can('inventory.adjust')} /><PharmacyField label="Adjustment reason" value={adjust.reason} onChange={(value) => setAdjust((current) => ({ ...current, reason: value }))} placeholder="Document the stocktake variance" maxLength="180" disabled={!can('inventory.adjust')} /></div>
            {selectedBatch ? <PharmacyNotice>Current balance: {selectedBatch.quantity} {medicineFor(data, selectedBatch.medicineId)?.unit}s. After adjustment: {selectedBatch.quantity + (Number(adjust.quantity) || 0)}.</PharmacyNotice> : null}
            <button type="submit" className="hms-pharmacy__button" disabled={!can('inventory.adjust')}><Icon name="checkCircle" size={16} />Record adjustment</button>
            {!can('inventory.adjust') ? <small className="hms-pharmacy__permission-hint">Read-only for your role.</small> : null}
          </form>
        </Dialog>
      </div>
      <PharmacyPanel title="Stock movement ledger" description="Receipts, adjustments, and dispenses are recorded as separate signed movements." actions={<label className="hms-pharmacy__ledger-filter">Movement type<select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All</option><option>Receipt</option><option>Dispense</option><option>Adjustment</option></select></label>} className="hms-pharmacy__table-panel">
        {movements.length ? <div className="hms-pharmacy__table-wrap"><table className="hms-pharmacy__table"><thead><tr><th>Time</th><th>Medicine / batch</th><th>Type</th><th>Change</th><th>Reference</th><th>Reason</th></tr></thead><tbody>{movements.map((movement) => <tr key={movement.id}><td>{when(movement.at)}</td><td><strong>{medicineFor(data, movement.medicineId)?.name || movement.medicineId}</strong><small>{data.pharmacy.batches.find((batch) => batch.id === movement.batchId)?.lot || movement.batchId}</small></td><td><StatusBadge tone={movement.type === 'Dispense' ? 'accent' : movement.type === 'Receipt' ? 'success' : 'warning'}>{movement.type}</StatusBadge></td><td className={movement.quantity < 0 ? 'is-negative' : 'is-positive'}>{movement.quantity > 0 ? '+' : ''}{movement.quantity}</td><td>{movement.reference || '—'}</td><td>{movement.reason || '—'}</td></tr>)}</tbody></table></div> : <PharmacyEmpty title="No movements recorded">Inventory activity will appear in the ledger.</PharmacyEmpty>}
      </PharmacyPanel>
      <PharmacyNotice>Inventory is stored in this browser only. Production stock receipt and adjustment must be server-authorised and transactionally audited.</PharmacyNotice>
    </div>
  </>
}
