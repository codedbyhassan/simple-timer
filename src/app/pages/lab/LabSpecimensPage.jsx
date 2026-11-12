import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Dialog, Icon, PageHeader } from '@ui'
import { LabEmpty, LabError, LabField, LabNotice, LabPanel, LabPatient, LabStatus, dateTime, elapsed, patientFor, specimenFor, testFor, uid } from './LabShared.jsx'
import './lab styles/shared.css'
import './lab styles/specimens.css'

export default function LabSpecimensPage({ data, error, commit, can }) {
  const location = useLocation()
  const [selectedId, setSelectedId] = useState(location.state?.orderId || '')
  const [nameConfirmed, setNameConfirmed] = useState(false)
  const [patientId, setPatientId] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [showCollectionDialog, setShowCollectionDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const orders = data.lab.orders.filter((order) => order.status !== 'Verified').sort((a, b) => a.orderedAt.localeCompare(b.orderedAt))
  const selected = orders.find((order) => order.id === selectedId) || orders[0]
  const specimen = selected ? specimenFor(data, selected.id) : null
  const patient = selected ? patientFor(data, selected.patientId) : null

  const updateSpecimen = (nextSpecimen, nextOrder, activityMessage, task) => {
    const now = new Date().toISOString()
    const lab = {
      ...data.lab,
      specimens: data.lab.specimens.map((item) => item.orderId === selected.id ? nextSpecimen : item),
      orders: data.lab.orders.map((item) => item.id === selected.id ? nextOrder : item),
      recollectionTasks: task
        ? [task, ...data.lab.recollectionTasks]
        : specimen.status === 'Rejected'
          ? data.lab.recollectionTasks.map((item) => item.orderId === selected.id && item.status === 'Open' ? { ...item, status: 'Completed', completedAt: now } : item)
          : data.lab.recollectionTasks,
      activity: [{ id: uid('LACT'), kind: 'Specimen', message: activityMessage, at: now }, ...data.lab.activity],
    }
    if (commit({ ...data, lab })) {
      setMessage(activityMessage)
      setActionError('')
      setNameConfirmed(false)
      setPatientId('')
      setRejectReason('')
      setShowCollectionDialog(false)
      setShowRejectDialog(false)
    }
  }

  const collect = () => {
    if (!selected || !specimen || !can('lab.collect')) { setActionError('Your role cannot collect specimens.'); return }
    if (!nameConfirmed || patientId.trim() !== patient?.id) { setActionError('Confirm the patient name and enter the exact patient ID before collection.'); return }
    if (!['Ordered', 'Rejected'].includes(specimen.status)) { setActionError('Only ordered or recollection-requested specimens can be collected.'); return }
    const now = new Date().toISOString()
    const nextSpecimen = { ...specimen, status: 'Collected', collectedAt: now, receivedAt: '', rejectedAt: '', rejectionReason: '', collectionChecks: { name: true, patientId: true }, recollectionRequested: false }
    updateSpecimen(nextSpecimen, { ...selected, status: 'Collected', collectedAt: now }, `${specimen.status === 'Rejected' ? 'Recollection completed' : 'Specimen collected'} · ${selected.id}`)
  }

  const receive = () => {
    if (!selected || !specimen || !can('lab.collect')) { setActionError('Your role cannot receive specimens.'); return }
    if (specimen.status !== 'Collected') { setActionError('Only a collected specimen can be received.'); return }
    const now = new Date().toISOString()
    updateSpecimen({ ...specimen, status: 'Received', receivedAt: now }, { ...selected, status: 'Received', receivedAt: now }, `Specimen received · ${selected.id}`)
  }

  const reject = () => {
    if (!selected || !specimen || !can('lab.collect')) { setActionError('Your role cannot reject specimens.'); return }
    if (specimen.status !== 'Collected' && specimen.status !== 'Received') { setActionError('Only a collected or received specimen can be rejected.'); return }
    if (!rejectReason.trim()) { setActionError('A documented rejection reason is required.'); return }
    const now = new Date().toISOString()
    const reason = rejectReason.trim()
    const task = { id: uid('RECOLLECT'), orderId: selected.id, patientId: selected.patientId, reason, status: 'Open', createdAt: now }
    const nextSpecimen = { ...specimen, status: 'Rejected', rejectedAt: now, rejectionReason: reason, recollectionRequested: true, receivedAt: '' }
    const nextOrder = { ...selected, status: 'Ordered', resultValues: {}, resultStatus: 'Not entered', notification: null }
    const notification = { id: uid('LNOT'), orderId: selected.id, kind: 'Specimen rejected', message: `${selected.id} rejected: ${reason}. Recollection requested.`, at: now, recipient: selected.orderedBy, read: false }
    const latest = { ...data.lab, notifications: [notification, ...data.lab.notifications], specimens: data.lab.specimens.map((item) => item.orderId === selected.id ? nextSpecimen : item), orders: data.lab.orders.map((item) => item.id === selected.id ? nextOrder : item), recollectionTasks: [task, ...data.lab.recollectionTasks], activity: [{ id: uid('LACT'), kind: 'Specimen', message: `Specimen rejected · recollection requested · ${selected.id}`, at: now }, ...data.lab.activity] }
    if (commit({ ...data, lab: latest })) {
      setMessage('Specimen rejected. A re-collection task was created and the ordering clinician was notified in the shared workspace.')
      setActionError('')
      setRejectReason('')
      setNameConfirmed(false)
      setPatientId('')
      setShowRejectDialog(false)
    }
  }

  return <>
    <PageHeader title="Specimen management" description="Verify two patient identifiers, collect and receive samples, or reject with a documented reason." />
    <div className="hms-lab">
      <LabError error={error} />
      {message ? <LabNotice tone="success">{message}</LabNotice> : null}
      {actionError ? <LabNotice tone="error">{actionError}</LabNotice> : null}
      <LabNotice>Collection records an on-screen label preview only. No physical label is printed or external clinician is notified.</LabNotice>
      <div className="hms-lab__specimen-layout">
        <LabPanel title="Open specimen orders" description="Select an order to manage its specimen.">
          <div className="hms-lab__specimen-list">{orders.map((order) => {
            const item = specimenFor(data, order.id)
            return <button type="button" className={`hms-lab__specimen-choice${selected?.id === order.id ? ' is-selected' : ''}`} onClick={() => { setSelectedId(order.id); setMessage(''); setActionError(''); setNameConfirmed(false); setPatientId(''); setRejectReason('') }} key={order.id}><span><strong>{testFor(data, order.testId)?.name || 'Unknown test'}</strong><small>{patientFor(data, order.patientId)?.firstName} {patientFor(data, order.patientId)?.lastName} · {order.id}</small></span><LabStatus>{item?.status || 'Not recorded'}</LabStatus><small>{elapsed(order.orderedAt)} since order</small></button>
          })}{!orders.length ? <LabEmpty title="No open specimens">New lab orders will be listed here.</LabEmpty> : null}</div>
        </LabPanel>
        {selected && specimen ? <div className="hms-lab__specimen-detail">
          <LabPanel title="Patient and specimen" description={`${selected.id} · ${testFor(data, selected.testId)?.specimenType || specimen.type}`}>
            <LabPatient patient={patient} secondary={selected.location} />
            <dl className="hms-lab__detail-list"><div><dt>Test</dt><dd>{testFor(data, selected.testId)?.name}</dd></div><div><dt>Ordered by</dt><dd>{selected.orderedBy}</dd></div><div><dt>Specimen status</dt><dd><LabStatus>{specimen.status}</LabStatus></dd></div><div><dt>Collected</dt><dd>{dateTime(specimen.collectedAt)}</dd></div><div><dt>Received</dt><dd>{dateTime(specimen.receivedAt)}</dd></div></dl>
            {specimen.status === 'Rejected' ? <LabNotice tone="error">Rejected: {specimen.rejectionReason}. A recollection task is open.</LabNotice> : null}
            {['Ordered', 'Rejected'].includes(specimen.status) && can('lab.collect') ? <button type="button" className="hms-lab__button hms-lab__button--primary" onClick={() => setShowCollectionDialog(true)}><Icon name="testTube" size={15} />{specimen.status === 'Rejected' ? 'Collect recollection' : 'Confirm collection'}</button> : null}
            {specimen.status === 'Collected' && can('lab.collect') ? <div className="hms-lab__receive-actions"><LabNotice tone="success">Collection recorded at {dateTime(specimen.collectedAt)}. Label preview: {selected.id} · {patient?.id} · {specimen.type}</LabNotice><button type="button" className="hms-lab__button hms-lab__button--primary" onClick={receive}><Icon name="checkCircle" size={15} />Receive in laboratory</button></div> : null}
            {['Collected', 'Received'].includes(specimen.status) && can('lab.collect') ? <button type="button" className="hms-lab__button hms-lab__button--danger" onClick={() => setShowRejectDialog(true)}><Icon name="xCircle" size={15} />Reject and request recollection</button> : null}
            {!can('lab.collect') ? <LabNotice>Your role can view specimens but cannot collect, receive, or reject them.</LabNotice> : null}
          </LabPanel>
          <Dialog open={showCollectionDialog} title="Confirm patient and collect specimen" description="Verify two patient identifiers before collection." onClose={() => setShowCollectionDialog(false)}>
            <div className="hms-lab__collection-checks"><strong>Two-identifier collection check</strong><small>Match the patient against the wristband or approved identity source and the order.</small><label className="hms-lab__check"><input type="checkbox" checked={nameConfirmed} onChange={(event) => setNameConfirmed(event.target.checked)} /><span>Patient name confirmed: {patient?.firstName} {patient?.lastName}</span></label><LabField label="Patient ID" value={patientId} onChange={setPatientId} placeholder="Enter the patient ID exactly" autoComplete="off" /></div>
            <button type="button" className="hms-lab__button hms-lab__button--primary" onClick={collect}><Icon name="testTube" size={15} />Confirm collection</button>
          </Dialog>
          <Dialog open={showRejectDialog} title="Reject specimen" description="Record the reason and request a replacement sample." onClose={() => setShowRejectDialog(false)}>
            <div className="hms-lab__reject-box"><LabField label="Rejection reason" value={rejectReason} onChange={setRejectReason} placeholder="e.g., insufficient volume, haemolysed, incorrect container" maxLength="240" /><button type="button" className="hms-lab__button hms-lab__button--danger" onClick={reject}><Icon name="xCircle" size={15} />Reject and request recollection</button></div>
          </Dialog>
          {data.lab.recollectionTasks.some((task) => task.orderId === selected.id && task.status === 'Open') ? <LabPanel title="Re-collection task" description="A rejected specimen needs a replacement sample."><LabNotice tone="warning">{data.lab.recollectionTasks.find((task) => task.orderId === selected.id && task.status === 'Open')?.reason}</LabNotice><LabNotice>The ordering clinician has been notified within the shared workspace.</LabNotice></LabPanel> : null}
        </div> : <LabPanel title="Select a specimen"><LabEmpty title="No specimen selected">Choose an open order.</LabEmpty></LabPanel>}
      </div>
    </div>
  </>
}
