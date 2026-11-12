import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, PageHeader, StatusBadge } from '@ui'
import { resultFlag } from '../lab/LabShared.jsx'
import { DoctorEmpty, DoctorError, DoctorNotice, DoctorPanel, DoctorPatient, dateTime, patientFor, statusTone, uid } from './DoctorShared.jsx'
import './doctor styles/shared.css'
import './doctor styles/results.css'

function resultRows(data, order) {
  const test = data.lab.catalogue.find((item) => item.id === order.testId)
  return (test?.components || []).map((component) => ({
    ...component,
    value: order.resultValues?.[component.key] ?? '',
    flag: resultFlag(component, order.resultValues?.[component.key] ?? ''),
  }))
}

export default function DoctorResultsPage({ data, error, commit, can }) {
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const activePatientIds = new Set(data.queue.map((entry) => entry.patientId))
  const orders = data.lab.orders.filter((order) => activePatientIds.has(order.patientId)
    && (order.resultStatus === 'Verified' || resultRows(data, order).some((row) => row.flag === 'Critical')))
    .sort((a, b) => {
      const critical = Number(resultRows(data, b).some((row) => row.flag === 'Critical')) - Number(resultRows(data, a).some((row) => row.flag === 'Critical'))
      return critical || (b.verifiedAt || b.orderedAt).localeCompare(a.verifiedAt || a.orderedAt)
    })
  const reviewedIds = new Set((data.doctor.reviewedResults || []).map((item) => item.orderId))
  const acknowledge = async (order) => {
    setMessage('')
    setActionError('')
    if (!can('clinical.consult')) { setActionError('Your role cannot acknowledge clinical results.'); return }
    const critical = resultRows(data, order).some((row) => row.flag === 'Critical')
    if (critical && !order.notification?.notifiedAt) { setActionError('The laboratory must document clinician notification before you acknowledge this critical result.'); return }
    if (reviewedIds.has(order.id) || (critical && order.notification?.acknowledgedAt)) { setActionError('This result has already been acknowledged.'); return }
    const now = new Date().toISOString()
    const lab = critical ? {
      ...data.lab,
      orders: data.lab.orders.map((item) => item.id === order.id ? {
        ...item,
        notification: { ...item.notification, acknowledgedBy: 'Clinician', acknowledgedAt: now },
      } : item),
      acknowledgedCritical: [...new Set([...(data.lab.acknowledgedCritical || []), order.id])],
      activity: [{ id: uid('LACT'), kind: 'Critical', message: `Critical result acknowledged by clinician · ${order.id}`, at: now }, ...data.lab.activity],
    } : data.lab
    const doctor = {
      ...data.doctor,
      reviewedResults: [...(data.doctor.reviewedResults || []), { orderId: order.id, reviewedAt: now, reviewedBy: 'Clinician' }],
    }
    if (await commit({ ...data, lab, doctor })) setMessage(`${critical ? 'Critical acknowledgement' : 'Result review'} recorded for ${order.id}.`)
  }

  return <>
    <PageHeader title="Results inbox" description="Verified results for your active patients. Critical values and unacknowledged alerts appear first." actions={<Link className="hms-doctor__button hms-doctor__button--quiet" to="/doctor/queue"><Icon name="listOrdered" size={16} />My queue</Link>} />
    <div className="hms-doctor">
      <DoctorError error={error} />
      {message ? <DoctorNotice tone="success">{message}</DoctorNotice> : null}
      {actionError ? <DoctorNotice tone="error">{actionError}</DoctorNotice> : null}
      <DoctorPanel title="Patient results" description={`${orders.length} verified result${orders.length === 1 ? '' : 's'} or critical alert${orders.length === 1 ? '' : 's'} in the shared workspace.`}>
        {orders.length ? <div className="hms-doctor__result-list">{orders.map((order) => {
          const rows = resultRows(data, order)
          const critical = rows.some((row) => row.flag === 'Critical')
          const acknowledged = Boolean(order.notification?.acknowledgedAt) || reviewedIds.has(order.id)
          const test = data.lab.catalogue.find((item) => item.id === order.testId)
          const pendingCritical = critical && order.resultStatus !== 'Verified'
          return <article className={`hms-doctor__result-card${critical ? ' is-critical' : ''}`} key={order.id}>
            <header><DoctorPatient patient={patientFor(data, order.patientId)} secondary={order.encounterId || 'No encounter linked'} /><span><StatusBadge tone={critical ? 'critical' : statusTone(order.resultStatus)}>{critical ? 'Critical result' : order.resultStatus}</StatusBadge><small>{dateTime(order.verifiedAt || order.orderedAt)}</small></span></header>
            <div className="hms-doctor__result-summary"><div><strong>{test?.name || 'Laboratory result'}</strong><small>{order.id} · Ordered by {order.orderedBy || 'Clinical team'}</small></div>{order.resultStatus === 'Verified' ? <StatusBadge tone="success">Verified</StatusBadge> : <StatusBadge tone="warning">Awaiting verification</StatusBadge>}</div>
            <div className="hms-doctor__result-values">{rows.map((row) => <div key={row.key}><span>{row.label}<small>{row.low !== undefined ? `Ref ${row.low}–${row.high} ${row.unit}` : row.unit}</small></span><strong>{row.value || '—'} {row.unit}</strong><StatusBadge tone={statusTone(row.flag)}>{row.flag || 'Recorded'}</StatusBadge></div>)}</div>
            {pendingCritical ? <DoctorNotice tone={order.notification?.notifiedAt ? 'warning' : 'error'}>{order.notification?.notifiedAt ? `Laboratory documented notification to ${order.notification.notifiedTo || 'clinician'} by ${order.notification.method || 'unspecified'}. Acknowledge to allow verification.` : 'Awaiting the laboratory notification record before clinician acknowledgement.'}</DoctorNotice> : null}
            {acknowledged ? <DoctorNotice tone="success">{order.notification?.acknowledgedAt ? `Acknowledged by ${order.notification.acknowledgedBy || 'clinician'} · ${dateTime(order.notification.acknowledgedAt)}` : `Reviewed by clinician · ${dateTime((data.doctor.reviewedResults || []).find((item) => item.orderId === order.id)?.reviewedAt)}`}</DoctorNotice> : <button type="button" className="hms-doctor__button hms-doctor__button--primary" onClick={() => acknowledge(order)} disabled={pendingCritical && !order.notification?.notifiedAt}><Icon name="checkCircle" size={15} />{critical ? 'Acknowledge critical result' : 'Acknowledge result'}</button>}
          </article>
        })}</div> : <DoctorEmpty title="No new results">Verified results and critical laboratory notifications for your active patients will appear here.</DoctorEmpty>}
      </DoctorPanel>
      <p className="hms-doctor__footnote">Only verified results are final. Critical values must be notified by the laboratory and acknowledged before verification.</p>
    </div>
  </>
}
