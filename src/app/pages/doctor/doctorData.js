import { LAB_SEED } from '../lab/labData.js'
import { NURSE_SEED } from '../nurse/nurseData.js'

const DOCTOR_SEED_REFERENCE = {
  ...LAB_SEED,
  nurse: NURSE_SEED.nurse,
  doctor: {
    drafts: [],
    reviewedResults: [],
    referrals: [],
    activity: [
      { id: 'DACT-001', kind: 'Queue', message: 'A new outpatient handover is ready for review.' },
      { id: 'DACT-002', kind: 'Results', message: 'Review verified and critical results in the results inbox.' },
    ],
  },
}

export const DOCTOR_SEED = {
  ...DOCTOR_SEED_REFERENCE, doctor: { ...DOCTOR_SEED_REFERENCE.doctor, drafts: [], reviewedResults: [], referrals: [], activity: [] },
}

export const DIAGNOSIS_OPTIONS = [
  { code: 'R50.9', description: 'Fever, unspecified' },
  { code: 'I10', description: 'Essential (primary) hypertension' },
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
  { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified' },
  { code: 'R51.9', description: 'Headache, unspecified' },
  { code: 'R10.9', description: 'Unspecified abdominal pain' },
]

export const DOCTOR_NAME = 'Dr. K. Owusu'
