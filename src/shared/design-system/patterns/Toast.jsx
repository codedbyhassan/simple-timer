import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../icons/Icon.jsx'
import IconButton from '../primitives/IconButton.jsx'
import './toast.css'

const ToastContext = createContext(null)

const TONES = {
  success: { icon: 'checkCircle', duration: 5000 },
  error: { icon: 'xCircle', duration: 8000 },
  warning: { icon: 'alertTriangle', duration: 7000 },
  info: { icon: 'info', duration: 5000 },
}
const MAX_VISIBLE = 3
const LEAVE_MS = 180

function ToastItem({ toast, onClose }) {
  const tone = TONES[toast.tone]
  return (
    <li
      className={`hms-toast hms-toast--${toast.tone}${toast.leaving ? ' is-leaving' : ''}`}
      role={toast.tone === 'error' ? 'alert' : 'status'}
    >
      <span className="hms-toast__badge"><Icon name={tone.icon} size={20} /></span>
      <div className="hms-toast__body">
        <p className="hms-toast__title">{toast.title}</p>
        {toast.message ? <p className="hms-toast__message">{toast.message}</p> : null}
        {toast.action ? (
          <button type="button" className="hms-toast__action" onClick={() => { toast.action.onClick?.(); onClose(toast.id) }}>
            {toast.action.label}
          </button>
        ) : null}
      </div>
      <IconButton size="sm" label="Dismiss notification" onClick={() => onClose(toast.id)}><Icon name="x" size={16} /></IconButton>
      <span
        className="hms-toast__timer"
        style={{ animationDuration: `${toast.duration}ms` }}
        onAnimationEnd={() => onClose(toast.id)}
      />
    </li>
  )
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const seq = useRef(0)

  const dismiss = useCallback((id) => {
    setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), LEAVE_MS)
  }, [])

  const push = useCallback((tone, input, maybeMessage) => {
    const opts = typeof input === 'string' ? { title: input, message: maybeMessage } : input
    const id = ++seq.current
    const item = { id, tone, duration: opts.duration ?? TONES[tone].duration, title: opts.title, message: opts.message, action: opts.action }
    setItems((list) => {
      // Ignore an identical toast that is already showing.
      if (list.some((t) => !t.leaving && t.tone === tone && t.title === item.title && t.message === item.message)) return list
      return [item, ...list].slice(0, MAX_VISIBLE + 2)
    })
    return id
  }, [])

  const api = useMemo(() => ({
    success: (a, b) => push('success', a, b),
    error: (a, b) => push('error', a, b),
    warning: (a, b) => push('warning', a, b),
    info: (a, b) => push('info', a, b),
    dismiss,
  }), [push, dismiss])

  // Development only: lets tests and the console trigger toasts.
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined
    window.__hmsToast = api
    return () => { delete window.__hmsToast }
  }, [api])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ol className="hms-toasts" aria-label="Notifications">
        {items.slice(0, MAX_VISIBLE).map((t) => <ToastItem key={t.id} toast={t} onClose={dismiss} />)}
      </ol>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
