import nhisMedicineCatalog from './nhisMedicineCatalog.json' with { type: 'json' }
import { createBrowserStore } from '../shared/browserStore.js'

function randomTestTopUp() {
  return Math.floor(Math.random() * 26) + 5
}

const initialCareData = () => ({
  consultations: [],
  labOrders: [],
  prescriptions: [],
  inventoryMovements: [],
  inventory: [
    { id: 'lab-stock-fbc', department: 'laboratory', itemCode: 'LAB-FBC', name: 'Full blood count', unit: 'tests', onHand: 18, reorderLevel: 5, trackStock: true, claimCode: '' },
    { id: 'lab-stock-glucose', department: 'laboratory', itemCode: 'LAB-FBG', name: 'Fasting blood glucose', unit: 'tests', onHand: 22, reorderLevel: 6, trackStock: true, claimCode: '' },
    { id: 'lab-stock-urinalysis', department: 'laboratory', itemCode: 'LAB-URINALYSIS', name: 'Urinalysis', unit: 'tests', onHand: 0, reorderLevel: 0, trackStock: false, claimCode: '' },
    { id: 'lab-stock-malaria', department: 'laboratory', itemCode: 'LAB-MALARIA-RDT', name: 'Malaria RDT', unit: 'tests', onHand: 14, reorderLevel: 4, trackStock: true, claimCode: '' },
    ...nhisMedicineCatalog.map((medicine) => {
      const testTopUpCedis = randomTestTopUp()
      return {
        id: `pharmacy-stock-${medicine.code.toLowerCase()}`,
        department: 'pharmacy',
        itemCode: medicine.code,
        name: medicine.description,
        unit: medicine.pack,
        onHand: 0,
        reorderLevel: 0,
        trackStock: true,
        claimCode: medicine.code,
        nhisPrice: medicine.nhisPrice,
        nhisCategory: medicine.category,
        testTopUpCedis,
        retailPrice: medicine.nhisPrice + testTopUpCedis,
        pricingMode: 'synthetic-test',
      }
    }),
  ],
})

const careStore = createBrowserStore({
  key: 'care',
  seed: initialCareData,
  validate: (value) => value && typeof value === 'object'
    && Array.isArray(value.consultations)
    && Array.isArray(value.labOrders)
    && Array.isArray(value.prescriptions)
    && Array.isArray(value.inventory),
})

export function getCareData() {
  return careStore.getSnapshot()
}

export function updateCareData(updater) {
  careStore.update(updater)
}

export function subscribeToCareData(listener) {
  return careStore.subscribe(listener)
}

export function createCareId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function calculatePrescriptionBilling({ prescription, patient, serviceDate }) {
  const quantity = Number(prescription.dispensedQty ?? prescription.quantity)
  const retailPrice = prescription.retailPrice
  const nhisPrice = prescription.nhisPrice
  const pricingReady = Number.isFinite(retailPrice) && retailPrice >= 0
    && Number.isFinite(quantity) && quantity > 0
  if (!pricingReady) {
    return {
      status: 'Retail price not configured',
      retailTotal: null,
      nhisCovered: 0,
      patientDue: null,
    }
  }

  const total = retailPrice * quantity
  const hasActiveNhis = patient?.insuranceProvider === 'NHIS'
    && Boolean(patient.insuranceExpires)
    && patient.insuranceExpires >= serviceDate
  const nhisCovered = hasActiveNhis && Number.isFinite(nhisPrice)
    ? Math.min(retailPrice, nhisPrice) * quantity
    : 0
  const patientDue = Math.max(0, total - nhisCovered)
  const isSyntheticTestPrice = prescription.pricingMode === 'synthetic-test'
  const testTopUpCedis = isSyntheticTestPrice
    ? Number(prescription.testTopUpCedis || 0) * quantity
    : 0

  return {
    status: isSyntheticTestPrice
      ? hasActiveNhis ? 'Test-only NHIS top-up' : 'Test-only patient charge'
      : hasActiveNhis ? patientDue > 0 ? 'NHIS top-up due' : 'NHIS covered' : 'Patient charge due',
    retailTotal: total,
    nhisCovered,
    patientDue,
    testTopUpCedis,
    pricingMode: isSyntheticTestPrice ? 'synthetic-test' : 'verified-retail',
  }
}
