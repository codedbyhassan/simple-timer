import { Link } from 'react-router-dom'
import { Icon, PageHeader } from '@ui'
import { DoctorEmpty, DoctorError, DoctorPanel, EncounterLink, priorityRank } from './DoctorShared.jsx'
import './doctor styles/shared.css'
import './doctor styles/queue.css'

export default function DoctorQueuePage({ data, error }) {
  const entries = data.queue.filter((entry) => ['Waiting for clinician', 'In consultation'].includes(entry.stage)).sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || new Date(a.arrivedAt) - new Date(b.arrivedAt))
  return <>
    <PageHeader title="My queue" description="Clinician-ready handovers ordered by urgency and waiting time." actions={<Link className="hms-doctor__button hms-doctor__button--quiet" to="/doctor/opd"><Icon name="listOrdered" size={16} />View OPD queue</Link>} />
    <div className="hms-doctor">
      <DoctorError error={error} />
      <div className="hms-doctor__queue-summary"><strong>{entries.length}</strong><span>patients ready for clinical review</span><small>Priority order: urgent, priority, then routine · longest wait first</small></div>
      <DoctorPanel title="Clinician handovers" description="Vitals and presenting concerns are carried over from triage.">
        {entries.length ? <div className="hms-doctor__encounter-grid">{entries.map((entry) => <EncounterLink key={entry.id} entry={entry} data={data} action={entry.stage === 'In consultation' ? 'Continue consultation' : 'Start consultation'} />)}</div> : <DoctorEmpty title="No patients ready for review">Patients will enter the clinician queue after nursing handover.</DoctorEmpty>}
      </DoctorPanel>
      <p className="hms-doctor__footnote">Patients awaiting triage are visible in the OPD queue but cannot be started from this list.</p>
    </div>
  </>
}
