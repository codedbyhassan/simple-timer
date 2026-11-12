import { RECEPTION_SEED, TODAY } from '../reception/receptionData.js'

const daysFromNow = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}
const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString()

const medicines = [
  { id: 'MED-001', name: 'Paracetamol 500 mg', form: 'Tablet', category: 'Analgesics', unit: 'tablet', reorderLevel: 40, nhiaCode: 'NHIA-MED-0184', ingredients: ['paracetamol'], unitPrice: 0.45 },
  { id: 'MED-002', name: 'Amoxicillin 500 mg', form: 'Capsule', category: 'Antibiotics', unit: 'capsule', reorderLevel: 30, nhiaCode: '', ingredients: ['amoxicillin', 'penicillin'], unitPrice: 1.2 },
  { id: 'MED-003', name: 'Metformin 500 mg', form: 'Tablet', category: 'Diabetes care', unit: 'tablet', reorderLevel: 50, nhiaCode: 'NHIA-MED-1120', ingredients: ['metformin'], unitPrice: 0.65 },
  { id: 'MED-004', name: 'Oral rehydration salts', form: 'Sachet', category: 'Rehydration', unit: 'sachet', reorderLevel: 25, nhiaCode: 'NHIA-MED-2041', ingredients: ['oral rehydration salts'], unitPrice: 2.5 },
  { id: 'MED-005', name: 'Amlodipine 5 mg', form: 'Tablet', category: 'Cardiovascular', unit: 'tablet', reorderLevel: 35, nhiaCode: 'NHIA-MED-0873', ingredients: ['amlodipine'], unitPrice: 0.8 },
]

