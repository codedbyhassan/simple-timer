import './foldertile.css'

// Folder tile with paper peeking out. `selected` fills it with the accent. `tone="dark"` is the black variant with a colour wash.
export default function FolderTile({ name, count, meta, selected = false, tone = 'light', preview, onSelect, ...rest }) {
  return (
    <button type="button" className={`hms-folder hms-folder--${tone}${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={onSelect} {...rest}>
      <span className="hms-folder__paper" aria-hidden="true">{preview ? <span className="hms-folder__preview">{preview}</span> : null}</span>
      <span className="hms-folder__paper hms-folder__paper--back" aria-hidden="true" />
      <span className="hms-folder__front">
        <span className="hms-folder__name">{name}</span>
        <span className="hms-folder__count">{count}</span>
        {meta ? <span className="hms-folder__meta">{meta}</span> : null}
      </span>
    </button>
  )
}
