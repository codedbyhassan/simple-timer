import { useAccess } from '@core/access/AccessProvider.jsx'
import useLabWorkspace from './useLabWorkspace.js'
import LabOverviewPage from './LabOverviewPage.jsx'
import LabWorklistPage from './LabWorklistPage.jsx'
import LabSpecimensPage from './LabSpecimensPage.jsx'
import LabResultsPage from './LabResultsPage.jsx'
import LabCriticalPage from './LabCriticalPage.jsx'
import LabCataloguePage from './LabCataloguePage.jsx'
import LabInventoryPage from './LabInventoryPage.jsx'

export default function LabWorkspacePage({ menu }) {
  const { data, error, commit } = useLabWorkspace()
  const { can } = useAccess()
  const props = { menu, data, error, commit, can }
  const pages = {
    overview: LabOverviewPage,
    worklist: LabWorklistPage,
    specimens: LabSpecimensPage,
    results: LabResultsPage,
    critical: LabCriticalPage,
    catalogue: LabCataloguePage,
    inventory: LabInventoryPage,
  }
  const Page = pages[menu.slug]
  return Page ? <Page {...props} /> : null
}
