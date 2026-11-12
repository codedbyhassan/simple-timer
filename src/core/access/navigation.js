// The eight role workspaces and their menus (owner brief: "dashboard and menu breakdown").
// A workspace belongs to the roles listed. Inside it, a menu shows when the user holds ANY of its permissions.
// Permission codes and role names come from the database blueprint, section 5.
// `summary` is what the screen does, taken from the brief.

const m = (slug, label, icon, anyOf, summary) => ({ slug, label, icon, anyOf, summary })

export const WORKSPACES = [
  {
    id: 'reception', slug: 'reception', label: 'Reception', icon: 'clipboardList',
    roles: ['receptionist', 'records_officer'],
    purpose: 'Patient registration, appointment coordination, front-desk operations and records management.',
    menus: [
      m('overview', 'Overview', 'layoutDashboard', ['patients.search', 'appointments.view'], 'Reception activity and key daily figures.'),
      m('desk', 'Reception desk', 'clipboardList', ['patients.create', 'encounters.open'], 'Walk-in registration, patient arrival and the front-desk workflow.'),
      m('appointments', 'Appointments', 'calendar', ['appointments.view'], 'View and manage appointments, including scheduling and status updates.'),
      m('patients', 'Patients', 'users', ['patients.search', 'patients.view'], 'Search and open the patient directory.'),
      m('documents', 'Documents', 'folder', ['patients.view'], 'Upload, store and retrieve patient documents such as referrals, ID and NHIS cards and lab reports.'),
      m('opd', 'OPD queue', 'listOrdered', ['encounters.open'], 'Outpatient check-in and patient queue progression.'),
      m('claim-gaps', 'Claim data gaps', 'alertCircle', ['patients.update'], 'Missing or invalid insurance information and other patient data issues that could affect claims.'),
      m('payments', 'Payment status', 'creditCard', ['finance.view'], 'Patient payment and outstanding balance information.'),
    ],
  },
  {
    id: 'nurse', slug: 'nurse', label: 'Nursing', icon: 'heartPulse',
    roles: ['triage_nurse', 'ward_nurse', 'bed_manager'],
    purpose: 'Triage, vital signs, nursing activities, ward monitoring and admission coordination.',
    menus: [
      m('overview', 'Overview', 'layoutDashboard', ['nursing.triage', 'nursing.observe'], 'Current nursing workload and patient activity.'),
      m('triage', 'Triage queue', 'heartPulse', ['nursing.triage'], 'Patients awaiting triage. Record vital signs and hand patients over to clinicians.'),
      m('wards', 'Ward and bed board', 'bed', ['nursing.observe'], 'Wards, beds, occupied beds and available beds.'),
      m('tasks', 'Nursing tasks', 'checkSquare', ['nursing.observe'], 'Create and track medication administration, vital-sign rounds, wound dressings, IV checks and other tasks.'),
      m('admissions', 'Admission requests', 'userPlus', ['nursing.observe'], 'Requests to admit patients into inpatient care.'),
      m('discharge', 'Discharge checklist', 'listChecks', ['nursing.observe'], 'Required discharge checks before a patient leaves.'),
      m('opd', 'OPD queue', 'listOrdered', ['encounters.open', 'nursing.triage'], 'Access to the outpatient queue.'),
    ],
  },
  {
    id: 'doctor', slug: 'doctor', label: 'Doctor', icon: 'stethoscope',
    roles: ['doctor'],
    purpose: 'Consultations, diagnosis, investigations, prescriptions and review of laboratory results.',
    menus: [
      m('overview', 'Overview', 'layoutDashboard', ['clinical.consult'], 'The doctor\u2019s clinical workload and pending activities.'),
      m('queue', 'My queue', 'listOrdered', ['clinical.consult'], 'Patients handed over by nursing who are waiting for clinical attention.'),
      m('consultation', 'Consultation', 'stethoscope', ['clinical.consult'], 'Document complaints, history, examination, diagnoses and treatment plans.'),
      m('results', 'Results inbox', 'inbox', ['clinical.order'], 'Completed laboratory results waiting for clinical review.'),
      m('admissions', 'My admissions', 'bed', ['clinical.consult'], 'Patients admitted under your care.'),
      m('opd', 'OPD queue', 'listOrdered', ['clinical.consult'], 'Outpatient activity.'),
    ],
  },
  {
    id: 'laboratory', slug: 'lab', label: 'Laboratory', icon: 'flask',
    roles: ['lab_technician'],
    purpose: 'Investigation processing, specimen handling, result entry, verification and laboratory stock.',
    menus: [
      m('overview', 'Overview', 'layoutDashboard', ['lab.view'], 'Laboratory workload, verification backlog and stock alerts.'),
      m('worklist', 'Worklist', 'listOrdered', ['lab.view', 'lab.process'], 'Laboratory investigations waiting to be processed.'),
      m('specimens', 'Specimens', 'testTube', ['lab.collect'], 'Specimen records and processing.'),
      m('results', 'Result entry and verification', 'flask', ['lab.process', 'lab.verify'], 'Record investigation results and verify them.'),
      m('critical', 'Critical results', 'alertTriangle', ['lab.verify'], 'Flagged critical laboratory results.'),
      m('catalogue', 'Test catalogue', 'book', ['lab.manage_catalogue'], 'Available laboratory tests and their information.'),
      m('inventory', 'Inventory', 'packageBox', ['inventory.view'], 'Laboratory stock and stock movements.'),
    ],
  },
  {
    id: 'pharmacy', slug: 'pharmacy', label: 'Pharmacy', icon: 'pill',
    roles: ['pharmacist', 'pharmacy_assistant', 'store_keeper'],
    purpose: 'Prescription processing, dispensing, stock control and formulary mapping.',
    menus: [
      m('overview', 'Overview', 'layoutDashboard', ['pharmacy.view'], 'Pharmacy workload and stock indicators.'),
      m('queue', 'Prescription queue', 'listOrdered', ['pharmacy.view'], 'Prescriptions waiting for pharmacy processing.'),
      m('dispensing', 'Dispensing panel', 'pill', ['pharmacy.dispense'], 'The prescription dispensing workflow.'),
      m('alerts', 'Stock alerts', 'alertTriangle', ['inventory.view'], 'Medicines at or below their reorder levels.'),
      m('levels', 'Stock levels', 'packageBox', ['inventory.view'], 'Current stock quantities.'),
      m('formulary', 'Formulary mapping flags', 'link', ['pharmacy.manage_formulary'], 'Pharmacy items with missing claim or formulary codes.'),
      m('inventory', 'Inventory', 'database', ['inventory.view'], 'Pharmacy inventory and stock movements.'),
    ],
  },
  {
    id: 'cashier', slug: 'cashier', label: 'Cashier', icon: 'wallet',
    roles: ['cashier', 'finance_officer'],
    purpose: 'Billing, payments, receipts, refunds, cashier operations and reconciliation.',
    menus: [
      m('overview', 'Overview', 'layoutDashboard', ['finance.view'], 'Key financial and operational indicators.'),
      m('charges', 'Pending charges', 'creditCard', ['finance.view'], 'Outstanding patient charges and unpaid balances.'),
      m('payments', 'Payment panel and receipts', 'receipt', ['finance.collect'], 'Record payments, take partial payments and print receipts.'),
      m('till', 'My till and shift', 'clock', ['finance.collect'], 'The cashier\u2019s till and shift activity.'),
      m('refunds', 'Refunds', 'undo', ['finance.refund'], 'Create refund requests for authorised review.'),
      m('reconciliation', 'Shift reconciliation', 'scale', ['finance.reconcile'], 'Reconcile cashier transactions.'),
      m('prices', 'Price list', 'tag', ['finance.view'], 'Configured service prices.'),
      m('billed-vs-claimed', 'Billed vs claimed', 'gitCompare', ['claims.view', 'finance.reconcile'], 'Billing compared with the available claims information.'),
    ],
  },
  {
    id: 'claims', slug: 'claims', label: 'Claims', icon: 'fileText',
    roles: ['claims_officer'],
    purpose: 'NHIS claims preparation, validation, mapping, export, import review and monthly monitoring.',
    menus: [
      m('overview', 'Overview', 'layoutDashboard', ['claims.view'], 'Claims activity, saved records and mapping gaps.'),
      m('pipeline', 'Pipeline', 'workflow', ['claims.view'], 'Claims processing stages at a glance.'),
      m('list', 'Claims list and detail', 'fileText', ['claims.view'], 'Saved claims and their information.'),
      m('mapping', 'Mapping queue', 'link', ['claims.manage_mappings'], 'Reference and tariff mapping records.'),
      m('exports', 'Export batches', 'upload', ['claims.export'], 'Claims export batches.'),
      m('imports', 'Import reports', 'download', ['claims.import_report'], 'Imported claims reports and their contents.'),
      m('progress', 'Month progress', 'trendingUp', ['claims.view'], 'Monthly claims preparation progress.'),
    ],
  },
  {
    id: 'admin', slug: 'admin', label: 'Administration', icon: 'shieldCheck',
    roles: ['hospital_admin', 'management_viewer'],
    purpose: 'Hospital-wide management, configuration, permissions, facilities, inventory and oversight.',
    menus: [
      m('overview', 'Management dashboard', 'layoutDashboard', ['admin.manage_config', 'reports.view'], 'The hospital-wide management overview.'),
      m('profile', 'Hospital profile', 'building', ['admin.manage_config'], 'Hospital information and configuration.'),
      m('facilities', 'Departments, wards, beds', 'network', ['admin.manage_config'], 'Configure departments, wards and beds, including bed capacity.'),
      m('users', 'Local role profiles', 'keyRound', ['admin.manage_users'], 'Manage local role profiles and frontend access. These are not secure accounts.'),
      m('catalogue', 'Service catalogue and prices', 'tag', ['finance.manage_prices', 'admin.manage_catalogue'], 'Service and pricing configuration.'),
      m('mappings', 'Reference mappings', 'link', ['claims.manage_mappings', 'admin.manage_catalogue'], 'Reference and code mapping configuration.'),
      m('settings', 'Operating settings', 'sliders', ['admin.manage_config'], 'Local operating preferences. A value affects a workflow only when that workflow reads it.'),
      m('reports', 'Reports', 'barChart', ['reports.view'], 'Available hospital reports.'),
      m('refunds', 'Refund approvals', 'undo', ['finance.approve_refund'], 'Approve or decline refund requests.'),
      m('inventory', 'Inventory console', 'packageBox', ['inventory.approve_adjustment', 'inventory.view'], 'Administrative inventory access.'),
      m('audit', 'Local activity history', 'history', ['audit.view'], 'Changes recorded by this browser or desktop installation.'),
      m('backup', 'Backup and restore', 'database', ['admin.manage_config'], 'Export or restore this installation’s local IndexedDB records.'),
    ],
  },
]

export const menuPath = (ws, menu) => `/${ws.slug}/${menu.slug}`
export const workspaceHome = (ws) => `/${ws.slug}/overview`

// Workspaces for a person's roles, in role order.
export const workspacesForRoles = (roles) =>
  roles.map((r) => WORKSPACES.find((w) => w.roles.includes(r))).filter((w, i, a) => w && a.indexOf(w) === i)

export const visibleMenus = (ws, can) => ws.menus.filter((menu) => menu.anyOf.some(can))

export const findWorkspaceBySlug = (slug) => WORKSPACES.find((w) => w.slug === slug)
