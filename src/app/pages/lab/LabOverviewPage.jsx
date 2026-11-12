import { Link } from 'react-router-dom'
import { Icon, MetricCard, PageHeader, StatusBadge } from '@ui'
import { LabEmpty, LabError, LabNotice, LabPanel, LabPatient, LabStatus, elapsed, patientFor, testFor, tone } from './LabShared.jsx'
import useHospitalSettings from '@core/storage/useHospitalSettings.js'
import './lab styles/shared.css'
import './lab styles/overview.css'

export default function LabOverviewPage({ data, error }) {
  const { lab } = data
  const { settings } = useHospitalSettings()
  const turnaroundTarget = Math.max(1, Number(settings.lab_turnaround_target) || 150)
  const lowStockEnabled = settings.low_stock_alerts !== false
  const open = lab.orders.filter((order) => order.status !== 'Verified')
  const awaitingVerification = lab.orders.filter((order) => order.resultStatus === 'Awaiting verification')
  const critical = lab.orders.filter((order) => order.resultStatus !== 'Verified' && Object.entries(order.resultValues || {}).some(([key, value]) => {
    const component = testFor(data, order.testId)?.components.find((item) => item.key === key)
    return component && (component.criticalLow !== undefined && Number(value) < component.criticalLow || component.criticalHigh !== undefined && Number(value) > component.criticalHigh)
  }))
  const stockAlerts = lowStockEnabled ? lab.stock.filter((item) => item.quantity <= item.reorderLevel).length : 0
  const overTarget = open.filter((order) => order.orderedAt && Number.isFinite(Date.parse(order.orderedAt)) && Date.now() - Date.parse(order.orderedAt) >= turnaroundTarget * 60000).length
  const recent = [...lab.activity].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5)

  return <>
    <PageHeader title="Laboratory overview" description="Investigations, specimen flow, verification backlog, critical follow-up, and laboratory stock." actions={<Link className="hms-lab__button hms-lab__button--primary" to="/lab/worklist"><Icon name="listOrdered" size={16} />Open worklist</Link>} />
    <div className="hms-lab">
      <LabError error={error} />
      <LabNotice>Manually entered values and reference ranges require confirmation against hospital-approved ranges and results in the laboratory system.</LabNotice>
      <div className="hms-lab__metrics">
        <MetricCard label="Open investigations" value={open.length} icon="flask" caption={`${overTarget} beyond ${turnaroundTarget} min target`} />
        <MetricCard label="Awaiting verification" value={awaitingVerification.length} icon="checkSquare" caption="Entry complete · verifier action required" />
        <MetricCard label="Critical follow-up" value={critical.length} icon="alertTriangle" caption="Notification and acknowledgement required" />
        <MetricCard label="Stock alerts" value={stockAlerts} icon="packageBox" caption="At or below reorder level" />
      </div>
      <div className="hms-lab__overview-grid">
        <LabPanel title="Priority worklist" description="Highest priority and longest waiting items." actions={<Link className="hms-lab__link" to="/lab/worklist">View full worklist <Icon name="chevronDown" size={14} /></Link>}>
          <div className="hms-lab__priority-list">{open.slice().sort((a, b) => (a.priority === 'Urgent' ? -1 : a.priority === 'Priority' ? 0 : 1) - (b.priority === 'Urgent' ? -1 : b.priority === 'Priority' ? 0 : 1) || a.orderedAt.localeCompare(b.orderedAt)).slice(0, 5).map((order) => <Link className="hms-lab__priority-row" to="/lab/worklist" state={{ orderId: order.id }} key={order.id}><div><strong>{testFor(data, order.testId)?.name || 'Unknown test'}</strong><LabPatient patient={patientFor(data, order.patientId)} secondary={order.id} /></div><div className="hms-lab__priority-meta"><StatusBadge tone={tone(order.priority)}>{order.priority}</StatusBadge><LabStatus>{order.status}</LabStatus><small>{elapsed(order.orderedAt)} waiting</small></div></Link>)}{!open.length ? <LabEmpty title="No open investigations">Verified investigations will be available from the worklist.</LabEmpty> : null}</div>
        </LabPanel>
        <LabPanel title="Specimen flow" description="Orders by their current processing stage.">
          <div className="hms-lab__stage-list">{['Ordered', 'Collected', 'Received', 'In process', 'Awaiting verification'].map((status) => {
            const count = lab.orders.filter((order) => order.status === status).length
            return <div key={status}><span><i className={`hms-lab__stage-dot is-${status.toLowerCase().replaceAll(' ', '-')}`} />{status}</span><strong>{count}</strong></div>
          })}</div>
          <Link className="hms-lab__button" to="/lab/specimens">Manage specimens</Link>
        </LabPanel>
        <LabPanel title="Stock watch" description="Reagents and collection supplies nearing replenishment." actions={<Link className="hms-lab__link" to="/lab/inventory">Inventory <Icon name="chevronDown" size={14} /></Link>}>
          <div className="hms-lab__stock-list">{lab.stock.filter((item) => lowStockEnabled && item.quantity <= item.reorderLevel).map((item) => <div key={item.id}><span><strong>{item.name}</strong><small>{item.quantity} {item.unit}s · reorder at {item.reorderLevel}</small></span><StatusBadge tone={item.quantity === 0 ? 'critical' : 'warning'}>{item.quantity === 0 ? 'Out of stock' : 'Low stock'}</StatusBadge></div>)}{!stockAlerts ? <LabEmpty title="Stock levels healthy">No item is at or below reorder level.</LabEmpty> : null}</div>
        </LabPanel>
        <LabPanel title="Recent laboratory activity" description="Latest workspace events.">
          {recent.length ? <div className="hms-lab__activity">{recent.map((item) => <div key={item.id}><span><Icon name={item.kind === 'Critical' ? 'alertTriangle' : item.kind === 'Result' ? 'checkCircle' : item.kind === 'Stock' ? 'packageBox' : 'flask'} size={15} /></span><div><strong>{item.message}</strong><small>{new Date(item.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></div></div>)}</div> : <LabEmpty title="No activity yet">Lab events will appear here.</LabEmpty>}
        </LabPanel>
        <LabPanel title="Critical result follow-up" description="Document clinician notification and capture acknowledgement." actions={<Link className="hms-lab__link" to="/lab/critical">Open critical results <Icon name="chevronDown" size={14} /></Link>}>
          {critical.length ? critical.slice(0, 3).map((order) => <div className="hms-lab__critical-glance" key={order.id}><span className="hms-lab__critical-pip"><Icon name="alertTriangle" size={15} /></span><div><strong>{testFor(data, order.testId)?.name}</strong><small>{patientFor(data, order.patientId)?.firstName} {patientFor(data, order.patientId)?.lastName} · {order.id}</small></div><StatusBadge tone="critical">Critical</StatusBadge></div>) : <LabEmpty title="No unverified critical values">Critical results needing action will be listed here.</LabEmpty>}
        </LabPanel>
        <LabPanel title="Quick access" description="Go directly to the key processing steps.">
          <div className="hms-lab__quick-links"><Link to="/lab/results"><Icon name="flask" size={16} />Enter and verify results <Icon name="chevronDown" size={14} /></Link><Link to="/lab/catalogue"><Icon name="book" size={16} />Review test catalogue <Icon name="chevronDown" size={14} /></Link><Link to="/lab/specimens"><Icon name="testTube" size={16} />Collect or receive specimens <Icon name="chevronDown" size={14} /></Link></div>
        </LabPanel>
      </div>
    </div>
  </>
}
