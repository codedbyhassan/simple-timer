import { useEffect, useState } from 'react'
import { Icon, PageHeader, StatusBadge } from '@ui'
import { appendAuditEvent, readDocument, writeDocument } from '@core/storage/localDatabase.js'
import './admin styles/hospitalprofile.css'

const FIELDS = [
  { group: 'Facility identity', description: 'Official identity used on local documents and reports.', fields: [['registeredName', 'Registered name'], ['facilityCode', 'Facility code'], ['facilityType', 'Facility type'], ['ownership', 'Ownership']] },
  { group: 'Contact and location', description: 'Primary address and contact details.', fields: [['address', 'Street address'], ['cityDistrict', 'City / district'], ['phone', 'Main phone'], ['email', 'Official email', 'email']] },
  { group: 'Regulatory details', description: 'Registration and accreditation references entered by the administrator.', fields: [['healthAuthorityRegistration', 'Health authority registration'], ['nhiaFacilityNumber', 'NHIA facility number'], ['accreditationStatus', 'Accreditation status'], ['accreditationExpiry', 'Accreditation expiry', 'date']] },
  { group: 'Operational defaults', description: 'Local display and financial conventions.', fields: [['timeZone', 'Time zone'], ['currency', 'Currency'], ['dateFormat', 'Date format'], ['weekStartsOn', 'Week starts on']] },
]
const EMPTY_PROFILE = { timeZone: 'Africa/Accra', currency: 'GHS', dateFormat: 'DD/MM/YYYY', weekStartsOn: 'Monday' }

export default function HospitalProfilePage({ menu }) {
  const [values, setValues] = useState(EMPTY_PROFILE)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let alive = true
    readDocument('admin.hospital-profile').then((profile) => {
      if (alive && profile && typeof profile === 'object') setValues({ ...EMPTY_PROFILE, ...profile })
    }).catch((loadError) => alive && setError(loadError instanceof Error ? loadError.message : 'Unable to load the local facility profile.')).finally(() => alive && setLoaded(true))
    return () => { alive = false }
  }, [])

  const update = (key, value) => { setValues((current) => ({ ...current, [key]: value })); setSaved(false) }
  const save = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true); setError(''); setSaved(false)
    try {
      await writeDocument('admin.hospital-profile', values)
      await appendAuditEvent({ action: 'Updated facility profile', resource: values.registeredName || 'Hospital profile', category: 'Administration' })
      setSaved(true)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the facility profile.')
    } finally { setSaving(false) }
  }

  return (
    <>
      <PageHeader title={menu.label} description="Maintain the facility identity and operating defaults saved on this device." actions={<button type="submit" form="hospital-profile-form" className="hms-hospital-profile__save" disabled={!loaded || saving}><Icon name="check" size={16} />{saving ? 'Saving…' : 'Save profile'}</button>} />
      <div className="hms-hospital-profile">
        <div className="hms-hospital-profile__identity"><span className="hms-hospital-profile__mark"><Icon name="building" size={24} /></span><div className="hms-hospital-profile__identity-copy"><span className="hms-hospital-profile__eyebrow">Local facility record</span><h2>{values.registeredName || 'Facility profile not configured'}</h2><p>{values.cityDistrict || 'Enter your facility location'}{values.facilityCode ? ` · ${values.facilityCode}` : ''}</p></div><StatusBadge tone="neutral">Stored locally</StatusBadge></div>
        {!loaded ? <div className="hms-hospital-profile__empty">Loading facility profile…</div> : (
          <form id="hospital-profile-form" onSubmit={save} className="hms-hospital-profile__form">
            {FIELDS.map((section) => <section className="hms-hospital-profile__section" key={section.group}><div><h2>{section.group}</h2><p>{section.description}</p></div><div className="hms-hospital-profile__fields">{section.fields.map(([key, label, type]) => <label key={key}><span>{label}</span>{key === 'weekStartsOn' ? <select value={values[key] || 'Monday'} onChange={(event) => update(key, event.target.value)}><option>Monday</option><option>Sunday</option></select> : <input type={type || 'text'} value={values[key] || ''} onChange={(event) => update(key, event.target.value)} />}</label>)}</div></section>)}
            {error ? <div className="hms-hospital-profile__error" role="alert">{error}</div> : null}
            {saved ? <div className="hms-hospital-profile__success" role="status"><Icon name="checkCircle" size={16} />Facility profile saved in IndexedDB.</div> : null}
          </form>
        )}
      </div>
    </>
  )
}
