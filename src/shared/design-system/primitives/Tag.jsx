import './tag.css'

export default function Tag({ tone = 'accent', children }) {
  return <span className={`hms-tag hms-tag--${tone}`}><span className="hms-tag__dot" />{children}</span>
}
