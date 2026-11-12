import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, MetricCard, PageHeader, StatusBadge } from '@ui'
import { NurseEmpty, NurseErrorNotice, NurseMessage, NursePatientIdentity, patientFor, statusTone, uid } from './NurseShared.jsx'
import './nurse styles/shared.css'
import './nurse styles/wards.css'

const WARD_FILTER_ALL = 'All wards'

export default async async function NurseWardBoardPage({ data, error, commit, can }) {
  const [wardFilter, setWardFilter] = useState(WARD_FILTER_ALL)
  const [message, setMessage] = useState('')
  const nurse = data.nurse
  const visibleWards = wardFilter === WARD_FILTER_ALL ? nurse.wards : nurse.wards.filter((ward) => ward.id === wardFilter)
  const occupied = nurse.beds.filter((bed) => bed.status === 'Occupied').length
  const available = nurse.beds.filter((bed) => bed.status === 'Available').length
  const pending = nurse.admissions.filter((request) => request.status === 'Awaiting bed').length
  const discharges = nurse.discharges.filter((item) => item.status === 'Discharged').length

  const markReady = (bed) => {
    if (!can('nursing.observe') || bed.status !== 'Cleaning') return
    const beds = nurse.beds.map((item) => item.id === bed.id ? { ...item, status: 'Available', since: '' } : item)
    if (await commit({ ...data, nurse: { ...nurse, beds } })) setMessage(`${bed.id} is now marked available.`)
  }
  const startDischarge = (bed) => {
    if (!can('nursing.observe') || !bed.patientId) return
    const existing = nurse.discharges.find((record) => record.patientId === bed.patientId && record.status !== 'Discharged')
    if (existing) { setMessage('A discharge checklist is already in progress for this patient.'); return }
    const record = {
      id: uid('DIS'),
      patientId: bed.patientId,
      wardId: bed.wardId,
      bedId: bed.id,
      status: 'Preparing',
      outcome: '',
      updatedAt: new Date().toISOString(),
      checks: { clinicalSummary: false, medicines: false, billing: false, outcome: false },
    }
    if (await commit({ ...data, nurse: { ...nurse, discharges: [record, ...nurse.discharges] } })) setMessage(`Discharge checklist started for bed ${bed.id}.`)
  }

  return <>
    <PageHeader title="Ward and bed board" description="Review bed availability and ward capacity. Patient names are shown only inside the signed-in workspace." />
    <div className="hms-nurse">
      <NurseErrorNotice error={error} />
      <NurseMessage>{message}</NurseMessage>
      <div className="hms-nurse__metrics hms-nurse__metrics--four">
        <MetricCard label="Occupancy" value={`${occupied} / ${nurse.beds.length}`} icon="bed" caption="Beds currently in use" />
        <MetricCard label="Available" value={available} icon="checkCircle" caption="Ready for allocation" />
        <MetricCard label="Admission requests" value={pending} icon="userPlus" caption="Waiting for a bed" />
        <MetricCard label="Discharges today" value={discharges} icon="listChecks" caption="Completed discharge records" />
      </div>
      <div className="hms-nurse__ward-toolbar"><div className="hms-nurse__ward-tabs" role="tablist" aria-label="Filter wards"><button type="button" className={wardFilter === WARD_FILTER_ALL ? 'is-selected' : ''} onClick={() => setWardFilter(WARD_FILTER_ALL)}>All wards</button>{nurse.wards.map((ward) => <button type="button" className={wardFilter === ward.id ? 'is-selected' : ''} key={ward.id} onClick={() => setWardFilter(ward.id)}>{ward.name}</button>)}</div><span className="hms-nurse__board-legend">{['Available', 'Occupied', 'Reserved', 'Cleaning', 'Out of service'].map((status) => <span key={status}><i className={`is-${status.toLowerCase().replaceAll(' ', '-')}`} />{status}</span>)}</span></div>
      <div className="hms-nurse__wards-grid">{visibleWards.map((ward) => {
        const beds = nurse.beds.filter((bed) => bed.wardId === ward.id)
        const occupiedInWard = beds.filter((bed) => bed.status === 'Occupied').length
        return <section className="hms-nurse__panel hms-nurse__ward-card" key={ward.id}>
          <header className="hms-nurse__panel-head"><div><span className="hms-nurse__eyebrow">{ward.type} ward</span><h2>{ward.name}</h2></div><StatusBadge tone="neutral">{occupiedInWard}/{beds.length} occupied</StatusBadge></header>
          <div className="hms-nurse__bed-grid">{beds.map((bed) => {
            const patient = patientFor(data, bed.patientId)
            return <article className={`hms-nurse__bed-tile is-${bed.status.toLowerCase().replaceAll(' ', '-')}`} key={bed.id}>
              <span className="hms-nurse__bed-tile-top"><Icon name="bed" size={17} /><strong>{bed.id}</strong></span>
              <StatusBadge tone={statusTone(bed.status)}>{bed.status}</StatusBadge>
              {patient ? <NursePatientIdentity patient={patient} secondary="Inpatient" /> : <small className="hms-nurse__bed-note">{bed.status === 'Cleaning' ? 'Being prepared' : bed.status === 'Out of service' ? 'Unavailable' : bed.status === 'Reserved' ? 'Held for admission' : 'Ready for allocation'}</small>}
              {patient && can('nursing.observe') ? <button type="button" className="hms-nurse__button hms-nurse__button--quiet" onClick={() => startDischarge(bed)}><Icon name="listChecks" size={15} />Prepare discharge</button> : null}
              {bed.status === 'Cleaning' && can('nursing.observe') ? <button type="button" className="hms-nurse__button hms-nurse__button--quiet" onClick={() => markReady(bed)}><Icon name="check" size={15} />Mark cleaned</button> : null}
            </article>
          })}</div>
          <footer className="hms-nurse__ward-footer"><span><strong>{availableInWard(beds)}</strong> beds ready</span><span>{nurse.tasks.filter((task) => task.wardId === ward.id && task.status !== 'Completed').length} open nursing tasks</span></footer>
        </section>
      })}</div>
      <section className="hms-nurse__panel"><header className="hms-nurse__panel-head"><div><span className="hms-nurse__eyebrow">Admissions</span><h2>Requests awaiting placement</h2></div><Link to="/nurse/admissions" className="hms-nurse__inline-link">Review requests <Icon name="arrowUpRight" size={15} /></Link></header>
        {nurse.admissions.filter((item) => item.status === 'Awaiting bed').length ? nurse.admissions.filter((item) => item.status === 'Awaiting bed').map((item) => <div className="hms-nurse__admission-mini" key={item.id}><NursePatientIdentity patient={patientFor(data, item.patientId)} secondary={item.department} /><span>{item.reason}</span><StatusBadge tone={statusTone(item.priority)}>{item.priority}</StatusBadge></div>) : <NurseEmpty title="No admission requests waiting" />}
      </section>
    </div>
  </>
}

function availableInWard(beds) {
  return beds.filter((bed) => bed.status === 'Available').length
}
