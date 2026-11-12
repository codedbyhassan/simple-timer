import { LAB_SEED } from '../lab/labData.js'

const timestamp = new Date().toISOString()

export const CLAIMS_SEED = {
  ...LAB_SEED,
  claims: {
    records: [
      {
        id: 'CLM-2611-1048', invoiceId: 'INV-1048', patientId: 'ASC-PAT-001284', encounterId: 'ENC-261106-01',
        month: new Date().toISOString().slice(0, 7), service: 'Consultation and laboratory', billed: 145, claimCost: 122,
        status: 'Ready', blockers: [], warnings: ['Confirm NHIS eligibility before submission.'],
        claimCheckCode: '', preauthorisationCode: '', physicianId: 'DR-OWUSU', diagnosisCode: 'R50.9',
        snapshotVersion: 1, updatedAt: timestamp, importResult: '',
      },
      {
        id: 'CLM-2611-1047', invoiceId: 'INV-1047', patientId: 'ASC-PAT-001311', encounterId: 'ENC-261106-05',
        month: new Date().toISOString().slice(0, 7), service: 'Paediatric consultation', billed: 60, claimCost: 48,
        status: 'Not ready', blockers: ['Encounter needs a coded diagnosis.'], warnings: [],
        claimCheckCode: '', preauthorisationCode: '', physicianId: '', diagnosisCode: '',
        snapshotVersion: 1, updatedAt: timestamp, importResult: '',
      },
      {
        id: 'CLM-2611-1046', invoiceId: 'INV-1046', patientId: 'ASC-PAT-001402', encounterId: 'ENC-261106-03',
        month: new Date().toISOString().slice(0, 7), service: 'Laboratory services', billed: 180, claimCost: 152,
        status: 'Exported', blockers: [], warnings: [], claimCheckCode: '', preauthorisationCode: '',
        physicianId: 'DR-QUARTEY', diagnosisCode: 'E11.9', snapshotVersion: 1, updatedAt: timestamp, importResult: '',
      },
      {
        id: 'CLM-2610-1035', invoiceId: 'INV-1035', patientId: 'ASC-PAT-001609', encounterId: 'ENC-261106-04',
        month: new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 7), service: 'Antenatal review', billed: 90, claimCost: 76,
        status: 'Failed', blockers: ['Encounter needs a coded diagnosis.'], warnings: ['Import feedback requires source review.'],
        claimCheckCode: '', preauthorisationCode: '', physicianId: 'DR-QUARTEY', diagnosisCode: '',
        snapshotVersion: 1, updatedAt: timestamp, importResult: 'Diagnosis code missing',
      },
    ],
    mappings: [
      { id: 'MAP-MED-002', kind: 'NHIA medicine tariff', source: 'Amoxicillin 500 mg', target: '', status: 'Unmapped', affectedClaims: 1 },
      { id: 'MAP-GDRG-001', kind: 'G-DRG', source: 'Outpatient general medicine', target: 'OPD-GEN-01', status: 'Mapped', affectedClaims: 2 },
      { id: 'MAP-DEPT-GEN', kind: 'Department specialty', source: 'General medicine', target: 'MEDI', status: 'Mapped', affectedClaims: 1 },
      { id: 'MAP-DEPT-PED', kind: 'Department specialty', source: 'Paediatrics', target: 'PAED', status: 'Mapped', affectedClaims: 1 },
      { id: 'MAP-DEPT-LAB', kind: 'Department specialty', source: 'Laboratory', target: 'MEDI', status: 'Mapped', affectedClaims: 1 },
      { id: 'MAP-DEPT-001', kind: 'Department specialty', source: 'Obstetrics and gynaecology', target: '', status: 'Unmapped', affectedClaims: 1 },
    ],
    batches: [],
    reports: [
      { id: 'IMP-001', fileName: 'claimit-feedback.csv', importedAt: timestamp, rows: [{ claimId: 'CLM-2610-1035', result: 'Failed', message: 'Diagnosis code missing' }] },
    ],
    activity: [{ id: 'CACT-001', message: 'Claim snapshot prepared for INV-1048.', at: timestamp }],
  },
}
