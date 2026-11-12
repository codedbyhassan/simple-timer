import { Link } from 'react-router-dom'
import { PageHeader, StatusBadge } from '@ui'
import { balance, CashierError, CashierNotice, CashierPanel, money, patientFor, patientName } from './CashierShared.jsx'
import './cashier styles/shared.css'
import './cashier styles/billed-vs-claimed.css'

export default function CashierBilledVsClaimedPage({ data, error }) {
  const claims = data.claims?.records || []
  const rows = claims.map((claim) => {
    const invoice = data.payments.find((item) => item.id === claim.invoiceId)
    return { claim, invoice, patient: patientFor(data, claim.patientId) }
  })
  return <>
    <PageHeader title="Billed vs claimed" description="Compare hospital invoice totals with available claim snapshots. This is not a G-DRG reimbursement calculation." />
    <div className="hms-cashier">
      <CashierError error={error} /><CashierNotice>Claim costs and totals are snapshot values, not approved reimbursement amounts or an adjudication result.</CashierNotice>
      <CashierPanel title="Invoice and claim comparison" description="Use Claims to prepare and validate source snapshots.">
        {rows.length ? <div className="hms-cashier__table-wrap"><table className="hms-cashier__table"><thead><tr><th>Patient / claim</th><th>Invoice</th><th>Billed</th><th>Paid</th><th>Open balance</th><th>Claim cost</th><th>Claim stage</th></tr></thead><tbody>{rows.map(({ claim, invoice, patient }) => <tr key={claim.id}><td><strong>{patientName(patient)}</strong><small>{claim.id} · {claim.month}</small></td><td>{invoice?.id || claim.invoiceId || '—'}</td><td>{money(invoice?.billed ?? claim.billed)}</td><td>{money(invoice?.paid)}</td><td>{invoice ? money(balance(invoice)) : '—'}</td><td>{money(claim.claimCost)}</td><td><StatusBadge tone={claim.status === 'Ready' || claim.status === 'Import passed' ? 'success' : claim.status === 'Failed' || claim.status === 'Not ready' ? 'warning' : 'info'}>{claim.status}</StatusBadge></td></tr>)}</tbody></table></div> : <div className="hms-cashier__empty">No claim snapshots available yet. <Link className="hms-cashier__link" to="/claims">Open Claims workspace</Link> to build claim snapshots.</div>}
      </CashierPanel>
    </div>
  </>
}
