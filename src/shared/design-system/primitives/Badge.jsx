import './badge.css'

// Count badge for icons and nav items.
export function CountBadge({ count, label }) {
  if (!count) return null
  return <span className="hms-count" aria-label={label}>{count > 99 ? '99+' : count}</span>
}

// Text status badge. Colour is never the only signal: the text always says it.
export function StatusBadge({ tone = 'neutral', children }) {
  return <span className={`hms-status hms-status--${tone}`}>{children}</span>
}
