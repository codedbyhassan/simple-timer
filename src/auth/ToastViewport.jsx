import { useEffect } from 'react'
import { AtSign, CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import './ToastViewport.css'

const toastTypes = {
  info: { label: 'Information', icon: Info },
  error: { label: 'Error', icon: CircleAlert },
  success: { label: 'Success!', icon: CircleCheck },
}

function ToastCard({ toast, onDismiss }) {
  const config = toastTypes[toast.type] || toastTypes.info
  const Icon = config.icon

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.duration || 5600)
    return () => window.clearTimeout(timer)
  }, [toast.duration, toast.id, onDismiss])

  return (
    <article className={`app-toast app-toast--${toast.type || 'info'}`} role={toast.type === 'error' ? 'alert' : 'status'}>
      <span className="app-toast-icon">{toast.type === 'info' ? <AtSign size={19} /> : <Icon size={20} />}</span>
      <span className="app-toast-copy">
        <strong>{toast.title || config.label}</strong>
        <span>{toast.message}</span>
      </span>
      {toast.action && <button className="app-toast-action" type="button" onClick={() => { toast.action.onClick(); onDismiss(toast.id) }}>{toast.action.label}</button>}
      {!toast.action && <button className="app-toast-close" type="button" aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)}><X size={15} /></button>}
    </article>
  )
}

export default function ToastViewport({ toasts, onDismiss }) {
  return (
    <div className="toast-viewport" aria-label="Notifications">
      {toasts.map((toast) => <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />)}
    </div>
  )
}
