import { Card, Icon, PageHeader } from '@ui'
import './admin styles/hospitalprofile.css'

const details = [
  {
    title: 'Facility identity',
    description: 'Official identifiers used across hospital operations.',
    items: [
      ['Registered name', '—'],
      ['Facility code', '—'],
      ['Facility type', '—'],
      ['Ownership', '—'],
    ],
  },
  {
    title: 'Contact and location',
    description: 'Primary location and contact details for the facility.',
    items: [
      ['Street address', '—'],
      ['City / district', '—'],
      ['Main phone', '—'],
      ['Official email', '—'],
    ],
  },
  {
    title: 'Regulatory details',
    description: 'Registration and insurance information for claims and reports.',
    items: [
      ['Health authority registration', '—'],
      ['NHIA facility number', '—'],
      ['Accreditation status', '—'],
      ['Accreditation expiry', '—'],
    ],
  },
  {
    title: 'Operational defaults',
    description: 'Facility-wide defaults used to display dates, times and amounts.',
    items: [
      ['Time zone', '—'],
      ['Currency', '—'],
      ['Date format', '—'],
      ['Week starts on', '—'],
    ],
  },
]

function DetailCard({ section }) {
  return (
    <Card title={section.title} description={section.description}>
      <dl className="hms-hospital-profile__details">
        {section.items.map(([label, value]) => (
          <div className="hms-hospital-profile__detail" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

export default function HospitalProfilePage({ menu }) {
  return (
    <>
      <PageHeader title={menu.label} description={menu.summary} />

      <div className="hms-hospital-profile">
        <section className="hms-hospital-profile__identity" aria-label="Facility summary">
          <div className="hms-hospital-profile__mark"><Icon name="building" size={24} /></div>
          <div className="hms-hospital-profile__identity-copy">
            <span className="hms-hospital-profile__eyebrow">Hospital record</span>
            <h2>Facility profile</h2>
            <p>Official identity, contact, regulatory and operational defaults.</p>
          </div>
        </section>

        <div className="hms-hospital-profile__grid">
          {details.map((section) => <DetailCard key={section.title} section={section} />)}
        </div>

      </div>
    </>
  )
}
