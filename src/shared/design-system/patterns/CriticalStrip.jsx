import Icon from '../icons/Icon.jsx'
import './criticalstrip.css'

// Persistent strip for critical notifications that still need acknowledging.
export default function CriticalStrip({ item, extra = 0, onAcknowledge }) {
  if (!item) return null
  return (
    <div className="hms-critical" role="alert">
      <Icon name="alertTriangle" size={20} />
      <p className="hms-critical__text">
        <strong>{item.title}</strong>{item.message ? `. ${item.message}` : ''}
        {extra > 0 ? <span className="hms-critical__more"> and {extra} more</span> : null}
      </p>
      <button type="button" className="hms-critical__btn" onClick={() => onAcknowledge(item.id)}>Acknowledge</button>
    </div>
  )
}
