import { RECEPTION_SEED } from '../reception/receptionData.js'

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString()

const NURSE_SEED_REFERENCE = {
  ...RECEPTION_SEED,
  nurse: {
    wards: [
      { id: 'ward-general', name: 'General ward', type: 'Medical', beds: ['G-01', 'G-02', 'G-03', 'G-04', 'G-05', 'G-06'] },
      { id: 'ward-paediatric', name: 'Paediatric ward', type: 'Paediatric', beds: ['P-01', 'P-02', 'P-03', 'P-04'] },
      { id: 'ward-maternity', name: 'Maternity', type: 'Maternity', beds: ['M-01', 'M-02', 'M-03', 'M-04'] },
    ],
    beds: [
      { id: 'G-01', wardId: 'ward-general', status: 'Occupied', patientId: 'ASC-PAT-001284', since: minutesAgo(225) },
      { id: 'G-02', wardId: 'ward-general', status: 'Available', patientId: '', since: '' },
      { id: 'G-03', wardId: 'ward-general', status: 'Cleaning', patientId: '', since: minutesAgo(26) },
      { id: 'G-04', wardId: 'ward-general', status: 'Occupied', patientId: 'ASC-PAT-001087', since: minutesAgo(1380) },
      { id: 'G-05', wardId: 'ward-general', status: 'Out of service', patientId: '', since: '' },
      { id: 'G-06', wardId: 'ward-general', status: 'Available', patientId: '', since: '' },
      { id: 'P-01', wardId: 'ward-paediatric', status: 'Occupied', patientId: 'ASC-PAT-001311', since: minutesAgo(840) },
      { id: 'P-02', wardId: 'ward-paediatric', status: 'Available', patientId: '', since: '' },
      { id: 'P-03', wardId: 'ward-paediatric', status: 'Available', patientId: '', since: '' },
      { id: 'P-04', wardId: 'ward-paediatric', status: 'Reserved', patientId: '', since: '' },
      { id: 'M-01', wardId: 'ward-maternity', status: 'Occupied', patientId: 'ASC-PAT-001609', since: minutesAgo(1960) },
      { id: 'M-02', wardId: 'ward-maternity', status: 'Available', patientId: '', since: '' },
      { id: 'M-03', wardId: 'ward-maternity', status: 'Available', patientId: '', since: '' },
      { id: 'M-04', wardId: 'ward-maternity', status: 'Out of service', patientId: '', since: '' },
    ],
    tasks: [
      { id: 'TASK-1001', patientId: 'ASC-PAT-001284', wardId: 'ward-general', type: 'Vital-sign round', note: 'Routine observation round', dueAt: minutesAgo(-18), status: 'Due', priority: 'Routine' },
      { id: 'TASK-1002', patientId: 'ASC-PAT-001311', wardId: 'ward-paediatric', type: 'Medication administration', note: 'Scheduled dose · see medication chart', dueAt: minutesAgo(-32), status: 'Due', priority: 'Priority' },
      { id: 'TASK-1003', patientId: 'ASC-PAT-001087', wardId: 'ward-general', type: 'Handover note', note: 'Document shift handover', dueAt: minutesAgo(12), status: 'Overdue', priority: 'Priority' },
      { id: 'TASK-1004', patientId: 'ASC-PAT-001609', wardId: 'ward-maternity', type: 'Observation', note: 'Scheduled observation', dueAt: minutesAgo(-54), status: 'Due', priority: 'Routine' },
      { id: 'TASK-1005', patientId: 'ASC-PAT-001284', wardId: 'ward-general', type: 'Wound dressing', note: 'Review dressing plan with clinical team', dueAt: minutesAgo(-120), status: 'Completed', priority: 'Routine', completedAt: minutesAgo(58) },
    ],
    admissions: [
      { id: 'ADM-1001', patientId: 'ASC-PAT-001402', requestedAt: minutesAgo(42), department: 'General medicine', reason: 'Observation requested', priority: 'Priority', status: 'Awaiting bed', wardId: 'ward-general', bedId: '' },
      { id: 'ADM-1002', patientId: 'ASC-PAT-001526', requestedAt: minutesAgo(95), department: 'General medicine', reason: 'Admission request from clinician', priority: 'Routine', status: 'Awaiting bed', wardId: 'ward-general', bedId: '' },
      { id: 'ADM-0998', patientId: 'ASC-PAT-001311', requestedAt: minutesAgo(840), department: 'Paediatrics', reason: 'Paediatric observation', priority: 'Routine', status: 'Admitted', bedId: 'P-01' },
    ],
    discharges: [
      {
        id: 'DIS-1001', patientId: 'ASC-PAT-001284', wardId: 'ward-general', bedId: 'G-01',
        status: 'Preparing', outcome: '', updatedAt: minutesAgo(18),
        checks: { clinicalSummary: true, medicines: false, billing: true, outcome: false },
      },
      {
        id: 'DIS-1002', patientId: 'ASC-PAT-001087', wardId: 'ward-general', bedId: 'G-04',
        status: 'Preparing', outcome: '', updatedAt: minutesAgo(35),
        checks: { clinicalSummary: true, medicines: true, billing: false, outcome: false },
      },
    ],
    activity: [
      { id: 'ACT-1001', kind: 'Triage', message: 'Triage station ready for the next arrival', at: minutesAgo(8) },
      { id: 'ACT-1002', kind: 'Ward', message: 'General ward observation round due', at: minutesAgo(18) },
      { id: 'ACT-1003', kind: 'Admission', message: 'New admission request awaiting a bed', at: minutesAgo(42) },
    ],
  },
}

export const NURSE_SEED = {
  ...NURSE_SEED_REFERENCE, nurse: { ...NURSE_SEED_REFERENCE.nurse, wards: [], beds: [], tasks: [], admissions: [], discharges: [], activity: [] },
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
