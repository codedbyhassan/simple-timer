import { PHARMACY_SEED } from './pharmacyData.js'
import useIndexedWorkspace from '@core/storage/useIndexedWorkspace.js'

// Every clinical workspace reads and writes the same IndexedDB document.
// Role-specific seed sections are merged into the shared local record on first use.
export default function usePharmacyWorkspace() {
  return useIndexedWorkspace(PHARMACY_SEED, 'Pharmacy')
}
