import { useEffect, useRef } from 'react'
import Icon from '../icons/Icon.jsx'
import Popover from './Popover.jsx'
import './menu.css'

// items: [{ id, label, icon, onSelect, tone }]. `header` renders above the list.
export default function Menu({ trigger, header, items, label, align = 'end', width = 248 }) {
  return (
    <Popover trigger={trigger} label={label} width={width} align={align}>
      {({ close }) => <MenuList header={header} items={items} close={close} label={label} />}
    </Popover>
  )
}

function MenuList({ header, items, close, label }) {
  const list = useRef(null)
  useEffect(() => { list.current?.querySelector('[role="menuitem"]')?.focus() }, [])

  const onKeyDown = (e) => {
    const nodes = [...list.current.querySelectorAll('[role="menuitem"]')]
    const i = nodes.indexOf(document.activeElement)
    const go = (n) => { e.preventDefault(); nodes[(n + nodes.length) % nodes.length]?.focus() }
    if (e.key === 'ArrowDown') go(i + 1)
    else if (e.key === 'ArrowUp') go(i - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(nodes.length - 1)
    else if (e.key === 'Tab') close(false)
  }

  return (
    <div className="hms-menu">
      {header ? <div className="hms-menu__header">{header}</div> : null}
      <div role="menu" aria-label={label} ref={list} onKeyDown={onKeyDown} className="hms-menu__list">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={`hms-menu__item${item.tone === 'critical' ? ' is-critical' : ''}`}
            onClick={() => { close(false); item.onSelect?.() }}
          >
            {item.icon ? <Icon name={item.icon} size={18} /> : null}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
