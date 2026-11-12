import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, PageHeader, StatusBadge } from '@ui'
import { ErrorNotice, SearchField, EmptyResult, nameOf, patientFor, money, formatDate, statusTone, patientPath } from './ReceptionShared.jsx'
import { TODAY } from './receptionData.js'
import './reception styles/shared.css'
import './reception styles/payments.css'

export default function PaymentsPage({ menu, data, error }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All statuses')
  const rows = data.payments.map((payment) => ({ ...payment, patient: patientFor(data, payment.patientId), balance: Math.max(0, Number(payment.billed) - Number(payment.paid)) }))
  const filtered = rows.filter((payment) => (
    (filter === 'All statuses' || payment.status === filter)
    && `${payment.patient?.id} ${nameOf(payment.patient)} ${payment.id} ${payment.description}`.toLowerCase().includes(query.toLowerCase())
  )).sort((a, b) => b.date.localeCompare(a.date))
  const outstanding = rows.filter((payment) => payment.balance > 0).reduce((sum, payment) => sum + payment.balance, 0)
  const outstandingPatients = new Set(rows.filter((payment) => payment.balance > 0).map((payment) => payment.patientId)).size
  const settledToday = rows.filter((payment) => payment.date === TODAY && payment.status === 'Settled').length

  return (
    <>
      <PageHeader title={menu.label} description="Review patient invoices and payment balances. Payment collection is handled by the cashier." />
      <div className="hms-reception">
        <ErrorNotice error={error} />
        <div className="hms-reception__payment-summary"><div><span className="hms-reception__eyebrow">Outstanding balances</span><strong>{money(outstanding)}</strong><small>Across {outstandingPatients} patients</small></div><div><span className="hms-reception__eyebrow">Open invoices</span><strong>{rows.filter((payment) => payment.balance > 0).length}</strong><small>Unpaid or part-paid</small></div><div><span className="hms-reception__eyebrow">Settled today</span><strong>{settledToday}</strong><small>Invoices marked settled</small></div><span className="hms-reception__payment-icon"><Icon name="creditCard" size={23} /></span></div>
        <section className="hms-reception__panel">
          <header className="hms-reception__panel-head"><div><span className="hms-reception__eyebrow">Front-desk visibility</span><h2>Patient payment records</h2><p>Payment and balance information for reception enquiries.</p></div></header>
          <div className="hms-reception__directory-tools"><SearchField value={query} onChange={setQuery} placeholder="Search patient or invoice" /><label className="hms-reception__select-filter"><Icon name="filter" size={16} /><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter payment status">{['All statuses', 'Unpaid', 'Part-paid', 'Settled'].map((item) => <option key={item}>{item}</option>)}</select></label></div>
          <div className="hms-reception__table-wrap"><table className="hms-reception__table"><thead><tr><th>Patient</th><th>Invoice</th><th>Date</th><th>Services</th><th>Billed</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>
            {filtered.map((payment) => <tr key={payment.id}><td><Link to={patientPath(payment.patient?.id)} className="hms-reception__table-patient">{nameOf(payment.patient)}<small>{payment.patient?.id}</small></Link></td><td><strong>{payment.id}</strong></td><td>{formatDate(payment.date)}</td><td>{payment.description}<small className="hms-reception__table-sub">{payment.method}</small></td><td>{money(payment.billed)}</td><td>{money(payment.paid)}</td><td className={payment.balance ? 'is-balance' : ''}>{money(payment.balance)}</td><td><StatusBadge tone={statusTone(payment.status)}>{payment.status}</StatusBadge></td></tr>)}
          </tbody></table>{filtered.length === 0 ? <EmptyResult icon="creditCard" title="No payment records match this view" /> : null}</div>
          <div className="hms-reception__payment-note"><Icon name="info" size={16} /><span>For payment collection, refunds or receipts, refer the patient to the cashier.</span></div>
        </section>
      </div>
    </>
  )
}
