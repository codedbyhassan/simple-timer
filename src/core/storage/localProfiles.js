import { appendAuditEvent, readDocument, updateDocument } from './localDatabase.js'

export const LOCAL_PROFILES_KEY = 'local.profiles'
export const LOCAL_SESSION_KEY = 'local.session'

export const PROFILE_ROLES = [
  { role: 'hospital_admin', name: 'Hospital administrator', department: 'Administration' },
  { role: 'receptionist', name: 'Receptionist', department: 'Front desk' },
  { role: 'records_officer', name: 'Records officer', department: 'Medical records' },
  { role: 'triage_nurse', name: 'Triage nurse', department: 'Nursing' },
  { role: 'ward_nurse', name: 'Ward nurse', department: 'Nursing' },
  { role: 'doctor', name: 'Doctor', department: 'Clinical services' },
  { role: 'lab_technician', name: 'Laboratory technician', department: 'Laboratory' },
  { role: 'pharmacist', name: 'Pharmacist', department: 'Pharmacy' },
  { role: 'pharmacy_assistant', name: 'Pharmacy assistant', department: 'Pharmacy' },
  { role: 'store_keeper', name: 'Store keeper', department: 'Stores' },
  { role: 'bed_manager', name: 'Bed manager', department: 'Facilities' },
  { role: 'cashier', name: 'Cashier', department: 'Finance' },
  { role: 'finance_officer', name: 'Finance officer', department: 'Finance' },
  { role: 'claims_officer', name: 'Claims officer', department: 'Claims' },
  { role: 'management_viewer', name: 'Management viewer', department: 'Management' },
]

const makeId = () => `local-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`

export async function getProfiles() {
  const profiles = await readDocument(LOCAL_PROFILES_KEY)
  if (Array.isArray(profiles)) return profiles
  const initial = PROFILE_ROLES.map((item) => ({ id: makeId(), ...item, displayName: item.name, active: true, kind: 'local-profile' }))
  await updateDocument(LOCAL_PROFILES_KEY, (current) => Array.isArray(current) ? current : initial, initial)
  return (await readDocument(LOCAL_PROFILES_KEY)) || initial
}

export async function getCurrentProfile() {
  const session = await readDocument(LOCAL_SESSION_KEY)
  if (!session?.profileId) return null
  const profiles = await getProfiles()
  const profile = profiles.find((item) => item.id === session.profileId && item.active)
  return profile ? { ...profile, id: profile.id } : null
}

export async function selectProfile(profileId) {
  const profiles = await getProfiles()
  const profile = profiles.find((item) => item.id === profileId && item.active)
  if (!profile) throw new Error('That local profile is unavailable or inactive.')
  await updateDocument(LOCAL_SESSION_KEY, () => ({ profileId: profile.id, selectedAt: new Date().toISOString() }), null)
  return profile
}

export async function signOutLocal() {
  await updateDocument(LOCAL_SESSION_KEY, () => null, null)
}

export async function saveProfiles(profiles) {
  if (!Array.isArray(profiles)) throw new Error('Profiles must be a list.')
  await updateDocument(LOCAL_PROFILES_KEY, () => profiles, [])
  try { await appendAuditEvent({ action: 'Saved local staff profiles', resource: `${profiles.length} profiles`, category: 'Access' }) } catch { /* Profile data is already saved. */ }
}
