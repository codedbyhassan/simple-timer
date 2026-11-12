import './pageheader.css'

export default function PageHeader({ title, description, actions }) {
  return (
    <header className="hms-pagehead">
      <div>
        <h1 className="hms-pagehead__title">{title}</h1>
        {description ? <p className="hms-pagehead__desc">{description}</p> : null}
      </div>
      {actions ? <div className="hms-pagehead__actions">{actions}</div> : null}
    </header>
  )
}
