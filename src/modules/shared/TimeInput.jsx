import { useEffect, useState } from 'react'
export function parseClockTime(value) {
  const text = String(value || '').trim().toUpperCase()
  const m = text.match(/^(1[0-2]|0?[1-9]):([0-5]\d)\s*(AM|PM)$/)
  if (m) { let h = Number(m[1]) % 12; if (m[3] === 'PM') h += 12; return `${String(h).padStart(2, '0')}:${m[2]}` }
  const m24 = text.match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  return m24 ? `${m24[1]}:${m24[2]}` : ''
}
export function formatClockTime(value) {
  const normalized = parseClockTime(value)
  if (!normalized) return value || '—'
  const [hour, minute] = normalized.split(':').map(Number)
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
}
export function formatDateTime12(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-GH', { dateStyle: 'medium', timeStyle: 'short', hour12: true }).format(date)
}
export default function TimeInput({ value, onChange, className = '', required = false, disabled = false }) {
  const [draft, setDraft] = useState(value ? formatClockTime(value) : '')
  useEffect(() => setDraft(value ? formatClockTime(value) : ''), [value])
  const commit = () => { const normalized = parseClockTime(draft); if (normalized) onChange(normalized); else setDraft(value ? formatClockTime(value) : '') }
  return <input type="text" inputMode="text" className={className} value={draft} placeholder="09:30 AM" aria-label="Time (AM or PM)" pattern="(0?[1-9]|1[0-2]):[0-5][0-9] ?(AM|PM)" title="Enter a time such as 09:30 AM or 04:15 PM" required={required} disabled={disabled} onChange={(event) => setDraft(event.target.value)} onBlur={commit} />
}
export function DateTime12Input({ value, onChange, className = '' }) {
  const [date = '', time = ''] = String(value || '').split('T')
  return <div className={className || 'time-input-datetime'}><input type="date" aria-label="Date" value={date} onChange={(event) => onChange(`${event.target.value}T${time}`)} /><TimeInput value={time.slice(0, 5)} onChange={(nextTime) => onChange(`${date}T${nextTime}`)} /></div>
}
