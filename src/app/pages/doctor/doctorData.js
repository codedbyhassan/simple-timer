import { LAB_SEED } from '../lab/labData.js'
import { NURSE_SEED } from '../nurse/nurseData.js'

export const DOCTOR_SEED = {
  ...LAB_SEED,
  nurse: NURSE_SEED.nurse,
  doctor: {
    drafts: [],
    reviewedResults: [],
    referrals: [],
    activity: [],
  },
}

export const DIAGNOSIS_OPTIONS = []
export const DOCTOR_NAME = 'Current clinician'
