import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Dialog, Icon, PageHeader, StatusBadge } from '@ui'
import { roleLabel } from '@core/access/roles.js'
import { ADMIN_ACCESS_ROLES } from './accessData.js'
import useAdminUsers from './useAdminUsers.js'
import './admin styles/userdetail.css'

const EMPTY_USER = {
  name: '',
  email: '',
  department: '',
  role: 'receptionist',
  status: 'Active',
  staffNumber: '',
  jobTitle: '',
  phone: '',
  location: '',
  employmentType: 'Full time',
  joinedAt: '',
  manager: '',
  notes: '',
}

const statusTone = (status) => {
  if (status === 'Active') return 'success'
  if (status === 'Invited') return 'warning'
  if (status === 'Suspended') return 'critical'
  return 'neutral'
}

const detailFields = [
  ['staffNumber', 'Staff ID'],
  ['jobTitle', 'Job title'],
  ['department', 'Department'],
  ['phone', 'Phone'],
  ['location', 'Work location'],
  ['employmentType', 'Employment type'],
  ['joinedAt', 'Start date'],
  ['manager', 'Reports to'],
]

function Field({ label, name, value, onChange, required, type = 'text', className = '', children, ...rest }) {
  return (
    <label className={`hms-user-detail__field ${className}`}>
      <span>{label}{required ? <b aria-hidden="true"> *</b> : null}</span>
      {children || <input type={type} name={name} value={value} onChange={onChange} required={required} {...rest} />}
    </label>
  )
}

function UserForm({ initial, onSave, onCancel, saving, error, isNew }) {
  const [form, setForm] = useState(initial)
  const setField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  return (
    <form className="hms-user-detail__form" onSubmit={(event) => { event.preventDefault(); onSave(form) }}>
      <div className="hms-user-detail__form-grid">
        <Field label="Full name" name="name" value={form.name} onChange={setField} required autoComplete="name" />
        <Field label="Contact email (optional)" name="email" type="email" value={form.email} onChange={setField} autoComplete="email" />
        <Field label="Department" name="department" value={form.department} onChange={setField} required />
        <Field label="Job title" name="jobTitle" value={form.jobTitle} onChange={setField} />
        <Field label="Staff ID" name="staffNumber" value={form.staffNumber} onChange={setField} />
        <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={setField} autoComplete="tel" />
        <Field label="Work location" name="location" value={form.location} onChange={setField} />
        <Field label="Employment type" name="employmentType" value={form.employmentType} onChange={setField}>
          <select name="employmentType" value={form.employmentType} onChange={setField}>
            {['Full time', 'Part time', 'Contract', 'Temporary'].map((value) => <option key={value}>{value}</option>)}
          </select>
        </Field>
        <Field label="Start date" name="joinedAt" type="date" value={form.joinedAt} onChange={setField} />
        <Field label="Reports to" name="manager" value={form.manager} onChange={setField} />
        <Field label="Role" name="role" value={form.role} onChange={setField} required>
          <select name="role" value={form.role} onChange={setField} required>
            {ADMIN_ACCESS_ROLES.map((role) => <option value={role.code} key={role.code}>{role.label}</option>)}
          </select>
        </Field>
        <Field label="Account status" name="status" value={form.status} onChange={setField} required>
          <select name="status" value={form.status} onChange={setField} required>
            {['Active', 'Suspended'].map((value) => <option key={value}>{value}</option>)}
          </select>
        </Field>
        <Field className="hms-user-detail__field--wide" label="Notes" name="notes" value={form.notes} onChange={setField}>
          <textarea name="notes" value={form.notes} onChange={setField} rows={4} />
        </Field>
      </div>

      {error ? <p className="hms-user-detail__error" role="alert">{error}</p> : null}
      <div className="hms-user-detail__form-actions">
        <button type="button" className="hms-user-detail__button is-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="hms-user-detail__button is-primary" disabled={saving}>{saving ? 'Saving…' : isNew ? 'Create profile' : 'Save changes'}</button>
      </div>
    </form>
  )
}

