import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Dialog, Icon, PageHeader, StatusBadge } from '@ui'
import { LabEmpty, LabError, LabField, LabNotice, LabPanel, LabPatient, LabStatus, elapsed, patientFor, resultFlag, specimenFor, testFor, tone, uid } from './LabShared.jsx'
import './lab styles/shared.css'
import './lab styles/results.css'

export default async async function LabResultsPage({ data, error, commit, can }) {
  const location = useLocation()
  const [selectedId, setSelectedId] = useState(location.state?.orderId || '')
  const [drafts, setDrafts] = useState({})
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [showResultEntry, setShowResultEntry] = useState(false)
  const orders = data.lab.orders.filter((order) => ['Received', 'In process', 'Awaiting verification'].includes(order.status) && order.resultStatus !== 'Verified')
    .sort((a, b) => (a.priority === 'Urgent' ? -1 : a.priority === 'Priority' ? 0 : 1) - (b.priority === 'Urgent' ? -1 : b.priority === 'Priority' ? 0 : 1) || a.orderedAt.localeCompare(b.orderedAt))
  const selected = orders.find((order) => order.id === selectedId) || orders[0]
  const test = selected ? testFor(data, selected.testId) : null
  const values = selected ? { ...(selected.resultValues || {}), ...(drafts[selected.id] || {}) } : {}
  const components = test?.components || []
  const flags = components.map((component) => ({ component, value: values[component.key] ?? '', flag: resultFlag(component, values[component.key] ?? '') }))
  const critical = flags.some((row) => row.flag === 'Critical')
  const allEntered = components.length > 0 && components.every((component) => String(values[component.key] ?? '').trim() !== '')
  const notification = selected?.notification
  const criticalReady = !critical || Boolean(notification?.notifiedAt && notification?.acknowledgedAt)

  const changeValue = (key, value) => {
    if (!selected) return
    setDrafts((current) => ({ ...current, [selected.id]: { ...(current[selected.id] || {}), [key]: value } }))
    setMessage('')
    setActionError('')
  }

  const saveResults = () => {
    setMessage('')
    setActionError('')
    if (!selected || !can('lab.process')) { setActionError('Your role cannot enter results.'); return }
    if (!['Received', 'In process', 'Awaiting verification'].includes(selected.status)) { setActionError('The specimen must be received before result entry.'); return }
    if (!allEntered) { setActionError('Enter a value for every test component before saving the result.'); return }
    const now = new Date().toISOString()
    const updated = {
      ...selected,
      status: 'Awaiting verification',
      resultStatus: 'Awaiting verification',
      resultValues: values,
      resultEnteredAt: now,
      resultEnteredBy: 'Laboratory technician',
      notification: null,
    }
    const lab = {
      ...data.lab,
      orders: data.lab.orders.map((order) => order.id === selected.id ? updated : order),
      activity: [{ id: uid('LACT'), kind: 'Result', message: `${test?.name || 'Result'} entered for ${selected.id}${critical ? ' · critical value detected' : ''}`, at: now }, ...data.lab.activity],
      notifications: critical ? [{ id: uid('LNOT'), orderId: selected.id, kind: 'Critical result', message: `Critical result entered for ${selected.id}. Clinician notification and acknowledgement are required.`, at: now, recipient: selected.orderedBy, read: false }, ...data.lab.notifications] : data.lab.notifications,
    }
    if (await commit({ ...data, lab })) {
      setDrafts((current) => { const next = { ...current }; delete next[selected.id]; return next })
      setMessage(critical ? 'Result saved. A critical-result follow-up was added; notify the clinician and record acknowledgement before verification.' : 'Result saved for separate verification.')
      setShowResultEntry(false)
    }
  }

  const verify = () => {
    setMessage('')
    setActionError('')
    if (!selected || !can('lab.verify')) { setActionError('Your role cannot verify laboratory results.'); return }
    if (selected.resultStatus !== 'Awaiting verification' || !allEntered) { setActionError('Save a complete result before verification.'); return }
    if (!criticalReady) { setActionError('Notify the requesting clinician and document acknowledgement before verifying a critical result.'); return }
    const now = new Date().toISOString()
    const updated = { ...selected, status: 'Verified', resultStatus: 'Verified', verifiedAt: now, verifiedBy: 'Laboratory technician' }
    const otherOrders = data.lab.orders.filter((order) => order.encounterId === selected.encounterId && order.id !== selected.id)
    const allEncounterTestsVerified = selected.encounterId && otherOrders.every((order) => order.status === 'Verified')
    const queue = data.queue.map((entry) => entry.id === selected.encounterId && entry.stage === 'Investigations' && allEncounterTestsVerified
      ? { ...entry, stage: 'Waiting for clinician', laboratoryStatus: 'Investigations complete', laboratoryUpdatedAt: now }
      : entry)
    const payment = {
      id: uid('INV'),
      patientId: selected.patientId,
      date: now.slice(0, 10),
      description: `Laboratory · ${test?.name || selected.id}`,
      billed: Number(test?.fee || 0),
      paid: 0,
      method: '—',
      status: 'Unpaid',
      source: 'Laboratory',
      orderId: selected.id,
    }
    const lab = {
      ...data.lab,
      orders: data.lab.orders.map((order) => order.id === selected.id ? updated : order),
      activity: [{ id: uid('LACT'), kind: 'Verification', message: `Result verified · ${selected.id}`, at: now }, ...data.lab.activity],
      notifications: [{ id: uid('LNOT'), orderId: selected.id, kind: 'Verified result', message: `Verified result is available for ${selected.id}.`, at: now, recipient: selected.orderedBy, read: false }, ...data.lab.notifications],
    }
    if (await commit({ ...data, queue, payments: [payment, ...data.payments], lab })) setMessage('Result verified. A laboratory charge and clinician notification were added to the shared workspace.')
  }

  return <>
    <PageHeader title="Result entry and verification" description="Enter component values with units and reference ranges. Result entry and verification are separate actions." />
    <div className="hms-lab">
      <LabError error={error} />
      {message ? <LabNotice tone="success">{message}</LabNotice> : null}
      {actionError ? <LabNotice tone="error">{actionError}</LabNotice> : null}
      <LabNotice>Confirm hospital-approved reference ranges and analyser/manual results; unverified values are not final.</LabNotice>
      <div className="hms-lab__result-layout">
        <LabPanel title="Ready for result entry" description="Received specimens and results awaiting independent verification.">
          <div className="hms-lab__result-list">{orders.map((order) => <button type="button" className={`hms-lab__result-choice${selected?.id === order.id ? ' is-selected' : ''}`} onClick={() => { setSelectedId(order.id); setMessage(''); setActionError('') }} key={order.id}><span><strong>{testFor(data, order.testId)?.name || 'Unknown test'}</strong><small>{patientFor(data, order.patientId)?.firstName} {patientFor(data, order.patientId)?.lastName} · {order.id}</small></span><LabStatus>{order.status}</LabStatus><small>{elapsed(order.orderedAt)}</small></button>)}{!orders.length ? <LabEmpty title="No results awaiting work">Results enter this list after a specimen is received.</LabEmpty> : null}</div>
        </LabPanel>
        {selected ? <div className="hms-lab__result-detail">
          <LabPanel title="Result record" description={`${selected.id} · ${test?.name || 'Unknown test'}`}>
            <LabPatient patient={patientFor(data, selected.patientId)} secondary={selected.encounterId || 'No encounter linked'} />
            <div className="hms-lab__result-meta"><span><small>Specimen</small><LabStatus>{specimenFor(data, selected.id)?.status || 'Not recorded'}</LabStatus></span><span><small>Order priority</small><StatusBadge tone={tone(selected.priority)}>{selected.priority}</StatusBadge></span><span><small>Result status</small><LabStatus>{selected.resultStatus}</LabStatus></span></div>
            <div className="hms-lab__result-grid"><div className="hms-lab__result-grid-head"><span>Component</span><span>Result</span><span>Reference range</span><span>Flag</span></div>{components.map((component) => {
              const flag = resultFlag(component, values[component.key] ?? '')
              const range = component.options ? component.options.join(' / ') : `${component.low ?? '—'}–${component.high ?? '—'} ${component.unit}`
              return <div className="hms-lab__result-row" key={component.key}><span className="hms-lab__component"><strong>{component.label}</strong><small>{component.unit}</small></span><strong>{values[component.key] ?? 'Not entered'}</strong><small className="hms-lab__reference">{range}</small><span>{flag ? <StatusBadge tone={tone(flag)}>{flag}</StatusBadge> : <span className="hms-lab__pending-flag">Pending</span>}</span></div>
            })}</div>
            <button type="button" className="hms-lab__button" onClick={() => setShowResultEntry(true)} disabled={!can('lab.process')}><Icon name="edit" size={15} />Enter or edit results</button>
            <Dialog open={showResultEntry} title="Enter laboratory results" description={`${selected.id} · ${test?.name || 'Unknown test'}`} onClose={() => setShowResultEntry(false)} size="large">
              <div className="hms-lab__result-grid"><div className="hms-lab__result-grid-head"><span>Component</span><span>Result</span><span>Reference range</span><span>Flag</span></div>{components.map((component) => {
                const flag = resultFlag(component, values[component.key] ?? '')
                const range = component.options ? component.options.join(' / ') : `${component.low ?? '—'}–${component.high ?? '—'} ${component.unit}`
                return <div className="hms-lab__result-row" key={component.key}><span className="hms-lab__component"><strong>{component.label}</strong><small>{component.unit}</small></span>{component.options ? <LabField label={`${component.label} result`} value={values[component.key] ?? ''} onChange={(value) => changeValue(component.key, value)} options={[{ value: '', label: 'Select result' }, ...component.options]} disabled={!can('lab.process')} /> : <LabField label={`${component.label} result`} type="number" step="any" value={values[component.key] ?? ''} onChange={(value) => changeValue(component.key, value)} disabled={!can('lab.process')} />}<small className="hms-lab__reference">{range}</small><span>{flag ? <StatusBadge tone={tone(flag)}>{flag}</StatusBadge> : <span className="hms-lab__pending-flag">Pending</span>}</span></div>
              })}</div>
              {critical ? <LabNotice tone="error">One or more values are outside the configured critical thresholds. Open Critical results to document clinician notification and acknowledgement before verification.</LabNotice> : null}
              <button type="button" className="hms-lab__button hms-lab__button--primary" disabled={!can('lab.process') || !allEntered} onClick={saveResults}><Icon name="checkCircle" size={15} />Save result</button>
            </Dialog>
            {critical ? <LabNotice tone="error">One or more values are outside the configured critical thresholds. Open Critical results to document clinician notification and acknowledgement before verification.</LabNotice> : null}
            {selected.resultStatus === 'Awaiting verification' && selected.notification?.acknowledgedAt ? <LabNotice tone="success">Critical clinician acknowledgement recorded: {selected.notification.acknowledgedBy} · {new Date(selected.notification.acknowledgedAt).toLocaleString()}.</LabNotice> : null}
            <div className="hms-lab__result-actions">
              <button type="button" className="hms-lab__button hms-lab__button--primary" disabled={!can('lab.verify') || selected.resultStatus !== 'Awaiting verification' || !allEntered || !criticalReady} onClick={verify}><Icon name="shieldCheck" size={15} />Verify result</button>
              {critical && !criticalReady ? <Link className="hms-lab__button hms-lab__button--danger" to="/lab/critical" state={{ orderId: selected.id }}><Icon name="alertTriangle" size={15} />Critical follow-up required</Link> : null}
            </div>
            {!can('lab.verify') ? <LabNotice>Your role can enter results but cannot verify them.</LabNotice> : null}
          </LabPanel>
          {selected.resultStatus === 'Verified' ? <LabPanel title="Verified result"><LabNotice tone="success">Verified by {selected.verifiedBy || 'laboratory staff'} · {new Date(selected.verifiedAt).toLocaleString()}.</LabNotice></LabPanel> : null}
        </div> : <LabPanel title="Select an investigation"><LabEmpty title="No investigation selected">Choose an item from the result worklist.</LabEmpty></LabPanel>}
      </div>
    </div>
  </>
}
