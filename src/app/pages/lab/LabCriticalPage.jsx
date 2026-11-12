import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Icon, PageHeader, StatusBadge } from '@ui'
import { LabEmpty, LabError, LabField, LabNotice, LabPanel, LabPatient, dateTime, patientFor, resultFlag, testFor, uid } from './LabShared.jsx'
import './lab styles/shared.css'
import './lab styles/critical.css'

const criticalValues = (data, order) => (testFor(data, order.testId)?.components || []).map((component) => ({
  component,
  value: order.resultValues?.[component.key] ?? '',
  flag: resultFlag(component, order.resultValues?.[component.key] ?? ''),
})).filter((item) => item.flag === 'Critical')

export default function LabCriticalPage({ data, error, commit, can }) {
  const location = useLocation()
  const [selectedId, setSelectedId] = useState(location.state?.orderId || '')
  const [recipient, setRecipient] = useState('')
  const [channel, setChannel] = useState('Phone')
  const [acknowledgedBy, setAcknowledgedBy] = useState('')
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const orders = data.lab.orders.filter((order) => criticalValues(data, order).length > 0)
    .sort((a, b) => (a.status === 'Verified') - (b.status === 'Verified') || a.orderedAt.localeCompare(b.orderedAt))
  const selected = orders.find((order) => order.id === selectedId) || orders[0]
  const pending = selected ? selected.resultStatus !== 'Verified' : false
  const details = selected ? criticalValues(data, selected) : []

  const saveNotification = async () => {
    setMessage('')
    setActionError('')
    if (!selected || !can('lab.verify')) { setActionError('Your role cannot document critical-result notification.'); return }
    if (!recipient.trim()) { setActionError('Record the name of the clinician notified.'); return }
    const now = new Date().toISOString()
    const notification = { ...(selected.notification || {}), notifiedTo: recipient.trim(), method: channel, notifiedAt: now }
    const lab = {
      ...data.lab,
      orders: data.lab.orders.map((order) => order.id === selected.id ? { ...order, notification } : order),
      notifications: [{ id: uid('LNOT'), orderId: selected.id, kind: 'Critical result notification', message: `Critical result for ${selected.id} communicated to ${recipient.trim()} by ${channel}.`, at: now, recipient: selected.orderedBy, read: false }, ...data.lab.notifications],
      activity: [{ id: uid('LACT'), kind: 'Critical', message: `Critical result communicated to ${recipient.trim()} · ${selected.id}`, at: now }, ...data.lab.activity],
    }
    if (await commit({ ...data, lab })) {
      setMessage(`Notification record saved for ${selected.id}. Record the clinician's acknowledgement separately.`)
      setActionError('')
    }
  }

  const saveAcknowledgement = async () => {
    setMessage('')
    setActionError('')
    if (!selected || !can('lab.verify')) { setActionError('Your role cannot record critical-result acknowledgement.'); return }
    if (!selected.notification?.notifiedAt) { setActionError('Record clinician notification before acknowledgement.'); return }
    if (!acknowledgedBy.trim()) { setActionError('Enter the name of the clinician acknowledging the critical result.'); return }
    const now = new Date().toISOString()
    const notification = { ...selected.notification, acknowledgedBy: acknowledgedBy.trim(), acknowledgedAt: now }
    const lab = {
      ...data.lab,
      orders: data.lab.orders.map((order) => order.id === selected.id ? { ...order, notification } : order),
      acknowledgedCritical: [...new Set([...data.lab.acknowledgedCritical, selected.id])],
      activity: [{ id: uid('LACT'), kind: 'Critical', message: `Critical result acknowledged by ${acknowledgedBy.trim()} · ${selected.id}`, at: now }, ...data.lab.activity],
    }
    if (await commit({ ...data, lab })) setMessage(`Clinician acknowledgement recorded for ${selected.id}. Result verification is now available.`)
  }

  return <>
    <PageHeader title="Critical results" description="Critical values remain open until clinician notification and acknowledgement are documented." />
    <div className="hms-lab">
      <LabError error={error} />
      {message ? <LabNotice tone="success">{message}</LabNotice> : null}
      {actionError ? <LabNotice tone="error">{actionError}</LabNotice> : null}
      <LabNotice tone="warning">Communication details are recorded locally; this page does not contact a clinician or send an external alert. Follow hospital critical-value policy.</LabNotice>
      <div className="hms-lab__critical-layout">
        <LabPanel title={`Critical results · ${orders.length}`} description="Open items first; acknowledged or verified results remain in the list for review.">
          {orders.length ? <div className="hms-lab__critical-list">{orders.map((order) => <button type="button" className={`hms-lab__critical-choice${selected?.id === order.id ? ' is-selected' : ''}`} onClick={() => { setSelectedId(order.id); setMessage(''); setActionError('') }} key={order.id}><span className="hms-lab__critical-icon"><Icon name="alertTriangle" size={17} /></span><span><strong>{testFor(data, order.testId)?.name}</strong><small>{patientFor(data, order.patientId)?.firstName} {patientFor(data, order.patientId)?.lastName} · {order.id}</small></span><StatusBadge tone={order.resultStatus === 'Verified' ? 'success' : order.notification?.acknowledgedAt ? 'info' : 'critical'}>{order.resultStatus === 'Verified' ? 'Verified' : order.notification?.acknowledgedAt ? 'Acknowledged' : 'Open'}</StatusBadge></button>)}</div> : <LabEmpty title="No critical values recorded">Critical flags will be generated from result component ranges.</LabEmpty>}
        </LabPanel>
        {selected ? <div className="hms-lab__critical-detail">
          <LabPanel title="Critical result detail" description={`${selected.id} · ordered by ${selected.orderedBy}`}>
            <LabPatient patient={patientFor(data, selected.patientId)} secondary={selected.encounterId || 'No encounter linked'} />
            <div className="hms-lab__critical-values">{details.map(({ component, value }) => <div key={component.key}><span><strong>{component.label}</strong><small>Configured threshold: below {component.criticalLow ?? '—'} or above {component.criticalHigh ?? '—'} {component.unit}</small></span><span className="hms-lab__critical-result">{value} {component.unit}<StatusBadge tone="critical">Critical</StatusBadge></span></div>)}</div>
            <LabNotice tone={selected.notification?.notifiedAt ? 'success' : 'error'}>{selected.notification?.notifiedAt ? `Clinician notified: ${selected.notification.notifiedTo} · ${selected.notification.method} · ${dateTime(selected.notification.notifiedAt)}` : 'Clinician notification has not been documented.'}</LabNotice>
            {pending && can('lab.verify') ? <div className="hms-lab__notify-form"><h3>Document clinician notification</h3><div className="hms-lab__form-row"><LabField label="Clinician notified" value={recipient || selected.notification?.notifiedTo || selected.orderedBy} onChange={setRecipient} placeholder="Name of clinician" /><LabField label="Communication method" value={channel || selected.notification?.method || 'Phone'} onChange={setChannel} options={['Phone', 'Secure in-app message', 'In person', 'Other approved method']} /></div><button type="button" className="hms-lab__button hms-lab__button--primary" onClick={saveNotification}><Icon name="bell" size={15} />Record notification</button></div> : null}
            <LabNotice tone={selected.notification?.acknowledgedAt ? 'success' : 'warning'}>{selected.notification?.acknowledgedAt ? `Acknowledged by ${selected.notification.acknowledgedBy} · ${dateTime(selected.notification.acknowledgedAt)}` : 'Clinician acknowledgement is required before this critical result can be verified.'}</LabNotice>
            {pending && can('lab.verify') ? <div className="hms-lab__notify-form"><h3>Record clinician acknowledgement</h3><div className="hms-lab__form-row"><LabField label="Acknowledged by" value={acknowledgedBy} onChange={setAcknowledgedBy} placeholder="Name of acknowledging clinician" disabled={!selected.notification?.notifiedAt} /></div><button type="button" className="hms-lab__button" disabled={!selected.notification?.notifiedAt} onClick={saveAcknowledgement}><Icon name="checkCircle" size={15} />Record acknowledgement</button></div> : null}
            {!pending ? <LabNotice tone="success">This result is verified and the communication record is retained for review.</LabNotice> : null}
            {!can('lab.verify') ? <LabNotice>Your role can view critical results but cannot document notification or acknowledgement.</LabNotice> : null}
          </LabPanel>
          {pending ? <LabPanel title="Next step"><p className="hms-lab__critical-next">After notification and acknowledgement, return to result entry to perform the separate verification action.</p><Link className="hms-lab__button" to="/lab/results" state={{ orderId: selected.id }}>Open result verification</Link></LabPanel> : null}
        </div> : <LabPanel title="Select a critical result"><LabEmpty title="No result selected">Choose a critical result.</LabEmpty></LabPanel>}
      </div>
    </div>
  </>
}