function ReadonlyDetails({ user }) {
  const role = ADMIN_ACCESS_ROLES.find((item) => item.code === user.role)
  return (
    <>
      <div className="hms-user-detail__identity">
        <span className="hms-user-detail__avatar">{user.name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
        <div>
          <h2>{user.name}</h2>
          <p>{user.jobTitle || roleLabel(user.role)} · {user.department}</p>
        </div>
        <StatusBadge tone={statusTone(user.status)}>{user.status}</StatusBadge>
      </div>

      <section className="hms-user-detail__section">
        <h2>Contact and employment</h2>
        <dl className="hms-user-detail__facts">
          <div><dt>Email address</dt><dd>{user.email}</dd></div>
          {detailFields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{user[key] || '—'}</dd></div>)}
          <div><dt>Last sign-in</dt><dd>{user.lastSeen || 'Not signed in'}</dd></div>
        </dl>
      </section>

      <section className="hms-user-detail__section">
        <h2>Access and permissions</h2>
        <div className="hms-user-detail__role">
          <span><Icon name="keyRound" size={18} /></span>
          <div><strong>{role?.label || roleLabel(user.role)}</strong><p>{role?.description || 'Role description unavailable.'}</p></div>
          <b>{role?.permissions.length || 0}</b>
        </div>
        <div className="hms-user-detail__permissions">
          {(role?.permissions || []).map((permission) => <span key={permission}><Icon name="checkCircle" size={14} />{permission}</span>)}
        </div>
      </section>

      <section className="hms-user-detail__section">
        <h2>Account notes</h2>
        <p className="hms-user-detail__notes">{user.notes || 'No notes recorded.'}</p>
      </section>
    </>
  )
}

export default function UserDetailPage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { users, loaded, storageError, commit } = useAdminUsers()
  const isNew = userId === 'new'
  const user = useMemo(() => users.find((item) => item.id === userId), [users, userId])
  const [editing, setEditing] = useState(isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const initial = isNew ? EMPTY_USER : { ...EMPTY_USER, ...(user || {}) }

  const saveUser = async (form) => {
    const clean = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]))
    if (!clean.name || !clean.department || !clean.role) {
      setError('Complete the required name, department and role fields.')
      return
    }
    if (clean.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) {
      setError('Enter a valid email address.')
      return
    }
    if (clean.email && users.some((item) => item.email?.toLowerCase() === clean.email.toLowerCase() && item.id !== user?.id)) {
      setError('A profile with this email address already exists.')
      return
    }

    setSaving(true)
    setError('')
    const record = {
      ...clean,
      id: user?.id || `staff-${globalThis.crypto?.randomUUID?.() || Date.now()}`,
      lastSeen: user?.lastSeen || 'Not signed in',
    }
    const nextUsers = user ? users.map((item) => item.id === user.id ? record : item) : [...users, record]
    const success = await commit(nextUsers)
    setSaving(false)
    if (success) navigate(`/admin/users/${encodeURIComponent(record.id)}`, { replace: true })
    else setError(storageError || 'Unable to save this local profile.')
  }

  const deleteUser = async () => {
    if (!user) return
    if (!window.confirm(`Delete ${user.name} from the staff directory on this device?`)) return
    const success = await commit(users.filter((item) => item.id !== user.id))
    if (success) navigate('/admin/users', { replace: true })
    else setError(storageError || 'Unable to remove this local profile.')
  }

  const beginEdit = () => {
    setError('')
    setEditing(true)
  }

  const cancelEdit = () => {
    setError('')
    if (isNew) navigate('/admin/users', { replace: true })
    else setEditing(false)
  }

  if (!loaded) return <div className="hms-user-detail__loading">Loading user…</div>
  if (storageError) return <div className="hms-user-detail__error" role="alert">{storageError}</div>
  if (!isNew && !user) {
    return (
      <>
        <PageHeader title="User not found" />
        <div className="hms-user-detail__not-found"><p>This user is no longer in the staff directory.</p><Link to="/admin/users">Return to users</Link></div>
      </>
    )
  }

  const menu = { label: isNew ? 'Add user' : user.name, summary: isNew ? 'Create a local staff profile and assign a workspace role.' : `${roleLabel(user.role)} · ${user.department}` }

  return (
    <>
      <PageHeader
        title={menu.label}
        description={menu.summary}
        actions={(
          <div className="hms-user-detail__header-actions">
            <Link className="hms-user-detail__button is-secondary" to="/admin/users"><Icon name="arrowLeft" size={16} />Users</Link>
            {!isNew && !editing ? <button type="button" className="hms-user-detail__button is-primary" onClick={beginEdit}><Icon name="edit" size={16} />Edit user</button> : null}
            {!isNew && !editing ? <button type="button" className="hms-user-detail__button is-danger" onClick={deleteUser}><Icon name="trash" size={16} />Delete</button> : null}
          </div>
        )}
      />

      <div className="hms-user-detail">
        {!isNew ? <ReadonlyDetails user={user} /> : null}
        {error && !editing ? <p className="hms-user-detail__error" role="alert">{error}</p> : null}
      </div>
      <Dialog open={editing} title={isNew ? 'New local staff profile' : 'Edit staff details'} description="Enter the account details and choose a role for this staff member." onClose={cancelEdit} size="large">
        <UserForm key={user?.id || 'new'} initial={initial} onSave={saveUser} onCancel={cancelEdit} saving={saving} error={error} isNew={isNew} />
      </Dialog>
    </>
  )
}
