import { Link } from 'react-router-dom'
import { Icon, MetricCard, PageHeader, StatusBadge } from '@ui'
import { ClaimsError, ClaimsNotice, ClaimsPanel, money } from './ClaimsShared.jsx'
import './claims styles/shared.css'
import './claims styles/progress.css'

export default function ClaimsProgressPage({ data, error }) {
  const records = data.claims.records
  const months = [...new Set(records.map((claim) => claim.month))].sort().reverse().slice(0, 6).reverse()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const current = records.filter((claim) => claim.month === currentMonth)
  const ready = current.filter((claim) => ['Ready', 'Exported', 'Import passed'].includes(claim.status)).length
  const percentage = current.length ? Math.round(ready / current.length * 100) : 0
  return <>
    <PageHeader title="Month progress" description="Monitor snapshot readiness and outcomes by claim month." actions={<Link className="hms-claims__button" to="/claims/list"><Icon name="fileText" size={16} />Review claim list</Link>} />
    <div className="hms-claims">
      <ClaimsError error={error} /><ClaimsNotice>Progress reflects local claim snapshots. Billed-versus-cost differences are not reimbursement estimates; CLAIM-it calculates cost from its own rules.</ClaimsNotice>
      <div className="hms-claims__metrics"><MetricCard label="Current month" value={currentMonth} icon="calendar" caption={`${current.length} saved snapshot(s)`} /><MetricCard label="Ready or exported" value={`${ready} / ${current.length}`} icon="checkCircle" caption={`${percentage}% of this month`} /><MetricCard label="Hospital billed" value={money(current.reduce((sum, item) => sum + Number(item.billed || 0), 0))} icon="receipt" caption="Source invoice totals" /><MetricCard label="Cost returned" value={money(current.reduce((sum, item) => sum + Number(item.claimCost || 0), 0))} icon="trendingUp" caption="Returned cost values" /></div>
      <ClaimsPanel title="Monthly readiness" description="Counts by workflow stage.">
        <div className="hms-claims__month-progress"><div className="hms-claims__progress-heading"><strong>{percentage}% ready or exported</strong><span>{ready} of {current.length} current-month claims</span></div><div className="hms-claims__progress-track"><i style={{ width: `${percentage}%` }} /></div></div>
        <div className="hms-claims__month-grid">{months.map((month) => {
          const monthClaims = records.filter((claim) => claim.month === month)
          const count = (status) => monthClaims.filter((claim) => claim.status === status).length
          return <article key={month}><header><strong>{month}</strong><StatusBadge tone="info">{monthClaims.length} claims</StatusBadge></header><div className="hms-claims__month-bars">{[['Ready', count('Ready') + count('Exported') + count('Import passed')], ['Not ready', count('Not ready')], ['Needs review', count('Failed') + count('Warned')]].map(([label, amount]) => <div key={label}><span>{label}</span><strong>{amount}</strong><i style={{ width: `${monthClaims.length ? amount / monthClaims.length * 100 : 0}%` }} /></div>)}</div><Link to="/claims/list" state={{ status: 'All' }}>View month records <Icon name="arrowUpRight" size={13} /></Link></article>
        })}{!months.length ? <p className="hms-claims__muted">No monthly claim data.</p> : null}</div>
      </ClaimsPanel>
    </div>
  </>
}
