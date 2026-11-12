import Spinner from './Spinner.jsx'
import './button.css'

export default function Button({ intent = 'primary', size = 'lg', fullWidth = false, loading = false, type = 'button', disabled, children, ...rest }) {
  return (
    <button
      type={type}
      className={`hms-btn hms-btn--${intent} hms-btn--${size}${fullWidth ? ' hms-btn--full' : ''}${loading ? ' is-loading' : ''}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <span className="hms-btn__label">{children}</span>
      {loading ? <span className="hms-btn__spinner"><Spinner size={18} /></span> : null}
    </button>
  )
}
