import { useEffect, useRef } from 'react'
import useLocalPreferences from '@core/storage/useLocalPreferences.js'
import { NavLink } from 'react-router-dom'
import Icon from '../icons/Icon.jsx'
import Avatar from '../primitives/Avatar.jsx'
import Menu from '../primitives/Menu.jsx'
import SearchField from '../primitives/SearchField.jsx'
import Logo from '../brand/Logo.jsx'
import ThemeToggle from '../theme/ThemeToggle.jsx'
import markNavy from '../brand/mark-navy.png'
import markWhite from '../brand/mark-white.png'
import './appshell.css'


function SideRail({ sections, switcher, compact, onToggle }) {
  return (
    <nav className="hms-rail" aria-label="Main">
      <div className="hms-rail__brand">
        {compact ? (
          <>
            <img className="hms-rail__mark hms-rail__mark--light" src={markNavy} alt="Ascend HMS" />
            <img className="hms-rail__mark hms-rail__mark--dark" src={markWhite} alt="" aria-hidden="true" />
          </>
        ) : <Logo width={168} />}
      </div>
      {switcher ? <div className="hms-rail__switch">{switcher({ compact })}</div> : null}
      <div className="hms-rail__scroll">
        {sections.map((section, i) => (
          <div key={section.id} className="hms-rail__section">
            {section.label ? <p className={`hms-rail__label${compact ? ' is-hidden' : ''}`}>{section.label}</p> : i > 0 ? <hr className="hms-rail__rule" /> : null}
            {compact && section.label && i > 0 ? <hr className="hms-rail__rule" /> : null}
            <ul className="hms-rail__list">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={({ isActive }) => `hms-rail__item${isActive ? ' is-active' : ''}`} title={compact ? item.label : undefined} aria-label={compact ? item.label : undefined}>
                    <Icon name={item.icon} size={20} />
                    {!compact ? <span className="hms-rail__text">{item.label}</span> : null}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <button type="button" className="hms-rail__collapse" onClick={onToggle} aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'} title={compact ? 'Expand sidebar' : 'Collapse sidebar'}>
        <Icon name="panelLeft" size={20} />
        {!compact ? <span className="hms-rail__text">Collapse</span> : null}
      </button>
    </nav>
  )
}

function TopBar({ search, notifications, user, menuItems }) {
  return (
    <header className="hms-topbar">
      <div className="hms-topbar__left" />
      <div className="hms-topbar__center">
        <SearchField placeholder={search.placeholder} label={search.label} onSubmit={search.onSubmit} />
      </div>
      <div className="hms-topbar__right">
        {notifications}
        <ThemeToggle />
        <Menu
          label="Account"
          header={(
            <div className="hms-account">
              <Avatar name={user.name} size="lg" />
              <div className="hms-account__text">
                <p className="hms-account__name">{user.name}</p>
                <p className="hms-account__sub">{user.sub}</p>
              </div>
            </div>
          )}
          items={menuItems}
          trigger={({ open, props }) => (
            <button type="button" className={`hms-userbtn${open ? ' is-open' : ''}`} aria-label="Account menu" {...props}>
              <Avatar name={user.name} />
              <Icon name="chevronDown" size={16} />
            </button>
          )}
        />
      </div>
    </header>
  )
}

export default function AppShell({ sections, switcher, search, notifications, user, menuItems, strip, children }) {
  const { preferences, updatePreference } = useLocalPreferences()
  const compact = preferences.rail === 'compact'
  const shell = useRef(null)
  const header = useRef(null)
  const content = useRef(null)
  const toggle = async () => {
    try { await updatePreference('rail', compact ? 'expanded' : 'compact') } catch { /* Keep the last saved rail preference. */ }
  }

  // The side rail and the header stay put; only the content scrolls. The header floats over the content so its
  // blur has something to blur, so the content needs to know how tall the header is and how wide the scrollbar is.
  useEffect(() => {
    const measure = () => {
      shell.current?.style.setProperty('--shell-header-h', `${header.current?.offsetHeight ?? 60}px`)
      shell.current?.style.setProperty('--shell-scrollbar', `${content.current ? content.current.offsetWidth - content.current.clientWidth : 0}px`)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (header.current) ro.observe(header.current)
    if (content.current) ro.observe(content.current)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={shell} className={`hms-shell${compact ? ' is-compact' : ''}`}>
      <SideRail sections={sections} switcher={switcher} compact={compact} onToggle={toggle} />
      <div className="hms-shell__main">
        <div ref={header} className="hms-shell__header">
          <TopBar search={search} notifications={notifications} user={user} menuItems={menuItems} />
          {strip}
        </div>
        <main ref={content} className="hms-shell__content" id="main">{children}</main>
      </div>
    </div>
  )
}

// Workspace switcher shown at the top of the rail for people who hold more than one role workspace.
export function WorkspaceSwitcher({ current, workspaces, compact, onSelect }) {
  return (
    <Menu
      label="Workspaces"
      align="start"
      width={248}
      items={workspaces.map((w) => ({ id: w.id, label: w.label, icon: w.icon, onSelect: () => onSelect(w) }))}
      trigger={({ open, props }) => (
        <button type="button" className={`hms-switch${open ? ' is-open' : ''}`} aria-label={`Workspace: ${current.label}. Switch workspace`} title={compact ? current.label : undefined} {...props}>
          <span className="hms-switch__icon"><Icon name={current.icon} size={16} /></span>
          {!compact ? <span className="hms-switch__label">{current.label}</span> : null}
          {!compact ? <span className="hms-switch__chev"><Icon name="chevronsUpDown" size={16} /></span> : null}
        </button>
      )}
    />
  )
}
