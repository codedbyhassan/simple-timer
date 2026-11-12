import { DOCTOR_SEED } from './doctorData.js'
import useIndexedWorkspace from '@core/storage/useIndexedWorkspace.js'

// Every clinical workspace reads and writes the same IndexedDB document.
// Role-specific seed sections are merged into the shared local record on first use.
export default function useDoctorWorkspace() {
  return useIndexedWorkspace(DOCTOR_SEED, 'Doctor')
}
