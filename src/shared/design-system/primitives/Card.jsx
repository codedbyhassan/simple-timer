import './card.css'

export default function Card({ title, description, children, padding = 'md', ...rest }) {
  return (
    <section className={`hms-card hms-card--${padding}`} {...rest}>
      {title ? (
        <header className="hms-card__head">
          <h2 className="hms-card__title">{title}</h2>
          {description ? <p className="hms-card__desc">{description}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  )
}
