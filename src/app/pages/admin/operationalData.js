export const CATALOGUE_SEED = [
  { id: 'svc-consult', name: 'General consultation', category: 'Consultation', code: 'CONS-001', claimCode: 'OPD-CONS', price: 60, status: 'Active', updated: '04 Nov 2026' },
  { id: 'svc-specialist', name: 'Specialist consultation', category: 'Consultation', code: 'CONS-014', claimCode: 'OPD-SPEC', price: 120, status: 'Active', updated: '04 Nov 2026' },
  { id: 'svc-ecg', name: 'Electrocardiogram (ECG)', category: 'Diagnostics', code: 'DIAG-020', claimCode: 'DIA-ECG', price: 160, status: 'Active', updated: '02 Nov 2026' },
  { id: 'svc-cbc', name: 'Full blood count', category: 'Laboratory', code: 'LAB-001', claimCode: 'LAB-CBC', price: 85, status: 'Active', updated: '02 Nov 2026' },
  { id: 'svc-malaria', name: 'Malaria parasite test', category: 'Laboratory', code: 'LAB-008', claimCode: 'LAB-MAL', price: 45, status: 'Active', updated: '29 Oct 2026' },
  { id: 'svc-xray', name: 'Chest X-ray', category: 'Imaging', code: 'IMG-003', claimCode: 'RAD-CXR', price: 210, status: 'Active', updated: '29 Oct 2026' },
  { id: 'svc-dressing', name: 'Wound dressing', category: 'Procedure', code: 'PROC-017', claimCode: 'PROC-WD', price: 75, status: 'Active', updated: '28 Oct 2026' },
  { id: 'svc-anc', name: 'Antenatal review', category: 'Maternity', code: 'MAT-004', claimCode: 'ANC-REV', price: 90, status: 'Active', updated: '27 Oct 2026' },
  { id: 'svc-admission', name: 'General ward accommodation', category: 'Inpatient', code: 'IPD-001', claimCode: 'IPD-GEN', price: 420, status: 'Active', updated: '26 Oct 2026' },
  { id: 'svc-physio', name: 'Physiotherapy session', category: 'Therapy', code: 'THER-006', claimCode: '', price: 110, status: 'Needs mapping', updated: '25 Oct 2026' },
  { id: 'svc-old-panel', name: 'Legacy chemistry panel', category: 'Laboratory', code: 'LAB-OLD-4', claimCode: 'LAB-CHEM', price: 95, status: 'Inactive', updated: '19 Oct 2026' },
  { id: 'svc-ultrasound', name: 'Obstetric ultrasound', category: 'Imaging', code: 'IMG-015', claimCode: 'RAD-OBS', price: 280, status: 'Active', updated: '17 Oct 2026' },
]

export const MAPPINGS_SEED = [
  { id: 'map-001', source: 'General consultation', sourceCode: 'CONS-001', target: 'Outpatient consultation', targetCode: 'OPD-CONS', type: 'Service tariff', status: 'Mapped', reviewed: '04 Nov 2026' },
  { id: 'map-002', source: 'Full blood count', sourceCode: 'LAB-001', target: 'Complete blood count', targetCode: 'LAB-CBC', type: 'Laboratory', status: 'Mapped', reviewed: '03 Nov 2026' },
  { id: 'map-003', source: 'Physiotherapy session', sourceCode: 'THER-006', target: '', targetCode: '', type: 'Service tariff', status: 'Needs review', reviewed: '25 Oct 2026' },
  { id: 'map-004', source: 'Amoxicillin 500 mg', sourceCode: 'MED-044', target: 'Amoxicillin capsule 500 mg', targetCode: 'NHIA-MED-9021', type: 'Medicine tariff', status: 'Mapped', reviewed: '02 Nov 2026' },
  { id: 'map-005', source: 'Wound dressing', sourceCode: 'PROC-017', target: 'Wound care procedure', targetCode: 'PROC-WD', type: 'Procedure', status: 'Mapped', reviewed: '01 Nov 2026' },
  { id: 'map-006', source: 'Hypertension, essential', sourceCode: 'I10', target: 'Essential (primary) hypertension', targetCode: 'ICD10-I10', type: 'Diagnosis', status: 'Mapped', reviewed: '31 Oct 2026' },
  { id: 'map-007', source: 'Chest X-ray', sourceCode: 'IMG-003', target: '', targetCode: '', type: 'Service tariff', status: 'Needs review', reviewed: '29 Oct 2026' },
  { id: 'map-008', source: 'Metformin 500 mg', sourceCode: 'MED-018', target: 'Metformin tablet 500 mg', targetCode: 'NHIA-MED-1180', type: 'Medicine tariff', status: 'Mapped', reviewed: '28 Oct 2026' },
  { id: 'map-009', source: 'ANC review', sourceCode: 'MAT-004', target: 'Antenatal care visit', targetCode: 'ANC-REV', type: 'Service tariff', status: 'Mapped', reviewed: '27 Oct 2026' },
  { id: 'map-010', source: 'Unspecified fever', sourceCode: 'R50.9', target: '', targetCode: '', type: 'Diagnosis', status: 'Needs review', reviewed: '26 Oct 2026' },
]

