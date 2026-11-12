import { useCallback, useEffect, useId, useRef, useState } from 'react'
import './popover.css'

// Anchored panel with outside-click and Escape handling. `trigger` and `children` can be render functions.
export default function Popover({ trigger, children, align = 'end', width, label, onOpenChange }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const panelId = useId()
  const rootId = useId()

  const set = useCallback((next) => { setOpen(next); onOpenChange?.(next) }, [onOpenChange])
  const close = useCallback((returnFocus = true) => {
    set(false)
    // Looked up by id (not through the ref) so this callback is safe to hand to render props.
    if (returnFocus) document.getElementById(rootId)?.querySelector('[data-popover-trigger]')?.focus()
  }, [set, rootId])

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (root.current && !root.current.contains(e.target)) set(false) }
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(true) } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open, close, set])

  const triggerProps = {
    'data-popover-trigger': true,
    'aria-haspopup': 'true',
    'aria-expanded': open,
    'aria-controls': open ? panelId : undefined,
    onClick: () => set(!open),
  }

  return (
    <div className="hms-popover" id={rootId} ref={root}>
      {trigger({ open, props: triggerProps })}
      {open ? (
        <div id={panelId} className={`hms-popover__panel hms-popover__panel--${align}`} style={width ? { width } : undefined} aria-label={label}>
          {typeof children === 'function' ? children({ close }) : children}
        </div>
      ) : null}
    </div>
  )
}
