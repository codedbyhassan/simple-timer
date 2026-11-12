import Icon from '../icons/Icon.jsx'
import './emptystate.css'

export default function EmptyState({ icon = 'info', title, children, action }) {
  return (
    <div className="hms-empty">
      <span className="hms-empty__icon"><Icon name={icon} size={22} /></span>
      <h2 className="hms-empty__title">{title}</h2>
      {children ? <p className="hms-empty__text">{children}</p> : null}
      {action}
    </div>
  )
}
