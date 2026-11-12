# Ascend HMS frontend workspaces

This document describes the local-first frontend. All operational data is stored in IndexedDB. The application does not connect to a backend or synchronise across installations.

## Shared application shell

- Local staff profile selector and role-based navigation.
- Shared global search across local patients, appointments, encounters, laboratory orders, prescriptions and claims.
- Persistent local notifications.
- Light and dark themes.
- Collapsible navigation and responsive layout.
- Profile and appearance settings.
- Local audit history and IndexedDB backup/restore.

## Reception

- Reception overview derived from saved local records.
- Patient registration and patient directory.
- Appointment creation and status management.
- Check-in and OPD queue.
- Patient documents.
- Patient record details and local payment/claim gaps.

## Nursing

- Nursing overview and triage queue.
- Vital signs and triage handover.
- Ward and bed board.
- Nursing tasks.
- Admission requests.
- Discharge checklist and discharge outcome.

## Doctor

- Doctor overview and patient queue.
- Consultation notes.
- Diagnosis and treatment plan.
- Laboratory investigation orders.
- Prescriptions.
- Results inbox and admissions.

## Laboratory

- Worklist and order processing.
- Specimen collection, receipt and rejection.
- Result entry and verification.
- Critical result acknowledgement.
- Test catalogue.
- Laboratory stock.

## Pharmacy

- Prescription queue.
- Dispensing and partial fulfilment.
- Batch and expiry selection.
- Stock levels and alerts.
- Formulary mapping.
- Pharmacy inventory.

## Cashier

- Pending charges.
- Payment entry and receipts.
- Till and shift management.
- Refund requests.
- Reconciliation.
- Shared service price list.

## Claims

- Claims overview and pipeline.
- Claim record list.
- Reference mapping management.
- Export preparation.
- Import report parsing.
- Month progress.

## Administration

- Management dashboard calculated from local operational records.
- Hospital profile.
- Department, ward and bed configuration shared with nursing.
- Local staff profiles and frontend role access.
- Service catalogue shared with cashier.
- Claims reference mappings shared with claims.
- Local operating preferences.
- Record summaries.
- Refund approval queue.
- Inventory summary derived from laboratory and pharmacy records.
- Local activity history.
- IndexedDB backup and restore.

## Data and interaction requirements

- Empty states must not display fabricated operational data.
- New installations contain no patient, clinical, financial or stock records.
- Local staff profiles are role selectors, not identity verification.
- Every user action that changes operational records must await its IndexedDB transaction.
- Shared workflows must read the same IndexedDB records.
- Search, dashboards and summaries must be calculated from current local records.
- Unsupported remote operations must not be represented as completed.
- Backup and restore must operate on the actual local IndexedDB database.
- Destructive actions require confirmation and explain the affected local records.

## Known limitations

This is a frontend workflow application for local evaluation. It does not provide secure authentication, device-to-device synchronisation, remote backups, payment settlement, official claims submission or production clinical data protection. Do not store real patient information in this application.
