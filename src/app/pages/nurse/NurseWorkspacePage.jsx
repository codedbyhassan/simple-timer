import { useAccess } from '@core/access/AccessProvider.jsx'
import useNurseWorkspace from './useNurseWorkspace.js'
import NurseOverviewPage from './NurseOverviewPage.jsx'
import NurseTriagePage from './NurseTriagePage.jsx'
import NurseWardBoardPage from './NurseWardBoardPage.jsx'
import NurseTasksPage from './NurseTasksPage.jsx'
import NurseAdmissionsPage from './NurseAdmissionsPage.jsx'
import NurseDischargePage from './NurseDischargePage.jsx'
import NurseOpdQueuePage from './NurseOpdQueuePage.jsx'

export default function NurseWorkspacePage({ menu }) {
  const { data, error, commit } = useNurseWorkspace()
  const { can } = useAccess()
  const props = { menu, data, error, commit, can }
  const pages = {
    overview: NurseOverviewPage,
    triage: NurseTriagePage,
    wards: NurseWardBoardPage,
    tasks: NurseTasksPage,
    admissions: NurseAdmissionsPage,
    discharge: NurseDischargePage,
    opd: NurseOpdQueuePage,
  }
  const Page = pages[menu.slug]
  return Page ? <Page {...props} /> : null
}
