const today = new Date()
const localDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const TODAY = localDate(today)
export const TOMORROW = localDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1))

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString()

const RECEPTION_SEED_REFERENCE = {
  patients: [
    { id: 'ASC-PAT-001284', firstName: 'Ama Serwaa', lastName: 'Mensah', sex: 'Female', dateOfBirth: '1992-03-18', phone: '024 555 0184', address: 'Adabraka, Accra', coverage: 'NHIS', memberNumber: '1234567890', membershipType: 'Principal member', dependent: false, principalName: '', expiry: '2027-08-31', nextOfKin: 'Kofi Mensah · 024 555 0112', otherInsurance: '', createdAt: minutesAgo(180), lastVisit: '2026-11-03' },
    { id: 'ASC-PAT-001311', firstName: 'Kofi', lastName: 'Boateng', sex: 'Male', dateOfBirth: '2018-06-07', phone: '020 418 2201', address: 'Osu, Accra', coverage: 'NHIS', memberNumber: '2087654321', membershipType: 'Dependent', dependent: true, principalName: 'Efua Boateng', expiry: '2026-11-15', nextOfKin: 'Efua Boateng · 020 418 2201', otherInsurance: '', createdAt: minutesAgo(1520), lastVisit: '2026-10-28' },
    { id: 'ASC-PAT-001087', firstName: 'Yaw Owusu', lastName: 'Ansah', sex: 'Male', dateOfBirth: '1974-01-21', phone: '050 102 7800', address: 'Madina, Accra', coverage: 'Self-pay', memberNumber: '', membershipType: '', dependent: false, principalName: '', expiry: '', nextOfKin: 'Adwoa Ansah · 050 102 7810', otherInsurance: '', createdAt: minutesAgo(9200), lastVisit: '2026-10-19' },
    { id: 'ASC-PAT-001142', firstName: 'Akosua', lastName: 'Frimpong', sex: 'Female', dateOfBirth: '1999-09-11', phone: '027 333 1054', address: 'East Legon, Accra', coverage: 'NHIS', memberNumber: '', membershipType: 'Principal member', dependent: false, principalName: '', expiry: '', nextOfKin: 'Nana Frimpong · 027 333 1055', otherInsurance: '', createdAt: minutesAgo(42_000), lastVisit: '2026-11-01' },
    { id: 'ASC-PAT-001402', firstName: 'Esi', lastName: 'Addo', sex: 'Female', dateOfBirth: '1987-12-03', phone: '024 612 4008', address: 'Cantonments, Accra', coverage: 'NHIS', memberNumber: '9081726354', membershipType: 'Principal member', dependent: false, principalName: '', expiry: '2026-12-02', nextOfKin: 'Kojo Addo · 024 612 4009', otherInsurance: '', createdAt: minutesAgo(80_000), lastVisit: '2026-10-27' },
    { id: 'ASC-PAT-001526', firstName: 'Nana', lastName: 'Bediako', sex: 'Male', dateOfBirth: '1962-04-29', phone: '055 800 0217', address: 'Dansoman, Accra', coverage: 'Private insurance', memberNumber: '', membershipType: '', dependent: false, principalName: '', expiry: '', nextOfKin: 'Akua Bediako · 055 800 0218', otherInsurance: 'SIC Life', createdAt: minutesAgo(110_000), lastVisit: '2026-10-21' },
    { id: 'ASC-PAT-001609', firstName: 'Abena', lastName: 'Ofori', sex: 'Female', dateOfBirth: '2003-02-14', phone: '026 404 8802', address: 'Legon, Accra', coverage: 'NHIS', memberNumber: '8172635409', membershipType: 'Principal member', dependent: false, principalName: '', expiry: '2027-01-31', nextOfKin: 'Kwame Ofori · 026 404 8803', otherInsurance: '', createdAt: minutesAgo(140_000), lastVisit: '2026-10-14' },
    { id: 'ASC-PAT-001728', firstName: 'Kojo', lastName: 'Asante', sex: 'Male', dateOfBirth: '1981-08-06', phone: '', address: 'Kaneshie, Accra', coverage: 'Self-pay', memberNumber: '', membershipType: '', dependent: false, principalName: '', expiry: '', nextOfKin: '', otherInsurance: '', createdAt: minutesAgo(190_000), lastVisit: '' },
  ],
  appointments: [
    { id: 'APT-261106-01', patientId: 'ASC-PAT-001284', date: TODAY, time: '08:30', department: 'General medicine', provider: 'Dr. K. Owusu', reason: 'Follow-up consultation', status: 'Arrived' },
    { id: 'APT-261106-02', patientId: 'ASC-PAT-001311', date: TODAY, time: '09:00', department: 'Paediatrics', provider: 'Dr. E. Asare', reason: 'Routine review', status: 'Expected' },
    { id: 'APT-261106-03', patientId: 'ASC-PAT-001402', date: TODAY, time: '09:15', department: 'Laboratory', provider: 'Esi Addo', reason: 'Review test results', status: 'Expected' },
    { id: 'APT-261106-04', patientId: 'ASC-PAT-001526', date: TODAY, time: '09:30', department: 'General medicine', provider: 'Dr. K. Owusu', reason: 'Blood pressure review', status: 'Expected' },
    { id: 'APT-261106-05', patientId: 'ASC-PAT-001609', date: TODAY, time: '10:00', department: 'Obstetrics and gynaecology', provider: 'Dr. A. Quartey', reason: 'Antenatal review', status: 'Expected' },
    { id: 'APT-261106-06', patientId: 'ASC-PAT-001087', date: TODAY, time: '08:00', department: 'Dental', provider: 'Dr. Y. Adjei', reason: 'Dental consultation', status: 'No-show' },
    { id: 'APT-261107-01', patientId: 'ASC-PAT-001284', date: TOMORROW, time: '11:00', department: 'General medicine', provider: 'Dr. K. Owusu', reason: 'Follow-up consultation', status: 'Expected' },
  ],
  queue: [
    { id: 'ENC-261106-01', patientId: 'ASC-PAT-001284', department: 'General medicine', reason: 'Follow-up consultation', stage: 'Waiting for triage', arrivedAt: minutesAgo(28), priority: 'Routine', appointmentId: 'APT-261106-01' },
    { id: 'ENC-261106-02', patientId: 'ASC-PAT-001087', department: 'Dental', reason: 'Walk-in consultation', stage: 'Waiting for clinician', arrivedAt: minutesAgo(21), priority: 'Routine', appointmentId: '' },
    { id: 'ENC-261106-03', patientId: 'ASC-PAT-001402', department: 'Laboratory', reason: 'Review test results', stage: 'Investigations', arrivedAt: minutesAgo(46), priority: 'Routine', appointmentId: 'APT-261106-03' },
    { id: 'ENC-261106-04', patientId: 'ASC-PAT-001609', department: 'Obstetrics and gynaecology', reason: 'Antenatal review', stage: 'In consultation', arrivedAt: minutesAgo(58), priority: 'Priority', appointmentId: 'APT-261106-05' },
    { id: 'ENC-261106-05', patientId: 'ASC-PAT-001311', department: 'Paediatrics', reason: 'Fever review', stage: 'Waiting for triage', arrivedAt: minutesAgo(12), priority: 'Routine', appointmentId: '' },
  ],
  payments: [
    { id: 'INV-1048', patientId: 'ASC-PAT-001284', date: TODAY, description: 'Consultation and laboratory', billed: 145, paid: 85, method: 'Mobile money', status: 'Part-paid' },
    { id: 'INV-1047', patientId: 'ASC-PAT-001311', date: TODAY, description: 'Paediatric consultation', billed: 60, paid: 0, method: '—', status: 'Unpaid' },
    { id: 'INV-1046', patientId: 'ASC-PAT-001402', date: TODAY, description: 'Laboratory services', billed: 180, paid: 180, method: 'NHIS', status: 'Settled' },
    { id: 'INV-1041', patientId: 'ASC-PAT-001087', date: '2026-11-03', description: 'Dental consultation', billed: 95, paid: 50, method: 'Cash', status: 'Part-paid' },
    { id: 'INV-1039', patientId: 'ASC-PAT-001526', date: '2026-11-02', description: 'Consultation', billed: 60, paid: 60, method: 'Card', status: 'Settled' },
    { id: 'INV-1035', patientId: 'ASC-PAT-001609', date: '2026-10-31', description: 'Antenatal review', billed: 90, paid: 0, method: '—', status: 'Unpaid' },
  ],
  documents: [
    { id: 'DOC-1001', patientId: 'ASC-PAT-001284', name: 'NHIS membership card', category: 'ID and NHIS cards', fileName: 'nhis-card.pdf', type: 'application/pdf', size: 482_000, addedAt: '2026-11-03', stored: false },
    { id: 'DOC-1002', patientId: 'ASC-PAT-001284', name: 'Referral letter', category: 'Referrals', fileName: 'referral-letter.pdf', type: 'application/pdf', size: 215_000, addedAt: '2026-11-03', stored: false },
    { id: 'DOC-1003', patientId: 'ASC-PAT-001311', name: 'Birth record', category: 'ID and NHIS cards', fileName: 'birth-record.jpg', type: 'image/jpeg', size: 920_000, addedAt: '2026-10-28', stored: false },
    { id: 'DOC-1004', patientId: 'ASC-PAT-001402', name: 'Laboratory report', category: 'Lab reports', fileName: 'lab-report.pdf', type: 'application/pdf', size: 384_000, addedAt: '2026-10-27', stored: false },
    { id: 'DOC-1005', patientId: 'ASC-PAT-001526', name: 'Insurance membership', category: 'ID and NHIS cards', fileName: 'insurance-card.jpg', type: 'image/jpeg', size: 612_000, addedAt: '2026-10-21', stored: false },
  ],
}

export const RECEPTION_SEED = {
  patients: [], appointments: [], queue: [], payments: [], documents: [],
}

export const DOCUMENT_CATEGORIES = ['Referrals', 'ID and NHIS cards', 'Lab reports', 'Imaging', 'Consent forms', 'Other']
export const DEPARTMENTS = ['General medicine', 'Paediatrics', 'Obstetrics and gynaecology', 'Dental', 'Laboratory', 'Imaging']
