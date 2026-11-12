import Icon from '../icons/Icon.jsx'
import './chartcard.css'

// Titled surface for charts and lists, with the small round "open" button from the reference.
export default function ChartCard({ eyebrow, title, onOpen, children, ...rest }) {
  return (
    <section className="hms-chartcard" {...rest}>
      <header className="hms-chartcard__head">
        <div>
          {eyebrow ? <p className="hms-chartcard__eyebrow">{eyebrow}</p> : null}
          <h2 className="hms-chartcard__title">{title}</h2>
        </div>
        {onOpen ? <button type="button" className="hms-chartcard__open" aria-label={`Open ${title}`} onClick={onOpen}><Icon name="chevronRight" size={16} /></button> : null}
      </header>
      {children}
    </section>
  )
}
