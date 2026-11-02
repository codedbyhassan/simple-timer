import { useState } from 'react'
import {
  ArrowRight,
  Check,
  FileCheck2,
  FlaskConical,
  HeartPulse,
  LockKeyhole,
  Pill,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Users,
  Wallet,
} from 'lucide-react'
import { roleDefinitions } from '../access/roleAccess.js'
import './AuthPage.css'

const roleIcons = {
  reception: Users,
  nurse: HeartPulse,
  doctor: Stethoscope,
  lab: FlaskConical,
  pharmacy: Pill,
  cashier: Wallet,
  claims: FileCheck2,
  'hospital-admin': ShieldCheck,
}

export default function AuthPage({ onSignIn }) {
  const [selectedRole, setSelectedRole] = useState('reception')
  const [error, setError] = useState('')

  const selectRole = (roleId) => {
    setError('')
    setSelectedRole(roleId)
  }

  const moveSelection = (event, currentIndex) => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(event.key)) return
    event.preventDefault()
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? roleDefinitions.length - 1
        : (currentIndex + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + roleDefinitions.length) % roleDefinitions.length
    const nextRole = roleDefinitions[nextIndex]
    selectRole(nextRole.id)
    document.getElementById(`auth-role-${nextRole.id}`)?.focus()
  }

  const submit = () => {
    if (!selectedRole) {
      setError('Select a workspace to continue.')
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
      <section className="auth-showcase" aria-label="Ascend HMS introduction">
        <div className="auth-showcase-grid" aria-hidden="true" />
        <div className="auth-showcase-glow auth-showcase-glow--one" aria-hidden="true" />
        <div className="auth-showcase-glow auth-showcase-glow--two" aria-hidden="true" />
        <div className="auth-showcase-content">
          <div className="auth-brand">
            <img src="/brand/hms-icon.png" alt="" />
            <span>
              <strong>Ascend HMS</strong>
              <small>Hospital management workspace</small>
            </span>
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

      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-panel-inner">
          <div className="auth-mobile-brand">
            <img src="/brand/hms-icon.png" alt="" />
            <span><strong>Ascend HMS</strong><small>Hospital workspace</small></span>
          </div>

          <div className="auth-panel-heading">
            <span className="auth-eyebrow">WORKSPACE ACCESS</span>
            <h2 id="auth-title">Welcome back</h2>
            <p>Select the workspace you want to explore.</p>
          </div>

          <div className="auth-role-heading">
            <span>Choose a role</span>
            <small>{roleDefinitions.length} workspaces available</small>
          </div>

          <div className="auth-role-list" role="radiogroup" aria-label="Choose a workspace">
            {roleDefinitions.map((role, index) => {
              const selected = selectedRole === role.id
              const RoleIcon = roleIcons[role.id] || Users
              return (
                <button
                  type="button"
                  id={`auth-role-${role.id}`}
                  className={`auth-role-option${selected ? ' auth-role-option--selected' : ''}`}
                  key={role.id}
                  onClick={() => selectRole(role.id)}
                  onKeyDown={(event) => moveSelection(event, index)}
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                >
                  <span className="auth-role-icon"><RoleIcon size={18} strokeWidth={1.8} /></span>
                  <span className="auth-role-copy"><strong>{role.name}</strong><small>{role.description}</small></span>
                  <span className="auth-role-check">{selected && <Check size={13} strokeWidth={2.5} />}</span>
                </button>
              )
            })}
          </div>

          {error && <p className="auth-error" role="alert"><ShieldAlert size={15} />{error}</p>}

          <button className="button button--primary auth-submit" type="button" onClick={submit}>
            Continue to workspace <ArrowRight size={16} />
          </button>

          <div className="auth-preview-note" id="auth-preview-note">
            <LockKeyhole size={15} />
            <span><strong>Demo environment</strong> This preview does not authenticate staff accounts. Workspace changes are saved in this browser only.</span>
          </div>

          <div className="auth-panel-bottom">
            <span><ShieldCheck size={14} /> Securely designed workspace</span>
            <span>Powered by Ascend Technologies</span>
          </div>
        </div>
      </section>
    </main>
  )
}
