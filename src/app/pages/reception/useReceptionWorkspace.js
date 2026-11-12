import { RECEPTION_SEED } from './receptionData.js'
import useIndexedWorkspace from '@core/storage/useIndexedWorkspace.js'

// Every clinical workspace reads and writes the same IndexedDB document.
// Role-specific seed sections are merged into the shared local record on first use.
export default function useReceptionWorkspace() {
  return useIndexedWorkspace(RECEPTION_SEED, 'Reception')
}
