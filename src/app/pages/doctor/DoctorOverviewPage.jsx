import { Link } from 'react-router-dom'
import { Icon, PageHeader, StatusBadge } from '@ui'
import { DoctorEmpty, DoctorError, DoctorMetric, DoctorPanel, DoctorPatient, ageLabel, patientFor, priorityRank, statusTone } from './DoctorShared.jsx'
import './doctor styles/shared.css'
import './doctor styles/overview.css'

export default function DoctorOverviewPage({ data, error }) {
  const queue = data.queue.filter((entry) => ['Waiting for clinician', 'In consultation'].includes(entry.stage)).sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || new Date(a.arrivedAt) - new Date(b.arrivedAt))
  const critical = data.lab.orders.filter((order) => order.notification?.notifiedAt && !order.notification?.acknowledgedAt)
  const verified = data.lab.orders.filter((order) => order.resultStatus === 'Verified' || order.status === 'Verified')
  const admissions = data.nurse?.admissions?.filter((item) => item.status === 'Admitted') || []
  const today = new Date().toISOString().slice(0, 10)
  const drafts = data.doctor.drafts.filter((draft) => draft.status !== 'Finalised')

  return <>
    <PageHeader title="Clinical overview" description="Your outpatient handovers, results needing attention, and current admissions." actions={<Link className="hms-doctor__button hms-doctor__button--primary" to="/doctor/queue"><Icon name="listOrdered" size={16} />Open my queue</Link>} />
    <div className="hms-doctor">
      <DoctorError error={error} />
      <div className="hms-doctor__metrics">
        <DoctorMetric label="Ready for review" value={queue.length} detail="Waiting or in consultation" icon="stethoscope" />
        <DoctorMetric label="Critical results" value={critical.length} detail="Acknowledgement required" icon="alertTriangle" tone="critical" />
        <DoctorMetric label="Verified results" value={verified.length} detail="Available in results inbox" icon="flask" tone="success" />
        <DoctorMetric label="Active admissions" value={admissions.length} detail="Patients under inpatient care" icon="bed" />
      </div>
      <div className="hms-doctor__overview-grid">
        <DoctorPanel title="My queue" description="Priority handovers appear first." actions={<Link className="hms-doctor__text-link" to="/doctor/queue">View queue <Icon name="arrowRight" size={15} /></Link>}>
          <div className="hms-doctor__overview-list">{queue.slice(0, 4).map((entry) => <Link className="hms-doctor__overview-row" key={entry.id} to="/doctor/consultation" state={{ encounterId: entry.id }}><DoctorPatient patient={patientFor(data, entry.patientId)} secondary={entry.department} /><span><StatusBadge tone={statusTone(entry.priority)}>{entry.priority || 'Routine'}</StatusBadge><small>{ageLabel(entry.arrivedAt)}</small></span></Link>)}{!queue.length ? <DoctorEmpty title="No patients waiting">New clinician handovers appear here after triage.</DoctorEmpty> : null}</div>
        </DoctorPanel>
        <DoctorPanel title="Results inbox" description="Unacknowledged critical results are highlighted first." actions={<Link className="hms-doctor__text-link" to="/doctor/results">Open inbox <Icon name="arrowRight" size={15} /></Link>}>
          <div className="hms-doctor__overview-list">{[...data.lab.orders].filter((order) => order.resultStatus === 'Verified' || (order.notification?.notifiedAt && !order.notification?.acknowledgedAt)).sort((a, b) => Number(Boolean(b.notification?.notifiedAt && !b.notification?.acknowledgedAt)) - Number(Boolean(a.notification?.notifiedAt && !a.notification?.acknowledgedAt)) || (b.verifiedAt || '').localeCompare(a.verifiedAt || '')).slice(0, 4).map((order) => <div className="hms-doctor__overview-row" key={order.id}><DoctorPatient patient={patientFor(data, order.patientId)} secondary={order.testId} /><StatusBadge tone={order.notification?.notifiedAt && !order.notification?.acknowledgedAt ? 'critical' : 'success'}>{order.notification?.notifiedAt && !order.notification?.acknowledgedAt ? 'Critical · acknowledge' : 'Verified'}</StatusBadge></div>)}{!data.lab.orders.some((order) => order.resultStatus === 'Verified' || order.notification?.notifiedAt) ? <DoctorEmpty title="No new results">Verified results and critical notifications will appear here.</DoctorEmpty> : null}</div>
        </DoctorPanel>
      </div>
      <DoctorPanel title="Consultation drafts" description="Continue saved notes or review what remains before finalisation.">
        <div className="hms-doctor__draft-list">{drafts.slice(0, 3).map((draft) => { const patient = patientFor(data, draft.patientId); return <Link key={draft.encounterId} to="/doctor/consultation" state={{ encounterId: draft.encounterId }}><span><strong>{patient?.firstName} {patient?.lastName}</strong><small>{draft.diagnosisCode ? `${draft.diagnosisCode} · ${draft.diagnosisDescription}` : 'Diagnosis not coded'} · {draft.disposition || 'Disposition pending'}</small></span><Icon name="arrowUpRight" size={16} /></Link> })}{!drafts.length ? <DoctorEmpty title="No open drafts">Start from a patient handover to begin a consultation.</DoctorEmpty> : null}</div>
      </DoctorPanel>
      <p className="hms-doctor__footnote">Counts reflect the shared browser-local workspace. {today} · Not connected to a production clinical record system.</p>
    </div>
  </>
}
