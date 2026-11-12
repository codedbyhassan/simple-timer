import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout, Button, Heading, PasswordField, RequirementList, Spinner, Stack, Text, TextLink, useToast } from '@ui'
import { authService, describeAuthError, passwordChecks } from '@core/auth'

export default function ResetPasswordPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const passwordRef = useRef(null)
  const confirmRef = useRef(null)
  const [phase, setPhase] = useState('checking') // checking | ready | invalid
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    authService.waitForRecovery().then((ok) => alive && setPhase(ok ? 'ready' : 'invalid'))
    return () => { alive = false }
  }, [])

  const checks = passwordChecks(password, confirm)

  const onSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    const [length, match] = checks
    const next = {}
    if (!length.met) next.password = length.label + ' are needed.'
    else if (!match.met) next.confirm = 'The two passwords do not match.'
    setErrors(next)
    if (next.password) { passwordRef.current?.focus(); return }
    if (next.confirm) { confirmRef.current?.focus(); return }

    setBusy(true)
    try {
      await authService.updatePassword(password)
      await authService.signOut()
      toast.success('Password updated', 'Sign in with your new password.')
      navigate('/signin', { replace: true })
    } catch (err) {
      const { title, message } = describeAuthError(err)
      if (err.kind === 'same_password') setErrors({ password: message })
      else toast.error(title, message)
      if (err.kind === 'expired_link') setPhase('invalid')
      setBusy(false)
    }
  }

  if (phase === 'checking') {
    return (
      <AuthLayout>
        <Stack gap="md">
          <Heading>Checking your link</Heading>
          <Text tone="muted" style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Spinner size={16} label="Checking" /> One moment.</Text>
        </Stack>
      </AuthLayout>
    )
  }

  if (phase === 'invalid') {
    const { message } = describeAuthError({ kind: 'expired_link' })
    return (
      <AuthLayout>
        <Stack gap="xs">
          <Heading>This link has expired</Heading>
          <Text tone="muted">{message} Reset links work once and stop working after a short time.</Text>
        </Stack>
        <Stack gap="md">
          <Button fullWidth onClick={() => navigate('/forgot-password')}>Request a new link</Button>
          <Text size="sm"><TextLink to="/signin" icon="arrowLeft">Back to sign in</TextLink></Text>
        </Stack>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Stack gap="xs">
        <Heading>Choose a new password</Heading>
        <Text tone="muted">You will sign in with it straight after.</Text>
      </Stack>

      <form onSubmit={onSubmit} noValidate>
        <Stack gap="lg">
          <Stack gap="md">
            <PasswordField
              ref={passwordRef}
              label="New password"
              name="new-password"
              autoComplete="new-password"
              autoFocus
              value={password}
              error={errors.password}
              onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((x) => ({ ...x, password: undefined })) }}
            />
            <PasswordField
              ref={confirmRef}
              label="Confirm new password"
              name="confirm-password"
              autoComplete="new-password"
              value={confirm}
              error={errors.confirm}
              onChange={(e) => { setConfirm(e.target.value); if (errors.confirm) setErrors((x) => ({ ...x, confirm: undefined })) }}
            />
            <RequirementList label="Password requirements" items={checks} />
          </Stack>
          <Button type="submit" fullWidth loading={busy}>Update password</Button>
        </Stack>
      </form>
    </AuthLayout>
  )
}
