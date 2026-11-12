import Icon from '../icons/Icon.jsx'
import './requirementlist.css'

// items: [{ id, label, met }]
export default function RequirementList({ items, label }) {
  return (
    <ul className="hms-reqs" aria-label={label}>
      {items.map((item) => (
        <li key={item.id} className={`hms-reqs__item${item.met ? ' is-met' : ''}`}>
          <span className="hms-reqs__mark">{item.met ? <Icon name="check" size={12} strokeWidth={3} /> : null}</span>
          <span>{item.label}</span>
          <span className="hms-reqs__sr">{item.met ? 'Met' : 'Not met'}</span>
        </li>
      ))}
    </ul>
  )
}
