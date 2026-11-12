export const CATALOGUE_SEED = []
export const MAPPINGS_SEED = []
export const REFUNDS_SEED = []
export const INVENTORY_SEED = []
export const AUDIT_SEED = []
export const REPORTS = []
export const REPORT_ACTIVITY = []
export const BACKUP_JOBS = []

// These are initial configuration values, not observed hospital metrics or seeded transactions.
export const SETTINGS_DEFAULTS = [
  { id: 'patient_wait_warning', group: 'Patient flow', label: 'Waiting-time warning', description: 'Flag patients who wait longer than this threshold.', value: '25', unit: 'minutes', type: 'number' },
  { id: 'bed_occupancy_warning', group: 'Capacity', label: 'High bed occupancy', description: 'Notify management when ward occupancy reaches this level.', value: '85', unit: '%', type: 'number' },
  { id: 'lab_turnaround_target', group: 'Laboratory', label: 'Standard lab turnaround target', description: 'Default target used in lab performance reports.', value: '150', unit: 'minutes', type: 'number' },
  { id: 'nhis_expiry_warning', group: 'Claims', label: 'Insurance expiry warning', description: 'Show a warning before a patient’s cover expires.', value: '60', unit: 'days', type: 'number' },
  { id: 'low_stock_alerts', group: 'Inventory', label: 'Low-stock alerts', description: 'Notify responsible teams when inventory reaches reorder level.', value: true, type: 'toggle' },
  { id: 'critical_result_alerts', group: 'Clinical safety', label: 'Critical result alerts', description: 'Flag critical laboratory results for review.', value: true, type: 'toggle' },
  { id: 'refund_second_approval', group: 'Finance', label: 'Second approval for large refunds', description: 'Require a second approver above the configured limit.', value: true, type: 'toggle' },
  { id: 'refund_second_approval_limit', group: 'Finance', label: 'Second approval threshold', description: 'Refund amounts above this limit need a second approver.', value: '500', unit: 'GHS', type: 'number' },
]
