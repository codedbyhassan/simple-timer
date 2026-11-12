import { useEffect, useRef, useState } from 'react'
import { AuthLayout, Button, Heading, LinkButton, Stack, Text, TextField, TextLink, useToast } from '@ui'
import { authService, describeAuthError, isEmail } from '@core/auth'

const COOLDOWN_SECONDS = 30

export default function ForgotPasswordPage() {
  const toast = useToast()
  const emailRef = useRef(null)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const send = async (address) => {
    setBusy(true)
    try {
      await authService.requestPasswordReset(address)
      setSentTo(address.trim())
      setCooldown(COOLDOWN_SECONDS)
      toast.success('Reset link sent', `Check ${address.trim()} for the link.`)
    } catch (err) {
      const { title, message } = describeAuthError(err)
      toast.error(title, message)
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (busy) return
    if (!email.trim()) { setError('Enter your email address.'); emailRef.current?.focus(); return }
    if (!isEmail(email)) { setError('Enter a valid email address.'); emailRef.current?.focus(); return }
    setError('')
    send(email)
  }

  if (sentTo) {
    return (
      <AuthLayout>
        <Stack gap="xs">
          <Heading>Check your email</Heading>
          <Text tone="muted">If an account exists for <strong>{sentTo}</strong>, a link to reset the password is on its way. It can take a few minutes to arrive.</Text>
        </Stack>
        <Stack gap="md">
          <Text size="sm" tone="muted">
            Nothing yet?{' '}
            <LinkButton disabled={cooldown > 0 || busy} onClick={() => send(sentTo)}>
              {cooldown > 0 ? `Send again in ${cooldown}s` : 'Send again'}
            </LinkButton>
          </Text>
          <Text size="sm"><TextLink to="/signin" icon="arrowLeft">Back to sign in</TextLink></Text>
        </Stack>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Stack gap="xs">
        <Heading>Reset your password</Heading>
        <Text tone="muted">Enter your email and we will send you a link to choose a new password.</Text>
      </Stack>

      <form onSubmit={onSubmit} noValidate>
        <Stack gap="lg">
          <TextField
            ref={emailRef}
            label="Email"
            name="email"
            type="email"
            icon="mail"
            autoComplete="username"
            inputMode="email"
            placeholder="name@hospital.com"
            autoFocus
            value={email}
            error={error}
            onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
          />
          <Button type="submit" fullWidth loading={busy}>Send reset link</Button>
        </Stack>
      </form>

      <Text size="sm"><TextLink to="/signin" icon="arrowLeft">Back to sign in</TextLink></Text>
    </AuthLayout>
  )
}
