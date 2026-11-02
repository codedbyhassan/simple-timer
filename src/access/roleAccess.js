import { createContext, useContext } from 'react'
import {
  Activity,
  BedDouble,
  Bell,
  CalendarDays,
  CheckCheck,
  ChartNoAxesColumn,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileText,
  FlaskConical,
  HeartPulse,
  KeyRound,
  LayoutDashboard,
  Pill,
  ReceiptText,
  Settings,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'

const item = (id, label, permission, page, icon = ClipboardList) => ({
  id,
  label,
  permission,
  page,
  icon,
  path: `/${id}`,
})

const group = (label, items) => ({ label, items })

export const roleDefinitions = [
  {
    id: 'reception',
    name: 'Reception',
    description: 'Receptionist + Records officer',
    homePage: 'reception-desk',
    groups: [
      group('Reception', [
        item('reception-desk', 'Reception desk', 'reception.dashboard.view', 'front-desk', LayoutDashboard),
        item('appointments', 'Appointments', 'appointments.manage', 'front-desk', CalendarDays),
        item('patients', 'Patients', 'patients.directory', 'patients', Users),
        item('documents', 'Documents', 'documents.manage', 'workspace'),
        item('opd-queue', 'OPD queue', 'opd.queue.manage', 'front-desk', ClipboardCheck),
        item('claim-data-gaps', 'Claim data gaps', 'claims.gaps.view', 'workspace', FileCheck2),
        item('payment-status', 'Payment status', 'payments.status.view', 'finance', Wallet),
      ]),
    ],
  },
  {
    id: 'nurse',
    name: 'Nurse',
    description: 'Triage nurse + Ward nurse',
    homePage: 'triage-queue',
    groups: [
      group('Nursing', [
        item('triage-queue', 'Triage queue', 'nursing.triage', 'nursing', HeartPulse),
        item('ward-bed-board', 'Ward & bed board', 'ward.view', 'inpatient', BedDouble),
        item('nursing-tasks', 'Nursing tasks', 'nursing.tasks', 'workspace', ClipboardList),
        item('admission-requests', 'Admission requests', 'admission.request', 'inpatient', FileText),
        item('discharge-checklist', 'Discharge checklist', 'discharge.checklist', 'inpatient', CheckCheck),
        item('nurse-opd-queue', 'OPD queue', 'opd.queue.view', 'front-desk', ClipboardCheck),
      ]),
    ],
  },
  {
    id: 'doctor',
    name: 'Doctor / Consulting',
    description: 'Consulting clinician',
    homePage: 'doctor-queue',
    groups: [
      group('Doctor workspace', [
        item('doctor-queue', 'My queue', 'clinical.queue.view', 'clinical', LayoutDashboard),
        item('consultation', 'Consultation', 'clinical.consult', 'clinical', Stethoscope),
        item('results-inbox', 'Results inbox', 'clinical.results.review', 'clinical', FlaskConical),
        item('my-admissions', 'My admissions', 'clinical.admissions.view', 'inpatient', BedDouble),
        item('doctor-opd-queue', 'OPD queue', 'opd.queue.view', 'front-desk', ClipboardCheck),
      ]),
    ],
  },
  {
    id: 'lab',
    name: 'Lab',
    description: 'Laboratory technician',
    homePage: 'lab-worklist',
    groups: [
      group('Laboratory', [
        item('lab-worklist', 'Worklist', 'lab.worklist.view', 'laboratory', LayoutDashboard),
        item('specimens', 'Specimens', 'lab.specimens.manage', 'laboratory', FlaskConical),
        item('lab-results', 'Result entry & verification', 'lab.results.enter', 'laboratory', FileCheck2),
        item('critical-results', 'Critical results', 'lab.critical.view', 'laboratory', ShieldAlert),
        item('test-catalogue', 'Test catalogue', 'lab.catalogue.manage', 'laboratory', ClipboardList),
        item('lab-inventory', 'Inventory', 'inventory.read', 'laboratory', ReceiptText),
      ]),
    ],
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    description: 'Pharmacist + Pharmacy assistant',
    homePage: 'pharmacy-queue',
    groups: [
      group('Pharmacy', [
        item('pharmacy-queue', 'Prescription queue', 'pharmacy.queue.view', 'pharmacy', LayoutDashboard),
        item('dispensing-panel', 'Dispensing panel', 'pharmacy.queue.view', 'pharmacy', Pill),
        item('stock-alerts', 'Stock alerts', 'inventory.read', 'pharmacy', Bell),
        item('stock-levels', 'Stock levels', 'inventory.read', 'pharmacy', ReceiptText),
        item('formulary-mapping', 'Formulary mapping flags', 'pharmacy.mapping.view', 'pharmacy', FileCheck2),
        item('pharmacy-inventory', 'Inventory', 'inventory.read', 'pharmacy', ClipboardList),
      ]),
    ],
  },
  {
    id: 'cashier',
    name: 'Cashier / Accountant',
    description: 'Cashier + Finance officer',
    homePage: 'pending-charges',
    groups: [
      group('Cashier desk', [
        item('pending-charges', 'Pending charges', 'cashier.charges.view', 'finance', Wallet),
        item('payments-receipts', 'Payment panel & receipts', 'cashier.charges.view', 'finance', ReceiptText),
        item('till-shift', 'My till & shift', 'cashier.shift.view', 'workspace', ClipboardList),
        item('refunds', 'Refunds', 'cashier.refund.request', 'workspace', ReceiptText),
        item('shift-reconciliation', 'Shift reconciliation', 'cashier.reconcile', 'workspace', ChartNoAxesColumn),
        item('price-list', 'Price list', 'prices.view', 'workspace', FileText),
        item('billed-vs-claimed', 'Billed vs claimed', 'claims.summary.view', 'finance', FileCheck2),
      ]),
    ],
  },
  {
    id: 'claims',
    name: 'Claims Officer',
    description: 'Claims preparation and validation',
    homePage: 'claims-pipeline',
    groups: [
      group('Claims office', [
        item('claims-pipeline', 'Pipeline', 'claims.pipeline.view', 'claims', LayoutDashboard),
        item('claims-list', 'Claims list & detail', 'claims.view', 'claims', FileCheck2),
        item('claims-mapping', 'Mapping queue', 'claims.mapping.manage', 'claims', ClipboardList),
        item('export-batches', 'Export batches', 'claims.export', 'claims', FileText),
        item('import-reports', 'Import reports', 'claims.import.view', 'claims', ReceiptText),
        item('month-progress', 'Month progress', 'claims.progress.view', 'claims', ChartNoAxesColumn),
      ]),
    ],
  },
  {
    id: 'hospital-admin',
    name: 'Hospital Administrator',
    description: 'Management + Store keeper + Bed manager',
    homePage: 'management-dashboard',
    groups: [
      group('Management', [
        item('management-dashboard', 'Management dashboard', 'admin.dashboard.view', 'management', LayoutDashboard),
        item('hospital-profile', 'Hospital profile', 'admin.settings.manage', 'workspace', UserRound),
        item('departments-wards', 'Departments, wards, beds', 'admin.facilities.manage', 'inpatient', BedDouble),
        item('users-permissions', 'Users, roles, permissions', 'admin.permissions.manage', 'permissions', KeyRound),
        item('service-catalogue', 'Service catalogue & prices', 'admin.catalogue.manage', 'workspace', FileText),
        item('reference-mappings', 'Reference mappings', 'admin.mappings.manage', 'workspace', FileCheck2),
        item('thresholds-settings', 'Thresholds & settings', 'admin.settings.manage', 'workspace', Settings),
      ]),
      group('Administration', [
        item('reports', 'Reports', 'admin.dashboard.view', 'reports', ChartNoAxesColumn),
        item('inventory-console', 'Inventory console', 'inventory.manage', 'pharmacy', ReceiptText),
        item('audit-viewer', 'Audit viewer', 'admin.audit.view', 'workspace', ClipboardList),
        item('break-glass-review', 'Break-glass review', 'admin.breakglass.review', 'workspace', ShieldAlert),
        item('sync-conflicts', 'Sync conflicts', 'admin.sync.review', 'workspace', Activity),
        item('realtime-sla', 'Realtime SLA monitor', 'admin.monitor.view', 'workspace', Activity),
        item('backup-status', 'Backup status', 'admin.backup.view', 'workspace', FileCheck2),
      ]),
    ],
  },
]

export const permissionCatalog = [
  { id: 'reception.dashboard.view', label: 'View reception desk' },
  { id: 'appointments.manage', label: 'Manage appointments' },
  { id: 'patients.directory', label: 'View patient directory' },
  { id: 'patients.create', label: 'Register patients' },
  { id: 'patients.update', label: 'Edit patient demographics' },
  { id: 'patient360.read', label: 'Open Patient 360' },
  { id: 'documents.manage', label: 'Manage patient documents' },
  { id: 'messages.draft', label: 'Draft patient messages' },
  { id: 'opd.queue.manage', label: 'Check in and manage OPD queue' },
  { id: 'opd.queue.view', label: 'View OPD queue' },
  { id: 'claims.gaps.view', label: 'View claim data gaps' },
  { id: 'payments.status.view', label: 'View payment status' },
  { id: 'nursing.triage', label: 'Perform triage and record vitals' },
  { id: 'ward.view', label: 'View ward and bed board' },
  { id: 'nursing.tasks', label: 'Manage nursing tasks' },
  { id: 'admission.request', label: 'Request admissions' },
  { id: 'discharge.checklist', label: 'Complete discharge checklist' },
  { id: 'clinical.queue.view', label: 'View clinician queue' },
  { id: 'clinical.consult', label: 'Document consultations and orders' },
  { id: 'clinical.results.review', label: 'Review clinical results' },
  { id: 'clinical.admissions.view', label: 'View clinician admissions' },
  { id: 'lab.worklist.view', label: 'View laboratory worklist' },
  { id: 'lab.specimens.manage', label: 'Manage specimens' },
  { id: 'lab.results.enter', label: 'Enter laboratory results' },
  { id: 'lab.results.verify', label: 'Enter and verify results' },
  { id: 'lab.critical.view', label: 'View critical results' },
  { id: 'lab.catalogue.manage', label: 'Manage test catalogue' },
  { id: 'inventory.read', label: 'View inventory and stock alerts' },
  { id: 'pharmacy.queue.view', label: 'View prescription queue' },
  { id: 'pharmacy.dispense', label: 'Dispense prescriptions' },
  { id: 'pharmacy.verify', label: 'Verify prescriptions' },
  { id: 'pharmacy.mapping.view', label: 'View formulary mapping flags' },
  { id: 'cashier.charges.view', label: 'View pending charges' },
  { id: 'cashier.payment.record', label: 'Record payments and receipts' },
  { id: 'cashier.shift.view', label: 'View own till and shift' },
  { id: 'cashier.refund.request', label: 'Request refunds' },
  { id: 'cashier.refund.approve', label: 'Approve refunds' },
  { id: 'cashier.reconcile', label: 'Reconcile shifts' },
  { id: 'prices.view', label: 'View price list' },
  { id: 'prices.manage', label: 'Manage prices' },
  { id: 'claims.summary.view', label: 'View billed versus claimed' },
  { id: 'claims.pipeline.view', label: 'View claims pipeline' },
  { id: 'claims.view', label: 'View and validate claims' },
  { id: 'claims.generate', label: 'Generate claims preview' },
  { id: 'claims.mapping.manage', label: 'Manage claims mappings' },
  { id: 'claims.export', label: 'Export claims' },
  { id: 'claims.import.view', label: 'View import reports' },
  { id: 'claims.progress.view', label: 'View monthly claims progress' },
  { id: 'admin.dashboard.view', label: 'View management dashboard' },
  { id: 'admin.settings.manage', label: 'Manage hospital settings' },
  { id: 'admin.facilities.manage', label: 'Manage departments, wards, and beds' },
  { id: 'admin.permissions.manage', label: 'Manage role permission seeds' },
  { id: 'admin.catalogue.manage', label: 'Manage service catalogue and prices' },
  { id: 'admin.mappings.manage', label: 'Manage reference mappings' },
  { id: 'inventory.manage', label: 'Receive and adjust inventory' },
  { id: 'admin.audit.view', label: 'View audit records' },
  { id: 'admin.breakglass.review', label: 'Review break-glass activity' },
  { id: 'admin.sync.review', label: 'Review sync conflicts' },
  { id: 'admin.monitor.view', label: 'View realtime SLA monitor' },
  { id: 'admin.backup.view', label: 'View backup status' },
]

export const defaultRolePermissions = {
  reception: [
    'reception.dashboard.view', 'appointments.manage', 'patients.directory', 'patients.create', 'patients.update',
    'patient360.read', 'documents.manage', 'messages.draft', 'opd.queue.manage', 'claims.gaps.view', 'payments.status.view',
  ],
  nurse: [
    'patient360.read', 'nursing.triage', 'ward.view', 'nursing.tasks', 'admission.request', 'discharge.checklist',
    'opd.queue.view',
  ],
  doctor: [
    'patient360.read', 'clinical.queue.view', 'clinical.consult', 'clinical.results.review',
    'clinical.admissions.view', 'opd.queue.view',
  ],
  lab: [
    'patient360.read', 'lab.worklist.view', 'lab.specimens.manage', 'lab.results.enter', 'lab.results.verify', 'lab.critical.view',
    'inventory.read',
  ],
  pharmacy: [
    'patient360.read', 'pharmacy.queue.view', 'pharmacy.dispense', 'pharmacy.verify', 'pharmacy.mapping.view',
    'inventory.read',
  ],
  cashier: [
    'patient360.read', 'cashier.charges.view', 'cashier.payment.record', 'cashier.shift.view',
    'cashier.refund.request', 'cashier.reconcile', 'prices.view', 'claims.summary.view',
  ],
  claims: [
    'patient360.read', 'claims.pipeline.view', 'claims.view', 'claims.generate', 'claims.mapping.manage',
    'claims.export', 'claims.import.view', 'claims.progress.view',
  ],
  'hospital-admin': [
    'admin.dashboard.view', 'admin.settings.manage', 'admin.facilities.manage', 'admin.permissions.manage',
    'admin.catalogue.manage', 'admin.mappings.manage', 'inventory.read', 'inventory.manage', 'ward.view',
    'admin.audit.view', 'admin.breakglass.review', 'admin.sync.review', 'admin.monitor.view', 'admin.backup.view',
    'cashier.refund.approve',
    'patient360.read',
  ],
}

export const roleAccessContext = createContext(null)

export function useRoleAccess() {
  const context = useContext(roleAccessContext)
  if (!context) throw new Error('Role access context is required for this page.')
  return context
}

export function mergePermissions(roleIds, roleGrants) {
  return new Set(roleIds.flatMap((roleId) => roleGrants[roleId] || []))
}

export function getVisibleNavigation(roleIds, permissions) {
  return roleDefinitions.flatMap((role) => roleIds.includes(role.id)
    ? role.groups.map((section) => ({
      label: section.label,
      items: section.items.filter((entry) => permissions.has(entry.permission)),
    })).filter((section) => section.items.length > 0)
    : [])
}

export function getHomePage(roleIds, roleGrants) {
  const roles = roleDefinitions
    .filter((role) => roleIds.includes(role.id))
    .sort((left, right) => (roleGrants[right.id]?.length || 0) - (roleGrants[left.id]?.length || 0)
      || roleDefinitions.indexOf(right) - roleDefinitions.indexOf(left))
  return roles[0]?.homePage || 'management-dashboard'
}

export function getRoleNames(roleIds) {
  return roleDefinitions.filter((role) => roleIds.includes(role.id)).map((role) => role.name)
}

export function getPageRoute(page) {
  if (page === 'patient-detail') return window.location.pathname
  const items = roleDefinitions.flatMap((role) => role.groups.flatMap((section) => section.items))
  return items.find((entry) => entry.id === page)?.path || '/'
}

export function getPageFromPath(pathname) {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (/^\/patients\/[^/]+$/.test(normalizedPath)) return 'patient-detail'
  const legacyPaths = {
    '/front-desk': 'opd-queue',
    '/nursing': 'triage-queue',
    '/clinical': 'consultation',
    '/laboratory': 'lab-worklist',
    '/pharmacy': 'pharmacy-queue',
    '/claims': 'claims-pipeline',
    '/inpatient': 'ward-bed-board',
    '/finance': 'pending-charges',
    '/reports': 'reports',
    '/settings': 'thresholds-settings',
  }
  if (legacyPaths[normalizedPath]) return legacyPaths[normalizedPath]
  if (normalizedPath === '/') return 'home'
  const items = roleDefinitions.flatMap((role) => role.groups.flatMap((section) => section.items))
  return items.find((entry) => entry.path === normalizedPath)?.id || 'not-found'
}
