import './iconbutton.css'

export default function IconButton({ label, size = 'md', tone = 'neutral', type = 'button', children, ...rest }) {
  return (
    <button type={type} className={`hms-iconbtn hms-iconbtn--${size} hms-iconbtn--${tone}`} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  )
}
