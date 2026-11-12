import { Link } from 'react-router-dom'
import { Icon, PageHeader, StatusBadge } from '@ui'
import { DoctorEmpty, DoctorError, DoctorPanel, DoctorPatient, dateTime, patientFor, statusTone } from './DoctorShared.jsx'
import './doctor styles/shared.css'
import './doctor styles/admissions.css'

export default function DoctorAdmissionsPage({ data, error }) {
  const admissions = (data.nurse?.admissions || []).filter((admission) => admission.status === 'Admitted' || admission.requestedBy === 'Dr. K. Owusu')
    .sort((a, b) => (b.requestedAt || '').localeCompare(a.requestedAt || ''))
  const requests = (data.nurse?.admissions || []).filter((admission) => admission.requestedBy === 'Dr. K. Owusu' && admission.status !== 'Admitted')
  return <>
    <PageHeader title="My admissions" description="Track admission requests and patients admitted under your care." actions={<Link className="hms-doctor__button hms-doctor__button--quiet" to="/nurse/admissions"><Icon name="bed" size={16} />Nursing admission board</Link>} />
    <div className="hms-doctor">
      <DoctorError error={error} />
      <div className="hms-doctor__admission-summary"><div><small>Patients admitted</small><strong>{admissions.filter((item) => item.status === 'Admitted').length}</strong></div><div><small>Bed requests pending</small><strong>{requests.length}</strong></div></div>
      <DoctorPanel title="Admission activity" description="Admission requests created during a consultation are shared with the nursing bed board.">
        {admissions.length ? <div className="hms-doctor__admission-list">{admissions.map((admission) => <article key={admission.id}><div><DoctorPatient patient={patientFor(data, admission.patientId)} secondary={admission.department} /><small>{admission.reason || 'Admission request'} · {dateTime(admission.requestedAt)}</small></div><span><StatusBadge tone={statusTone(admission.status)}>{admission.status}</StatusBadge><small>{admission.wardId ? `${admission.wardId}${admission.bedId ? ` · ${admission.bedId}` : ''}` : 'Bed not assigned'}</small></span></article>)}</div> : <DoctorEmpty title="No admissions to show">Finalise a consultation with disposition “Admit” to create a request.</DoctorEmpty>}
      </DoctorPanel>
      <p className="hms-doctor__footnote">Admission placement and bed assignment are managed by the nursing team. Requests shown here are stored in the shared browser workspace.</p>
    </div>
  </>
}
