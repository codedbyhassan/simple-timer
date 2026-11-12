import Icon from '../icons/Icon.jsx'
import './metriccard.css'

// delta: { value: '+4.7%', direction: 'up' | 'down', good: true | false }
export default function MetricCard({ label, value, icon, delta, caption }) {
  return (
    <article className="hms-metric">
      <header className="hms-metric__head">
        <span className="hms-metric__label">{label}</span>
        {icon ? <span className="hms-metric__icon"><Icon name={icon} size={18} /></span> : null}
      </header>
      <p className="hms-metric__value">{value}</p>
      <footer className="hms-metric__foot">
        {delta ? (
          <span className={`hms-metric__delta ${delta.good === false ? 'is-bad' : 'is-good'}`}>
            {delta.value}
            <Icon name={delta.direction === 'down' ? 'arrowDownRight' : 'arrowUpRight'} size={14} strokeWidth={2.2} />
          </span>
        ) : null}
        {caption ? <span className="hms-metric__caption">{caption}</span> : null}
      </footer>
    </article>
  )
}
