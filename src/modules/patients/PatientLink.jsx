import { useRoleAccess } from '../../access/roleAccess.js'
import './PatientLink.css'

export default function PatientLink({ patientId, children, className = '' }) {
  const { hasPermission } = useRoleAccess()
  if (!patientId || !hasPermission('patient360.read')) return <span className={className}>{children}</span>

  const openPatient = () => {
    window.history.pushState({}, '', `/patients/${encodeURIComponent(patientId)}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button className={`patient-link ${className}`.trim()} type="button" onClick={openPatient}>
      {children}
    </button>
  )
}
