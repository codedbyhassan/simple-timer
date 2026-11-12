# Role workspaces, links and end-to-end actions

Source: the owner's dashboard and menu breakdown, extended with the hand-offs between workspaces. This document decides the navigation. Where it differs from the older dashboard numbering (D0 to D14) in `DASHBOARDS_AND_SCREENS.md`, this one wins.

Each person sees one **workspace** for their role, with its own overview and menus. A person with more than one role gets a workspace switcher at the top of the sidebar. Inside a workspace, a menu appears only when the person holds one of its permissions. The permission codes are in `src/core/access/navigation.js` and come from the database blueprint (section 5).

Desktop only. The brief's "responsive navigation" line is not built.

## The eight workspaces

### 1. Reception (receptionist, records officer)
Patient registration, appointment coordination, front-desk operations, records.

| Menu | What it does |
|---|---|
| Overview | Today's appointments, patients who have arrived and are waiting, total registered, completed visits, recent appointment activity, quick links |
| Reception desk | Walk-in registration, patient arrival, front-desk workflow |
| Appointments | View and manage appointments, scheduling and status updates |
| Patients | Search and open the patient directory (cards, filters, 50 per page) |
| Documents | Upload, store and retrieve referrals, ID and NHIS cards, lab reports (folder view) |
| OPD queue | Outpatient check-in and queue progression |
| Claim data gaps | Missing or invalid insurance information and other patient data that could affect claims |
| Payment status | Patient payments and outstanding balances |

### 2. Nurse (triage nurse, ward nurse)
Triage, vital signs, nursing activities, ward monitoring, admission coordination.

| Menu | What it does |
|---|---|
| Overview | Patients awaiting triage, ready for clinician review, today's outpatient visits, directory count, recent triage activity |
| Triage queue | Patients awaiting triage. Record vitals and hand over to the clinician |
| Ward and bed board | Wards, beds, occupied and available |
| Nursing tasks | Medication administration, vital-sign rounds, wound dressings, IV checks and other tasks |
| Admission requests | Requests to admit patients into inpatient care |
| Discharge checklist | Required checks before a patient leaves |
| OPD queue | Access to the outpatient queue |

### 3. Doctor (doctor)
Consultations, diagnosis, investigations, prescriptions, review of results.

| Menu | What it does |
|---|---|
| Overview | My clinical queue, results awaiting review, investigations awaiting the lab, prescriptions pending at pharmacy, recent activity |
| My queue | Patients handed over by nursing |
| Consultation | Complaints, history, examination, diagnoses (ICD-10 and G-DRG), investigations, prescriptions, plan. Several of each allowed, chosen from lists so claims map cleanly. Save and pause while waiting for results |
| Results inbox | Completed results waiting for review, critical first |
| My admissions | Patients admitted under the doctor's care |
| OPD queue | Outpatient activity |

A consultation can be saved while results are pending. It cannot be completed while required investigations are unresolved or diagnosis coding is incomplete.

### 4. Laboratory (laboratory technician)
Investigation processing, specimens, result entry, verification, laboratory stock.

| Menu | What it does |
|---|---|
| Overview | Open investigations, results awaiting verification, critical results, stock alerts, recent work |
| Worklist | Investigations waiting to be processed |
| Specimens | Specimen records and processing |
| Result entry and verification | Record results and verify them |
| Critical results | Flagged critical results, acknowledgement |
| Test catalogue | Available tests and their information (age rules, tracked or untracked stock) |
| Inventory | Laboratory stock and movements: issues, receipts, adjustments |

### 5. Pharmacy (pharmacist, pharmacy assistant)
Prescription processing, dispensing, stock control, formulary mapping.

| Menu | What it does |
|---|---|
| Overview | Prescription queue, dispensed, stock alerts, missing formulary mappings, recent activity |
| Prescription queue | Prescriptions waiting for pharmacy |
| Dispensing panel | The dispensing workflow. Deducts tracked stock |
| Stock alerts | Medicines at or below reorder level |
| Stock levels | Current quantities |
| Formulary mapping flags | Items missing claim or formulary codes |
| Inventory | Stock movements, receipts, adjustments |

