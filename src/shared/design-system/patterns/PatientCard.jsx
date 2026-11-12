import { Link } from 'react-router-dom'
import Icon from '../icons/Icon.jsx'
import './patientcard.css'

const STATUS = {
  insured: { label: 'Insured', icon: 'badgeCheck' },
  'non-insured': { label: 'Non-Insured', icon: null },
  'near-expiry': { label: 'Near Expiry', icon: 'clock' },
}
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

// Profile-style card. The card is the link: there are no buttons on it.
// status: 'insured' | 'non-insured' | 'near-expiry'. stats: [{ icon, value, label }].
export default function PatientCard({ to, name, meta, reference, status, stats = [], footnote, photo }) {
  const s = STATUS[status] || STATUS['non-insured']
  const body = (
    <>
      <div className="hms-pcard__media">
        {photo ? <img src={photo} alt="" /> : <span className="hms-pcard__initials" aria-hidden="true">{initials(name)}</span>}
        <span className={`hms-pcard__badge hms-pcard__badge--${status}`}>{s.icon ? <Icon name={s.icon} size={13} strokeWidth={2.2} /> : null}{s.label}</span>
      </div>
      <div className="hms-pcard__body">
        <h3 className="hms-pcard__name">{name}</h3>
        <p className="hms-pcard__meta">{meta}</p>
        {reference ? <p className="hms-pcard__ref">{reference}</p> : null}
        <div className="hms-pcard__foot">
          {stats.map((st) => (
            <span key={st.label} className="hms-pcard__stat" title={st.label}><Icon name={st.icon} size={15} />{st.value}<span className="hms-pcard__sr"> {st.label}</span></span>
          ))}
          {footnote ? <span className="hms-pcard__note">{footnote}</span> : null}
        </div>
      </div>
    </>
  )
  return to ? <Link to={to} className="hms-pcard">{body}</Link> : <article className="hms-pcard">{body}</article>
}
