import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CountBadge, Icon, MetricCard, PageHeader, StatusBadge } from '@ui'
import { ErrorNotice, SearchField, EmptyResult, stageClass, activeQueueStages, nameOf, initials, patientFor, formatElapsed, elapsedMinutes, patientPath } from './ReceptionShared.jsx'
import { DEPARTMENTS } from './receptionData.js'
import './reception styles/shared.css'
import './reception styles/opd-queue.css'

const QUEUE_STAGES = ['Registered', 'Waiting for triage', 'Waiting for clinician', 'In consultation', 'Investigations', 'Pharmacy / billing']

export default function OpdQueuePage({ menu, data, error }) {
  const [department, setDepartment] = useState('All departments')
  const [query, setQuery] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [showMore, setShowMore] = useState({})
  const active = data.queue.filter((entry) => activeQueueStages.has(entry.stage))
  const filtered = active.filter((entry) => {
    const patient = patientFor(data, entry.patientId)
    const waited = elapsedMinutes(entry.arrivedAt)
    return (department === 'All departments' || entry.department === department)
      && (!overdueOnly || waited >= 30)
      && `${nameOf(patient)} ${patient?.id} ${entry.department} ${entry.reason}`.toLowerCase().includes(query.toLowerCase())
  })
  const longest = filtered.reduce((max, entry) => Math.max(max, elapsedMinutes(entry.arrivedAt)), 0)
  const average = filtered.length ? Math.round(filtered.reduce((sum, entry) => sum + elapsedMinutes(entry.arrivedAt), 0) / filtered.length) : 0
  const overdue = filtered.filter((entry) => elapsedMinutes(entry.arrivedAt) >= 30).length

  return (
    <>
      <PageHeader title={menu.label} description="See where checked-in patients are in their visit and how long they have been waiting." />
      <div className="hms-reception">
        <ErrorNotice error={error} />
        <div className="hms-reception__queue-summary"><MetricCard label="Patients in queue" value={filtered.length} icon="users" caption="Active outpatient visits" /><MetricCard label="Average wait" value={`${average} min`} icon="clock" caption="Since reception check-in" /><MetricCard label="Longest wait" value={`${longest} min`} icon="alertCircle" caption="Current active visit" /><MetricCard label="Over 30 minutes" value={overdue} icon="alertTriangle" caption="Review with care team" /></div>
        <div className="hms-reception__queue-toolbar"><SearchField value={query} onChange={setQuery} placeholder="Search patient, clinic or reason" /><label className="hms-reception__select-filter"><Icon name="filter" size={16} /><select value={department} onChange={(event) => setDepartment(event.target.value)} aria-label="Filter by department"><option>All departments</option>{DEPARTMENTS.map((item) => <option key={item}>{item}</option>)}</select></label><label className="hms-reception__toggle-filter"><input type="checkbox" checked={overdueOnly} onChange={(event) => setOverdueOnly(event.target.checked)} /><span>Over 30 min</span></label><span className="hms-reception__queue-readonly"><Icon name="info" size={15} />Clinical stages are updated by the care team</span></div>
        <div className="hms-reception__queue-board">
          {QUEUE_STAGES.map((stage) => {
            const entries = filtered.filter((entry) => entry.stage === stage).sort((a, b) => {
              const priority = (a.priority === 'Priority' ? 0 : 1) - (b.priority === 'Priority' ? 0 : 1)
              return priority || new Date(a.arrivedAt) - new Date(b.arrivedAt)
            })
            const limit = showMore[stage] ? entries.length : 5
            return <section className="hms-reception__queue-column" key={stage}><header><span><i className={`hms-reception__stage-dot hms-reception__stage-dot--${stageClass(stage)}`} />{stage}</span><CountBadge>{entries.length}</CountBadge></header>
              <div className="hms-reception__queue-cards">{entries.slice(0, limit).map((entry) => {
                const patient = patientFor(data, entry.patientId)
                const waited = elapsedMinutes(entry.arrivedAt)
                return <Link className={`hms-reception__queue-card${waited >= 45 ? ' is-critical' : waited >= 30 ? ' is-warning' : ''}`} key={entry.id} to={patientPath(patient?.id)}>
                  <div className="hms-reception__queue-card-head"><span className="hms-reception__avatar hms-reception__avatar--small">{initials(patient)}</span><span><strong>{nameOf(patient)}</strong><small>{patient?.id}</small></span><Icon name="chevronRight" size={15} /></div>
                  <p>{entry.reason}</p><div className="hms-reception__queue-card-meta"><span>{entry.department}</span><span className={waited >= 30 ? 'is-overdue' : ''}><Icon name="clock" size={13} />{formatElapsed(entry.arrivedAt)}</span></div>
                  <div className="hms-reception__queue-card-foot"><StatusBadge tone={entry.priority === 'Priority' ? 'warning' : 'neutral'}>{entry.priority}</StatusBadge><small>Arrived {new Date(entry.arrivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div>
                </Link>
              })}{entries.length === 0 ? <EmptyResult icon="users" title="No patients" /> : null}</div>
              {entries.length > 5 ? <button className="hms-reception__text-button hms-reception__show-more" type="button" onClick={() => setShowMore((current) => ({ ...current, [stage]: !current[stage] }))}>{showMore[stage] ? 'Show fewer' : `Show ${entries.length - 5} more`}</button> : null}
            </section>
          })}
        </div>
        <p className="hms-reception__footnote">This board reflects the care team’s encounter stage. Reception can check patients in from the <Link to="/reception/desk">reception desk</Link>; clinical stage changes are made by the responsible team.</p>
      </div>
    </>
  )
}
