import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CountBadge, Icon, PageHeader, StatusBadge } from '@ui'
import { PharmacyEmpty, PharmacyError, PharmacyPatient, PharmacyPanel, RxStatus, ageLabel, patientFor, statusTone } from './PharmacyShared.jsx'
import './pharmacy styles/shared.css'
import './pharmacy styles/queue.css'

const FILTERS = ['All', 'New', 'In progress', 'Partial', 'Dispensed']

export default function PharmacyQueuePage({ data, error }) {
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const prescriptions = useMemo(() => [...data.pharmacy.prescriptions]
    .filter((rx) => filter === 'All' || rx.status === filter)
    .filter((rx) => {
      const patient = patientFor(data, rx.patientId)
      const search = `${rx.id} ${rx.encounterId} ${patient?.firstName || ''} ${patient?.lastName || ''} ${patient?.id || ''}`.toLowerCase()
      return search.includes(query.toLowerCase().trim())
    })
    .sort((a, b) => (a.status === 'Dispensed') - (b.status === 'Dispensed') || (a.priority === 'Urgent' ? -1 : a.priority === 'Priority' ? 0 : 1) - (b.priority === 'Urgent' ? -1 : b.priority === 'Priority' ? 0 : 1) || a.prescribedAt.localeCompare(b.prescribedAt)),
  [data, filter, query])
  const countFor = (status) => status === 'All' ? data.pharmacy.prescriptions.length : data.pharmacy.prescriptions.filter((rx) => rx.status === status).length

  return <>
    <PageHeader title="Prescription queue" description="Review prescription details and route active orders to dispensing." />
    <div className="hms-pharmacy">
      <PharmacyError error={error} />
      <div className="hms-pharmacy__queue-toolbar"><label className="hms-pharmacy__search"><Icon name="search" size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient, prescription or encounter" /></label><div className="hms-pharmacy__filters" role="tablist" aria-label="Filter prescriptions">{FILTERS.map((status) => <button type="button" role="tab" aria-selected={filter === status} className={filter === status ? 'is-active' : ''} onClick={() => setFilter(status)} key={status}>{status}<CountBadge>{countFor(status)}</CountBadge></button>)}</div></div>
      <PharmacyPanel title={`${prescriptions.length} prescription${prescriptions.length === 1 ? '' : 's'}`} description="Priority and oldest waiting items are shown first.">
        {prescriptions.length ? <div className="hms-pharmacy__rx-list">{prescriptions.map((rx) => {
          const patient = patientFor(data, rx.patientId)
          const active = rx.status !== 'Dispensed'
          return <article className={`hms-pharmacy__rx-card${rx.priority === 'Urgent' ? ' is-urgent' : ''}`} key={rx.id}>
            <div className="hms-pharmacy__rx-card-main"><div className="hms-pharmacy__rx-card-title"><strong>{rx.id}</strong><RxStatus status={rx.status} /><StatusBadge tone={statusTone(rx.priority)}>{rx.priority}</StatusBadge></div><PharmacyPatient patient={patient} secondary={rx.encounterId || 'No encounter linked'} /><div className="hms-pharmacy__rx-details"><span><Icon name="user" size={14} />{rx.prescribedBy}</span><span><Icon name="clock" size={14} />{ageLabel(rx.prescribedAt)} waiting</span><span><Icon name="pill" size={14} />{rx.items.length} item{rx.items.length === 1 ? '' : 's'}</span></div>{rx.allergies.length ? <div className="hms-pharmacy__allergy-flag"><Icon name="alertTriangle" size={15} /><span><strong>Allergy review required</strong><small>{rx.allergies.join(', ')} · verify in the patient chart</small></span></div> : null}<div className="hms-pharmacy__rx-items">{rx.items.map((item) => <span key={item.id}>{data.pharmacy.medicines.find((medicine) => medicine.id === item.medicineId)?.name || 'Unknown medicine'} · {item.dispensedQuantity}/{item.prescribedQuantity}</span>)}</div></div>
            <div className="hms-pharmacy__rx-card-actions"><Link className={`hms-pharmacy__button${active ? ' hms-pharmacy__button--primary' : ''}`} to="/pharmacy/dispensing" state={{ prescriptionId: rx.id }}>{active ? <><Icon name="pill" size={15} />Open dispensing</> : 'View dispense record'}</Link></div>
          </article>
        })}</div> : <PharmacyEmpty title="No matching prescriptions">Try another search or status filter.</PharmacyEmpty>}
      </PharmacyPanel>
    </div>
  </>
}
