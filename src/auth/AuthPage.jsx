import { useEffect, useState } from 'react'
import { ArrowRight, HeartPulse, KeyRound, LockKeyhole, Mail, ShieldAlert, ShieldCheck, UserRound } from 'lucide-react'
import { supabase } from '../integrations/supabase/client.ts'
import { changePassword, requestPasswordReset, setupFirstAdmin, signInWithPassword, signOutOfPreview } from './previewSession.js'
import './AuthPage.css'

function Showcase() {
  return (
    <section className="auth-showcase" aria-label="Ascend HMS introduction">
      <div className="auth-showcase-grid" aria-hidden="true" />
      <div className="auth-showcase-glow auth-showcase-glow--one" aria-hidden="true" />
      <div className="auth-showcase-glow auth-showcase-glow--two" aria-hidden="true" />
      <div className="auth-showcase-content">
        <div className="auth-brand">
          <img src="/brand/hms-icon.png" alt="" />
          <span><strong>Ascend HMS</strong><small>Hospital management workspace</small></span>
        </div>
        <div className="auth-showcase-copy">
          <span className="auth-showcase-kicker"><i /> ONE CONNECTED WORKSPACE</span>
          <h1>Better coordination.<br /><span>Better care.</span></h1>
          <p>Bring the people, processes and information behind every patient journey into one clear workspace.</p>
        </div>
        <div className="auth-showcase-footer">
          <div className="auth-showcase-symbol"><HeartPulse size={19} /></div>
          <div><strong>Designed around care delivery</strong><span>From the front desk to the clinical floor.</span></div>
        </div>
      </div>
    </section>
  )
}

function Frame({ eyebrow, title, subtitle, children }) {
  return (
    <main className="auth-page">
      <Showcase />
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-panel-inner">
          <div className="auth-mobile-brand">
            <img src="/brand/hms-icon.png" alt="" />
            <span><strong>Ascend HMS</strong><small>Hospital workspace</small></span>
          </div>
          <div className="auth-panel-heading">
            <span className="auth-eyebrow">{eyebrow}</span>
            <h2 id="auth-title">{title}</h2>
            <p>{subtitle}</p>
          </div>
          {children}
          <div className="auth-panel-bottom">
            <span><ShieldCheck size={14} /> Secure staff sign-in</span>
            <span>Powered by Ascend Technologies</span>
          </div>
        </div>
      </section>
    </main>
  )
}

function Input({ icon: Icon, label, ...props }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <div className="auth-input"><Icon size={16} /><input {...props} /></div>
    </label>
  )
}

export default function AuthPage({ onSignedIn }) {
  const [mode, setMode] = useState('signin')
  const [adminExists, setAdminExists] = useState(true)
  const [form, setForm] = useState({ email: '', password: '', fullName: '' })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.rpc('admin_exists').then(({ data }) => setAdminExists(data !== false))
  }, [])

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value })
  const run = async (task) => {
    setError(''); setInfo(''); setBusy(true)
    try { await task() } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }

  const submit = (event) => {
    event.preventDefault()
    if (mode === 'signin') run(async () => { await signInWithPassword(form.email, form.password); onSignedIn?.() })
    if (mode === 'forgot') run(async () => { await requestPasswordReset(form.email); setInfo('If that email belongs to a staff account, a reset link is on its way.') })
    if (mode === 'setup') run(async () => {
      if (form.password.length < 8) throw new Error('Use at least 8 characters for the password.')
      const { needsConfirmation } = await setupFirstAdmin(form)
      setInfo(needsConfirmation ? 'Check your email to confirm the administrator account, then sign in.' : 'Administrator account ready.')
      setMode('signin')
    })
  }

  const titles = {
    signin: ['STAFF ACCESS', 'Welcome back', 'Sign in with the email and password from your administrator.'],
    forgot: ['PASSWORD HELP', 'Reset your password', 'We will email you a secure link to choose a new password.'],
    setup: ['FIRST-TIME SETUP', 'Create the administrator', 'This first account manages every other staff account.'],
  }[mode]

  return (
    <Frame eyebrow={titles[0]} title={titles[1]} subtitle={titles[2]}>
      <form className="auth-form" onSubmit={submit}>
        {mode === 'setup' && <Input icon={UserRound} label="Full name" required value={form.fullName} onChange={set('fullName')} placeholder="Your name" autoComplete="name" />}
        <Input icon={Mail} label="Email address" type="email" required value={form.email} onChange={set('email')} placeholder="name@hospital.com" autoComplete="email" />
        {mode !== 'forgot' && <Input icon={LockKeyhole} label="Password" type="password" required value={form.password} onChange={set('password')} placeholder="••••••••" autoComplete={mode === 'setup' ? 'new-password' : 'current-password'} />}
        {error && <p className="auth-error" role="alert"><ShieldAlert size={15} />{error}</p>}
        {info && <p className="auth-info" role="status">{info}</p>}
        <button className="button button--primary auth-submit" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'forgot' ? 'Send reset link' : 'Create administrator'} <ArrowRight size={16} />
        </button>
      </form>
      <div className="auth-links">
        {mode === 'signin' ? <button type="button" onClick={() => setMode('forgot')}>Forgot password?</button> : <button type="button" onClick={() => setMode('signin')}>Back to sign in</button>}
        {!adminExists && mode !== 'setup' && <button type="button" onClick={() => setMode('setup')}>Set up this hospital</button>}
      </div>
    </Frame>
  )
}

