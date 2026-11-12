import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Icon, PageHeader, StatusBadge } from '@ui'
import { LabEmpty, LabError, LabField, LabNotice, LabPanel, LabPatient, LabStatus, dateTime, elapsed, isOverdue, patientFor, specimenFor, testFor, tone, uid } from './LabShared.jsx'
import './lab styles/shared.css'
import './lab styles/worklist.css'

const STAGES = ['All', 'Ordered', 'Collected', 'Received', 'In process', 'Awaiting verification', 'Verified']

export default async function LabWorklistPage({ data, error, commit, can }) {
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState('All')
  const [priority, setPriority] = useState('All')
  const [testId, setTestId] = useState('All')
  const [locationFilter, setLocationFilter] = useState('All')
  const [selectedId, setSelectedId] = useState(location.state?.orderId || '')
  const orders = useMemo(() => data.lab.orders.filter((order) => {
    const patient = patientFor(data, order.patientId)
    const search = `${order.id} ${patient?.firstName || ''} ${patient?.lastName || ''} ${patient?.id || ''} ${testFor(data, order.testId)?.name || ''}`.toLowerCase()
    return (stage === 'All' || order.status === stage)
      && (priority === 'All' || order.priority === priority)
      && (testId === 'All' || order.testId === testId)
      && (locationFilter === 'All' || order.location === locationFilter)
      && search.includes(query.toLowerCase().trim())
  }).sort((a, b) => (a.priority === 'Urgent' ? -1 : a.priority === 'Priority' ? 0 : 1) - (b.priority === 'Urgent' ? -1 : b.priority === 'Priority' ? 0 : 1) || a.orderedAt.localeCompare(b.orderedAt)), [data, stage, priority, testId, locationFilter, query])
  const selected = orders.find((order) => order.id === selectedId) || orders[0]
  const startProcessing = (order) => {
    if (!can('lab.process') || order.status !== 'Received') return
    const now = new Date().toISOString()
    const lab = {
      ...data.lab,
      orders: data.lab.orders.map((item) => item.id === order.id ? { ...item, status: 'In process', processingStartedAt: now } : item),
      activity: [{ id: uid('LACT'), kind: 'Worklist', message: `${order.id} processing started`, at: now }, ...data.lab.activity],
    }
    if (!await commit({ ...data, lab })) return
    setSelectedId(order.id)
  }

  return <>
    <PageHeader title="Laboratory worklist" description="Filter investigations by urgency, test, stage, and patient location." />
    <div className="hms-lab">
      <LabError error={error} />
      <LabNotice>Only verified results are final. Overdue indicators use the turnaround target configured for each test.</LabNotice>
      <div className="hms-lab__filters">
        <label className="hms-lab__search"><Icon name="search" size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient, test, or order ID" /></label>
        <LabField label="Priority" value={priority} onChange={setPriority} options={['All', 'Urgent', 'Priority', 'Routine']} />
        <LabField label="Test" value={testId} onChange={setTestId} options={[{ value: 'All', label: 'All tests' }, ...data.lab.catalogue.map((test) => ({ value: test.id, label: test.name }))]} />
        <LabField label="Location" value={locationFilter} onChange={setLocationFilter} options={['All', ...new Set(data.lab.orders.map((order) => order.location))]} />
      </div>
      <div className="hms-lab__stage-tabs" role="tablist" aria-label="Investigation stage">{STAGES.map((status) => <button type="button" role="tab" aria-selected={stage === status} className={stage === status ? 'is-active' : ''} onClick={() => setStage(status)} key={status}>{status}<span>{status === 'All' ? data.lab.orders.length : data.lab.orders.filter((order) => order.status === status).length}</span></button>)}</div>
      <div className="hms-lab__worklist-layout">
        <LabPanel title={`Investigations · ${orders.length}`} description="Priority and oldest orders appear first." className="hms-lab__worklist-panel">
          {orders.length ? <div className="hms-lab__worklist-list">{orders.map((order) => {
            const test = testFor(data, order.testId)
            const specimen = specimenFor(data, order.id)
            const patient = patientFor(data, order.patientId)
            return <button type="button" className={`hms-lab__worklist-row${selected?.id === order.id ? ' is-selected' : ''}${isOverdue(order, test) ? ' is-overdue' : ''}`} onClick={() => { setSelectedId(order.id); window.history.replaceState(window.history.state, '', location.pathname) }} key={order.id}>
              <span className="hms-lab__row-top"><strong>{test?.name || 'Unknown test'}</strong><StatusBadge tone={tone(order.priority)}>{order.priority}</StatusBadge></span>
              <LabPatient patient={patient} secondary={order.id} />
              <span className="hms-lab__row-meta"><LabStatus>{order.status}</LabStatus><small>{elapsed(order.orderedAt)} · {order.location}</small></span>
              <span className="hms-lab__row-bottom"><span>Specimen: {specimen?.status || 'Not recorded'}</span><span>{test?.turnaroundHours || '—'}h target</span></span>
            </button>
          })}</div> : <LabEmpty title="No investigations match">Change one or more filters to see other orders.</LabEmpty>}
        </LabPanel>
        {selected ? <LabPanel title="Investigation details" description={selected.id} className="hms-lab__detail-panel">
          <LabPatient patient={patientFor(data, selected.patientId)} secondary={selected.encounterId || 'No encounter linked'} />
          <dl className="hms-lab__detail-list"><div><dt>Test</dt><dd>{testFor(data, selected.testId)?.name || 'Unknown test'}</dd></div><div><dt>Ordered by</dt><dd>{selected.orderedBy}</dd></div><div><dt>Ordered</dt><dd>{dateTime(selected.orderedAt)}</dd></div><div><dt>Location</dt><dd>{selected.location}</dd></div><div><dt>Priority</dt><dd><StatusBadge tone={tone(selected.priority)}>{selected.priority}</StatusBadge></dd></div><div><dt>Specimen</dt><dd><LabStatus>{specimenFor(data, selected.id)?.status || 'Not recorded'}</LabStatus></dd></div></dl>
          {isOverdue(selected, testFor(data, selected.testId)) ? <LabNotice tone="warning">This investigation has exceeded its configured turnaround target.</LabNotice> : null}
          <div className="hms-lab__detail-actions">
            {selected.status === 'Received' && can('lab.process') ? <button type="button" className="hms-lab__button hms-lab__button--primary" onClick={() => startProcessing(selected)}><Icon name="flask" size={15} />Start processing</button> : null}
            {['Received', 'In process', 'Awaiting verification'].includes(selected.status) ? <Link className="hms-lab__button" to="/lab/results" state={{ orderId: selected.id }}><Icon name="clipboardList" size={15} />Open result entry</Link> : null}
            <Link className="hms-lab__button hms-lab__button--quiet" to="/lab/specimens" state={{ orderId: selected.id }}><Icon name="testTube" size={15} />Open specimen</Link>
          </div>
          {!can('lab.process') && selected.status === 'Received' ? <LabNotice>Your role can view this order but cannot start processing.</LabNotice> : null}
        </LabPanel> : <LabPanel title="Select an investigation"><LabEmpty title="No selected order">Select a row to see its details.</LabEmpty></LabPanel>}
      </div>
    </div>
  </>
}
