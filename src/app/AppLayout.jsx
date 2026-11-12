import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppShell, Button, CriticalStrip, EmptyState, NotificationCenter, Spinner, WorkspaceSwitcher } from '@ui'
import { useAuth } from '@core/auth'
import { useAccess } from '@core/access/AccessProvider.jsx'
import { findWorkspaceBySlug, menuPath, visibleMenus, workspaceHome } from '@core/access/navigation.js'
import { roleLabel } from '@core/access/roles.js'
import { useNotifications } from '@core/notifications/NotificationsProvider.jsx'

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const access = useAccess()
  const notes = useNotifications()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  if (access.status === 'loading') {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-subtle)' }}><Spinner size={28} label="Loading your access" /></div>
  }
  if (access.status === 'error') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 32 }}>
        <div style={{ maxWidth: 480 }}>
          <EmptyState icon="alertTriangle" title="Your access could not be loaded" action={(
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Button size="md" onClick={access.retry}>Try again</Button>
              <Button size="md" intent="secondary" onClick={async () => { await signOut(); navigate('/signin', { replace: true }) }}>Sign out</Button>
            </div>
          )}>
            The local profile or IndexedDB data could not be read. Check browser storage availability and try again.
          </EmptyState>
        </div>
      </div>
    )
  }

  // The workspace is read from the address. Shared pages (profile and settings) use the first available workspace.
  const slug = pathname.split('/')[1]
  const fromUrl = findWorkspaceBySlug(slug)
  const current = access.workspaces.find((w) => w === fromUrl) || access.workspaces[0]
  const sections = current
    ? [{ id: current.id, label: current.label, items: visibleMenus(current, access.can).map((menu) => ({ to: menuPath(current, menu), label: menu.label, icon: menu.icon })) }]
    : []

  const name = access.access.displayName || user?.displayName || user?.name || 'Local profile'
  const role = access.roles.length ? roleLabel(access.roles[0]) : ''
  const critical = notes.pendingCritical

  return (
    <AppShell
      sections={sections}
      switcher={access.workspaces.length > 1 && current
        ? ({ compact }) => <WorkspaceSwitcher current={current} workspaces={access.workspaces} compact={compact} onSelect={(w) => navigate(workspaceHome(w))} />
        : null}
      search={{ placeholder: 'Search', label: 'Search patients, appointments, orders and claims', onSubmit: (q) => q && navigate(`/search?q=${encodeURIComponent(q)}`) }}
      notifications={(
        <NotificationCenter
          items={notes.items}
          unread={notes.unread}
          onMarkAllRead={notes.markAllRead}
          onAcknowledge={notes.acknowledge}
          onOpenItem={(n) => n.target && navigate(n.target)}
        />
      )}
      user={{ name, sub: role || user?.department || 'Local profile' }}
      menuItems={[
        { id: 'settings', label: 'Settings', icon: 'settings', onSelect: () => navigate('/settings') },
        { id: 'profile', label: 'Profile', icon: 'user', onSelect: () => navigate('/profile') },
        { id: 'logout', label: 'Log out', icon: 'logOut', tone: 'critical', onSelect: async () => { await signOut(); navigate('/signin', { replace: true }) } },
      ]}
      strip={<CriticalStrip item={critical[0]} extra={Math.max(0, critical.length - 1)} onAcknowledge={notes.acknowledge} />}
    >
      <Outlet />
    </AppShell>
  )
}