### 6. Cashier (cashier, finance officer)
Billing, payments, receipts, refunds, reconciliation.

| Menu | What it does |
|---|---|
| Overview | Appointments needing billing review, dispensed prescriptions that may generate charges, registered patients, claims generated |
| Pending charges | Outstanding charges and unpaid balances |
| Payment panel and receipts | Full and partial payments, printed receipts (ticket style with barcode) |
| My till and shift | The cashier's till and shift activity |
| Refunds | Refund requests (approved in Administration) |
| Shift reconciliation | Reconcile the cashier's transactions |
| Price list | Configured service prices |
| Billed vs claimed | Billing compared with available claims information. Not a full G-DRG reimbursement calculation |

### 7. Claims (claims officer)
NHIS claims preparation, validation, mapping, export, import review, monthly monitoring. **Generate and validate only. There is no submit button.**

| Menu | What it does |
|---|---|
| Overview | Saved claims, generated this month, medicine tariff mapping gaps, export-ready records, recent claims |
| Pipeline | Claims by processing stage |
| Claims list and detail | Saved claims, auto-filled from patient and clinical data, validation results, XML preview and download |
| Mapping queue | Reference and tariff mappings. Fixes are applied to claim generation, not kept as a separate list |
| Export batches | Export batches and their lifecycle (the file is downloaded, never sent) |
| Import reports | Imported CLAIM-it reports and their contents |
| Month progress | Monthly claims preparation progress |

### 8. Administration (hospital administrator, management viewer)
Hospital-wide management, configuration, permissions, facilities, inventory, oversight.

| Menu | What it does |
|---|---|
| Management dashboard | Hospital-wide activity, financial and clinical indicators |
| Hospital profile | Hospital information and configuration |
| Departments, wards, beds | Departments, wards, beds and bed capacity |
| Users, roles, permissions | Accounts and role permission assignments |
| Service catalogue and prices | Services and prices |
| Reference mappings | Reference and code mappings |
| Thresholds and settings | Operational thresholds and settings |
| Reports | Hospital reports |
| Refund approvals | Approve or decline refund requests |
| Inventory console | Administrative inventory access, adjustment approval |
| Audit viewer | Recorded administrative activity |
| Sync conflicts | Review synchronisation conflicts |
| Realtime SLA monitor | Realtime monitoring information |
| Backup status | Backup status information |

A management viewer sees only the management dashboard and reports.

## Shared across every workspace

| Feature | What it does |
|---|---|
| Global search | Patients, appointments, laboratory orders, prescriptions and claims. Focus with `/` |
| Notifications | Critical laboratory results, low stock, patients awaiting care. Critical items stay until acknowledged |
| Patient 360 | A patient's record at `/patient/:id`, tabbed, shown according to permissions |
| Theme switcher | Light and dark |
| Profile menu | Settings, Profile, Log out |
| Permission controls | Navigation and pages follow the person's roles and permissions |

## How the workspaces are linked

Every row is an automated test in the final milestone. Target for each cell: visible within 5 seconds, hard limit 10 seconds, with no refresh, no retyping and no phone call.

