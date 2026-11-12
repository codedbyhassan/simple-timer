import { useNavigate } from 'react-router-dom'
import { Avatar, Button, Card, PageHeader, StatusBadge, Text } from '@ui'
import { useAuth } from '@core/auth'
import { useAccess } from '@core/access/AccessProvider.jsx'
import { roleLabel } from '@core/access/roles.js'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const { access, roles } = useAccess()
  const navigate = useNavigate()
  const displayName = access.displayName || user?.displayName || user?.name || 'Local staff profile'

  const switchProfile = async () => {
    await signOut()
    navigate('/signin', { replace: true })
  }

  return (
    <>
      <PageHeader title="Profile" description="The local staff profile currently selected for this installation." />
      <div style={{ display: 'grid', gap: 18, maxWidth: 720 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar name={displayName} size="lg" />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 650 }}>{displayName}</p>
              <Text tone="muted" size="sm">{user?.department || 'Department not set'}</Text>
            </div>
            <StatusBadge tone="info">Local profile</StatusBadge>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
            {roles.map((role) => <StatusBadge key={role} tone="neutral">{roleLabel(role)}</StatusBadge>)}
          </div>
        </Card>
        <Card title="Access mode" description="Profiles and permissions are stored in IndexedDB on this device. They do not authenticate a real staff member and do not sync to another installation.">
          <Button size="md" intent="secondary" onClick={switchProfile}>Switch local profile</Button>
        </Card>
      </div>
    </>
  )
}
