import { useAccess } from '@core/access/AccessProvider.jsx'
import useReceptionWorkspace from './useReceptionWorkspace.js'
import ReceptionOverviewPage from './ReceptionOverviewPage.jsx'
import ReceptionDeskPage from './ReceptionDeskPage.jsx'
import ReceptionAppointmentsPage from './ReceptionAppointmentsPage.jsx'
import ReceptionPatientsPage from './ReceptionPatientsPage.jsx'
import ReceptionDocumentsPage from './ReceptionDocumentsPage.jsx'
import ReceptionOpdQueuePage from './ReceptionOpdQueuePage.jsx'
import ReceptionClaimGapsPage from './ReceptionClaimGapsPage.jsx'
import ReceptionPaymentsPage from './ReceptionPaymentsPage.jsx'

export default function ReceptionWorkspacePage({ menu }) {
  const { data, error, commit } = useReceptionWorkspace()
  const { can } = useAccess()
  const props = { menu, data, error, commit, can }
  const pages = {
    overview: ReceptionOverviewPage,
    desk: ReceptionDeskPage,
    appointments: ReceptionAppointmentsPage,
    patients: ReceptionPatientsPage,
    documents: ReceptionDocumentsPage,
    opd: ReceptionOpdQueuePage,
    'claim-gaps': ReceptionClaimGapsPage,
    payments: ReceptionPaymentsPage,
  }
  const Page = pages[menu.slug]
  return Page ? <Page {...props} /> : null
}