export const REFUNDS_SEED = [
  { id: 'REF-2026-041', patient: 'Patient ASC-PAT-002381', invoice: 'INV-1048', reason: 'Duplicate consultation charge', amount: 60, requestedBy: 'Akosua Tetteh', requestedAt: '06 Nov 2026 · 10:18', status: 'Pending', method: 'Mobile money', notes: 'Two consultation line items recorded for the same encounter.' },
  { id: 'REF-2026-040', patient: 'Patient ASC-PAT-001940', invoice: 'INV-1039', reason: 'Insurance correction', amount: 85, requestedBy: 'Nana Bediako', requestedAt: '06 Nov 2026 · 09:42', status: 'Pending', method: 'Cash', notes: 'Patient coverage was confirmed after payment collection.' },
  { id: 'REF-2026-039', patient: 'Patient ASC-PAT-001822', invoice: 'INV-1031', reason: 'Service not provided', amount: 210, requestedBy: 'Akosua Tetteh', requestedAt: '05 Nov 2026 · 16:27', status: 'Pending', method: 'Card', notes: 'Imaging order was cancelled before service delivery.' },
  { id: 'REF-2026-038', patient: 'Patient ASC-PAT-002016', invoice: 'INV-1025', reason: 'Incorrect amount collected', amount: 45, requestedBy: 'Nana Bediako', requestedAt: '05 Nov 2026 · 13:06', status: 'Approved', method: 'Cash', notes: 'Over-collection confirmed against printed receipt.' },
  { id: 'REF-2026-037', patient: 'Patient ASC-PAT-001511', invoice: 'INV-1018', reason: 'Patient payment reversal', amount: 120, requestedBy: 'Akosua Tetteh', requestedAt: '04 Nov 2026 · 11:52', status: 'Declined', method: 'Mobile money', notes: 'Payment was correctly applied to an outstanding balance.' },
  { id: 'REF-2026-036', patient: 'Patient ASC-PAT-001206', invoice: 'INV-1007', reason: 'Duplicate payment', amount: 90, requestedBy: 'Nana Bediako', requestedAt: '03 Nov 2026 · 15:10', status: 'Approved', method: 'Cash', notes: 'Duplicate receipt verified in cashier reconciliation.' },
]

export const INVENTORY_SEED = [
  { id: 'INV-1001', name: 'Amoxicillin 500 mg capsules', category: 'Medicine', location: 'Central pharmacy', onHand: 168, reorder: 120, unit: 'packs', unitCost: 18.5, status: 'In stock', updated: 'Today, 10:42' },
  { id: 'INV-1002', name: 'Paracetamol 500 mg tablets', category: 'Medicine', location: 'Central pharmacy', onHand: 82, reorder: 100, unit: 'packs', unitCost: 8.25, status: 'Low stock', updated: 'Today, 10:18' },
  { id: 'INV-1003', name: 'Normal saline 0.9% 1 L', category: 'Medical supply', location: 'Main store', onHand: 245, reorder: 80, unit: 'bags', unitCost: 14.2, status: 'In stock', updated: 'Today, 09:54' },
  { id: 'INV-1004', name: 'Examination gloves, medium', category: 'PPE', location: 'Main store', onHand: 38, reorder: 60, unit: 'boxes', unitCost: 42, status: 'Low stock', updated: 'Today, 09:31' },
  { id: 'INV-1005', name: 'Malaria rapid test kits', category: 'Diagnostics', location: 'Laboratory', onHand: 0, reorder: 40, unit: 'kits', unitCost: 5.75, status: 'Out of stock', updated: 'Today, 09:10' },
  { id: 'INV-1006', name: 'Insulin regular 100 IU/mL', category: 'Medicine', location: 'Cold room A', onHand: 32, reorder: 20, unit: 'vials', unitCost: 38, status: 'In stock', updated: 'Today, 08:56' },
  { id: 'INV-1007', name: 'CBC reagent pack', category: 'Laboratory reagent', location: 'Laboratory', onHand: 14, reorder: 18, unit: 'packs', unitCost: 235, status: 'Low stock', updated: 'Yesterday, 16:45' },
  { id: 'INV-1008', name: 'Surgical masks', category: 'PPE', location: 'Main store', onHand: 410, reorder: 150, unit: 'boxes', unitCost: 22.5, status: 'In stock', updated: 'Yesterday, 15:32' },
  { id: 'INV-1009', name: 'Suture kit, sterile', category: 'Medical supply', location: 'Theatre store', onHand: 27, reorder: 30, unit: 'kits', unitCost: 34.75, status: 'Low stock', updated: 'Yesterday, 14:17' },
  { id: 'INV-1010', name: 'Dextrose 5% 500 mL', category: 'Medicine', location: 'Central pharmacy', onHand: 96, reorder: 50, unit: 'bags', unitCost: 11.4, status: 'In stock', updated: 'Yesterday, 13:28' },
]

