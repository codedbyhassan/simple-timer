import { Link } from 'react-router-dom'
import { Icon, PageHeader, StatusBadge } from '@ui'
import { DoctorEmpty, DoctorError, DoctorPanel, DoctorPatient, ageLabel, patientFor, priorityRank, statusTone } from './DoctorShared.jsx'
import './doctor styles/shared.css'
import './doctor styles/opd.css'

const STAGES = ['Registered', 'Waiting for triage', 'Waiting for clinician', 'Investigations', 'In consultation', 'Pharmacy / billing', 'Admitted']

export default function DoctorOpdQueuePage({ data, error }) {
  const queue = data.queue.filter((entry) => STAGES.includes(entry.stage))
  return <>
    <PageHeader title="OPD queue" description="Shared outpatient activity from arrival through clinician review, investigations, and disposition." actions={<Link className="hms-doctor__button hms-doctor__button--primary" to="/doctor/queue"><Icon name="stethoscope" size={16} />My clinician queue</Link>} />
    <div className="hms-doctor">
      <DoctorError error={error} />
      <div className="hms-doctor__opd-summary"><div><small>Active visits</small><strong>{queue.length}</strong></div><div><small>Waiting for triage</small><strong>{queue.filter((entry) => ['Registered', 'Waiting for triage'].includes(entry.stage)).length}</strong></div><div><small>Clinical review</small><strong>{queue.filter((entry) => ['Waiting for clinician', 'In consultation'].includes(entry.stage)).length}</strong></div><div><small>Investigations</small><strong>{queue.filter((entry) => entry.stage === 'Investigations').length}</strong></div></div>
      {STAGES.map((stage) => {
        const entries = queue.filter((entry) => entry.stage === stage).sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || new Date(a.arrivedAt) - new Date(b.arrivedAt))
        return <DoctorPanel className="hms-doctor__opd-stage" key={stage} title={stage} description={`${entries.length} encounter${entries.length === 1 ? '' : 's'}`}>
          {entries.length ? <div className="hms-doctor__opd-list">{entries.map((entry) => <article key={entry.id}><DoctorPatient patient={patientFor(data, entry.patientId)} secondary={entry.department} /><span className="hms-doctor__opd-reason">{entry.reason || 'No presenting concern recorded'}<small>{ageLabel(entry.arrivedAt)} waiting · {entry.id}</small></span><StatusBadge tone={statusTone(entry.priority)}>{entry.priority || 'Routine'}</StatusBadge>{['Waiting for clinician', 'In consultation', 'Investigations'].includes(entry.stage) ? <Link className="hms-doctor__button hms-doctor__button--quiet" to="/doctor/consultation" state={{ encounterId: entry.id }}>Open encounter</Link> : <span className="hms-doctor__muted">No clinician action</span>}</article>)}</div> : <DoctorEmpty title="No encounters in this stage" />}
        </DoctorPanel>
      })}
      {!queue.length ? <DoctorEmpty title="OPD queue is clear">New check-ins will appear here from Reception.</DoctorEmpty> : null}
      <p className="hms-doctor__footnote">OPD encounters are shared with Reception and Nursing. Complete triage before starting a new clinical review.</p>
    </div>
  </>
}
