import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  Activity,
  Bell,
  Check,
  ChevronDown,
  CircleAlert,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  UserRound,
  X,
} from 'lucide-react'
import AuthPage from './auth/AuthPage.jsx'
import { getPreviewSession, signInToPreview, signOutOfPreview, subscribeToPreviewSession } from './auth/previewSession.js'
import ToastViewport from './auth/ToastViewport.jsx'
import {
  defaultRolePermissions,
  getHomePage,
  getPageFromPath,
  getPageRoute,
  getRoleNames,
  getVisibleNavigation,
  mergePermissions,
  permissionCatalog,
  roleAccessContext,
  roleDefinitions,
} from './access/roleAccess.js'
import './App.css'
import ClinicalPage, { LaboratoryPage, PharmacyPage } from './modules/clinical/CarePages.jsx'
import ClaimsDashboard from './modules/clinical/ClaimsDashboard.jsx'
import ClaimsWorkspacePage from './modules/clinical/ClaimsWorkspacePage.jsx'
import FrontDeskPage from './modules/front-desk/FrontDeskPage.jsx'
import NursePage from './modules/nursing/NursePage.jsx'
import { FinancePage, InpatientPage, ReportsPage } from './modules/operations/OperationsPages.jsx'
import PatientsPage from './modules/patients/PatientsPage.jsx'
import { getDemoPatients, subscribeToDemoPatients } from './modules/patients/patientStore.js'
import { getAppointments, subscribeToAppointments } from './modules/front-desk/frontDeskStore.js'
import { getCareData, subscribeToCareData } from './modules/clinical/careStore.js'
import { getGeneratedClaimsSnapshot, subscribeToGeneratedClaims } from './modules/clinical/claimsStore.js'
import { ManagementDashboard, PermissionSettingsPage, RoleModulePreview } from './modules/role-workspaces/RoleWorkspacePages.jsx'
import RoleDashboardPage from './modules/role-workspaces/RoleDashboardPage.jsx'
import { WorkspacePage } from './modules/admin/WorkspacePages.jsx'

const GRANTS_STORAGE_KEY = 'ascend-hms-preview-role-grants-v1'
const GRANTS_SCHEMA_KEY = 'ascend-hms-preview-role-grants-schema-v2'
const THEME_STORAGE_KEY = 'hms-theme'

function subscribeToLocation(listener) {
  window.addEventListener('popstate', listener)
  return () => window.removeEventListener('popstate', listener)
}

function getLocationSnapshot() {
  return window.location.pathname
}

