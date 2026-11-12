import { Link } from 'react-router-dom'
import { Icon, PageHeader, StatusBadge } from '@ui'
import { ClaimsError, ClaimsNotice, ClaimsPanel, money, patientFor, patientName } from './ClaimsShared.jsx'
import './claims styles/shared.css'
import './claims styles/pipeline.css'

const STAGES = ['Not ready', 'Ready', 'Exported', 'Import passed', 'Warned', 'Failed']
export default function ClaimsPipelinePage({ data, error }) {
  const records = data.claims.records
  return <>
    <PageHeader title="Claims pipeline" description="Track saved claims through validation, export, and external import feedback." actions={<Link className="hms-claims__button" to="/claims/imports"><Icon name="download" size={16} />Review import reports</Link>} />
    <div className="hms-claims">
      <ClaimsError error={error} /><ClaimsNotice>Claim submission is intentionally not available. “Exported” means the local snapshot was prepared for download; it does not mean a payer received it.</ClaimsNotice>
      <div className="hms-claims__pipeline">{STAGES.map((status) => <Link key={status} to="/claims/list" state={{ status }} className={`hms-claims__stage-card is-${status.toLowerCase().replaceAll(' ', '-')}`}><span>{status}</span><strong>{records.filter((claim) => claim.status === status).length}</strong><small>View records <Icon name="arrowUpRight" size={13} /></small></Link>)}</div>
      <ClaimsPanel title="Claims requiring attention" description="Blockers and failed external feedback should be corrected at the source.">
        <div className="hms-claims__table-wrap"><table className="hms-claims__table"><thead><tr><th>Claim / patient</th><th>Stage</th><th>Blockers</th><th>Billed</th><th>Next step</th></tr></thead><tbody>{records.filter((claim) => claim.status === 'Not ready' || claim.status === 'Failed' || claim.status === 'Warned').map((claim) => <tr key={claim.id}><td><strong>{claim.id}</strong><small>{patientName(patientFor(data, claim.patientId))}</small></td><td><StatusBadge tone={claim.status === 'Failed' ? 'critical' : 'warning'}>{claim.status}</StatusBadge></td><td>{claim.blockers.length} blocker(s){claim.warnings.length ? ` · ${claim.warnings.length} warning(s)` : ''}</td><td>{money(claim.billed)}</td><td><Link className="hms-claims__link" to="/claims/list" state={{ claimId: claim.id }}>Review details <Icon name="arrowUpRight" size={14} /></Link></td></tr>)}</tbody></table>{!records.some((claim) => ['Not ready', 'Failed', 'Warned'].includes(claim.status)) ? <div className="hms-claims__empty">No claims need attention.</div> : null}</div>
      </ClaimsPanel>
    </div>
  </>
}
