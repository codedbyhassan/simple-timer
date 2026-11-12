import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, PageHeader, StatusBadge } from '@ui'
import { roleLabel } from '@core/access/roles.js'
import { ADMIN_ACCESS_ROLES, ADMIN_PERMISSION_GROUPS } from './accessData.js'
import useAdminUsers from './useAdminUsers.js'
import './admin styles/accessmanagement.css'

const TABS = [
  { id: 'users', label: 'Users' },
  { id: 'roles', label: 'Roles' },
  { id: 'permissions', label: 'Permissions' },
]

const statusTone = (status) => {
  if (status === 'Active') return 'success'
  if (status === 'Invited') return 'warning'
  if (status === 'Suspended') return 'critical'
  return 'neutral'
}

function UserCards({ users }) {
  return (
    <div className="hms-access__user-grid">
      {users.map((user) => {
        const role = ADMIN_ACCESS_ROLES.find((item) => item.code === user.role)
        return (
          <Link className="hms-access__user-card" to={`/admin/users/${encodeURIComponent(user.id)}`} key={user.id}>
            <div className="hms-access__user-card-top">
              <span className="hms-access__avatar">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
              <StatusBadge tone={statusTone(user.status)}>{user.status}</StatusBadge>
              <Icon name="chevronRight" size={17} />
            </div>
            <h2>{user.name}</h2>
            <p className="hms-access__user-email">{user.email}</p>
            <div className="hms-access__user-meta">
              <span><Icon name="building" size={14} />{user.department}</span>
              <span><Icon name="keyRound" size={14} />{role?.label || roleLabel(user.role)}</span>
            </div>
            <div className="hms-access__user-card-foot">
              <span>Last sign-in</span><strong>{user.lastSeen || 'Not signed in'}</strong>
            </div>
          </Link>
        )
      })}
      {users.length === 0 ? <div className="hms-access__empty"><Icon name="search" size={20} /><strong>No users found</strong><span>Adjust your search or status filter.</span></div> : null}
    </div>
  )
}

function RolesPanel({ query, users }) {
  const filtered = ADMIN_ACCESS_ROLES.filter((role) => `${role.label} ${role.description} ${role.code}`.toLowerCase().includes(query.trim().toLowerCase()))
  return (
    <div className="hms-access__role-grid">
      {filtered.map((role) => {
        const assignedCount = users.filter((user) => user.role === role.code).length
        return (
          <article className="hms-access__role-card" key={role.code}>
            <div className="hms-access__role-card-head">
              <span className="hms-access__role-icon"><Icon name={role.code === 'hospital_admin' ? 'shieldCheck' : 'keyRound'} size={18} /></span>
              <span className="hms-access__role-count">{assignedCount} {assignedCount === 1 ? 'user' : 'users'}</span>
            </div>
            <h2>{role.label}</h2>
            <p>{role.description}</p>
            <div className="hms-access__role-permissions">
              <strong>{role.permissions.length}</strong><span>permissions assigned</span>
            </div>
            <div className="hms-access__chips">
              {role.permissions.slice(0, 3).map((permission) => <code key={permission}>{permission}</code>)}
              {role.permissions.length > 3 ? <span>+{role.permissions.length - 3}</span> : null}
            </div>
          </article>
        )
      })}
      {filtered.length === 0 ? <div className="hms-access__empty"><Icon name="search" size={20} /><strong>No roles found</strong></div> : null}
    </div>
  )
}

