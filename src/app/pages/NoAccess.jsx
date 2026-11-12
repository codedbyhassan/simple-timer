import { useNavigate } from 'react-router-dom'
import { Button, EmptyState } from '@ui'
import { useAccess } from '@core/access/AccessProvider.jsx'

export default function NoAccess() {
  const navigate = useNavigate()
  const { home } = useAccess()
  return (
    <EmptyState icon="shieldCheck" title="You do not have access to this page" action={<Button size="md" onClick={() => navigate(home)}>Go to your dashboard</Button>}>
      Your role does not include it. If you need it, ask your hospital administrator.
    </EmptyState>
  )
}