function readRoleGrants() {
  const knownPermissions = new Set(permissionCatalog.map((permission) => permission.id))
  try {
    const saved = JSON.parse(localStorage.getItem(GRANTS_STORAGE_KEY) || 'null')
    const grants = Object.fromEntries(roleDefinitions.map((role) => [
      role.id,
      Array.isArray(saved?.[role.id])
        ? saved[role.id].filter((permission) => typeof permission === 'string' && knownPermissions.has(permission))
        : [...(defaultRolePermissions[role.id] || [])],
    ]))
    if (localStorage.getItem(GRANTS_SCHEMA_KEY) !== '4') {
      grants['hospital-admin'] = [...new Set([...(grants['hospital-admin'] || []), 'cashier.refund.approve'])]
      grants.lab = [...new Set([...(grants.lab || []), 'lab.catalogue.manage'])]
      localStorage.setItem(GRANTS_SCHEMA_KEY, '4')
    }
    return grants
  } catch (error) {
    console.error('Could not read the preview role permission seeds.', error)
    return Object.fromEntries(Object.entries(defaultRolePermissions).map(([role, permissions]) => [role, [...permissions]]))
  }
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || 'light')
  const [roleGrants, setRoleGrants] = useState(readRoleGrants)
  const [toasts, setToasts] = useState([])
  const [menu, setMenu] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState('')
  const patients = useSyncExternalStore(subscribeToDemoPatients, getDemoPatients, getDemoPatients)
  const appointments = useSyncExternalStore(subscribeToAppointments, getAppointments, getAppointments)
  const careData = useSyncExternalStore(subscribeToCareData, getCareData, getCareData)
  const claimsArchive = useSyncExternalStore(subscribeToGeneratedClaims, getGeneratedClaimsSnapshot, getGeneratedClaimsSnapshot)
  const session = useSyncExternalStore(subscribeToPreviewSession, getPreviewSession, () => null)
  const pathname = useSyncExternalStore(subscribeToLocation, getLocationSnapshot, () => '/')
  const roleIds = useMemo(() => session?.roleIds || [], [session])
  const permissions = useMemo(() => mergePermissions(roleIds, roleGrants), [roleIds, roleGrants])
  const navigation = useMemo(() => getVisibleNavigation(roleIds, permissions), [roleIds, permissions])
  const homePage = useMemo(() => getHomePage(roleIds, roleGrants), [roleIds, roleGrants])
  const pageItems = useMemo(() => navigation.flatMap((section) => section.items), [navigation])
  const selectedRoleNames = getRoleNames(roleIds)
  const routePage = getPageFromPath(pathname)
  const requestedPage = routePage === 'home' ? homePage : routePage
  const searchTerm = query.trim().toLowerCase()
  const patientMatches = searchTerm
    ? patients.filter((patient) =>
      `${patient.name} ${patient.id} ${patient.phone} ${patient.insuranceMemberId}`.toLowerCase().includes(searchTerm),
    ).slice(0, 4)
    : []
  const appointmentMatches = searchTerm
    ? appointments.filter((item) => `${item.patientName} ${item.patientId} ${item.department} ${item.status} ${item.id}`.toLowerCase().includes(searchTerm)).slice(0, 3)
    : []
  const labMatches = searchTerm
    ? careData.labOrders.filter((item) => `${item.patientName} ${item.patientId} ${item.testName} ${item.status} ${item.specimenId || ''}`.toLowerCase().includes(searchTerm)).slice(0, 3)
    : []
  const prescriptionMatches = searchTerm
    ? careData.prescriptions.filter((item) => `${item.patientName} ${item.patientId} ${item.medication} ${item.status}`.toLowerCase().includes(searchTerm)).slice(0, 3)
    : []
  const claimMatches = searchTerm
    ? claimsArchive.records.filter((item) => `${item.claimID} ${item.patientName || ''} ${item.sourcePatientId}`.toLowerCase().includes(searchTerm)).slice(0, 3)
    : []
  const searchCount = patientMatches.length + appointmentMatches.length + labMatches.length + prescriptionMatches.length + claimMatches.length
  const localNotifications = [
    ...careData.labOrders.filter((item) => item.critical && item.status === 'Result ready' && !item.reviewedAt).slice(0, 3).map((item) => ({ id: item.id, title: 'Critical laboratory result', detail: `${item.testName} · ${item.patientName}`, route: 'critical-results' })),
    ...careData.inventory.filter((item) => item.trackStock && item.reorderLevel > 0 && item.onHand <= item.reorderLevel).slice(0, 3).map((item) => ({ id: item.id, title: 'Stock reorder alert', detail: `${item.name} · ${item.onHand} ${item.unit} remaining`, route: item.department === 'laboratory' ? 'lab-inventory' : 'stock-alerts' })),
    ...appointments.filter((item) => item.date === new Date().toISOString().slice(0, 10) && ['Checked in', 'In triage'].includes(item.status)).slice(0, 3).map((item) => ({ id: item.id, title: 'Patient awaiting care', detail: `${item.patientName} · ${item.status}`, route: 'opd-queue' })),
  ].slice(0, 8)

  const canOpenPage = useCallback((page) => page === 'not-found'
    ? true
    : page === 'patient-detail'
      ? permissions.has('patient360.read')
      : pageItems.some((item) => item.id === page), [permissions, pageItems])

  const navigate = useCallback((page, { replace = false, patientId = '' } = {}) => {
    const targetPage = page === 'home' || page === 'overview' ? homePage : page
    if (!canOpenPage(targetPage)) {
      setDialog('You do not have permission to open that workspace.')
      return
    }
    const path = targetPage === 'patient-detail' && patientId
      ? `/patients/${encodeURIComponent(patientId)}`
      : getPageRoute(targetPage)
    if (window.location.pathname !== path) {
      if (replace) window.history.replaceState({}, '', path)
      else window.history.pushState({}, '', path)
    }
    window.dispatchEvent(new PopStateEvent('popstate'))
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setMobileNavOpen(false)
    setMenu('')
    setQuery('')
  }, [canOpenPage, homePage])

  const roleContextValue = useMemo(() => ({
    roleIds,
    roleGrants,
    permissions,
    hasPermission: (permission) => permissions.has(permission),
    setRoleGrants,
    navigate,
  }), [roleIds, roleGrants, permissions, navigate])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    const syncPreviewSettings = (event) => {
      if (event.key === GRANTS_STORAGE_KEY) {
        const nextGrants = readRoleGrants()
        setRoleGrants((current) => JSON.stringify(current) === JSON.stringify(nextGrants) ? current : nextGrants)
      }
      if (event.key === THEME_STORAGE_KEY && (event.newValue === 'light' || event.newValue === 'dark')) {
        setTheme((current) => current === event.newValue ? current : event.newValue)
      }
    }
    window.addEventListener('storage', syncPreviewSettings)
    return () => window.removeEventListener('storage', syncPreviewSettings)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(GRANTS_STORAGE_KEY, JSON.stringify(roleGrants))
    } catch (error) {
      console.error('Could not save preview role settings.', error)
    }
  }, [roleIds, roleGrants])

  useEffect(() => {
    if (!session) {
      if (pathname !== '/signin') window.history.replaceState({}, '', '/signin')
      return
    }
    if (pathname === '/signin' || routePage === 'home') {
      const destination = getPageRoute(homePage)
      if (pathname !== destination) {
        window.history.replaceState({}, '', destination)
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
      return
    }
    if (routePage === 'not-found') return
    if (canOpenPage(requestedPage)) {
      if (routePage === 'home') {
        window.history.replaceState({}, '', getPageRoute(homePage))
      }
      return
    }
    window.history.replaceState({}, '', getPageRoute(homePage))
  }, [canOpenPage, homePage, pathname, requestedPage, routePage, session])

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMenu('')
        setMobileNavOpen(false)
        setDialog('')
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  const dismissToast = useCallback((toastId) => setToasts((current) => current.filter((toast) => toast.id !== toastId)), [])
  const addToast = (toast) => setToasts((current) => [...current, { ...toast, id: `${Date.now()}-${Math.random()}` }].slice(-3))
  const handleSignIn = (selectedRoles) => {
    try {
      const signedIn = signInToPreview(selectedRoles)
      const roleNames = getRoleNames(signedIn.roleIds).join(' · ')
      addToast({ type: 'success', title: 'Signed in', message: `Welcome to ${roleNames}.` })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      addToast({ type: 'error', title: 'Sign-in failed', message })
      throw error
    }
  }
  const handleSignOut = () => {
    try {
      const name = session?.displayName || 'Demo user'
      signOutOfPreview()
      addToast({ type: 'success', title: 'Signed out', message: `${name} has signed out.` })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      addToast({ type: 'error', title: 'Sign-out failed', message })
    }
  }

  const openPatient = (patientId) => {
    if (!permissions.has('patient360.read')) {
      setDialog('You do not have permission to open Patient 360.')
      return
    }
    const path = `/patients/${encodeURIComponent(patientId)}`
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
    setQuery('')
    setMenu('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openSearchResult = (kind, record) => {
    if (kind === 'patient') { openPatient(record.id); return }
    const candidates = kind === 'appointment' ? ['appointments', 'doctor-queue', 'triage-queue', 'opd-queue']
      : kind === 'lab' ? [record.critical ? 'critical-results' : record.status === 'Result entered' ? 'lab-results' : record.specimenId ? 'specimens' : 'lab-worklist', 'lab-worklist']
        : kind === 'prescription' ? [record.status === 'Verified' ? 'dispensing-panel' : 'pharmacy-queue', 'pharmacy-queue']
          : ['claims-list']
    const destination = candidates.find((candidate) => pageItems.some((item) => item.id === candidate))
    if (destination) navigate(destination)
    else setDialog('Your current role does not have access to the matching record workspace.')
  }

  const activePage = canOpenPage(requestedPage) ? requestedPage : homePage
  const currentItem = pageItems.find((item) => item.id === activePage)
  const pageTitle = activePage === 'patient-detail'
    ? 'Patient 360'
    : currentItem?.label || roleDefinitions.find((role) => roleIds.includes(role.id) && role.homePage === activePage)?.name || 'Workspace'
  const pageKind = activePage === 'patient-detail' ? 'patients' : currentItem?.page

  let pageContent
  if (pageKind === 'front-desk') {
    pageContent = <FrontDeskPage pageId={activePage} pageTitle={pageTitle} />
  } else if (pageKind === 'nursing') {
    pageContent = <NursePage pageId={activePage} pageTitle={pageTitle} />
  } else if (pageKind === 'clinical') {
    pageContent = <ClinicalPage pageId={activePage} pageTitle={pageTitle} />
  } else if (pageKind === 'laboratory') {
    pageContent = <LaboratoryPage pageId={activePage} pageTitle={pageTitle} />
  } else if (pageKind === 'pharmacy') {
    pageContent = <PharmacyPage pageId={activePage} pageTitle={pageTitle} />
  } else if (pageKind === 'patients') {
    pageContent = <PatientsPage />
  } else if (pageKind === 'claims') {
    pageContent = activePage === 'claims-list'
      ? <ClaimsDashboard pageId={activePage} pageTitle={pageTitle} />
      : <ClaimsWorkspacePage pageId={activePage} pageTitle={pageTitle} />
  } else if (pageKind === 'inpatient') {
    pageContent = <InpatientPage pageId={activePage} pageTitle={pageTitle} />
  } else if (pageKind === 'finance') {
    pageContent = <FinancePage pageId={activePage} pageTitle={pageTitle} />
  } else if (pageKind === 'reports') {
    pageContent = <ReportsPage />
  } else if (pageKind === 'role-dashboard') {
    pageContent = <RoleDashboardPage roleId={activePage.replace(/-overview$/, '')} />
  } else if (pageKind === 'management') {
    pageContent = <ManagementDashboard />
  } else if (pageKind === 'permissions') {
    pageContent = <PermissionSettingsPage />
  } else if (pageKind === 'workspace') {
    pageContent = <WorkspacePage pageId={activePage} />
  } else if (activePage === 'not-found') {
    pageContent = (
      <section className="module-placeholder" aria-labelledby="not-found-title">
        <span className="placeholder-icon"><CircleAlert size={20} /></span>
        <h1 id="not-found-title">Page not found</h1>
        <p>This address does not match a page in the current workspace.</p>
        <div className="heading-actions">
          <button className="button button--primary" type="button" onClick={() => navigate('home')}>Return to workspace</button>
        </div>
      </section>
    )
  } else {
    pageContent = <RoleModulePreview title={pageTitle} roleName={selectedRoleNames.join(' + ')} />
  }

  if (!session) {
    return (
      <>
        <AuthPage onSignIn={handleSignIn} />
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      </>
    )
  }

  return (
    <roleAccessContext.Provider value={roleContextValue}>
      <div className="app-shell">
        {mobileNavOpen && (
          <button className="mobile-backdrop" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />
        )}

        <aside className={`sidebar ${mobileNavOpen ? 'sidebar--open' : ''}`} aria-label="Main navigation">
          <div className="brand-lockup">
            <img className="brand-mark" src="/brand/hms-icon.png" alt="" />
            <span className="brand-wordmark" role="img" aria-label="Ascend HMS by Ascend Technologies">
              <img className="brand-wordmark-image brand-wordmark-image--light" src="/brand/ascend-hms-light.png" alt="" />
              <img className="brand-wordmark-image brand-wordmark-image--dark" src="/brand/ascend-hms-dark.png" alt="" />
            </span>
            <button className="icon-button sidebar-close" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <nav className="primary-nav">
            {navigation.map((section) => (
              <div className="nav-group" key={`${section.label}-${section.items[0]?.id}`}>
                <p className="nav-group-label">{section.label}</p>
                {section.items.map(({ id, label, icon: Icon }) => (
                  <button
                    type="button"
                    className={`nav-link ${activePage === id ? 'nav-link--active' : ''}`}
                    key={id}
                    onClick={() => navigate(id)}
                    aria-current={activePage === id ? 'page' : undefined}
                  >
                    <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-role-note">Departmental workspaces</div>
        </aside>

        <main className="main-area">
          <header className="topbar">
            <div className="topbar-start">
              <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(true)}>
                <Menu size={19} />
              </button>
              <div className="global-search-wrap">
                <label className="search-field">
                  <Search size={17} aria-hidden="true" />
                  <input
                    type="search"
                    placeholder="Search patients, visits, orders or claims"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label="Search patients, visits, orders or claims"
                    aria-expanded={Boolean(searchTerm)}
                  />
                </label>
                {searchTerm && (
                  <div className="global-search-results" role="listbox" aria-label="Patient and operational search results">
                    {patientMatches.map((patient) => <button type="button" role="option" key={`patient-${patient.id}`} onClick={() => openSearchResult('patient', patient)}><span className="global-search-avatar">P</span><span><strong>{patient.name}</strong><small>Patient · {patient.id} · {patient.phone}</small></span></button>)}
                    {appointmentMatches.map((item) => <button type="button" role="option" key={`visit-${item.id}`} onClick={() => openSearchResult('appointment', item)}><span className="global-search-avatar">V</span><span><strong>{item.patientName}</strong><small>Visit · {item.id} · {item.department} · {item.status}</small></span></button>)}
                    {labMatches.map((item) => <button type="button" role="option" key={`lab-${item.id}`} onClick={() => openSearchResult('lab', item)}><span className="global-search-avatar">L</span><span><strong>{item.testName}</strong><small>Laboratory · {item.patientName} · {item.status}</small></span></button>)}
                    {prescriptionMatches.map((item) => <button type="button" role="option" key={`rx-${item.id}`} onClick={() => openSearchResult('prescription', item)}><span className="global-search-avatar">Rx</span><span><strong>{item.medication}</strong><small>Prescription · {item.patientName} · {item.status}</small></span></button>)}
                    {claimMatches.map((item) => <button type="button" role="option" key={`claim-${item.id}`} onClick={() => openSearchResult('claim', item)}><span className="global-search-avatar">C</span><span><strong>{item.claimID}</strong><small>Claim · {item.patientName || item.sourcePatientId}</small></span></button>)}
                    {!searchCount && <p>No matching records in the local preview data.</p>}
                  </div>
                )}
              </div>
            </div>
            <div className="topbar-actions">
              <div className="menu-anchor">
                <button className="icon-button" type="button" aria-label="Notifications" aria-expanded={menu === 'notifications'} onClick={() => setMenu(menu === 'notifications' ? '' : 'notifications')}>
                  <Bell size={18} strokeWidth={1.8} />{localNotifications.length > 0 && <span className="notification-count">{localNotifications.length > 9 ? '9+' : localNotifications.length}</span>}
                </button>
                {menu === 'notifications' && (
                  <div className="popover notification-popover">
                    <div className="popover-heading"><div><strong>Notifications</strong><span>Workspace updates</span></div></div>
                    {localNotifications.length ? <div className="notification-list">{localNotifications.map((item) => {
                      const destination = pageItems.some((page) => page.id === item.route) ? item.route : homePage
                      return <button className="notification-item" type="button" key={item.id} onClick={() => navigate(destination)}><span><strong>{item.title}</strong><small>{item.detail}</small></span><ChevronDown size={14}/></button>
                    })}</div> : <div className="notification-empty"><Check size={18} /><span>No active local alerts.</span></div>}
                    <p className="notification-footnote">Alerts are derived from browser-local records. Push notifications are not configured.</p>
                    <button className="text-button notification-dismiss" type="button" onClick={() => setMenu('')}>Close</button>
                  </div>
                )}
              </div>
              <button className="icon-button theme-toggle" type="button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <div className="menu-anchor profile-anchor">
                <button type="button" className="profile-button" aria-expanded={menu === 'profile'} onClick={() => setMenu(menu === 'profile' ? '' : 'profile')}>
                  <span className="avatar avatar--profile">{session.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
                {menu === 'profile' && (
                  <div className="popover profile-popover profile-popover--roles">
                    <div className="profile-menu-heading">
                      <span className="avatar avatar--profile">{session.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
                      <div><strong>{session.displayName}</strong><span>{selectedRoleNames.join(' · ')}</span></div>
                    </div>
                    <div className="profile-preview-note"><UserRound size={15}/><span>Local preview session<br/><small>Account settings and password management are not connected.</small></span></div>
                    {permissions.has('admin.settings.manage') && (
                      <button type="button" onClick={() => navigate('thresholds-settings')}>
                        <Settings size={16} /> Settings
                      </button>
                    )}
                    <div className="popover-divider" />
                    <button type="button" onClick={() => { setMenu(''); handleSignOut() }}>
                      <LogOut size={16} /> Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="page-content">
            {activePage === 'patient-detail' && permissions.has('patient360.read')
              ? <PatientsPage />
              : pageContent}
          </div>
        </main>

        {dialog && (
          <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDialog('')}>
            <section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
              <button className="icon-button dialog-close" type="button" aria-label="Close dialog" onClick={() => setDialog('')}><X size={18} /></button>
              <span className="dialog-mark"><CircleAlert size={19} /></span>
              <h2 id="dialog-title">Access information</h2>
              <p className="dialog-stage">No action was performed</p>
              <p>{dialog}</p>
              <div className="dialog-actions">
                <button className="button button--primary" type="button" onClick={() => setDialog('')}><Check size={16} /> Close</button>
              </div>
            </section>
          </div>
        )}
      </div>
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </roleAccessContext.Provider>
  )
}

export default App
