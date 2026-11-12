import { Link } from 'react-router-dom'
import { Icon, MetricCard, PageHeader, StatusBadge } from '@ui'
import { NurseEmpty, NurseErrorNotice, NursePatientIdentity, NurseTaskRow, elapsedLabel, patientFor, statusTone } from './NurseShared.jsx'
import useHospitalSettings from '@core/storage/useHospitalSettings.js'
import './nurse styles/shared.css'
import './nurse styles/overview.css'

export default function NurseOverviewPage({ data, error, can }) {
  const nurse = data.nurse
  const { settings } = useHospitalSettings()
  const waitLimit = Math.max(1, Number(settings.patient_wait_warning) || 25)
  const awaitingTriage = data.queue.filter((entry) => ['Registered', 'Waiting for triage'].includes(entry.stage))
  const readyForClinician = data.queue.filter((entry) => entry.stage === 'Waiting for clinician')
  const overdueTriage = awaitingTriage.filter((entry) => entry.arrivedAt && Number.isFinite(Date.parse(entry.arrivedAt)) && Date.now() - Date.parse(entry.arrivedAt) >= waitLimit * 60000).length
  const openTasks = nurse.tasks.filter((task) => task.status !== 'Completed')
  const occupiedBeds = nurse.beds.filter((bed) => bed.status === 'Occupied').length
  const pendingAdmissions = nurse.admissions.filter((item) => item.status === 'Awaiting bed').length
  const recent = [...nurse.activity].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 4)

  return <>
    <PageHeader title="Nursing overview" description="Triage priorities, ward activity and care tasks in one place." actions={<Link className="hms-nurse__button hms-nurse__button--primary" to={can('nursing.triage') ? '/nurse/triage' : '/nurse/tasks'}><Icon name={can('nursing.triage') ? 'heartPulse' : 'clipboardList'} size={16} />{can('nursing.triage') ? 'Open triage queue' : 'Review tasks'}</Link>} />
    <div className="hms-nurse">
      <NurseErrorNotice error={error} />
      <section className="hms-nurse__welcome"><div><span className="hms-nurse__eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} · Nursing station</span><h2>Care team, at a glance</h2><p>Keep arrivals moving, stay ahead of due observations and coordinate the ward handover.</p></div><span className="hms-nurse__welcome-icon"><Icon name="heartPulse" size={27} /></span></section>
      <div className="hms-nurse__metrics">
        <MetricCard label="Awaiting triage" value={awaitingTriage.length} icon="heartPulse" caption={`${overdueTriage} beyond ${waitLimit} min target`} />
        <MetricCard label="Ready for clinician" value={readyForClinician.length} icon="stethoscope" caption="Triage handover completed" />
        <MetricCard label="Open nursing tasks" value={openTasks.length} icon="checkSquare" caption={`${openTasks.filter((task) => task.status === 'Overdue').length} overdue`} />
        <MetricCard label="Occupied beds" value={`${occupiedBeds} / ${nurse.beds.length}`} icon="bed" caption={`${pendingAdmissions} admission requests waiting`} />
      </div>
      <div className="hms-nurse__overview-grid">
        <section className="hms-nurse__panel"><header className="hms-nurse__panel-head"><div><span className="hms-nurse__eyebrow">Next at the triage station</span><h2>Patients waiting</h2></div><Link to="/nurse/triage">Open worklist <Icon name="arrowUpRight" size={15} /></Link></header>
          {awaitingTriage.length ? <div className="hms-nurse__waiting-list">{awaitingTriage.slice(0, 4).map((entry) => <Link className="hms-nurse__waiting-row" to="/nurse/triage" key={entry.id}><NursePatientIdentity patient={patientFor(data, entry.patientId)} secondary={entry.department} /><span className="hms-nurse__wait-copy"><StatusBadge tone={statusTone(entry.priority)}>{entry.priority || 'Routine'}</StatusBadge><small>{elapsedLabel(entry.arrivedAt)} waiting</small></span><Icon name="chevronRight" size={16} /></Link>)}</div> : <NurseEmpty title="No patients waiting for triage" />}</section>
        <section className="hms-nurse__panel"><header className="hms-nurse__panel-head"><div><span className="hms-nurse__eyebrow">Due and overdue</span><h2>Priority nursing tasks</h2></div><Link to="/nurse/tasks">All tasks <Icon name="arrowUpRight" size={15} /></Link></header>
          {openTasks.length ? <div className="hms-nurse__task-list">{openTasks.slice(0, 3).map((task) => <NurseTaskRow key={task.id} task={task} patient={patientFor(data, task.patientId)} canUpdate={false} onComplete={() => {}} />)}</div> : <NurseEmpty title="All nursing tasks are complete" />}
          {!can('nursing.observe') ? <p className="hms-nurse__permission-note">Your role has read-only access to nursing tasks.</p> : null}
        </section>
        <section className="hms-nurse__panel hms-nurse__ward-snapshot"><header className="hms-nurse__panel-head"><div><span className="hms-nurse__eyebrow">Inpatient capacity</span><h2>Ward snapshot</h2></div><Link to="/nurse/wards">Open bed board <Icon name="arrowUpRight" size={15} /></Link></header>
          <div className="hms-nurse__ward-list">{nurse.wards.map((ward) => { const beds = nurse.beds.filter((bed) => bed.wardId === ward.id); const occupied = beds.filter((bed) => bed.status === 'Occupied').length; return <Link to="/nurse/wards" key={ward.id}><span><strong>{ward.name}</strong><small>{ward.type}</small></span><span className="hms-nurse__occupancy"><i><b style={{ width: `${beds.length ? (occupied / beds.length) * 100 : 0}%` }} /></i><small>{occupied}/{beds.length} occupied</small></span></Link> })}</div>
        </section>
        <section className="hms-nurse__panel"><header className="hms-nurse__panel-head"><div><span className="hms-nurse__eyebrow">Shift timeline</span><h2>Recent nursing activity</h2></div></header>
          {recent.length ? <ol className="hms-nurse__activity">{recent.map((item) => <li key={item.id}><span className="hms-nurse__activity-icon"><Icon name={item.kind === 'Triage' ? 'heartPulse' : item.kind === 'Admission' ? 'userPlus' : 'clipboardList'} size={15} /></span><span><strong>{item.message}</strong><small>{new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {item.kind}</small></span></li>)}</ol> : <NurseEmpty title="No recent nursing activity" />}
        </section>
      </div>
    </div>
  </>
}
