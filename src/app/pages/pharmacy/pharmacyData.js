import { RECEPTION_SEED, TODAY } from '../reception/receptionData.js'

export const PHARMACY_SEED = {
  ...RECEPTION_SEED,
  pharmacy: {
    medicines: [],
    batches: [],
    prescriptions: [],
    movements: [],
    activity: [],
    reviewedAlerts: [],
  },
}

export const PHARMACY_TODAY = TODAY