export const AUDIT_SEED = [
  { id: 'AUD-88214', time: '06 Nov 2026, 10:42:18', actor: 'Ama Mensah', action: 'Role assignment reviewed', resource: 'Staff · Kojo Asante', outcome: 'Success', category: 'Access' },
  { id: 'AUD-88213', time: '06 Nov 2026, 10:18:42', actor: 'Akosua Tetteh', action: 'Refund request created', resource: 'REF-2026-041', outcome: 'Success', category: 'Finance' },
  { id: 'AUD-88212', time: '06 Nov 2026, 09:56:04', actor: 'Nana Bediako', action: 'Inventory receipt recorded', resource: 'INV-1001 · +24 packs', outcome: 'Success', category: 'Inventory' },
  { id: 'AUD-88211', time: '06 Nov 2026, 09:41:39', actor: 'Ama Mensah', action: 'Hospital settings viewed', resource: 'Thresholds and settings', outcome: 'Success', category: 'Administration' },
  { id: 'AUD-88210', time: '06 Nov 2026, 09:11:02', actor: 'Esi Addo', action: 'Result verification completed', resource: 'LAB-20482', outcome: 'Success', category: 'Clinical' },
  { id: 'AUD-88209', time: '06 Nov 2026, 08:52:15', actor: 'System', action: 'Scheduled report generated', resource: 'Daily operations summary', outcome: 'Success', category: 'Reports' },
  { id: 'AUD-88208', time: '06 Nov 2026, 08:38:44', actor: 'Unknown session', action: 'Sign-in rejected', resource: 'Account · d.quaye', outcome: 'Denied', category: 'Access' },
  { id: 'AUD-88207', time: '05 Nov 2026, 17:26:09', actor: 'Ama Mensah', action: 'Service price updated', resource: 'General consultation', outcome: 'Success', category: 'Catalogue' },
  { id: 'AUD-88206', time: '05 Nov 2026, 16:04:51', actor: 'Kofi Appiah', action: 'Claim mapping reviewed', resource: 'MAP-003 · THER-006', outcome: 'Needs review', category: 'Claims' },
  { id: 'AUD-88205', time: '05 Nov 2026, 15:44:23', actor: 'Nana Bediako', action: 'Stock adjustment submitted', resource: 'INV-1007 · -2 packs', outcome: 'Pending', category: 'Inventory' },
  { id: 'AUD-88204', time: '05 Nov 2026, 14:52:08', actor: 'Ama Mensah', action: 'Hospital profile updated', resource: 'Contact information', outcome: 'Success', category: 'Administration' },
]