export function ChangePasswordScreen({ session, forced = false, onDone }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (form.next.length < 8) return setError('Use at least 8 characters.')
    if (form.next !== form.confirm) return setError('The new passwords do not match.')
    if (form.next === form.current) return setError('Choose a password different from the temporary one.')
    setBusy(true)
    try { await changePassword(form.current, form.next); onDone?.() } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <Frame eyebrow={forced ? 'ACCOUNT SECURITY' : 'CHANGE PASSWORD'} title={forced ? 'Choose your own password' : 'Change password'} subtitle={`${session.displayName} · ${session.email}. ${forced ? 'Your administrator set a temporary password. Replace it to continue.' : ''}`}>
      <form className="auth-form" onSubmit={submit}>
        <Input icon={LockKeyhole} label={forced ? 'Temporary password' : 'Current password'} type="password" required value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} autoComplete="current-password" />
        <Input icon={KeyRound} label="New password" type="password" required value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} autoComplete="new-password" />
        <Input icon={KeyRound} label="Confirm new password" type="password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="new-password" />
        {error && <p className="auth-error" role="alert"><ShieldAlert size={15} />{error}</p>}
        <button className="button button--primary auth-submit" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save new password'} <ArrowRight size={16} /></button>
      </form>
      <div className="auth-links">
        {forced ? <button type="button" onClick={() => signOutOfPreview()}>Sign out</button> : <button type="button" onClick={onDone}>Cancel</button>}
      </div>
    </Frame>
  )
}

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    if (password.length < 8) return setError('Use at least 8 characters.')
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) return setError(updateError.message)
    await supabase.rpc('mark_password_changed')
    setDone(true)
    setTimeout(() => { window.location.href = '/' }, 1200)
  }
  return (
    <Frame eyebrow="PASSWORD RESET" title="Set a new password" subtitle="Choose a password you have not used before.">
      <form className="auth-form" onSubmit={submit}>
        <Input icon={KeyRound} label="New password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        {error && <p className="auth-error" role="alert"><ShieldAlert size={15} />{error}</p>}
        {done && <p className="auth-info">Password updated. Opening your workspace…</p>}
        <button className="button button--primary auth-submit" type="submit">Update password <ArrowRight size={16} /></button>
      </form>
    </Frame>
  )
}

export function AccountBlockedScreen({ session }) {
  const suspended = session.status !== 'Active'
  return (
    <Frame eyebrow="ACCESS PENDING" title={suspended ? 'Account unavailable' : 'No workspace assigned'} subtitle={suspended ? `This account is marked ${session.status}. Contact your hospital administrator.` : 'Your administrator has not assigned you a role yet. You will get access as soon as they do.'}>
      <div className="auth-links"><button type="button" onClick={() => signOutOfPreview()}>Sign out</button></div>
    </Frame>
  )
}
