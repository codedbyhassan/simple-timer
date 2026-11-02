import { createBrowserStore } from '../shared/browserStore.js'

const providers = ['NHIS', 'Acacia Health Insurance', 'GLICO Healthcare', 'Allianz Care', 'Nationwide Medical']
const firstNames = ['Ama', 'Kofi', 'Esi', 'Yaw', 'Akosua', 'Kojo', 'Abena', 'Kwame', 'Adwoa', 'Nana', 'Efua', 'Kwabena']
const lastNames = ['Mensah', 'Owusu', 'Boateng', 'Asare', 'Darko', 'Arthur', 'Ofori', 'Addo', 'Amoah', 'Appiah']

function dateOffset(days) {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function makePatient(index, details = {}) {
  const firstName = firstNames[index % firstNames.length]
  const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length]
  const coveragePattern = index % 9
  const uninsured = coveragePattern === 0
  const nearExpiry = coveragePattern === 1
  const provider = uninsured ? '' : providers[index % providers.length]
  const expiry = uninsured ? '' : dateOffset(nearExpiry ? 4 + (index % 25) : 90 + (index % 540))
  const year = 1950 + ((index * 7) % 58)

  return {
    id: `HMS-${10482 + index}`,
    name: `${firstName} ${lastName}`,
    dob: `${year}-${String(1 + (index % 12)).padStart(2, '0')}-${String(1 + ((index * 3) % 27)).padStart(2, '0')}`,
    sex: index % 2 === 0 ? 'Female' : 'Male',
    phone: `+233 20 100 ${String(index).padStart(4, '0')}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.test`,
    registered: dateOffset(-((index % 90) + 1)),
    insuranceProvider: provider,
    insuranceMemberId: provider ? `ASC-${String(700000 + index)}` : '',
    isDependant: '',
    insuranceExpires: expiry,
    ...details,
  }
}

function createDemoPatients() {
  const patients = Array.from({ length: 120 }, (_, index) => makePatient(index))
  patients[0] = {
    ...patients[0],
    name: 'Ama Mensah',
    dob: '1989-04-12',
    phone: '+233 20 000 1048',
    email: 'ama.mensah@example.test',
    insuranceProvider: 'NHIS',
    insuranceMemberId: 'NHIS-10482',
    isDependant: '',
    insuranceExpires: dateOffset(220),
  }
  patients[1] = {
    ...patients[1],
    name: 'Kofi Owusu',
    dob: '1976-11-03',
    phone: '+233 24 000 1048',
    insuranceProvider: '',
    insuranceMemberId: '',
    insuranceExpires: '',
  }
  patients[2] = {
    ...patients[2],
    name: 'Esi Boateng',
    dob: '2012-07-26',
    phone: '+233 55 000 1048',
    insuranceProvider: 'GLICO Healthcare',
    insuranceMemberId: 'GLICO-10485',
    insuranceExpires: dateOffset(14),
  }
  patients[3] = {
    ...patients[3],
    name: 'Yaw Asare',
    dob: '1968-01-19',
    phone: '+233 27 000 1048',
    email: 'yaw.asare@example.test',
    insuranceProvider: 'Acacia Health Insurance',
    insuranceMemberId: 'ACACIA-10486',
    insuranceExpires: dateOffset(180),
  }
  patients[4] = {
    ...patients[4],
    name: 'Akosua Darko',
    dob: '1994-09-08',
    phone: '+233 26 000 1047',
    insuranceProvider: '',
    insuranceMemberId: '',
    insuranceExpires: '',
  }
  return patients
}

const patientStore = createBrowserStore({
  key: 'patients',
  seed: createDemoPatients,
  validate: (value) => Array.isArray(value) && value.every((patient) =>
    patient && typeof patient.id === 'string' && typeof patient.name === 'string',
  ),
})

export function getDemoPatients() {
  return patientStore.getSnapshot()
}

export function setDemoPatients(updater) {
  patientStore.update(updater)
}

export function subscribeToDemoPatients(listener) {
  return patientStore.subscribe(listener)
}

export function getPatientInsuranceStatus(patient) {
  if (!patient.insuranceProvider || !patient.insuranceExpires) return 'Non-insured'
  const expiry = new Date(`${patient.insuranceExpires}T00:00:00Z`)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000)
  if (daysUntilExpiry < 0) return 'Non-insured'
  if (daysUntilExpiry <= 30) return 'Near expiry'
  return 'Insured'
}

export { providers }
