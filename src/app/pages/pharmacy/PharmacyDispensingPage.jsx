import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Dialog, Icon, PageHeader, StatusBadge } from '@ui'
import {
  PharmacyEmpty, PharmacyError, PharmacyField, PharmacyNotice, PharmacyPanel, PharmacyPatient,
  ageLabel, availableQuantity, batchesFor, day, medicineFor, money, patientFor, statusTone, uid,
} from './PharmacyShared.jsx'
import './pharmacy styles/shared.css'
import './pharmacy styles/dispensing.css'

const remainingFor = (item) => Math.max(0, item.prescribedQuantity - item.dispensedQuantity)

export default function PharmacyDispensingPage({ data, error, commit, can }) {
  const location = useLocation()
  const [selection, setSelection] = useState({ key: '', id: '' })
  const [quantities, setQuantities] = useState({})
  const [allergyChecks, setAllergyChecks] = useState({})
  const [identityChecks, setIdentityChecks] = useState({})
  const [confirmId, setConfirmId] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [showDispenseForm, setShowDispenseForm] = useState(false)
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const requestedId = location.state?.prescriptionId
  const firstActive = data.pharmacy.prescriptions.find((rx) => rx.status !== 'Dispensed')?.id || ''
  const selectedId = selection.key === location.key ? selection.id : requestedId || selection.id || firstActive
  const prescription = data.pharmacy.prescriptions.find((rx) => rx.id === selectedId)
  const patient = prescription ? patientFor(data, prescription.patientId) : null
  const allergyChecked = allergyChecks[prescription?.id] || false
  const plan = useMemo(() => Object.fromEntries((prescription?.items || []).map((item) => {
    const medicineId = item.medicineId
    const batch = batchesFor(data, medicineId)[0]
    return [item.id, {
      medicineId,
      batchId: batch?.id || '',
      quantity: remainingFor(item),
      substitutionReason: '',
      overrideReason: '',
    }]
  })), [data, prescription])
  const activeItems = (prescription?.items || []).filter((item) => remainingFor(item) > 0)
  const otherActivePrescriptions = data.pharmacy.prescriptions.filter((rx) => rx.id !== prescription?.id && rx.patientId === prescription?.patientId && rx.status !== 'Dispensed')
  const setLine = (itemId, key, value) => setQuantities((current) => ({
    ...current,
    [prescription.id]: {
      ...plan,
      ...(current[prescription.id] || {}),
      [itemId]: { ...plan[itemId], ...(current[prescription.id]?.[itemId] || {}), [key]: value },
    },
  }))
  const getLine = (itemId) => ({ ...plan[itemId], ...(quantities[prescription?.id]?.[itemId] || {}) })
  const chosenLines = activeItems.map((item) => ({ item, ...getLine(item.id), quantity: Number(getLine(item.id).quantity) || 0 })).filter((line) => line.quantity > 0)
  const selectedTotal = chosenLines.reduce((sum, line) => sum + line.quantity * (medicineFor(data, line.medicineId)?.unitPrice || 0), 0)
  const allergyConflicts = (line) => {
    const medicine = medicineFor(data, line.medicineId)
    const allergyTerms = (prescription?.allergies || []).map((value) => value.toLowerCase().split(' ')[0])
    return medicine?.ingredients?.some((ingredient) => allergyTerms.some((allergy) => ingredient.toLowerCase().includes(allergy) || allergy.includes(ingredient.toLowerCase()))) || false
  }
  const duplicateMedicine = (medicineId) => otherActivePrescriptions.some((rx) => rx.items.some((item) => item.medicineId === medicineId && remainingFor(item) > 0))

  const validate = () => {
    if (!prescription || !can('pharmacy.dispense')) return 'Your role cannot dispense prescriptions.'
    if (prescription.status === 'Dispensed') return 'This prescription is already fully dispensed.'
    if (prescription.status === 'New') return 'Start the pharmacist review before dispensing this prescription.'
    if (!patient) return 'The patient record could not be found.'
    if (!identityChecks[prescription.id]?.name || confirmId.trim() !== patient.id) return 'Confirm the patient name and enter the exact patient ID.'
    if (!allergyChecks[prescription.id]) return 'Review the patient allergy record before dispensing.'
    if (!chosenLines.length) return 'Enter a dispense quantity for at least one prescription item.'
    const batchUse = {}
    for (const line of chosenLines) {
      if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > remainingFor(line.item)) return `Enter a valid quantity for ${medicineFor(data, line.medicineId)?.name || 'the medicine'}.`
      if (!line.batchId) return `Select an available batch for ${medicineFor(data, line.medicineId)?.name || 'the medicine'}.`
      const batch = data.pharmacy.batches.find((candidate) => candidate.id === line.batchId && candidate.medicineId === line.medicineId)
      if (!batch) return 'A selected batch is no longer available. Review the batch selection.'
      batchUse[line.batchId] = (batchUse[line.batchId] || 0) + line.quantity
      if (allergyConflicts(line) && !line.overrideReason.trim()) return `Record a clinical override reason for the allergy flag on ${medicineFor(data, line.medicineId)?.name || 'this medicine'}.`
      if (allergyConflicts(line) && !can('pharmacy.verify')) return 'Only a pharmacist with verification permission can authorise an allergy override.'
      if (line.medicineId !== line.item.medicineId && (!line.substitutionReason.trim() || !can('pharmacy.verify'))) return 'A pharmacist with verification permission must document the substitution reason.'
    }
    for (const [batchId, quantity] of Object.entries(batchUse)) {
      const batch = data.pharmacy.batches.find((candidate) => candidate.id === batchId)
      if (!batch || batch.quantity < quantity) return 'Available stock changed. Review batch quantities before confirming.'
    }
    return ''
  }

  const openConfirmation = () => {
    setMessage('')
    const validation = validate()
    setActionError(validation)
    if (!validation) setDialogOpen(true)
  }

  const startReview = async () => {
    if (!prescription || !can('pharmacy.verify') || prescription.status !== 'New') return
    const now = new Date().toISOString()
    const pharmacy = {
      ...data.pharmacy,
      prescriptions: data.pharmacy.prescriptions.map((rx) => rx.id === prescription.id ? { ...rx, status: 'In progress', verifiedAt: now } : rx),
      activity: [{ id: uid('ACT-PH'), type: 'Queue', message: `${prescription.id} review started`, at: now }, ...data.pharmacy.activity],
    }
    if (await commit({ ...data, pharmacy })) {
      setMessage(`${prescription.id} is now in progress.`)
      setActionError('')
    }
  }

  const dispense = async () => {
    const validation = validate()
    if (validation) { setDialogOpen(false); setActionError(validation); return }
    const now = new Date().toISOString()
    const movementRows = chosenLines.map((line) => ({
      id: uid('MOV'),
      medicineId: line.medicineId,
      batchId: line.batchId,
      type: 'Dispense',
      quantity: -line.quantity,
      reference: prescription.id,
      reason: line.medicineId !== line.item.medicineId ? `Substitution: ${line.substitutionReason.trim()}` : line.overrideReason.trim() ? `Allergy override: ${line.overrideReason.trim()}` : 'Prescription dispense',
      at: now,
    }))
    const itemUpdates = new Map(chosenLines.map((line) => [line.item.id, {
      dispensedQuantity: line.item.dispensedQuantity + line.quantity,
      lastDispensedMedicineId: line.medicineId,
    }]))
    const items = prescription.items.map((item) => ({ ...item, ...(itemUpdates.get(item.id) || {}) }))
    const nextStatus = items.every((item) => item.dispensedQuantity >= item.prescribedQuantity) ? 'Dispensed' : 'Partial'
    const nextPrescription = {
      ...prescription,
      items,
      status: nextStatus,
      dispensedAt: now,
      allergyReview: 'Reviewed at dispensing',
      lastDispense: {
        at: now,
        staffRole: 'Pharmacy',
        patientNameConfirmed: true,
        patientIdConfirmed: true,
        items: chosenLines.map((line) => ({
          medicineId: line.medicineId,
          batchId: line.batchId,
          quantity: line.quantity,
          ...(line.substitutionReason.trim() ? { substitutionReason: line.substitutionReason.trim() } : {}),
          ...(line.overrideReason.trim() ? { overrideReason: line.overrideReason.trim() } : {}),
        })),
      },
    }
    const batches = data.pharmacy.batches.map((batch) => {
      const used = movementRows.filter((movement) => movement.batchId === batch.id).reduce((sum, movement) => sum - movement.quantity, 0)
      return used ? { ...batch, quantity: batch.quantity - used } : batch
    })
    const charge = {
      id: uid('INV'),
      patientId: prescription.patientId,
      date: new Date().toISOString().slice(0, 10),
      description: `Pharmacy dispensing · ${prescription.id}`,
      billed: Number(selectedTotal.toFixed(2)),
      paid: 0,
      method: '—',
      status: 'Unpaid',
      source: 'Pharmacy',
      prescriptionId: prescription.id,
    }
    const updatedQueue = data.queue.map((entry) => entry.id === prescription.encounterId
      ? { ...entry, pharmacyStatus: nextStatus, pharmacyUpdatedAt: now }
      : entry)
    const pharmacy = {
      ...data.pharmacy,
      batches,
      prescriptions: data.pharmacy.prescriptions.map((rx) => rx.id === prescription.id ? nextPrescription : rx),
      movements: [...movementRows, ...data.pharmacy.movements],
      activity: [{ id: uid('ACT-PH'), type: 'Dispense', message: `${chosenLines.length} item${chosenLines.length === 1 ? '' : 's'} dispensed for ${prescription.id}${nextStatus === 'Partial' ? ' · partial supply' : ''}`, at: now }, ...data.pharmacy.activity],
    }
    if (await commit({ ...data, queue: updatedQueue, payments: [charge, ...data.payments], pharmacy })) {
      setMessage(`${prescription.id} recorded as ${nextStatus.toLowerCase()}. Stock movements and a cashier charge were added.`)
      setDialogOpen(false)
      setShowDispenseForm(false)
      setConfirmId('')
      setQuantities({})
      setIdentityChecks({})
      setAllergyChecks({})
      setActionError('')
    }
  }

  return <>
    <PageHeader title="Dispensing panel" description="Verify patient identifiers and safety details, select stock batches, then record a full or partial dispense." actions={prescription ? <button type="button" className="hms-pharmacy__button hms-pharmacy__button--primary" onClick={() => setShowDispenseForm(true)}><Icon name="pill" size={16} />Prepare dispense</button> : null} />
    <div className="hms-pharmacy">
      <PharmacyError error={error} />
      {message ? <PharmacyNotice tone="success">{message}</PharmacyNotice> : null}
      {actionError ? <PharmacyNotice tone="error">{actionError}</PharmacyNotice> : null}
      <PharmacyNotice tone="info">Verify allergies and clinical details in the patient chart. Dispensing records are stored in this browser and are not server-verified.</PharmacyNotice>
      <div className="hms-pharmacy__dispense-layout">
        <PharmacyPanel title="Prescription worklist" description="Select an active prescription to prepare a dispense.">
          <div className="hms-pharmacy__dispense-list">{data.pharmacy.prescriptions.filter((rx) => rx.status !== 'Dispensed').map((rx) => <button type="button" className={`hms-pharmacy__dispense-choice${selectedId === rx.id ? ' is-selected' : ''}`} onClick={() => { setSelection({ key: location.key, id: rx.id }); setActionError(''); setMessage(''); setShowDispenseForm(false) }} key={rx.id}><span><strong>{rx.id}</strong><small>{personNameSafe(patientFor(data, rx.patientId))} · {ageLabel(rx.prescribedAt)} ago</small></span><StatusBadge tone={statusTone(rx.priority)}>{rx.priority}</StatusBadge><span className="hms-pharmacy__choice-status">{rx.status}</span></button>)}</div>
          {!data.pharmacy.prescriptions.some((rx) => rx.status !== 'Dispensed') ? <PharmacyEmpty title="No active prescriptions">New orders will appear when prescribed.</PharmacyEmpty> : null}
        </PharmacyPanel>
        {prescription ? <Dialog open={showDispenseForm} title={`Prepare dispensing · ${prescription.id}`} description="Confirm the patient, allergies, quantities, and stock batches." onClose={() => setShowDispenseForm(false)} size="large"><div className="hms-pharmacy__dispense-work">
          <PharmacyPanel title="Patient and prescription" description={`${prescription.id} · prescribed by ${prescription.prescribedBy}`}>
            <PharmacyPatient patient={patient} secondary={prescription.encounterId || 'No encounter linked'} />
            <div className="hms-pharmacy__prescription-meta"><span><small>Priority</small><StatusBadge tone={statusTone(prescription.priority)}>{prescription.priority}</StatusBadge></span><span><small>Age in queue</small><strong>{ageLabel(prescription.prescribedAt)}</strong></span><span><small>Status</small><StatusBadge tone={statusTone(prescription.status)}>{prescription.status}</StatusBadge></span></div>
            <div className={`hms-pharmacy__allergy-review${prescription.allergies.length ? ' is-warning' : ''}`}><Icon name={prescription.allergies.length ? 'alertTriangle' : 'shieldCheck'} size={18} /><div><strong>{prescription.allergies.length ? 'Allergy information needs careful review' : 'Review allergy record'}</strong><small>{prescription.allergies.length ? prescription.allergies.join(', ') : prescription.allergyReview}</small></div>{prescription.status === 'New' && can('pharmacy.verify') ? <button type="button" className="hms-pharmacy__button" onClick={startReview}>Start review</button> : null}</div>
            {prescription.allergies.length ? <PharmacyNotice tone="error">A potential allergy conflict is flagged below. Dispensing a conflicting item is blocked unless an authorised pharmacist records an override reason.</PharmacyNotice> : null}
            <label className="hms-pharmacy__check"><input type="checkbox" checked={allergyChecked} onChange={(event) => setAllergyChecks((current) => ({ ...current, [prescription.id]: event.target.checked }))} /><span><strong>I reviewed the current allergy record</strong><small>Required for every dispense.</small></span></label>
            <div className="hms-pharmacy__identity-check"><div><strong>Two-identifier confirmation</strong><small>Confirm the patient&apos;s name visually, then enter the patient ID exactly.</small></div><label className="hms-pharmacy__check"><input type="checkbox" checked={Boolean(identityChecks[prescription.id]?.name)} onChange={(event) => setIdentityChecks((current) => ({ ...current, [prescription.id]: { ...current[prescription.id], name: event.target.checked } }))} /><span><strong>Name confirmed</strong><small>{personNameSafe(patient)}</small></span></label><label className="hms-pharmacy__field"><span>Patient ID confirmation</span><input value={confirmId} onChange={(event) => setConfirmId(event.target.value)} placeholder="Enter the patient ID" autoComplete="off" /></label></div>
            {otherActivePrescriptions.length ? <PharmacyNotice>Possible duplicate therapy: this patient has another active prescription. Review both orders before proceeding.</PharmacyNotice> : null}
          </PharmacyPanel>
          <PharmacyPanel title="Prescription items" description="Select a batch by earliest expiry. Record partial quantities when full supply is not possible.">
            <div className="hms-pharmacy__item-list">{activeItems.map((item) => {
              const line = getLine(item.id)
              const medicine = medicineFor(data, line.medicineId)
              const batches = batchesFor(data, line.medicineId)
              const conflict = allergyConflicts(line)
              const unmapped = !medicine?.nhiaCode
              return <article className="hms-pharmacy__dispense-item" key={item.id}>
                <header><div><span className="hms-pharmacy__eyebrow">Prescribed medicine</span><h3>{medicineFor(data, item.medicineId)?.name || 'Unknown medicine'}</h3></div>{unmapped ? <StatusBadge tone="warning">Unmapped for claims</StatusBadge> : <StatusBadge tone="success">NHIA mapped</StatusBadge>}</header>
                <div className="hms-pharmacy__dose-grid"><span><small>Dose</small><strong>{item.dose}</strong></span><span><small>Frequency</small><strong>{item.frequency}</strong></span><span><small>Duration</small><strong>{item.durationDays} days</strong></span><span><small>Remaining</small><strong>{remainingFor(item)} {medicineFor(data, item.medicineId)?.unit || 'units'}</strong></span></div>
                <div className="hms-pharmacy__item-controls">
                  <PharmacyField label="Dispense quantity" type="number" min="0" max={remainingFor(item)} step="1" value={line.quantity} onChange={(value) => setLine(item.id, 'quantity', value)} hint="Use 0 to defer this item; quantity cannot exceed the remaining prescription." />
                  <PharmacyField label="Batch · first expiry, first out" value={line.batchId} onChange={(value) => setLine(item.id, 'batchId', value)} options={batches.length ? batches.map((batch) => ({ value: batch.id, label: `${batch.lot} · ${batch.quantity} on hand · expires ${day(batch.expiresAt)}` })) : [{ value: '', label: 'No stock available' }]} />
                  <PharmacyField label="Substitute medicine (optional)" value={line.medicineId} onChange={(value) => { const batch = batchesFor(data, value)[0]; setLine(item.id, 'medicineId', value); setLine(item.id, 'batchId', batch?.id || '') }} options={[{ value: item.medicineId, label: `Prescribed: ${medicineFor(data, item.medicineId)?.name}` }, ...data.pharmacy.medicines.filter((candidate) => candidate.id !== item.medicineId && availableQuantity(data, candidate.id) > 0).map((candidate) => ({ value: candidate.id, label: candidate.name }))]} />
                </div>
                {line.medicineId !== item.medicineId ? <PharmacyField label="Substitution reason" value={line.substitutionReason} onChange={(value) => setLine(item.id, 'substitutionReason', value)} placeholder="Document the authorised reason" maxLength="240" /> : null}
                {conflict ? <div className="hms-pharmacy__conflict"><Icon name="alertTriangle" size={16} /><span><strong>Potential allergy conflict</strong><small>Do not dispense without a clinically authorised decision and documented reason.</small></span><PharmacyField label="Override reason (required)" value={line.overrideReason} onChange={(value) => setLine(item.id, 'overrideReason', value)} placeholder="Enter the documented authorisation" maxLength="240" /></div> : null}
                {duplicateMedicine(line.medicineId) ? <PharmacyNotice>Same medicine appears on another active prescription. Confirm this is not duplicate therapy.</PharmacyNotice> : null}
                <PharmacyNotice>Verify quantity against the prescribed dose, frequency, duration, and original order before proceeding.</PharmacyNotice>
                <div className="hms-pharmacy__item-stock"><span>{availableQuantity(data, line.medicineId)} usable {medicine?.unit || 'units'} in unexpired batches</span><span>Estimated line value {money((Number(line.quantity) || 0) * (medicine?.unitPrice || 0))}</span></div>
              </article>
            })}</div>
            {!activeItems.length ? <PharmacyEmpty title="Prescription is complete">No remaining items need dispensing.</PharmacyEmpty> : null}
            <footer className="hms-pharmacy__dispense-footer"><span><small>Estimated charge</small><strong>{money(selectedTotal)}</strong></span><button type="button" className="hms-pharmacy__button hms-pharmacy__button--primary" disabled={!can('pharmacy.dispense') || !activeItems.length} onClick={openConfirmation}><Icon name="shieldCheck" size={16} />Review and dispense</button></footer>
            {!can('pharmacy.dispense') ? <PharmacyNotice>Your role can review prescriptions and stock but cannot dispense.</PharmacyNotice> : null}
          </PharmacyPanel>
        </div></Dialog> : <PharmacyPanel title="Select a prescription"><PharmacyEmpty title="No prescription selected">Choose an active prescription from the worklist.</PharmacyEmpty></PharmacyPanel>}
      </div>
    </div>
    <Dialog open={dialogOpen} title="Confirm dispensing" description="This records selected quantities, deducts the listed batches, writes stock movements, and creates a cashier charge." onClose={() => setDialogOpen(false)}>
      <div className="hms-pharmacy__dialog-summary"><span>Prescription<strong>{prescription?.id}</strong></span><span>Patient<strong>{personNameSafe(patient)} · {patient?.id}</strong></span><span>Estimated charge<strong>{money(selectedTotal)}</strong></span><span>Items<strong>{chosenLines.length} selected</strong></span></div>
      <div className="hms-pharmacy__dialog-actions"><button type="button" className="hms-pharmacy__button" onClick={() => setDialogOpen(false)}>Go back</button><button type="button" className="hms-pharmacy__button hms-pharmacy__button--primary" onClick={dispense}><Icon name="checkCircle" size={16} />Confirm dispensing</button></div>
    </Dialog>
  </>
}

function personNameSafe(patient) {
  return patient ? `${patient.firstName} ${patient.lastName}`.trim() : 'Patient record'
}
