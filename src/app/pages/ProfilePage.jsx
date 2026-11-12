import { useState } from 'react'
import { Avatar, Button, Card, PageHeader, StatusBadge, Text, useToast } from '@ui'
import { authService, describeAuthError, useAuth } from '@core/auth'
import { useAccess } from '@core/access/AccessProvider.jsx'
import { roleLabel } from '@core/access/roles.js'

export default function ProfilePage() {
  const { user } = useAuth()
  const { access, roles } = useAccess()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const sendReset = async () => {
    setBusy(true)
    try {
      await authService.requestPasswordReset(user.email)
      toast.success('Reset link sent', `Check ${user.email} for the link.`)
    } catch (err) {
      const { title, message } = describeAuthError(err)
      toast.error(title, message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Profile" />
      <div style={{ display: 'grid', gap: 24, maxWidth: 720 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar name={access.displayName || user.email} size="lg" />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 600 }}>{access.displayName || 'Account'}</p>
              <Text tone="muted" size="sm">{user.email}</Text>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
            {roles.length ? roles.map((r) => <StatusBadge key={r} tone="info">{roleLabel(r)}</StatusBadge>) : <Text tone="muted" size="sm">No role assigned.</Text>}
          </div>
        </Card>
        <Card title="Password" description="We email you a link to choose a new password.">
          <Button size="md" intent="secondary" loading={busy} onClick={sendReset}>Send reset link</Button>
        </Card>
      </div>
    </>
  )
}
