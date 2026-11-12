import { PHARMACY_SEED } from '../pharmacy/pharmacyData.js'

export const LAB_SEED = {
  ...PHARMACY_SEED,
  lab: {
    catalogue: [],
    orders: [],
    specimens: [],
    stock: [],
    movements: [],
    recollectionTasks: [],
    activity: [],
    notifications: [],
    acknowledgedCritical: [],
  },
}
