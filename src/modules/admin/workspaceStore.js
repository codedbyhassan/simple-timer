import { createBrowserStore } from '../shared/browserStore.js'

const id = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const now = () => new Date().toISOString()

const seed = () => ({
  profile: {
    name: 'Ascend Demo Hospital',
    nhisProviderNo: '',
    region: 'Greater Accra',
    address: '',
    phone: '',
    email: '',
  },
  catalogue: [
    { id: 'svc-consult', category: 'Consultation', code: 'OPD-GP', name: 'General consultation', price: 50 },
    { id: 'svc-specialist', category: 'Consultation', code: 'OPD-SPEC', name: 'Specialist consultation', price: 120 },
    { id: 'svc-fbc', category: 'Laboratory', code: 'LAB-FBC', name: 'Full blood count', price: 45 },
    { id: 'svc-fbg', category: 'Laboratory', code: 'LAB-FBG', name: 'Fasting blood glucose', price: 25 },
    { id: 'svc-urine', category: 'Laboratory', code: 'LAB-URINALYSIS', name: 'Urinalysis', price: 20 },
    { id: 'svc-mal', category: 'Laboratory', code: 'LAB-MALARIA-RDT', name: 'Malaria RDT', price: 15 },
    { id: 'svc-bed', category: 'Ward', code: 'WARD-GEN', name: 'General ward bed (per day)', price: 150 },
    { id: 'svc-dress', category: 'Procedure', code: 'PROC-DRESS', name: 'Wound dressing', price: 40 },
  ],
  mappings: [
    { id: 'map-1', localCode: 'LAB-FBC', system: 'G-DRG', externalCode: 'INVE01C', note: '' },
    { id: 'map-2', localCode: 'OPD-GP', system: 'G-DRG', externalCode: 'OPDC06A', note: '' },
  ],
  thresholds: {
    triageWaitMinutes: 15,
    doctorWaitMinutes: 45,
    labTurnaroundMinutes: 120,
    pharmacyWaitMinutes: 20,
    insuranceExpiryWarningDays: 30,
    defaultReorderLevel: 5,
  },
  audit: [],
  tills: [],
  refunds: [],
  documents: [],
  nursingTasks: [],
  conflicts: [],
  backups: [],
})

const store = createBrowserStore({
  key: 'workspace',
  seed,
  validate: (v) => v && typeof v === 'object' && v.profile && Array.isArray(v.catalogue) && Array.isArray(v.audit),
})

export const getWorkspace = store.getSnapshot
export const subscribeWorkspace = store.subscribe

export function updateWorkspace(updater, auditEntry) {
  store.update((current) => {
    const next = updater(current)
    if (!auditEntry) return next
    return { ...next, audit: [{ id: id('AUD'), at: now(), ...auditEntry }, ...next.audit].slice(0, 500) }
  })
}

export function addRecord(listKey, record, auditEntry) {
  const full = { id: id(listKey.slice(0, 3).toUpperCase()), createdAt: now(), ...record }
  updateWorkspace((c) => ({ ...c, [listKey]: [full, ...c[listKey]] }), auditEntry)
  return full
}

export function patchRecord(listKey, recordId, changes, auditEntry) {
  updateWorkspace((c) => ({ ...c, [listKey]: c[listKey].map((r) => r.id === recordId ? { ...r, ...changes } : r) }), auditEntry)
}

export function removeRecord(listKey, recordId, auditEntry) {
  updateWorkspace((c) => ({ ...c, [listKey]: c[listKey].filter((r) => r.id !== recordId) }), auditEntry)
}

export function priceFor(catalogue, code, fallback = 0) {
  return catalogue.find((s) => s.code === code)?.price ?? fallback
}
