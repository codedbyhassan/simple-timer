import { CLAIMS_SEED } from '../claims/claimsData.js'

export const CASHIER_SEED = {
  ...CLAIMS_SEED,
  cashier: {
    transactions: [],
    refunds: [],
    shift: {
      id: '',
      status: 'Closed',
      openedAt: '',
      openingFloat: 0,
      countedCash: null,
      reconciliations: [],
    },
    prices: [],
    activity: [],
  },
}
