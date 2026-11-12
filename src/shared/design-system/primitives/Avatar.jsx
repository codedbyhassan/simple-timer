import './avatar.css'

const initialsOf = (name = '') => {
  const parts = name.replace(/@.*$/, '').split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({ name, size = 'md' }) {
  return <span className={`hms-avatar hms-avatar--${size}`} aria-hidden="true">{initialsOf(name)}</span>
}
