export const ADMIN_ACCESS_USERS = [
  { id: 'staff-001', name: 'Ama Mensah', email: 'ama.mensah@ascend.example', department: 'Administration', role: 'hospital_admin', status: 'Active', lastSeen: 'Today, 10:42' },
  { id: 'staff-002', name: 'Kojo Asante', email: 'kojo.asante@ascend.example', department: 'Reception', role: 'receptionist', status: 'Active', lastSeen: 'Today, 10:15' },
  { id: 'staff-003', name: 'Abena Owusu', email: 'abena.owusu@ascend.example', department: 'Nursing', role: 'triage_nurse', status: 'Active', lastSeen: 'Today, 09:58' },
  { id: 'staff-004', name: 'Kwame Boateng', email: 'kwame.boateng@ascend.example', department: 'Medical', role: 'doctor', status: 'Active', lastSeen: 'Today, 09:43' },
  { id: 'staff-005', name: 'Esi Addo', email: 'esi.addo@ascend.example', department: 'Laboratory', role: 'lab_technician', status: 'Active', lastSeen: 'Today, 09:32' },
  { id: 'staff-006', name: 'Yaw Ofori', email: 'yaw.ofori@ascend.example', department: 'Pharmacy', role: 'pharmacist', status: 'Active', lastSeen: 'Today, 08:51' },
  { id: 'staff-007', name: 'Akosua Tetteh', email: 'akosua.tetteh@ascend.example', department: 'Finance', role: 'cashier', status: 'Active', lastSeen: 'Today, 08:39' },
  { id: 'staff-008', name: 'Kofi Appiah', email: 'kofi.appiah@ascend.example', department: 'Claims', role: 'claims_officer', status: 'Invited', lastSeen: 'Not signed in' },
  { id: 'staff-009', name: 'Mabel Nkrumah', email: 'mabel.nkrumah@ascend.example', department: 'Management', role: 'management_viewer', status: 'Active', lastSeen: 'Yesterday, 16:20' },
  { id: 'staff-010', name: 'Daniel Quaye', email: 'daniel.quaye@ascend.example', department: 'Medical Records', role: 'records_officer', status: 'Suspended', lastSeen: '04 Nov, 14:02' },
  { id: 'staff-011', name: 'Efua Sarpong', email: 'efua.sarpong@ascend.example', department: 'Nursing', role: 'ward_nurse', status: 'Active', lastSeen: 'Today, 08:22' },
  { id: 'staff-012', name: 'Nana Bediako', email: 'nana.bediako@ascend.example', department: 'Finance', role: 'finance_officer', status: 'Active', lastSeen: 'Today, 08:17' },
  { id: 'staff-013', name: 'Adwoa Kusi', email: 'adwoa.kusi@ascend.example', department: 'Pharmacy', role: 'pharmacy_assistant', status: 'Active', lastSeen: 'Today, 07:55' },
  { id: 'staff-014', name: 'Kwesi Antwi', email: 'kwesi.antwi@ascend.example', department: 'Stores', role: 'store_keeper', status: 'Active', lastSeen: 'Yesterday, 17:11' },
  { id: 'staff-015', name: 'Akua Dapaah', email: 'akua.dapaah@ascend.example', department: 'Facilities', role: 'bed_manager', status: 'Active', lastSeen: 'Today, 07:46' },
]

