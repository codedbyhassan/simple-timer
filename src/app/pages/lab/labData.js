import { PHARMACY_SEED } from '../pharmacy/pharmacyData.js'

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString()
const daysFromNow = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const catalogue = [
  {
    id: 'TEST-CBC', code: 'FBC-001', name: 'Full blood count', category: 'Haematology',
    specimenType: 'EDTA whole blood', turnaroundHours: 4, trackedStock: true, claimCode: 'NHIA-LAB-0104', fee: 48,
    components: [
      { key: 'haemoglobin', label: 'Haemoglobin', unit: 'g/dL', low: 12, high: 17, criticalLow: 7, criticalHigh: 22 },
      { key: 'whiteCells', label: 'White blood cells', unit: '×10⁹/L', low: 4, high: 11, criticalLow: 1, criticalHigh: 30 },
      { key: 'platelets', label: 'Platelets', unit: '×10⁹/L', low: 150, high: 400, criticalLow: 20, criticalHigh: 1000 },
    ],
  },
  {
    id: 'TEST-UEC', code: 'BIO-014', name: 'Urea and electrolytes', category: 'Biochemistry',
    specimenType: 'Serum', turnaroundHours: 6, trackedStock: true, claimCode: 'NHIA-LAB-0338', fee: 65,
    components: [
      { key: 'sodium', label: 'Sodium', unit: 'mmol/L', low: 135, high: 145, criticalLow: 120, criticalHigh: 160 },
      { key: 'potassium', label: 'Potassium', unit: 'mmol/L', low: 3.5, high: 5.1, criticalLow: 2.5, criticalHigh: 6.5 },
      { key: 'creatinine', label: 'Creatinine', unit: 'µmol/L', low: 45, high: 110, criticalLow: 20, criticalHigh: 900 },
    ],
  },
  {
    id: 'TEST-GLU', code: 'BIO-003', name: 'Blood glucose', category: 'Biochemistry',
    specimenType: 'Fluoride plasma', turnaroundHours: 2, trackedStock: true, claimCode: '', fee: 25,
    components: [{ key: 'glucose', label: 'Glucose', unit: 'mmol/L', low: 3.9, high: 7.8, criticalLow: 2.2, criticalHigh: 25 }],
  },
  {
    id: 'TEST-HB', code: 'HAE-007', name: 'Haemoglobin estimation', category: 'Haematology',
    specimenType: 'EDTA whole blood', turnaroundHours: 2, trackedStock: false, claimCode: 'NHIA-LAB-0102', fee: 15,
    components: [{ key: 'haemoglobin', label: 'Haemoglobin', unit: 'g/dL', low: 12, high: 17, criticalLow: 7, criticalHigh: 22 }],
  },
  {
    id: 'TEST-MRDT', code: 'MIC-002', name: 'Malaria rapid diagnostic test', category: 'Microbiology',
    specimenType: 'Whole blood', turnaroundHours: 1, trackedStock: true, claimCode: 'NHIA-LAB-0501', fee: 22,
    components: [{ key: 'result', label: 'RDT result', unit: 'Qualitative', options: ['Negative', 'Positive'] }],
  },
]

