import { useState } from 'react'
import { Check, LogIn, ShieldAlert, Stethoscope } from 'lucide-react'
import { roleDefinitions } from '../access/roleAccess.js'
import './AuthPage.css'

export default function AuthPage({ onSignIn }) {
  const [selectedRole, setSelectedRole] = useState('reception')
  const [error, setError] = useState('')

  const selectRole = (roleId) => {
    setError('')
    setSelectedRole(roleId)
  }

  const submit = () => {
    if (!selectedRole) {
      setError('Select one demo role to continue.')
      return
    }
    try {
      onSignIn([selectedRole])
    } catch (signInError) {
      const message = signInError instanceof Error ? signInError.message : String(signInError)
      setError(message)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">
          <img src="/brand/hms-icon.png" alt="" />
          <span>
            <strong>Ascend HMS</strong>
            <small>Hospital workspace</small>
          </span>
        </div>
        <div className="auth-intro">
          <span className="auth-mark"><Stethoscope size={21} /></span>
          <p className="auth-eyebrow">LOCAL DEMO SIGN-IN</p>
          <h1 id="auth-title">Choose a workspace</h1>
          <p>Select one demo role to open its workspace.</p>
        </div>
        <div className="auth-role-list" role="radiogroup" aria-label="Choose a demo role">
          {roleDefinitions.map((role) => {
            const selected = selectedRole === role.id
            return (
              <button
                type="button"
                className={`auth-role-option${selected ? ' auth-role-option--selected' : ''}`}
                key={role.id}
                onClick={() => selectRole(role.id)}
                role="radio"
                aria-checked={selected}
              >
                <span className="auth-role-check">{selected && <Check size={14} />}</span>
                <span><strong>{role.name}</strong><small>{role.description}</small></span>
              </button>
            )
          })}
        </div>
        {error && <p className="auth-error" role="alert"><ShieldAlert size={15} />{error}</p>}
        <button className="button button--primary auth-submit" type="button" onClick={submit}>
          <LogIn size={16} /> Sign in to demo dashboard
        </button>
        <div className="auth-preview-note">
          <ShieldAlert size={14} />
          <span>Preview accounts have no password and do not authenticate a real user. Changes sync only between tabs in this browser profile.</span>
        </div>
      </section>
    </main>
  )
}
