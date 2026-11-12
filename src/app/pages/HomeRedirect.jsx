import { Navigate } from 'react-router-dom'
import { useAccess } from '@core/access/AccessProvider.jsx'

export default function HomeRedirect() {
  const { home } = useAccess()
  return <Navigate to={home} replace />
}
