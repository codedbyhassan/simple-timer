import Icon from '../icons/Icon.jsx'
import IconButton from '../primitives/IconButton.jsx'
import Popover from '../primitives/Popover.jsx'
import { CountBadge } from '../primitives/Badge.jsx'
import './notificationcenter.css'

const TIER = {
  critical: { icon: 'alertTriangle', label: 'Critical' },
  important: { icon: 'info', label: 'Important' },
}

// items: [{ id, tier: 'critical' | 'important', title, message, time, read, acknowledged }]
export default function NotificationCenter({ items, unread, onOpenItem, onMarkAllRead, onAcknowledge }) {
  return (
    <Popover
      label="Notifications"
      width={380}
      onOpenChange={(open) => { if (!open) onMarkAllRead?.() }}
      trigger={({ props }) => (
        <span className="hms-bell">
          <IconButton label={unread ? `Notifications, ${unread} unread` : 'Notifications'} {...props}>
            <Icon name="bell" size={20} />
          </IconButton>
          <span className="hms-bell__count"><CountBadge count={unread} /></span>
        </span>
      )}
    >
      {({ close }) => (
        <div className="hms-notes">
          <div className="hms-notes__head"><h2 className="hms-notes__title">Notifications</h2></div>
          {items.length === 0 ? (
            <div className="hms-notes__empty">
              <span className="hms-notes__tick"><Icon name="check" size={18} strokeWidth={2.4} /></span>
              <p>You are up to date.</p>
            </div>
          ) : (
            <ul className="hms-notes__list">
              {items.map((n) => (
                <li key={n.id} className={`hms-note hms-note--${n.tier}${n.read ? '' : ' is-unread'}`}>
                  <span className="hms-note__icon"><Icon name={TIER[n.tier].icon} size={18} /></span>
                  <div className="hms-note__body">
                    <p className="hms-note__title">{n.title}</p>
                    {n.message ? <p className="hms-note__msg">{n.message}</p> : null}
                    <div className="hms-note__foot">
                      <span className="hms-note__time">{n.time}</span>
                      {n.tier === 'critical' && !n.acknowledged ? (
                        <button type="button" className="hms-note__ack" onClick={() => onAcknowledge?.(n.id)}>Acknowledge</button>
                      ) : null}
                      {n.target ? (
                        <button type="button" className="hms-note__open" onClick={() => { close(false); onOpenItem?.(n) }}>Open</button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Popover>
  )
}
