import { Link } from 'react-router-dom'
import Icon from '../icons/Icon.jsx'
import './breadcrumbs.css'

// items: [{ label, to?, icon? }]. The last item is the current page.
export default function Breadcrumbs({ items }) {
  return (
    <nav className="hms-crumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((it, i) => {
          const last = i === items.length - 1
          const inner = <>{it.icon ? <Icon name={it.icon} size={16} /> : null}{it.label}</>
          return (
            <li key={`${it.label}-${i}`}>
              {last || !it.to ? <span className={last ? 'is-current' : ''} aria-current={last ? 'page' : undefined}>{inner}</span> : <Link to={it.to}>{inner}</Link>}
              {!last ? <Icon name="chevronRight" size={14} /> : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
