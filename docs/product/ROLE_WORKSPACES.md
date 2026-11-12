# Role workspaces

Ascend HMS has eight frontend workspaces. The selected local staff profile determines which workspace and menu permissions are visible. These roles are local demonstration profiles, not secure accounts.

## Reception

Patient registration, appointments, check-in, patient directory, documents, OPD queue, patient record and claim-data gap review.

## Nursing

Triage queue, vital signs, triage handover, ward and bed board, nursing tasks, admission requests, discharge checklist and OPD queue.

## Doctor

Clinical queue, consultation notes, diagnosis, investigation orders, prescriptions, results inbox and admissions.

## Laboratory

Investigation worklist, specimen collection and receipt, result entry, verification, critical results, test catalogue and laboratory stock.

## Pharmacy

Prescription queue, dispensing, partial fulfilment, batch and expiry selection, stock levels, alerts, formulary mappings and inventory.

## Cashier

Pending charges, full and partial payments, receipts, till and shift activity, refund requests, reconciliation, price list and billed-versus-claimed review.

## Claims

Claims overview, pipeline, claims list, reference mappings, export preparation, import report review and monthly progress. The frontend prepares local claim records and files; it does not submit claims to NHIA or CLAIM-it.

## Administration

Management dashboard, hospital profile, department/ward/bed configuration, local staff profiles, service catalogue, claims mappings, operating settings, reports, refund approvals, shared inventory summary, local activity history and IndexedDB backup/restore.

## Cross-workspace records

The following records share the same IndexedDB source:

- Patient and appointment records connect reception, nursing, doctor, laboratory, pharmacy, cashier and claims.
- Encounter updates connect triage, consultation and OPD queues.
- Investigation orders and results connect doctor and laboratory.
- Prescriptions and dispensing connect doctor and pharmacy.
- Service prices connect Administration and Cashier.
- Claims reference mappings connect Administration and Claims.
- Wards and beds connect Administration and Nursing.
- Refund requests connect Cashier and Administration.
- Local operational and configuration changes are recorded in the audit history.

## Explicit boundaries

- One browser profile or Electron installation owns its local database. Other devices do not receive these changes.
- Role permissions are client-side navigation and workflow controls, not security.
- Payment entries are local records, not payment settlement.
- Claims exports are local files, not official submissions.
- Backup is user-triggered JSON export/import, not a scheduled or cloud backup.
- Do not enter real patient information into this frontend-only application.
