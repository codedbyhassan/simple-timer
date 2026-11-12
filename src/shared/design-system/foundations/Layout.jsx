import { Link } from 'react-router-dom'
import Icon from '../icons/Icon.jsx'
import './foundations.css'

export function Stack({ gap = 'md', as: Tag = 'div', children, ...rest }) {
  return <Tag className={`hms-stack hms-stack--${gap}`} {...rest}>{children}</Tag>
}

export function Heading({ level = 1, size = 'xl', children, ...rest }) {
  const Tag = `h${level}`
  return <Tag className={`hms-heading hms-heading--${size}`} {...rest}>{children}</Tag>
}

export function Text({ tone = 'default', size = 'md', as: Tag = 'p', children, ...rest }) {
  return <Tag className={`hms-text hms-text--${tone} hms-text--${size}`} {...rest}>{children}</Tag>
}

export function TextLink({ to, icon, children, ...rest }) {
  return (
    <Link className={`hms-link${icon ? ' hms-link--icon' : ''}`} to={to} {...rest}>
      {icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </Link>
  )
}

export function LinkButton({ children, ...rest }) {
  return <button type="button" className="hms-link hms-link--button" {...rest}>{children}</button>
}
