import { CheckCircle2, Clock3, Loader, Send, XCircle, Zap, AlertTriangle } from 'lucide-react'
import './UiKit.css'

const pillTones = {
  pending: { icon: AlertTriangle, tone: 'amber' },
  progress: { icon: Loader, tone: 'blue' },
  submitted: { icon: Send, tone: 'violet' },
  review: { icon: Zap, tone: 'yellow' },
  success: { icon: CheckCircle2, tone: 'green' },
  failed: { icon: XCircle, tone: 'red' },
  expired: { icon: Clock3, tone: 'grey' },
}

/** @type {[RegExp, string][]} */
const statusMap = [
  [/(paid|dispensed|verified|completed|success|accepted|covered|available|ready|saved|generated)/i, 'success'],
  [/(fail|reject|error|critical|cancel|overdue)/i, 'failed'],
  [/(expired|closed|archived|discharged)/i, 'expired'],
  [/(review|triage|cleaning)/i, 'review'],
  [/(submitted|sent|exported)/i, 'submitted'],
  [/(progress|processing|collected|admitted|occupied|consult)/i, 'progress'],
]

export function statusVariant(label = '') {
  return statusMap.find(([pattern]) => pattern.test(label))?.[1] || 'pending'
}

export function StatusPill({ label, variant = undefined }) {
  const key = variant || statusVariant(label)
  const { icon: Icon, tone } = pillTones[key] || pillTones.pending
  return (
    <span className={`ui-pill ui-pill--${tone}`}>
      <Icon size={13} strokeWidth={2.2} aria-hidden="true" />
      {label}
    </span>
  )
}

export function TactileTabs({ options, value, onChange, label = 'View' }) {
  return (
    <div className="ui-tabs" role="tablist" aria-label={label}>
      {options.map((option) => {
        const item = typeof option === 'string' ? { value: option, label: option } : option
        const active = item.value === value
        return (
          <button key={item.value} type="button" role="tab" aria-selected={active} className={active ? 'ui-tab ui-tab--active' : 'ui-tab'} onClick={() => onChange(item.value)}>
            {item.label}{item.count != null && <span className="ui-tab-count">{item.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function BentoGrid({ children }) {
  return <div className="ui-bento">{children}</div>
}

export function BentoCard({ title, icon: Icon, value, trend, note, span = 1, children }) {
  const trendUp = typeof trend === 'number' ? trend >= 0 : null
  return (
    <section className={`ui-bento-card ui-bento-card--span${span}`}>
      <header>
        <span>{Icon && <Icon size={15} aria-hidden="true" />}{title}</span>
        {trend != null && <em className={trendUp ? 'ui-trend ui-trend--up' : 'ui-trend ui-trend--down'}>{trendUp ? '+' : ''}{trend}%</em>}
      </header>
      {value != null && <strong className="ui-bento-value">{value}</strong>}
      {note && <p className="ui-bento-note">{note}</p>}
      {children}
    </section>
  )
}

export function ArcGauge({ value = 0, max = 100, label, suffix = '%' }) {
  const ratio = Math.max(0, Math.min(1, max ? value / max : 0))
  const radius = 52
  const length = Math.PI * radius
  return (
    <div className="ui-gauge" role="img" aria-label={`${label || 'Value'}: ${value}${suffix}`}>
      <svg viewBox="0 0 128 72">
        <path d="M12 66 A52 52 0 0 1 116 66" className="ui-gauge-track" />
        <path d="M12 66 A52 52 0 0 1 116 66" className="ui-gauge-fill" strokeDasharray={length} strokeDashoffset={length * (1 - ratio)} />
      </svg>
      <div><strong>{value}{suffix}</strong>{label && <span>{label}</span>}</div>
    </div>
  )
}

const money = (amount, currency) => `${currency} ${Number(amount || 0).toFixed(2)}`

export function ReceiptVoucher({ facility = 'Ascend HMS', reference, date, patientName, items = [], covered = 0, paid, method, currency = 'GH₵' }) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const due = Math.max(0, subtotal - covered)
  const bars = String(reference || 'RECEIPT').split('').map((char, index) => (char.charCodeAt(0) + index) % 4 + 1)
  return (
    <article className="ui-receipt" aria-label={`Receipt ${reference || ''}`}>
      <header>
        <strong>{facility}</strong>
        <span>{date}</span>
      </header>
      <div className="ui-receipt-greeting"><span>Receipt for</span><strong>{patientName}</strong></div>
      <ul>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}><span>{item.label}</span><i aria-hidden="true" /><b>{money(item.amount, currency)}</b></li>
        ))}
      </ul>
      {covered > 0 && <p className="ui-receipt-line"><span>NHIS covered</span><b>− {money(covered, currency)}</b></p>}
      <p className="ui-receipt-total"><span>Total due</span><b>{money(due, currency)}</b></p>
      {paid != null && <p className="ui-receipt-line"><span>Paid{method ? ` · ${method}` : ''}</span><b>{money(paid, currency)}</b></p>}
      <div className="ui-receipt-cut" aria-hidden="true" />
      <footer>
        <div className="ui-barcode" aria-hidden="true">{bars.map((width, index) => <span key={index} style={{ width }} />)}</div>
        <small>{reference}</small>
      </footer>
    </article>
  )
}
