import { Navigate, useLocation } from 'react-router-dom'
import { Button, EmptyState, Spinner } from '@ui'
import { useAuth } from './AuthProvider.jsx'

const Splash = () => (
  <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-subtle)' }}>
    <Spinner size={28} label="Loading" />
  </div>
)

// Pages that need a signed-in user.
export function ProtectedRoute({ children }) {
  const { status, error } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <Splash />
  if (status === 'error') return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}><div style={{ maxWidth: 480 }}><EmptyState icon="database" title="Local database unavailable" action={<Button onClick={() => window.location.reload()}>Retry</Button>}>{error?.message || 'Ascend HMS could not open IndexedDB. Check that browser storage is enabled and available.'}</EmptyState></div></div>
  if (status === 'signedOut') return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  return children
}

// Pages for people who are not signed in (sign in, forgot password).
export function GuestRoute({ children }) {
  const { status } = useAuth()
  if (status === 'loading') return <Splash />
  if (status === 'signedIn') return <Navigate to="/" replace />
  return children
}
