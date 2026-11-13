import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout, Heading, Stack, Text, useToast } from '@ui'
import { getProfiles } from '@core/storage/localProfiles.js'
import { WORKSPACES, workspaceHome } from '@core/access/navigation.js'
import { roleLabel } from '@core/access/roles.js'
import { ROLE_PERMISSIONS } from '@core/auth/rolePermissions.js'
import { useAuth } from '@core/auth'
import './local-signin.css'

export default function SignInPage() {
  const { signIn } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState([])
  const [workspaceId, setWorkspaceId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyRole, setBusyRole] = useState('')
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    let alive = true
    getProfiles().then((items) => {
      if (!alive) return
      setProfiles(items.filter((profile) => profile.active))
    }).catch((error) => alive && setProfileError(error instanceof Error ? error.message : 'Unable to load local profiles.')).finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const availableWorkspaces = useMemo(() => WORKSPACES.map((workspace) => ({
    ...workspace,
    availableRoles: workspace.roles.filter((role) => profiles.some((profile) => profile.role === role)),
  })).filter((workspace) => workspace.availableRoles.length), [profiles])

  const selectedWorkspace = availableWorkspaces.find((workspace) => workspace.id === workspaceId) || null

  const openRole = async (workspace, role) => {
    const profile = profiles.find((item) => item.role === role)
    if (!profile || busyRole) return
    setBusyRole(role)
    try {
      await signIn(profile.id)
      navigate(workspaceHome(workspace, (permission) => (ROLE_PERMISSIONS[role] || []).includes(permission)), { replace: true })
    } catch (error) {
      toast.error('Unable to open workspace', error.message)
      setBusyRole('')
    }
  }

  const chooseWorkspace = (workspace) => {
    if (workspace.availableRoles.length === 1) {
      openRole(workspace, workspace.availableRoles[0])
      return
    }
    setWorkspaceId(workspace.id)
  }

  return (
    <AuthLayout>
      <Stack gap="xs">
        <Heading>{selectedWorkspace ? `Choose a ${selectedWorkspace.label} role` : 'Choose your workspace'}</Heading>
        <Text tone="muted">
          {selectedWorkspace
            ? `Select the role dashboard you want to open in ${selectedWorkspace.label}.`
            : 'Select your department to continue to its workspace.'}
        </Text>
      </Stack>

      {profileError ? <p className="hms-local-signin__error" role="alert">{profileError}</p> : null}

      {loading ? <Text tone="muted">Loading available workspaces…</Text> : availableWorkspaces.length ? (
        selectedWorkspace ? (
          <section className="hms-local-signin__selection" aria-label={`${selectedWorkspace.label} role dashboards`}>
            <button className="hms-local-signin__back" type="button" onClick={() => setWorkspaceId('')} disabled={Boolean(busyRole)}>
              <span aria-hidden="true">←</span> All workspaces
            </button>
            <div className="hms-local-signin__grid hms-local-signin__grid--roles">
              {selectedWorkspace.availableRoles.map((role) => {
                const profile = profiles.find((item) => item.role === role)
                const isBusy = busyRole === role
                return (
                  <button
                    className="hms-local-signin__card hms-local-signin__role-card"
                    type="button"
                    data-role={role}
                    key={role}
                    onClick={() => openRole(selectedWorkspace, role)}
                    disabled={Boolean(busyRole)}
                  >
                    <span className="hms-local-signin__card-mark" aria-hidden="true">{roleLabel(role).slice(0, 1).toUpperCase()}</span>
                    <span className="hms-local-signin__card-copy">
                      <strong>{roleLabel(role)}</strong>
                      <span>{profile?.department || selectedWorkspace.label}</span>
                    </span>
                    <span className="hms-local-signin__card-arrow" aria-hidden="true">{isBusy ? '…' : '→'}</span>
                  </button>
                )
              })}
            </div>
          </section>
        ) : (
          <section className="hms-local-signin__selection" aria-label="Available workspaces">
            <div className="hms-local-signin__grid">
              {availableWorkspaces.map((workspace) => (
                <button
                  className="hms-local-signin__card"
                  type="button"
                  data-workspace={workspace.id}
                  key={workspace.id}
                  onClick={() => chooseWorkspace(workspace)}
                  disabled={Boolean(busyRole)}
                >
                  <span className="hms-local-signin__card-mark" aria-hidden="true">{workspace.label.slice(0, 1).toUpperCase()}</span>
                  <span className="hms-local-signin__card-copy">
                    <strong>{workspace.label}</strong>
                    <span>{workspace.purpose}</span>
                    {workspace.availableRoles.length > 1 ? <small>{workspace.availableRoles.length} role dashboards</small> : <small>Continue to dashboard</small>}
                  </span>
                  <span className="hms-local-signin__card-arrow" aria-hidden="true">{busyRole && workspace.availableRoles.includes(busyRole) ? '…' : '→'}</span>
                </button>
              ))}
            </div>
          </section>
        )
      ) : (
        <Text tone="muted">No active role profiles are available. Restore a backup containing an active hospital administrator profile.</Text>
      )}

    </AuthLayout>
  )
}
