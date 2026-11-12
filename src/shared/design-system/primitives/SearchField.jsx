import { useEffect, useRef, useState } from 'react'
import Icon from '../icons/Icon.jsx'
import './searchfield.css'

// iOS-style search: soft grey fill, no border, clear button while typing, "Cancel" floats in on focus.
// `shortcut` is a key that focuses the field from anywhere on the page.
export default function SearchField({ placeholder = 'Search', label, onSubmit, shortcut = '/', name = 'q' }) {
  const input = useRef(null)
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!shortcut) return undefined
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase()
      if (e.key === shortcut && !e.ctrlKey && !e.metaKey && !e.altKey && tag !== 'input' && tag !== 'textarea' && !e.target.isContentEditable) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [shortcut])

  const clear = () => { setValue(''); input.current?.focus() }
  const cancel = () => { setValue(''); input.current?.blur() }

  return (
    <form className={`hms-search${focused ? ' is-focused' : ''}`} role="search" onSubmit={(e) => { e.preventDefault(); const q = value.trim(); if (q) onSubmit?.(q) }}>
      <div className="hms-search__field">
        <span className="hms-search__icon"><Icon name="search" size={16} strokeWidth={2.2} /></span>
        <input
          ref={input}
          type="search"
          name={name}
          value={value}
          placeholder={placeholder}
          aria-label={label || placeholder}
          autoComplete="off"
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') { if (value) setValue(''); else input.current?.blur() } }}
        />
        {value ? (
          <button type="button" className="hms-search__clear" aria-label="Clear search" onMouseDown={(e) => e.preventDefault()} onClick={clear}>
            <Icon name="x" size={10} strokeWidth={3} />
          </button>
        ) : null}
      </div>
      <button type="button" className="hms-search__cancel" tabIndex={focused ? 0 : -1} aria-hidden={!focused} onMouseDown={(e) => e.preventDefault()} onClick={cancel}>Cancel</button>
    </form>
  )
}
