import { Link } from 'react-router-dom'
import { CountBadge, Icon, PageHeader, StatusBadge } from '@ui'
import { NurseEmpty, NurseErrorNotice, NursePatientIdentity, elapsedLabel, patientFor, statusTone } from './NurseShared.jsx'
import './nurse styles/shared.css'
import './nurse styles/opd-queue.css'

const QUEUE_STAGES = ['Registered', 'Waiting for triage', 'Waiting for clinician', 'Investigations', 'In consultation', 'Pharmacy / billing']

export default function NurseOpdQueuePage({ data, error, can }) {
  const active = data.queue.filter((entry) => QUEUE_STAGES.includes(entry.stage))
  const urgent = active.filter((entry) => entry.priority === 'Urgent' || entry.priority === 'Priority').length

  return <>
    <PageHeader title="OPD queue" description="A shared view of outpatient encounters. Clinical stages are managed by the responsible care team." actions={can('nursing.triage') ? <Link className="hms-nurse__button hms-nurse__button--primary" to="/nurse/triage"><Icon name="heartPulse" size={16} />Open triage queue</Link> : null} />
    <div className="hms-nurse">
      <NurseErrorNotice error={error} />
      <div className="hms-nurse__queue-summary"><div><span className="hms-nurse__eyebrow">Active outpatient visits</span><strong>{active.length}</strong><small>Across all care stages</small></div><div><span className="hms-nurse__eyebrow">Priority handovers</span><strong>{urgent}</strong><small>Priority or urgent attention flag</small></div><div><span className="hms-nurse__eyebrow">Waiting for triage</span><strong>{active.filter((entry) => ['Registered', 'Waiting for triage'].includes(entry.stage)).length}</strong><small>Visible in the triage worklist</small></div></div>
      <div className="hms-nurse__queue-board">{QUEUE_STAGES.map((stage) => {
        const entries = active.filter((entry) => entry.stage === stage).sort((a, b) => (a.priority === 'Urgent' ? -1 : a.priority === 'Priority' ? 0 : 1) - (b.priority === 'Urgent' ? -1 : b.priority === 'Priority' ? 0 : 1))
        return <section className="hms-nurse__queue-column" key={stage}><header><span><i className={`hms-nurse__stage-dot is-${stageClass(stage)}`} />{stage}</span><CountBadge>{entries.length}</CountBadge></header>
          {entries.length ? <div className="hms-nurse__queue-cards">{entries.map((entry) => {
            const patient = patientFor(data, entry.patientId)
            const values = entry.triage || {}
            return <article className="hms-nurse__queue-card" key={entry.id}><div className="hms-nurse__queue-card-top"><NursePatientIdentity patient={patient} secondary={entry.department} /><StatusBadge tone={statusTone(entry.priority)}>{entry.priority || 'Routine'}</StatusBadge></div><p>{entry.reason}</p><small><Icon name="clock" size={13} />{elapsedLabel(entry.arrivedAt)} in queue</small>
              {values.recordedAt ? <div className="hms-nurse__vitals-summary">{[['BP', values.systolic && values.diastolic ? `${values.systolic}/${values.diastolic}` : '—'], ['Temp', values.temperature ? `${values.temperature}°C` : '—'], ['SpO₂', values.oxygenSaturation ? `${values.oxygenSaturation}%` : '—']].map(([label, value]) => <span key={label}><small>{label}</small><strong>{value}</strong></span>)}</div> : null}
              {stage === 'Waiting for triage' || stage === 'Registered' ? <Link to="/nurse/triage" className="hms-nurse__queue-action">Open triage <Icon name="arrowUpRight" size={14} /></Link> : null}
            </article>
          })}</div> : <NurseEmpty title="No patients" />}
        </section>
      })}</div>
      {!active.length ? <div className="hms-nurse__panel"><NurseEmpty title="OPD queue is clear">Reception check-ins will appear here.</NurseEmpty></div> : null}
      <p className="hms-nurse__footnote">This queue reads the same local encounter list as Reception. Completing triage moves an encounter to “Waiting for clinician”.</p>
    </div>
  </>
}

function stageClass(stage) {
  if (stage === 'Registered' || stage === 'Waiting for triage') return 'triage'
  if (stage === 'Waiting for clinician') return 'clinician'
  if (stage === 'Investigations') return 'investigations'
  if (stage === 'In consultation') return 'consultation'
  return 'billing'
}
