import { Link } from 'react-router-dom'
import { Icon, MetricCard, PageHeader, StatusBadge } from '@ui'
import { ClaimsError, ClaimsPanel, dateLabel, money, patientFor, patientName } from './ClaimsShared.jsx'
import './claims styles/shared.css'
import './claims styles/overview.css'

export default function ClaimsOverviewPage({ data, error }) {
  const { claims } = data
  const records = claims.records
  const ready = records.filter((claim) => claim.status === 'Ready')
  const month = new Date().toISOString().slice(0, 7)
  const thisMonth = records.filter((claim) => claim.month === month)
  const gaps = claims.mappings.filter((item) => item.status !== 'Mapped').length
  const recent = [...claims.activity].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5)
  return <>
    <PageHeader title="Claims overview" description="NHIS claim snapshots, validation gaps, export readiness, and imported outcomes." actions={<Link className="hms-claims__button hms-claims__button--primary" to="/claims/list"><Icon name="fileText" size={16} />Review claims</Link>} />
    <div className="hms-claims">
      <ClaimsError error={error} />
      <div className="hms-claims__metrics"><MetricCard label="Saved snapshots" value={records.length} icon="fileText" caption={`${thisMonth.length} for this month`} /><MetricCard label="Export ready" value={ready.length} icon="checkCircle" caption="No validation blockers" /><MetricCard label="Mapping gaps" value={gaps} icon="link" caption="Reference mapping needs review" /><MetricCard label="Export batches" value={claims.batches.length} icon="upload" caption="Download history" /></div>
      <div className="hms-claims__overview-grid">
        <ClaimsPanel title="Recent claim snapshots" description="Latest saved claim records." actions={<Link className="hms-claims__link" to="/claims/list">Open claim list <Icon name="arrowUpRight" size={14} /></Link>}>
          <div className="hms-claims__recent-list">{records.slice(0, 5).map((claim) => <Link to="/claims/list" state={{ claimId: claim.id }} className="hms-claims__recent-row" key={claim.id}><span><strong>{patientName(patientFor(data, claim.patientId))}</strong><small>{claim.id} · {claim.service}</small></span><span><StatusBadge tone={claim.status === 'Ready' || claim.status === 'Import passed' ? 'success' : claim.status === 'Failed' || claim.status === 'Not ready' ? 'warning' : 'info'}>{claim.status}</StatusBadge><small>{money(claim.billed)} billed</small></span></Link>)}</div>
        </ClaimsPanel>
        <ClaimsPanel title="Pipeline snapshot" description="Claims by the current local workflow stage." actions={<Link className="hms-claims__link" to="/claims/pipeline">View pipeline <Icon name="arrowUpRight" size={14} /></Link>}>
          <div className="hms-claims__mini-pipeline">{['Not ready', 'Ready', 'Exported', 'Import passed', 'Warned', 'Failed'].map((status) => <Link key={status} to="/claims/pipeline" state={{ status }}><span>{status}</span><strong>{records.filter((claim) => claim.status === status).length}</strong></Link>)}</div>
        </ClaimsPanel>
        <ClaimsPanel title="Mapping gaps" description="Unresolved reference values can block validation." actions={<Link className="hms-claims__link" to="/claims/mapping">Open mapping queue <Icon name="arrowUpRight" size={14} /></Link>}>
          {claims.mappings.filter((item) => item.status !== 'Mapped').slice(0, 4).map((item) => <div className="hms-claims__gap-row" key={item.id}><span><strong>{item.source}</strong><small>{item.kind} · {item.affectedClaims} affected record(s)</small></span><StatusBadge tone="critical">Unmapped</StatusBadge></div>)}{!gaps ? <p className="hms-claims__muted">No mapping gaps.</p> : null}
        </ClaimsPanel>
        <ClaimsPanel title="Recent activity" description="Claim workspace events.">
          {recent.map((item) => <div className="hms-claims__activity-row" key={item.id}><Icon name="history" size={16} /><span>{item.message}<small>{dateLabel(item.at)}</small></span></div>)}{!recent.length ? <p className="hms-claims__muted">No activity recorded.</p> : null}
        </ClaimsPanel>
      </div>
    </div>
  </>
}
