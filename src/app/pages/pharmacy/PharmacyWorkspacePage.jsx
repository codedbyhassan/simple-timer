import { useAccess } from '@core/access/AccessProvider.jsx'
import usePharmacyWorkspace from './usePharmacyWorkspace.js'
import PharmacyOverviewPage from './PharmacyOverviewPage.jsx'
import PharmacyQueuePage from './PharmacyQueuePage.jsx'
import PharmacyDispensingPage from './PharmacyDispensingPage.jsx'
import PharmacyAlertsPage from './PharmacyAlertsPage.jsx'
import PharmacyStockLevelsPage from './PharmacyStockLevelsPage.jsx'
import PharmacyFormularyPage from './PharmacyFormularyPage.jsx'
import PharmacyInventoryPage from './PharmacyInventoryPage.jsx'

export default function PharmacyWorkspacePage({ menu }) {
  const { data, error, commit } = usePharmacyWorkspace()
  const { can } = useAccess()
  const props = { menu, data, error, commit, can }
  const pages = {
    overview: PharmacyOverviewPage,
    queue: PharmacyQueuePage,
    dispensing: PharmacyDispensingPage,
    alerts: PharmacyAlertsPage,
    levels: PharmacyStockLevelsPage,
    formulary: PharmacyFormularyPage,
    inventory: PharmacyInventoryPage,
  }
  const Page = pages[menu.slug]
  return Page ? <Page {...props} /> : null
}