export const LAB_SEED = {
  ...PHARMACY_SEED,
  lab: {
    catalogue,
    orders: [
      { id: 'LAB-261106-041', patientId: 'ASC-PAT-001284', encounterId: 'ENC-261106-01', testId: 'TEST-CBC', orderedBy: 'Dr. K. Owusu', orderedAt: minutesAgo(53), priority: 'Routine', location: 'OPD', status: 'Ordered', resultValues: {}, resultStatus: 'Not entered', notification: null, recollections: 0 },
      { id: 'LAB-261106-042', patientId: 'ASC-PAT-001311', encounterId: 'ENC-261106-05', testId: 'TEST-UEC', orderedBy: 'Dr. E. Asare', orderedAt: minutesAgo(89), priority: 'Priority', location: 'OPD', status: 'Received', resultValues: {}, resultStatus: 'Not entered', notification: null, recollections: 0 },
      { id: 'LAB-261106-039', patientId: 'ASC-PAT-001402', encounterId: 'ENC-261106-03', testId: 'TEST-GLU', orderedBy: 'Dr. A. Quartey', orderedAt: minutesAgo(156), priority: 'Routine', location: 'OPD', status: 'In process', resultValues: { glucose: '8.4' }, resultStatus: 'Awaiting verification', notification: null, recollections: 0 },
      { id: 'LAB-261106-037', patientId: 'ASC-PAT-001609', encounterId: 'ENC-261106-04', testId: 'TEST-HB', orderedBy: 'Dr. A. Quartey', orderedAt: minutesAgo(214), priority: 'Urgent', location: 'Maternity', status: 'Awaiting verification', resultValues: { haemoglobin: '6.2' }, resultStatus: 'Awaiting verification', notification: null, recollections: 0 },
      { id: 'LAB-261105-086', patientId: 'ASC-PAT-001087', encounterId: 'ENC-261106-02', testId: 'TEST-MRDT', orderedBy: 'Dr. Y. Adjei', orderedAt: minutesAgo(1220), priority: 'Routine', location: 'OPD', status: 'Verified', resultValues: { result: 'Negative' }, resultStatus: 'Verified', notification: null, recollections: 0, verifiedAt: minutesAgo(1000), verifiedBy: 'Laboratory technician' },
      { id: 'LAB-261106-043', patientId: 'ASC-PAT-001526', encounterId: '', testId: 'TEST-CBC', orderedBy: 'Dr. K. Owusu', orderedAt: minutesAgo(28), priority: 'Routine', location: 'General ward', status: 'Collected', resultValues: {}, resultStatus: 'Not entered', notification: null, recollections: 0 },
    ],
    specimens: [
      { id: 'SP-041', orderId: 'LAB-261106-041', patientId: 'ASC-PAT-001284', type: 'EDTA whole blood', status: 'Ordered', collectedAt: '', receivedAt: '', rejectedAt: '', rejectionReason: '', collectionChecks: null, recollectionRequested: false },
      { id: 'SP-042', orderId: 'LAB-261106-042', patientId: 'ASC-PAT-001311', type: 'Serum', status: 'Received', collectedAt: minutesAgo(56), receivedAt: minutesAgo(42), rejectedAt: '', rejectionReason: '', collectionChecks: { name: true, patientId: true }, recollectionRequested: false },
      { id: 'SP-039', orderId: 'LAB-261106-039', patientId: 'ASC-PAT-001402', type: 'Fluoride plasma', status: 'Received', collectedAt: minutesAgo(113), receivedAt: minutesAgo(96), rejectedAt: '', rejectionReason: '', collectionChecks: { name: true, patientId: true }, recollectionRequested: false },
      { id: 'SP-037', orderId: 'LAB-261106-037', patientId: 'ASC-PAT-001609', type: 'EDTA whole blood', status: 'Received', collectedAt: minutesAgo(155), receivedAt: minutesAgo(141), rejectedAt: '', rejectionReason: '', collectionChecks: { name: true, patientId: true }, recollectionRequested: false },
      { id: 'SP-086', orderId: 'LAB-261105-086', patientId: 'ASC-PAT-001087', type: 'Whole blood', status: 'Received', collectedAt: minutesAgo(1190), receivedAt: minutesAgo(1170), rejectedAt: '', rejectionReason: '', collectionChecks: { name: true, patientId: true }, recollectionRequested: false },
      { id: 'SP-043', orderId: 'LAB-261106-043', patientId: 'ASC-PAT-001526', type: 'EDTA whole blood', status: 'Collected', collectedAt: minutesAgo(19), receivedAt: '', rejectedAt: '', rejectionReason: '', collectionChecks: { name: true, patientId: true }, recollectionRequested: false },
    ],
    stock: [
      { id: 'LST-001', name: 'EDTA collection tubes', category: 'Collection supplies', unit: 'tube', quantity: 46, reorderLevel: 20, lot: 'EDTA-26A', expiresAt: daysFromNow(300) },
      { id: 'LST-002', name: 'CBC reagent pack', category: 'Haematology reagent', unit: 'pack', quantity: 8, reorderLevel: 10, lot: 'CBC-R-118', expiresAt: daysFromNow(115) },
      { id: 'LST-003', name: 'Glucose reagent', category: 'Biochemistry reagent', unit: 'kit', quantity: 14, reorderLevel: 6, lot: 'GLU-R-404', expiresAt: daysFromNow(180) },
      { id: 'LST-004', name: 'Malaria RDT kits', category: 'Rapid test', unit: 'kit', quantity: 0, reorderLevel: 15, lot: 'MRDT-26B', expiresAt: daysFromNow(90) },
      { id: 'LST-005', name: 'Serum separator tubes', category: 'Collection supplies', unit: 'tube', quantity: 28, reorderLevel: 18, lot: 'SST-26C', expiresAt: daysFromNow(8) },
    ],
    movements: [
      { id: 'LMOV-001', stockId: 'LST-001', type: 'Receipt', quantity: 46, reference: 'Opening balance', reason: 'Opening stock', at: minutesAgo(42_000) },
      { id: 'LMOV-002', stockId: 'LST-002', type: 'Receipt', quantity: 8, reference: 'Opening balance', reason: 'Opening stock', at: minutesAgo(39_000) },
      { id: 'LMOV-003', stockId: 'LST-003', type: 'Receipt', quantity: 14, reference: 'Opening balance', reason: 'Opening stock', at: minutesAgo(38_000) },
      { id: 'LMOV-006', stockId: 'LST-004', type: 'Receipt', quantity: 20, reference: 'Opening balance', reason: 'Opening stock', at: minutesAgo(42_500) },
      { id: 'LMOV-004', stockId: 'LST-004', type: 'Issue', quantity: -20, reference: 'LAB-261105-086', reason: 'Opening consumption', at: minutesAgo(1220) },
      { id: 'LMOV-005', stockId: 'LST-005', type: 'Receipt', quantity: 28, reference: 'Opening balance', reason: 'Opening stock', at: minutesAgo(36_000) },
    ],
    recollectionTasks: [],
    activity: [
      { id: 'LACT-001', kind: 'Worklist', message: 'Priority chemistry specimen received and ready for processing', at: minutesAgo(42) },
      { id: 'LACT-002', kind: 'Critical', message: 'Critical haemoglobin result needs clinician notification', at: minutesAgo(92) },
      { id: 'LACT-003', kind: 'Stock', message: 'CBC reagent pack is below reorder level', at: minutesAgo(135) },
    ],
    notifications: [],
    acknowledgedCritical: [],
  },
}

export const LAB_TODAY = new Date().toISOString().slice(0, 10)