export const ADMIN_ACCESS_ROLES = [
  { code: 'hospital_admin', label: 'Hospital administrator', description: 'Hospital configuration, user access and operational oversight.', permissions: ['admin.manage_users', 'admin.manage_config', 'admin.manage_catalogue', 'audit.view', 'audit.review_break_glass', 'system.view_sla', 'reports.view', 'reports.export', 'finance.manage_prices', 'finance.approve_refund', 'claims.manage_mappings', 'inventory.view', 'inventory.approve_adjustment'] },
  { code: 'records_officer', label: 'Records officer', description: 'Patient records, registration and document workflows.', permissions: ['patients.search', 'patients.view', 'patients.create', 'patients.update', 'appointments.view', 'encounters.open'] },
  { code: 'receptionist', label: 'Receptionist', description: 'Patient registration, appointments and front-desk operations.', permissions: ['patients.search', 'patients.view', 'patients.create', 'patients.update', 'appointments.view', 'appointments.manage', 'encounters.open', 'finance.view'] },
  { code: 'triage_nurse', label: 'Triage nurse', description: 'Triage, observations and outpatient handover.', permissions: ['patients.search', 'patients.view', 'encounters.open', 'nursing.triage', 'nursing.observe'] },
  { code: 'ward_nurse', label: 'Ward nurse', description: 'Ward observations, nursing tasks and admission coordination.', permissions: ['patients.search', 'patients.view', 'nursing.observe'] },
  { code: 'doctor', label: 'Doctor', description: 'Consultations, investigations, prescriptions and clinical decisions.', permissions: ['patients.search', 'patients.view', 'clinical.consult', 'clinical.finalize', 'clinical.order', 'clinical.prescribe', 'clinical.refer', 'lab.view', 'pharmacy.view'] },
  { code: 'lab_technician', label: 'Laboratory technician', description: 'Specimen handling, investigation processing, result verification and laboratory stock control.', permissions: ['patients.search', 'patients.view', 'lab.view', 'lab.collect', 'lab.process', 'lab.verify', 'lab.manage_catalogue', 'inventory.view', 'inventory.receive', 'inventory.adjust'] },
  { code: 'pharmacist', label: 'Pharmacist', description: 'Prescription verification, dispensing and formulary management.', permissions: ['patients.search', 'patients.view', 'pharmacy.view', 'pharmacy.verify', 'pharmacy.dispense', 'pharmacy.manage_formulary', 'inventory.view', 'inventory.receive', 'inventory.adjust'] },
  { code: 'pharmacy_assistant', label: 'Pharmacy assistant', description: 'Prescription queue support and stock visibility.', permissions: ['patients.search', 'patients.view', 'pharmacy.view', 'inventory.view'] },
  { code: 'cashier', label: 'Cashier', description: 'Patient billing, payment collection, refund requests and till reconciliation.', permissions: ['patients.search', 'patients.view', 'finance.view', 'finance.collect', 'finance.refund', 'finance.reconcile'] },
  { code: 'finance_officer', label: 'Finance officer', description: 'Financial operations, payment review, refund requests and reconciliation.', permissions: ['patients.search', 'patients.view', 'finance.view', 'finance.collect', 'finance.refund', 'finance.reconcile'] },
  { code: 'claims_officer', label: 'Claims officer', description: 'Claims preparation, mapping, export and import review.', permissions: ['patients.search', 'patients.view', 'claims.view', 'claims.build', 'claims.enter_ccc', 'claims.export', 'claims.import_report', 'claims.manage_mappings', 'finance.view'] },
  { code: 'store_keeper', label: 'Store keeper', description: 'Inventory receiving, issuing and stock control.', permissions: ['inventory.view', 'inventory.receive', 'inventory.adjust'] },
  { code: 'bed_manager', label: 'Bed manager', description: 'Facility bed and ward capacity administration.', permissions: ['admin.manage_config', 'nursing.observe'] },
  { code: 'management_viewer', label: 'Management', description: 'Read-only hospital reporting and management overview.', permissions: ['reports.view', 'reports.export'] },
]

const groupForPermission = (code) => {
  const prefix = code.split('.')[0]
  const groups = {
    admin: 'Administration',
    appointments: 'Appointments',
    audit: 'Audit and oversight',
    claims: 'Claims',
    clinical: 'Clinical',
    encounters: 'Patient flow',
    finance: 'Finance',
    inventory: 'Inventory',
    lab: 'Laboratory',
    nursing: 'Nursing',
    patients: 'Patient records',
    pharmacy: 'Pharmacy',
    reports: 'Reports',
    system: 'System',
  }
  return groups[prefix] || 'Other'
}

export const ADMIN_PERMISSION_GROUPS = Object.entries(
  [...new Set(ADMIN_ACCESS_ROLES.flatMap((role) => role.permissions))]
    .sort()
    .reduce((groups, permission) => {
      const group = groupForPermission(permission)
      groups[group] ||= []
      groups[group].push(permission)
      return groups
    }, {}),
).map(([name, permissions]) => ({ name, permissions }))
