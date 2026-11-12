import { CASHIER_SEED } from './cashierData.js'
import useIndexedWorkspace from '@core/storage/useIndexedWorkspace.js'

// Every clinical workspace reads and writes the same IndexedDB document.
// Role-specific seed sections are merged into the shared local record on first use.
export default function useCashierWorkspace() {
  return useIndexedWorkspace(CASHIER_SEED, 'Cashier')
}
