import { useState } from 'react'
import { Icon, PageHeader, StatusBadge } from '@ui'
import { PharmacyEmpty, PharmacyError, PharmacyField, PharmacyNotice, PharmacyPanel, uid } from './PharmacyShared.jsx'
import './pharmacy styles/shared.css'
import './pharmacy styles/formulary.css'

export default function PharmacyFormularyPage({ data, error, commit, can }) {
  const [codes, setCodes] = useState({})
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [query, setQuery] = useState('')
  const pending = data.pharmacy.medicines.filter((medicine) => !medicine.nhiaCode)
  const medicines = data.pharmacy.medicines.filter((medicine) => `${medicine.name} ${medicine.category} ${medicine.nhiaCode}`.toLowerCase().includes(query.toLowerCase().trim()))

  const save = (medicine) => {
    setMessage('')
    setActionError('')
    if (!can('pharmacy.manage_formulary')) { setActionError('Your role cannot update formulary mappings.'); return }
    const code = (codes[medicine.id] ?? medicine.nhiaCode).trim()
    if (code && !/^[A-Za-z0-9][A-Za-z0-9._/-]{2,39}$/.test(code)) { setActionError('Enter a valid reference code (3–40 letters, numbers, or . _ / -).'); return }
    const now = new Date().toISOString()
    const pharmacy = {
      ...data.pharmacy,
      medicines: data.pharmacy.medicines.map((item) => item.id === medicine.id ? { ...item, nhiaCode: code } : item),
      activity: [{ id: uid('ACT-PH'), type: 'Mapping', message: `${medicine.name} mapping ${code ? 'updated' : 'cleared'}`, at: now }, ...data.pharmacy.activity],
    }
    if (commit({ ...data, pharmacy })) {
      setMessage(`${medicine.name} mapping saved in the shared workspace.`)
      setCodes((current) => ({ ...current, [medicine.id]: code }))
    }
  }

  return <>
    <PageHeader title="Formulary mapping flags" description="Review medicine references used for claims. A code is a local reference entry and does not certify NHIA approval." />
    <div className="hms-pharmacy">
      <PharmacyError error={error} />
      {message ? <PharmacyNotice tone="success">{message}</PharmacyNotice> : null}
      {actionError ? <PharmacyNotice tone="error">{actionError}</PharmacyNotice> : null}
      <div className="hms-pharmacy__mapping-summary"><div><Icon name="alertTriangle" size={18} /><span><strong>{pending.length}</strong><small>Missing codes</small></span></div><div><Icon name="link" size={18} /><span><strong>{data.pharmacy.medicines.length - pending.length}</strong><small>Mapped references</small></span></div><p>Items without a code are visibly flagged before dispensing. Confirm mappings against an approved reference catalogue.</p></div>
      <label className="hms-pharmacy__search"><Icon name="search" size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search medicines or mapping codes" /></label>
      <PharmacyPanel title="Medicine references" description="Changes are stored in this browser's shared workspace.">
        {medicines.length ? <div className="hms-pharmacy__mapping-list">{medicines.map((medicine) => <article className={`hms-pharmacy__mapping-row${medicine.nhiaCode ? '' : ' is-unmapped'}`} key={medicine.id}><div className="hms-pharmacy__mapping-info"><span className="hms-pharmacy__mapping-icon"><Icon name="pill" size={17} /></span><span><strong>{medicine.name}</strong><small>{medicine.category} · {medicine.form} · {medicine.id}</small></span><StatusBadge tone={medicine.nhiaCode ? 'success' : 'warning'}>{medicine.nhiaCode ? 'Mapped' : 'Unmapped for claims'}</StatusBadge></div><div className="hms-pharmacy__mapping-edit"><PharmacyField label="NHIA medicine code" value={codes[medicine.id] ?? medicine.nhiaCode} onChange={(value) => setCodes((current) => ({ ...current, [medicine.id]: value }))} placeholder="Enter approved reference code" disabled={!can('pharmacy.manage_formulary')} /><button type="button" className="hms-pharmacy__button hms-pharmacy__button--primary" disabled={!can('pharmacy.manage_formulary') || (codes[medicine.id] ?? medicine.nhiaCode) === medicine.nhiaCode} onClick={() => save(medicine)}><Icon name="checkCircle" size={15} />Save mapping</button></div></article>)}</div> : <PharmacyEmpty title="No medicines found">Change the search term to find another medicine.</PharmacyEmpty>}
        {!can('pharmacy.manage_formulary') ? <PharmacyNotice>Your role can review mapping flags but cannot edit formulary references.</PharmacyNotice> : null}
      </PharmacyPanel>
    </div>
  </>
}
