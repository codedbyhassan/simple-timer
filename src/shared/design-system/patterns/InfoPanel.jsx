import Icon from '../icons/Icon.jsx'
import Meter from '../primitives/Meter.jsx'
import './infopanel.css'

export function InfoPanel({ title = 'Info', children, footer }) {
  return (
    <aside className="hms-info" aria-label={title}>
      <header className="hms-info__head"><h2 className="hms-info__title">{title}</h2></header>
      <div className="hms-info__body">{children}</div>
      {footer ? <footer className="hms-info__foot">{footer}</footer> : null}
    </aside>
  )
}

export function UsageCard({ label, value, used, max, tone = 'accent' }) {
  return (
    <div className="hms-usage">
      <div className="hms-usage__row"><span className="hms-usage__label">{label}</span><Icon name="more" size={16} /></div>
      <p className="hms-usage__value">{value}</p>
      <Meter value={used} max={max} tone={tone} label={label} />
    </div>
  )
}

export function PropertyList({ title, items }) {
  return (
    <section className="hms-props">
      <h3 className="hms-props__title">{title}</h3>
      <dl className="hms-props__list">
        {items.map((it) => (<div key={it.label} className="hms-props__row"><dt>{it.label}</dt><dd>{it.value}</dd></div>))}
      </dl>
    </section>
  )
}

export function InfoFooterLink({ icon, children, ...rest }) {
  return <button type="button" className="hms-info__link" {...rest}><Icon name={icon} size={18} />{children}</button>
}
