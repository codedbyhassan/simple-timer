import { useAccess } from '@core/access/AccessProvider.jsx'
import useDoctorWorkspace from './useDoctorWorkspace.js'
import DoctorOverviewPage from './DoctorOverviewPage.jsx'
import DoctorQueuePage from './DoctorQueuePage.jsx'
import DoctorConsultationPage from './DoctorConsultationPage.jsx'
import DoctorResultsPage from './DoctorResultsPage.jsx'
import DoctorAdmissionsPage from './DoctorAdmissionsPage.jsx'
import DoctorOpdQueuePage from './DoctorOpdQueuePage.jsx'

export default function DoctorWorkspacePage({ menu }) {
  const { data, error, commit } = useDoctorWorkspace()
  const { can } = useAccess()
  const props = { menu, data, error, commit, can }
  const pages = {
    overview: DoctorOverviewPage,
    queue: DoctorQueuePage,
    consultation: DoctorConsultationPage,
    results: DoctorResultsPage,
    admissions: DoctorAdmissionsPage,
    opd: DoctorOpdQueuePage,
  }
  const Page = pages[menu.slug]
  return Page ? <Page {...props} /> : null
}
