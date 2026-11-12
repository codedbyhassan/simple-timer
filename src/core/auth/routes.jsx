import { Navigate, useLocation } from 'react-router-dom'
import { Spinner } from '@ui'
import { authService } from './authService.js'
import { useAuth } from './AuthProvider.jsx'

const Splash = () => (
  <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-subtle)' }}>
    <Spinner size={28} label="Loading" />
  </div>
)

// Pages that need a signed-in user.
export function ProtectedRoute({ children }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <Splash />
  // A password reset link signs the person in. Until they choose a new password they stay on the reset page.
  if (status === 'signedIn' && authService.isRecovery()) return <Navigate to="/reset-password" replace />
  if (status === 'signedOut') return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  return children
}

// Pages for people who are not signed in (sign in, forgot password).
export function GuestRoute({ children }) {
  const { status } = useAuth()
  if (status === 'loading') return <Splash />
  if (status === 'signedIn' && !authService.isRecovery()) return <Navigate to="/" replace />
  return children
}