export const PHARMACY_SEED = {
  ...RECEPTION_SEED,
  pharmacy: {
    medicines,
    batches: [
      { id: 'BAT-001-A', medicineId: 'MED-001', lot: 'PCM-2411-A', quantity: 112, expiresAt: daysFromNow(210), receivedAt: daysFromNow(-42) },
      { id: 'BAT-002-A', medicineId: 'MED-002', lot: 'AMX-2409-B', quantity: 9, expiresAt: daysFromNow(18), receivedAt: daysFromNow(-88) },
      { id: 'BAT-002-B', medicineId: 'MED-002', lot: 'AMX-2510-C', quantity: 64, expiresAt: daysFromNow(310), receivedAt: daysFromNow(-22) },
      { id: 'BAT-003-A', medicineId: 'MED-003', lot: 'MTF-2508-A', quantity: 88, expiresAt: daysFromNow(155), receivedAt: daysFromNow(-75) },
      { id: 'BAT-004-A', medicineId: 'MED-004', lot: 'ORS-2502-D', quantity: 0, expiresAt: daysFromNow(95), receivedAt: daysFromNow(-130) },
      { id: 'BAT-005-A', medicineId: 'MED-005', lot: 'AML-2501-A', quantity: 18, expiresAt: daysFromNow(26), receivedAt: daysFromNow(-105) },
    ],
    prescriptions: [
      {
        id: 'RX-261106-018', patientId: 'ASC-PAT-001284', encounterId: 'ENC-261106-01',
        prescribedBy: 'Dr. K. Owusu', prescribedAt: minutesAgo(34), priority: 'Routine',
        status: 'New', allergyReview: 'No allergy recorded', allergies: [],
        items: [
          { id: 'RXI-018-1', medicineId: 'MED-001', dose: '1 tablet', frequency: 'As prescribed', durationDays: 3, prescribedQuantity: 12, dispensedQuantity: 0 },
          { id: 'RXI-018-2', medicineId: 'MED-004', dose: '1 sachet', frequency: 'As prescribed', durationDays: 2, prescribedQuantity: 4, dispensedQuantity: 0 },
        ],
      },
      {
        id: 'RX-261106-017', patientId: 'ASC-PAT-001311', encounterId: 'ENC-261106-05',
        prescribedBy: 'Dr. E. Asare', prescribedAt: minutesAgo(67), priority: 'Priority',
        status: 'New', allergyReview: 'Review required', allergies: ['Penicillin'],
        items: [
          { id: 'RXI-017-1', medicineId: 'MED-002', dose: '1 capsule', frequency: 'As prescribed', durationDays: 5, prescribedQuantity: 15, dispensedQuantity: 0 },
        ],
      },
      {
        id: 'RX-261106-015', patientId: 'ASC-PAT-001402', encounterId: 'ENC-261106-03',
        prescribedBy: 'Dr. A. Quartey', prescribedAt: minutesAgo(112), priority: 'Routine',
        status: 'Partial', allergyReview: 'No allergy recorded', allergies: [],
        items: [
          { id: 'RXI-015-1', medicineId: 'MED-003', dose: '1 tablet', frequency: 'As prescribed', durationDays: 7, prescribedQuantity: 14, dispensedQuantity: 4 },
        ],
      },
      {
        id: 'RX-261105-009', patientId: 'ASC-PAT-001087', encounterId: '',
        prescribedBy: 'Dr. Y. Adjei', prescribedAt: minutesAgo(940), priority: 'Routine',
        status: 'Dispensed', allergyReview: 'No allergy recorded', allergies: [],
        items: [
          { id: 'RXI-009-1', medicineId: 'MED-001', dose: '1 tablet', frequency: 'As prescribed', durationDays: 2, prescribedQuantity: 8, dispensedQuantity: 8 },
        ],
      },
    ],
    movements: [
      { id: 'MOV-1001', medicineId: 'MED-001', batchId: 'BAT-001-A', type: 'Receipt', quantity: 120, reference: 'Opening balance', reason: 'Opening stock', at: minutesAgo(43_200) },
      { id: 'MOV-1002', medicineId: 'MED-002', batchId: 'BAT-002-A', type: 'Receipt', quantity: 9, reference: 'Opening balance', reason: 'Opening stock', at: minutesAgo(52_000) },
      { id: 'MOV-1005', medicineId: 'MED-002', batchId: 'BAT-002-B', type: 'Receipt', quantity: 64, reference: 'Opening balance', reason: 'Opening stock', at: minutesAgo(45_000) },
      { id: 'MOV-1003', medicineId: 'MED-003', batchId: 'BAT-003-A', type: 'Receipt', quantity: 92, reference: 'Opening balance', reason: 'Opening stock', at: minutesAgo(38_000) },
      { id: 'MOV-1006', medicineId: 'MED-003', batchId: 'BAT-003-A', type: 'Dispense', quantity: -4, reference: 'RX-261106-015', reason: 'Partial dispensing', at: minutesAgo(112) },
      { id: 'MOV-1007', medicineId: 'MED-005', batchId: 'BAT-005-A', type: 'Receipt', quantity: 18, reference: 'Opening balance', reason: 'Opening stock', at: minutesAgo(35_000) },
      { id: 'MOV-1004', medicineId: 'MED-001', batchId: 'BAT-001-A', type: 'Dispense', quantity: -8, reference: 'RX-261105-009', reason: 'Dispensing', at: minutesAgo(940) },
    ],
    activity: [
      { id: 'ACT-PH-001', type: 'Queue', message: 'A priority prescription is awaiting review', at: minutesAgo(12) },
      { id: 'ACT-PH-002', type: 'Stock', message: 'Amlodipine is below its reorder level and nearing expiry', at: minutesAgo(38) },
      { id: 'ACT-PH-003', type: 'Mapping', message: 'Amoxicillin has no NHIA medicine code', at: minutesAgo(75) },
      { id: 'ACT-PH-004', type: 'Dispense', message: 'Prescription dispensed · RX-261105-009', at: minutesAgo(940) },
    ],
    reviewedAlerts: [],
  },
}

export const PHARMACY_TODAY = TODAY
