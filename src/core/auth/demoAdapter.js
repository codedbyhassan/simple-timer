// DEVELOPMENT ONLY. Used when no Supabase settings exist and the app runs under `npm run dev`.
// This file is never reachable from a production build (see authService.js).
import { AuthFailure } from './errors.js'

const KEY = 'hms.demo.session'
const DEMO_EMAIL = 'demo@ascend.test'
const DEMO_PASSWORD = 'Ascend#2026'
const listeners = new Set()
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null } }
const emit = (event, session) => listeners.forEach((fn) => fn(event, session))
let recovery = false

// Demo roles use the real permission codes from the database blueprint (section 5). Development only.
const READ = ['patients.search', 'patients.view']
const DEMO_ROLES = {
  receptionist: [...READ, 'patients.create', 'patients.update', 'appointments.view', 'appointments.manage', 'encounters.open', 'finance.view'],
  triage_nurse: [...READ, 'encounters.open', 'nursing.triage', 'nursing.observe'],
  ward_nurse: [...READ, 'nursing.observe'],
  doctor: [...READ, 'clinical.consult', 'clinical.finalize', 'clinical.order', 'clinical.prescribe', 'clinical.refer', 'lab.view', 'pharmacy.view'],
  lab_technician: [...READ, 'lab.view', 'lab.collect', 'lab.process', 'lab.verify', 'lab.manage_catalogue', 'inventory.view', 'inventory.receive', 'inventory.adjust'],
  pharmacist: [...READ, 'pharmacy.view', 'pharmacy.verify', 'pharmacy.dispense', 'pharmacy.manage_formulary', 'inventory.view', 'inventory.receive', 'inventory.adjust'],
  pharmacy_assistant: [...READ, 'pharmacy.view', 'inventory.view'],
  cashier: [...READ, 'finance.view', 'finance.collect', 'finance.refund', 'finance.reconcile'],
  finance_officer: [...READ, 'finance.view', 'finance.collect', 'finance.refund', 'finance.reconcile'],
  claims_officer: [...READ, 'claims.view', 'claims.build', 'claims.enter_ccc', 'claims.export', 'claims.import_report', 'claims.manage_mappings', 'finance.view'],
  hospital_admin: ['admin.manage_users', 'admin.manage_config', 'admin.manage_catalogue', 'audit.view', 'audit.review_break_glass', 'system.view_sla', 'reports.view', 'reports.export', 'finance.manage_prices', 'finance.approve_refund', 'claims.manage_mappings', 'inventory.view', 'inventory.approve_adjustment'],
  management_viewer: ['reports.view', 'reports.export'],
}
// Visit any page with ?as=doctor (or another role code) to switch the demo role.
// Join roles with + to test a person who holds more than one, for example ?as=doctor+lab_technician.
// A literal + in a URL query is read as a space, so both are accepted.
const asParam = (new URLSearchParams(window.location.search).get('as') || '').trim().replace(/ /g, '+')
if (asParam && asParam.split('+').every((r) => DEMO_ROLES[r])) localStorage.setItem('hms.demo.role', asParam)

console.info(`[Ascend HMS] Demo auth is active (no Supabase settings found). Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}.`)

export const demoAuth = {
  async getSession() { return read() },
  onAuthChange(fn) { listeners.add(fn); return () => listeners.delete(fn) },
  async signIn(email, password) {
    await wait(700)
    const e = email.trim().toLowerCase()
    if (e === 'offline@ascend.test') throw new AuthFailure('network')
    if (e === 'limited@ascend.test') throw new AuthFailure('rate_limited')
    if (e === 'disabled@ascend.test') throw new AuthFailure('disabled')
    if (e !== DEMO_EMAIL || password !== DEMO_PASSWORD) throw new AuthFailure('invalid_credentials')
    const session = { user: { id: 'demo-user', email: DEMO_EMAIL } }
    localStorage.setItem(KEY, JSON.stringify(session))
    emit('SIGNED_IN', session)
    return session.user
  },
  async signOut() {
    recovery = false
    localStorage.removeItem(KEY)
    emit('SIGNED_OUT', null)
  },
  async requestPasswordReset(email) {
    await wait(700)
    if (email.trim().toLowerCase() === 'limited@ascend.test') throw new AuthFailure('rate_limited')
  },
  async updatePassword(password) {
    await wait(700)
    if (password === DEMO_PASSWORD) throw new AuthFailure('same_password')
    recovery = false
  },
  async getAccess() {
    await wait(250)
    const roles = (localStorage.getItem('hms.demo.role') || 'hospital_admin').split('+').filter((r) => DEMO_ROLES[r])
    const label = roles[0].replace(/_/g, ' ')
    const permissions = [...new Set(roles.flatMap((r) => DEMO_ROLES[r]))]
    return { displayName: label, roles, permissions, department: '' }
  },
  isRecovery: () => recovery,
  // Visit /reset-password?demo=expired to see the expired-link screen.
  initialLinkError: () => (new URLSearchParams(window.location.search).get('demo') === 'expired' ? 'otp_expired' : null),
  async waitForRecovery() {
    await wait(500)
    if (demoAuth.initialLinkError()) return false
    recovery = true
    return true
  },
}
