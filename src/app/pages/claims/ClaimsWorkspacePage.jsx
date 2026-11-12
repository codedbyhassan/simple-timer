import { useAccess } from '@core/access/AccessProvider.jsx'
import useClaimsWorkspace from './useClaimsWorkspace.js'
import ClaimsOverviewPage from './ClaimsOverviewPage.jsx'
import ClaimsPipelinePage from './ClaimsPipelinePage.jsx'
import ClaimsListPage from './ClaimsListPage.jsx'
import ClaimsMappingPage from './ClaimsMappingPage.jsx'
import ClaimsExportsPage from './ClaimsExportsPage.jsx'
import ClaimsImportsPage from './ClaimsImportsPage.jsx'
import ClaimsProgressPage from './ClaimsProgressPage.jsx'

export default function ClaimsWorkspacePage({ menu }) {
  const workspace = useClaimsWorkspace()
  const { can } = useAccess()
  const props = { ...workspace, menu, can }
  const pages = {
    overview: ClaimsOverviewPage,
    pipeline: ClaimsPipelinePage,
    list: ClaimsListPage,
    mapping: ClaimsMappingPage,
    exports: ClaimsExportsPage,
    imports: ClaimsImportsPage,
    progress: ClaimsProgressPage,
  }
  const Page = pages[menu.slug]
  return Page ? <Page {...props} /> : null
}
