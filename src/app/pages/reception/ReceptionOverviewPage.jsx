import { Link } from 'react-router-dom'
import { ChartCard, Icon, MetricCard, PageHeader, PillBarChart, StatusBadge } from '@ui'
import { ErrorNotice, EmptyResult, PatientIdentity, AppointmentLine, activeQueueStages, patientFor, formatElapsed, statusTone, patientPath } from './ReceptionShared.jsx'
import { TODAY } from './receptionData.js'
import './reception styles/shared.css'
import './reception styles/overview.css'

export default function OverviewPage({ data, error }) {
  const todayAppointments = data.appointments.filter((item) => item.date === TODAY)
  const expected = todayAppointments.filter((item) => item.status === 'Expected').length
  const arrived = todayAppointments.filter((item) => item.status === 'Arrived').length
  const waiting = data.queue.filter((item) => activeQueueStages.has(item.stage)).length
  const arrivalBars = ['08', '09', '10', '11', '12', '13', '14'].map((hour) => ({
    label: `${hour}:00`,
    value: todayAppointments.filter((item) => item.time.startsWith(hour) && ['Arrived', 'Completed'].includes(item.status)).length,
  }))

  return (
    <>
      <PageHeader title="Good day, Reception" description="A clear view of today’s arrivals, appointments and front-desk work." actions={<Link className="hms-reception__button hms-reception__button--primary" to="/reception/desk"><Icon name="userPlus" size={16} />Register or check in</Link>} />
      <div className="hms-reception">
        <ErrorNotice error={error} />
        <section className="hms-reception__welcome">
          <div><span className="hms-reception__eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</span><h2>Front desk, at a glance</h2><p>Keep arrivals moving and make sure each patient is ready for their visit.</p></div>
          <div className="hms-reception__welcome-icon"><Icon name="clipboardList" size={28} /></div>
        </section>
        <div className="hms-reception__metrics">
          <MetricCard label="Expected today" value={todayAppointments.length} icon="calendar" caption={`${expected} still expected`} />
          <MetricCard label="Arrived" value={arrived} icon="checkCircle" caption="Checked in today" />
          <MetricCard label="In the OPD queue" value={waiting} icon="listOrdered" caption="Across all departments" />
          <MetricCard label="Patient records" value={data.patients.length} icon="users" caption="Available to reception" />
        </div>
        <div className="hms-reception__overview-grid">
          <section className="hms-reception__panel">
            <header className="hms-reception__panel-head"><div><span className="hms-reception__eyebrow">Today’s schedule</span><h2>Appointments and arrivals</h2></div><Link to="/reception/appointments">Open schedule <Icon name="arrowUpRight" size={15} /></Link></header>
            <div className="hms-reception__appointment-list">
              {todayAppointments.slice(0, 5).map((appointment) => <AppointmentLine key={appointment.id} appointment={appointment} patient={patientFor(data, appointment.patientId)} compact />)}
              {todayAppointments.length === 0 ? <EmptyResult icon="calendar" title="No appointments scheduled today" /> : null}
            </div>
          </section>
          <ChartCard eyebrow="Arrivals today" title="Check-ins by hour">
            <PillBarChart label="Arrivals by hour today" unit="arrivals" height={154} data={arrivalBars} />
          </ChartCard>
          <section className="hms-reception__panel">
            <header className="hms-reception__panel-head"><div><span className="hms-reception__eyebrow">Live hand-off</span><h2>Recently checked in</h2></div><Link to="/reception/opd">View OPD queue <Icon name="arrowUpRight" size={15} /></Link></header>
            <div className="hms-reception__recent-list">
              {data.queue.filter((entry) => activeQueueStages.has(entry.stage)).slice(0, 4).map((entry) => {
                const patient = patientFor(data, entry.patientId)
                return <Link className="hms-reception__recent-row" to={patientPath(patient?.id)} key={entry.id}><PatientIdentity patient={patient} /><span className="hms-reception__recent-meta"><StatusBadge tone={statusTone(entry.stage)}>{entry.stage}</StatusBadge><small>{formatElapsed(entry.arrivedAt)} waiting</small></span></Link>
              })}
              {data.queue.length === 0 ? <EmptyResult icon="listOrdered" title="Queue is clear" /> : null}
            </div>
          </section>
          <section className="hms-reception__panel hms-reception__quick-links">
            <span className="hms-reception__eyebrow">Quick access</span><h2>Common tasks</h2>
            <Link to="/reception/desk"><span><Icon name="userPlus" size={17} /></span><div><strong>Register a walk-in</strong><small>Capture identity, cover and visit details</small></div><Icon name="chevronRight" size={16} /></Link>
            <Link to="/reception/appointments"><span><Icon name="calendar" size={17} /></span><div><strong>Book an appointment</strong><small>Schedule the next patient visit</small></div><Icon name="chevronRight" size={16} /></Link>
            <Link to="/reception/claim-gaps"><span><Icon name="alertCircle" size={17} /></span><div><strong>Resolve claim data gaps</strong><small>Review incomplete registration details</small></div><Icon name="chevronRight" size={16} /></Link>
          </section>
        </div>
      </div>
    </>
  )
}