| Event | Where it shows up |
|---|---|
| Patient registered | Reception Patients and Overview. Patient 360 exists. Claim data gaps re-checks the record |
| Encounter opened (check-in) | Reception OPD queue. Nurse Triage queue and Overview. Cashier Pending charges (registration charge). A claim candidate begins |
| Registration paid | Cashier Pending charges clears. Reception Payment status updates. Patient 360 billing tab |
| Triage completed | Doctor My queue (with priority and vitals). OPD card moves to waiting doctor. Vitals become available to the claim |
| Consultation saved and paused | Doctor My queue shows it paused. Doctor can attend other patients. OPD shows investigations pending |
| Lab ordered | Lab Worklist. Cashier Pending charges (lab charge). OPD shows investigations. Patient 360 labs tab |
| Specimen collected, result entered | Lab Specimens, Result entry and verification |
| Result verified | Doctor Results inbox (critical first). Claim investigation line ready. Patient 360 results |
| Critical result | Notification to the doctor. Lab Critical results needs acknowledgement. Critical strip until acknowledged |
| Prescription created | Pharmacy Prescription queue. Doctor shows prescribed. Patient 360 medications |
| Medicine dispensed | Tracked stock reduced. Stock alerts if at or below reorder level. Cashier Pending charges (pharmacy charge). Doctor shows dispensed. Claim medicine line ready. Missing code raises Formulary mapping flags and the Claims Mapping queue |
| Payment recorded | Cashier receipt. Reception Payment status. Patient 360 billing |
| Consultation completed | OPD card closes. Claim becomes Ready when nothing blocks it |
| Admission requested | Nurse Admission requests. After approval: Doctor My admissions, Ward and bed board bed Occupied, Nursing tasks created, Cashier inpatient billing opens |
| Discharge checklist completed, patient discharged | Bed goes to cleaning. Cashier finalises charges. Claim candidate gets outcome and dates. Doctor admission closes |
| Mapping fixed (Claims or Pharmacy) | Claim validation re-runs. Claim data gaps and Formulary flags clear |
| Claim generated and validated | Claims list and detail, Pipeline, Month progress |
| Export batch created | XML file downloaded from Export batches (no submission) |
| CLAIM-it import report uploaded | Failures raise tasks in the responsible workspace: Reception for registration data, Doctor for clinical, Lab, Pharmacy |
| Refund requested | Cashier Refunds, then Administration Refund approvals, then back to Cashier |
| Price, threshold or permission changed | Applies across every workspace |

## End-to-end actions

**A. An outpatient visit on NHIS**
1. Reception registers the patient (NHIS number, dependant flag, date of birth, sex) and checks in.
2. Cashier records the registration payment.
3. Nurse takes vitals and completes triage, handing over to the doctor.
4. Doctor consults: several diagnoses (ICD-10 and G-DRG), lab requests and prescriptions from lists. Age rules block anything not applicable. Saves and pauses while waiting.
5. Lab collects, enters and verifies results. The doctor sees them in the Results inbox and completes the consultation.
6. Pharmacy dispenses. Tracked stock reduces.
7. Cashier collects non-covered charges.
8. The visit closes. The claim becomes Ready if nothing blocks it.
9. Claims officer enters the CCC, validates, downloads the XML and later uploads the CLAIM-it import report.

**B. Admission and discharge**
1. Nurse or doctor raises an admission request. It is approved.
2. A bed is allocated without double-booking. The board shows it Occupied.
3. Nursing tasks run during the stay: medication administration, vital-sign rounds, dressings, IV checks.
4. The doctor reviews the patient under My admissions.
5. The discharge checklist is completed. The patient is discharged and the bed goes to cleaning.
6. Cashier finalises inpatient charges. The claim candidate carries the outcome and dates.

**C. A critical lab result**
Lab verifies a result flagged critical. The doctor is notified and a critical strip appears until acknowledged. Lab Critical results shows it until it is acknowledged on both sides.

**D. Stock running low**
A dispense or lab issue takes tracked stock to or below its reorder level. Stock alerts raises it in the workspace and the notification centre. Receipts and adjustments are recorded as movements. Large adjustments need approval in Administration.

**E. A claim that does not pass validation**
Validation shows exactly what is missing. Patient data problems appear in Reception Claim data gaps. Missing codes appear in Pharmacy Formulary flags and the Claims Mapping queue. Once fixed, validation re-runs and the claim moves to Ready.

## Scope notes

- The nurse, doctor and administration menus include inpatient basics (ward and bed board, admission requests, discharge checklist, my admissions, departments, wards and beds). These need the `inpatient` and `nursing` schemas, which were scheduled later in the original architecture. They are now part of this build. Radiology, theatre, maternity and HR are still outside it.
- Database Blueprint Part 3 was not supplied, so inpatient, pharmacy, inventory, finance, insurance and audit tables are designed from this document and the architecture specs and marked in `VERIFY.md`.
- The brief describes a browser-local preview. This build uses Supabase, with the permission model enforced in the database.
