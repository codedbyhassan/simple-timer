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
