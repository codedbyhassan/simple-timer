import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout, Heading, Stack, Text, useToast } from '@ui'
import { getProfiles } from '@core/storage/localProfiles.js'
import { useAuth } from '@core/auth'
import './local-signin.css'

export default function SignInPage() {
  const { signIn } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [profiles, setProfiles] = useState([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    let alive = true
    getProfiles().then((items) => {
      if (!alive) return
      const active = items.filter((profile) => profile.active)
      setProfiles(active)
      setSelected(active[0]?.id || '')
    }).catch((error) => alive && setProfileError(error instanceof Error ? error.message : 'Unable to load local profiles.')).finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!selected || busy) return
    setBusy(true)
    try {
      await signIn(selected)
      navigate(location.state?.from || '/', { replace: true })
    } catch (error) {
      toast.error('Unable to open profile', error.message)
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <Stack gap="xs">
        <Heading>Choose a staff profile</Heading>
        <Text tone="muted">Select a local role profile to open its workspace. This does not verify a real person’s identity.</Text>
      </Stack>
      <form className="hms-local-signin" onSubmit={onSubmit}>
        {profileError ? <p className="hms-local-signin__error" role="alert">{profileError}</p> : null}
        {loading ? <Text tone="muted">Loading local profiles…</Text> : profiles.length ? (
          <>
            <label className="hms-local-signin__label" htmlFor="local-profile">Staff role</label>
            <select id="local-profile" value={selected} onChange={(event) => setSelected(event.target.value)} disabled={busy}>
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName || profile.name} · {profile.department}</option>)}
            </select>
            <button className="hms-local-signin__submit" type="submit" disabled={!selected || busy}>{busy ? 'Opening workspace…' : 'Continue to workspace'}</button>
          </>
        ) : <Text tone="muted">No active profiles are available. Restore a backup containing an active hospital administrator profile.</Text>}
      </form>
      <div className="hms-local-signin__notice">
        <strong>Local demonstration mode</strong>
        <span>Records stay in this browser or desktop installation. This mode does not provide secure staff authentication or synchronise data between devices.</span>
      </div>
    </AuthLayout>
  )
}