export const REPORTS = [
  { id: 'daily-operations', name: 'Daily operations summary', category: 'Operations', cadence: 'Daily', description: 'Patient flow, appointments, department activity and open operational items.', icon: 'layoutDashboard', values: [38, 55, 46, 70, 63, 84, 72] },
  { id: 'revenue-collections', name: 'Revenue and collections', category: 'Finance', cadence: 'Daily', description: 'Collections by payment channel and billed activity by service line.', icon: 'creditCard', values: [46, 63, 52, 76, 66, 88, 79] },
  { id: 'claims-readiness', name: 'Claims readiness', category: 'Claims', cadence: 'Weekly', description: 'Validation outcomes, mapping completeness and export preparation.', icon: 'fileText', values: [28, 38, 44, 58, 65, 74, 82] },
  { id: 'inventory-valuation', name: 'Inventory and stock risks', category: 'Inventory', cadence: 'Weekly', description: 'Stock valuation, low-stock exposure, expiries and adjustment activity.', icon: 'packageBox', values: [71, 65, 61, 58, 52, 49, 43] },
  { id: 'clinical-throughput', name: 'Clinical throughput', category: 'Clinical', cadence: 'Weekly', description: 'Visits, consultations, investigations and completed patient journeys.', icon: 'activity', values: [42, 48, 62, 57, 78, 70, 86] },
  { id: 'access-review', name: 'User access review', category: 'Governance', cadence: 'Monthly', description: 'Account status, role assignments, dormant accounts and permission review.', icon: 'keyRound', values: [90, 87, 92, 82, 88, 94, 96] },
]

export const REPORT_ACTIVITY = [
  { name: 'Daily operations summary', created: 'Today, 08:52', owner: 'System', format: 'PDF', status: 'Ready' },
  { name: 'Revenue and collections', created: 'Today, 07:30', owner: 'Nana Bediako', format: 'CSV', status: 'Ready' },
  { name: 'Claims readiness', created: '05 Nov, 16:10', owner: 'Kofi Appiah', format: 'PDF', status: 'Ready' },
  { name: 'Inventory and stock risks', created: '05 Nov, 08:00', owner: 'System', format: 'CSV', status: 'Ready' },
]

export const SETTINGS_DEFAULTS = [
  { id: 'patient_wait_warning', group: 'Patient flow', label: 'Waiting-time warning', description: 'Flag patients who wait longer than this threshold.', value: '25', unit: 'minutes', type: 'number' },
  { id: 'bed_occupancy_warning', group: 'Capacity', label: 'High bed occupancy', description: 'Notify management when ward occupancy reaches this level.', value: '85', unit: '%', type: 'number' },
  { id: 'lab_turnaround_target', group: 'Laboratory', label: 'Standard lab turnaround target', description: 'Default target used in lab performance reports.', value: '150', unit: 'minutes', type: 'number' },
  { id: 'nhis_expiry_warning', group: 'Claims', label: 'Insurance expiry warning', description: 'Show a warning before a patient’s cover expires.', value: '60', unit: 'days', type: 'number' },
  { id: 'low_stock_alerts', group: 'Inventory', label: 'Low-stock alerts', description: 'Notify responsible teams when inventory reaches reorder level.', value: true, type: 'toggle' },
  { id: 'critical_result_alerts', group: 'Clinical safety', label: 'Critical result alerts', description: 'Escalate verified critical laboratory results.', value: true, type: 'toggle' },
  { id: 'refund_second_approval', group: 'Finance', label: 'Second approval for large refunds', description: 'Require a second approver above the configured limit.', value: true, type: 'toggle' },
  { id: 'refund_second_approval_limit', group: 'Finance', label: 'Second approval threshold', description: 'Refund amounts above this limit need a second approver.', value: '500', unit: 'GHS', type: 'number' },
]

export const BACKUP_JOBS = [
  { id: 'BKP-2214', type: 'Full database backup', started: '06 Nov 2026 · 02:00', duration: '08m 42s', size: '2.4 GB', destination: 'Primary encrypted storage', status: 'Completed', checksum: 'Verified' },
  { id: 'BKP-2213', type: 'Incremental database backup', started: '05 Nov 2026 · 20:00', duration: '02m 18s', size: '186 MB', destination: 'Primary encrypted storage', status: 'Completed', checksum: 'Verified' },
  { id: 'BKP-2212', type: 'Full database backup', started: '05 Nov 2026 · 02:00', duration: '09m 10s', size: '2.3 GB', destination: 'Offsite encrypted storage', status: 'Completed', checksum: 'Verified' },
  { id: 'BKP-2211', type: 'Incremental database backup', started: '04 Nov 2026 · 20:00', duration: '03m 04s', size: '204 MB', destination: 'Primary encrypted storage', status: 'Failed', checksum: 'Not verified' },
  { id: 'BKP-2210', type: 'Full database backup', started: '04 Nov 2026 · 02:00', duration: '08m 53s', size: '2.3 GB', destination: 'Offsite encrypted storage', status: 'Completed', checksum: 'Verified' },
]