function PermissionsPanel({ query }) {
  const filteredGroups = ADMIN_PERMISSION_GROUPS.map((group) => ({
    ...group,
    permissions: group.permissions.filter((permission) => permission.toLowerCase().includes(query.trim().toLowerCase())),
  })).filter((group) => group.permissions.length)

  return (
    <div className="hms-access__permission-groups">
      {filteredGroups.map((group) => (
        <section className="hms-access__permission-group" key={group.name}>
          <header><h2>{group.name}</h2><span>{group.permissions.length}</span></header>
          <div className="hms-access__permission-grid">
            {group.permissions.map((permission) => {
              const roles = ADMIN_ACCESS_ROLES.filter((role) => role.permissions.includes(permission))
              return (
                <article className="hms-access__permission-card" key={permission}>
                  <div className="hms-access__permission-card-name"><Icon name="checkCircle" size={16} /><code>{permission}</code></div>
                  <p>{roles.length} {roles.length === 1 ? 'role' : 'roles'} include this permission</p>
                  <div className="hms-access__permission-roles">{roles.map((role) => <span key={role.code}>{role.label}</span>)}</div>
                </article>
              )
            })}
          </div>
        </section>
      ))}
      {filteredGroups.length === 0 ? <div className="hms-access__empty"><Icon name="search" size={20} /><strong>No permissions found</strong></div> : null}
    </div>
  )
}

export default function AccessManagementPage({ menu }) {
  const { users: allUsers, loaded, storageError } = useAdminUsers()
  const [tab, setTab] = useState('users')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All statuses')

  const users = useMemo(() => allUsers.filter((user) => {
    const matchesText = `${user.name} ${user.email} ${user.department} ${roleLabel(user.role)}`.toLowerCase().includes(query.trim().toLowerCase())
    return matchesText && (status === 'All statuses' || user.status === status)
  }), [allUsers, query, status])

  return (
    <>
      <PageHeader
        title={menu.label}
        description={menu.summary}
        actions={tab === 'users' ? <Link className="hms-access__add-user" to="/admin/users/new"><Icon name="userPlus" size={17} />Add user</Link> : null}
      />

      <div className="hms-access">
        {storageError ? <div className="hms-access__error" role="alert">{storageError}</div> : null}
        <div className="hms-access__summary">
          <div><span className="hms-access__summary-icon"><Icon name="users" size={18} /></span><span><strong>{allUsers.length}</strong><small>Staff accounts</small></span></div>
          <div><span className="hms-access__summary-icon"><Icon name="keyRound" size={18} /></span><span><strong>{ADMIN_ACCESS_ROLES.length}</strong><small>System roles</small></span></div>
          <div><span className="hms-access__summary-icon"><Icon name="shieldCheck" size={18} /></span><span><strong>{ADMIN_PERMISSION_GROUPS.reduce((count, group) => count + group.permissions.length, 0)}</strong><small>Permission codes</small></span></div>
          <div className="hms-access__summary-status"><StatusBadge tone="success">Access controls active</StatusBadge></div>
        </div>

        <section className="hms-access__workspace">
          <nav className="hms-access__tabs" aria-label="Access management sections">
            {TABS.map((item) => (
              <button type="button" key={item.id} className={tab === item.id ? 'is-active' : ''} aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}>
                {item.label}                {item.id === 'users' ? <span>{allUsers.length}</span> : item.id === 'roles' ? <span>{ADMIN_ACCESS_ROLES.length}</span> : null}
              </button>
            ))}
          </nav>

          <div className="hms-access__toolbar">
            <label className="hms-access__search">
              <Icon name="search" size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === 'users' ? 'Search name, email or department' : tab === 'roles' ? 'Search roles' : 'Search permissions'} aria-label={`Search ${tab}`} />
              {query ? <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><Icon name="x" size={14} /></button> : null}
            </label>
            {tab === 'users' ? (
              <label className="hms-access__status-filter"><span>Status</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter users by status">
                  {['All statuses', 'Active', 'Invited', 'Suspended'].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            ) : null}
            {tab === 'users' ? <span className="hms-access__result-count">{users.length} accounts</span> : null}
          </div>

          {!loaded && tab === 'users' ? <div className="hms-access__empty"><strong>Loading users…</strong></div> : null}
          {loaded && tab === 'users' ? <div className="hms-access__panel"><UserCards users={users} /></div> : null}
          {tab === 'roles' ? <div className="hms-access__panel"><RolesPanel query={query} users={allUsers} /></div> : null}
          {tab === 'permissions' ? <div className="hms-access__panel"><PermissionsPanel query={query} /></div> : null}
        </section>
      </div>
    </>
  )
}
