import { useAccess } from '@core/access/AccessProvider.jsx'
import useCashierWorkspace from './useCashierWorkspace.js'
import CashierOverviewPage from './CashierOverviewPage.jsx'
import CashierChargesPage from './CashierChargesPage.jsx'
import CashierPaymentsPage from './CashierPaymentsPage.jsx'
import CashierTillPage from './CashierTillPage.jsx'
import CashierRefundsPage from './CashierRefundsPage.jsx'
import CashierReconciliationPage from './CashierReconciliationPage.jsx'
import CashierPricesPage from './CashierPricesPage.jsx'
import CashierBilledVsClaimedPage from './CashierBilledVsClaimedPage.jsx'

export default function CashierWorkspacePage({ menu }) {
  const workspace = useCashierWorkspace()
  const { can } = useAccess()
  const props = { ...workspace, menu, can }
  const pages = {
    overview: CashierOverviewPage,
    charges: CashierChargesPage,
    payments: CashierPaymentsPage,
    till: CashierTillPage,
    refunds: CashierRefundsPage,
    reconciliation: CashierReconciliationPage,
    prices: CashierPricesPage,
    'billed-vs-claimed': CashierBilledVsClaimedPage,
  }
  const Page = pages[menu.slug]
  return Page ? <Page {...props} /> : null
}
