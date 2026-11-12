import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout, Button, Heading, PasswordField, Stack, Text, TextField, TextLink, useToast } from '@ui'
import { describeAuthError, isEmail, useAuth } from '@core/auth'

export default function SignInPage() {
  const { signIn } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const emailRef = useRef(null)
  const passwordRef = useRef(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const validate = () => {
    const next = {}
    if (!email.trim()) next.email = 'Enter your email address.'
    else if (!isEmail(email)) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Enter your password.'
    setErrors(next)
    if (next.email) emailRef.current?.focus()
    else if (next.password) passwordRef.current?.focus()
    return Object.keys(next).length === 0
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (busy || !validate()) return
    setBusy(true)
    try {
      await signIn(email, password)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      const { title, message } = describeAuthError(err)
      toast.error(title, message)
      if (err.kind === 'invalid_credentials') {
        setPassword('')
        passwordRef.current?.focus()
      }
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <Stack gap="xs">
        <Heading>Sign in</Heading>
        <Text tone="muted">Use your hospital email and password.</Text>
      </Stack>

      <form onSubmit={onSubmit} noValidate>
        <Stack gap="lg">
          <Stack gap="md">
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
              error={errors.email}
              onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((x) => ({ ...x, email: undefined })) }}
            />
            <PasswordField
              ref={passwordRef}
              label="Password"
              name="password"
              autoComplete="current-password"
              value={password}
              error={errors.password}
              onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((x) => ({ ...x, password: undefined })) }}
            />
            <Text size="sm" style={{ textAlign: 'right' }}><TextLink to="/forgot-password">Forgot password?</TextLink></Text>
          </Stack>
          <Button type="submit" fullWidth loading={busy}>Sign in</Button>
        </Stack>
      </form>

      <Text tone="subtle" size="sm">Need an account? Ask your hospital administrator to create one.</Text>
    </AuthLayout>
  )
}
