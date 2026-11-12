import { RECEPTION_SEED } from '../reception/receptionData.js'

export const NURSE_SEED = {
  ...RECEPTION_SEED,
  nurse: {
    wards: [],
    beds: [],
    tasks: [],
    admissions: [],
    discharges: [],
    activity: [],
  },
}

export const TRIAGE_PRIORITIES = ['Routine', 'Priority', 'Urgent']
export const RED_FLAGS = [
  'Breathing difficulty',
  'Reduced level of consciousness',
  'Severe bleeding',
  'Severe pain',
  'Other immediate concern',
]
export const TASK_TYPES = ['Vital-sign round', 'Medication administration', 'Wound dressing', 'IV check', 'Handover note', 'Observation']
export const DISCHARGE_CHECKS = [
  { key: 'clinicalSummary', label: 'Clinical summary completed' },
  { key: 'medicines', label: 'Medicines dispensed or arranged' },
  { key: 'billing', label: 'Bills cleared or arrangements recorded' },
  { key: 'outcome', label: 'Discharge outcome recorded' },
]
