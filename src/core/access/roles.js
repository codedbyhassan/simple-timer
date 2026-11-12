// Display names for the seeded system roles (database blueprint 5.5).
export const ROLE_LABELS = {
  hospital_admin: 'Hospital administrator',
  records_officer: 'Records officer',
  receptionist: 'Receptionist',
  triage_nurse: 'Triage nurse',
  ward_nurse: 'Ward nurse',
  doctor: 'Doctor',
  lab_technician: 'Laboratory technician',
  pharmacist: 'Pharmacist',
  pharmacy_assistant: 'Pharmacy assistant',
  cashier: 'Cashier',
  finance_officer: 'Finance officer',
  claims_officer: 'Claims officer',
  store_keeper: 'Store keeper',
  bed_manager: 'Bed manager',
  management_viewer: 'Management viewer',
}

export const roleLabel = (code) => ROLE_LABELS[code] || code.replace(/_/g, ' ')
