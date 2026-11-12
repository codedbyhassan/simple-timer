import { CLAIMS_SEED } from '../claims/claimsData.js'

const paymentTransactions = CLAIMS_SEED.payments.filter((payment) => payment.paid > 0).map((payment) => ({
  id: `RCT-${payment.id}`,
  invoiceId: payment.id,
  patientId: payment.patientId,
  amount: payment.paid,
  method: payment.method === 'NHIS' ? 'Insurance co-payment' : payment.method,
  reference: `PAY-${payment.id}`,
  recordedAt: `${payment.date}T10:00:00.000Z`,
  cashier: 'Cashier',
}))

const CASHIER_SEED_REFERENCE = {
  ...CLAIMS_SEED,
  cashier: {
    transactions: paymentTransactions,
    refunds: [
      { id: 'REF-1021', invoiceId: 'INV-1041', patientId: 'ASC-PAT-001087', amount: 10, reason: 'Duplicate service charge review', status: 'Pending approval', requestedAt: new Date().toISOString(), requestedBy: 'Cashier' },
    ],
    shift: {
      id: 'SHIFT-01',
      status: 'Open',
      openedAt: new Date().toISOString(),
      openingFloat: 150,
      countedCash: null,
      reconciliations: [],
    },
    prices: [
      { id: 'PRICE-CONSULT', name: 'Outpatient consultation', category: 'Consultation', amount: 60, source: 'Service catalogue' },
      { id: 'PRICE-REG', name: 'Registration', category: 'Registration', amount: 20, source: 'Service catalogue' },
      { id: 'PRICE-DRESS', name: 'Wound dressing', category: 'Procedure', amount: 35, source: 'Service catalogue' },
      { id: 'PRICE-XRAY', name: 'Plain X-ray', category: 'Imaging', amount: 75, source: 'Service catalogue' },
    ],
    activity: [],
  },
}

export const CASHIER_SEED = {
  ...CASHIER_SEED_REFERENCE, cashier: { ...CASHIER_SEED_REFERENCE.cashier, transactions: [], refunds: [], prices: [], shift: { id: '', status: 'Closed', openedAt: '', openingFloat: 0, countedCash: null, reconciliations: [] }, activity: [] },
}
