# Role dashboard audit and proposal

## Scope and status

This document records the current frontend audit and the user-approved role-oriented workspace structure. Local demo sign-in and permission behavior are preview-only; they do not implement authentication or secure authorization.

The current application is a synthetic-data UI preview. It must not be used with real patient information.

## Current-state audit

### Application shell and routes

- `src/App.jsx` now provides a shared shell with role-filtered navigation, direct-route fallback, patient search, theme toggle, notification affordance, profile/settings/sign-out menus, and scroll-to-top navigation.
- `/signin` offers passwordless demo role selection. This is not a real identity, authentication, or security boundary. Multiple selected roles receive the union of their local permission grants.
- Role grants and theme settings persist locally and can synchronize between tabs. The app does not connect to Supabase.
- Several menu areas remain explicit placeholders; a visible menu entry does not imply a functioning backend workflow.

### Implemented modules and maturity

| Module | What is present | Boundaries and gaps |
|---|---|---|
| Patients | A 120-record synthetic directory, patient registration/editing, coverage details, patient profile tabs, and visit-linked vitals/care records. | Patient data persists in this browser profile only. Several history tabs show synthetic example rows when no live record exists. There is no durable clinical record. |
| Front desk | Appointment scheduling and walk-in check-in, date/status filtering, queue view, patient lookup, and editable SMS drafts. | Appointments persist locally and sync across same-profile tabs. SMS is not sent; Arkesel is not configured. |
| Nursing | Check-in queue, vitals capture, triage status, handoff to the clinician queue, admission requests, and discharge checklist. | Vitals and workflow state persist locally and sync across tabs. This preview is not a validated clinical chart. |
| Clinical care | Resumable consultations, multiple coded diagnoses, multiple lab requests, multiple prescriptions, pause/resume while awaiting results, and completion checks. | Consultation and order data persist locally. Code formats and result state are checked but do not establish clinical appropriateness or authoritative code validity. |
| Laboratory | Order queue, processing with tracked stock deduction, separate result entry and verification, and feedback to the ordering consultation. | Orders, results, and stock persist locally. Seeded inventory and prices are synthetic; official lab tariff mappings are not configured. |
| Pharmacy | Prescription queue, separate verification/dispense actions, tracked stock deduction on dispense, inventory viewing, and a billing estimate. | Orders and inventory persist locally. NHIS tariff data is separate from test-only retail add-ons; the add-ons are not real prices. Inventory management is limited to the administrator preview role. |
| Claims | Patient-linked claim preparation, age-sensitive code checks, XML generation/validation, paper-style sheet preview, month/year archive filters, duplicate-encounter protection, and XML download. | The archive is browser `localStorage`, not shared across users or devices. No claim submission is present, by design. Coverage estimates include known dispensed-medicine tariffs only; diagnosis and investigation tariffs are not configured. |
| Inpatient | Synthetic bed board, nurse admission requests, administrator bed assignments/discharge, nurse discharge checklist, and bed cleaning/ready states. | State persists locally and syncs across tabs. Admissions are not linked to encounters, finance, or a durable backend. |
| Finance | Sample invoice ledger, balance calculations, local payment preview, and archived known medicine coverage. | Payments persist locally, but invoices are not generated from actual consultation, lab, pharmacy, procedure, or inpatient charges. No reconciliation or durable ledger exists. |
| Reports | Synthetic patient/appointment/clinical/claim metrics, seven-day appointment chart, and CSV export for appointments, clinical activity, or archived claims. | It omits finance and inpatient records, has no durable/audited reporting source, and some values/overview data are previews rather than operational analytics. |

### Data and workflow handoffs

The current positive foundation is that Front desk, Nursing, Clinical, Laboratory, Pharmacy, Patient details, Claims, and some Reports consume shared module stores rather than independent copies for every page.

1. `patientStore.js` supplies the shared synthetic patient directory.
2. `frontDeskStore.js` supplies appointments and visit status. Front desk check-in moves a visit into the shared queue.
3. Nursing reads that queue, records vitals on the appointment, and changes its status to `With clinician`.
4. Clinical reads clinician-ready visits, stores consultation drafts and coded diagnoses, and creates lab and prescription orders.
5. Laboratory and Pharmacy consume those care-store orders. Lab results return to the same order and can be reviewed when the clinician resumes the consultation. Pharmacy dispensing updates the prescription and tracked inventory.
6. Patient details read live session vitals and care data. Claim generation uses patient and encounter information; completed claim snapshots and XML are archived separately in browser storage.

The shared preview stores use local storage and browser broadcasts, so records survive reloads and update between tabs in the same browser profile. They do not provide cross-device synchronization, transactional concurrency, conflict resolution, audit history, or production recovery.

### State and production-readiness findings

- Supabase is not connected to the client. `supabase/` currently contains configuration and placeholder files, but no operational migrations, Edge Functions, or database tests.
- Patient, appointment, nursing, clinical, lab, pharmacy, inpatient, finance-preview, and claims data are browser-local only; none is persisted to Supabase.
- Demo sign-in is local and passwordless. Role menus and action guards are client-side preview behavior, not authorization.
- There is no durable audit trail, production error monitoring, or validated production code/tariff master.
- Admission requests and bed assignments now hand off in local state, but finance remains disconnected from actual service charges.
- The project constraint forbids RLS in migrations. That is not itself a safe access-control design. Do not connect real patient data until an independently reviewed, server-enforced access-control design and tests are agreed and deployed. Never put a Supabase service-role/secret key in the browser or Electron renderer.
- Front-desk SMS drafts are local only. An Arkesel integration requires a trusted server-side function, secret management, consent/recipient controls, delivery-state handling, and audit records.

## User-approved role workspaces

The following eight roles supersede the earlier ten-workspace proposal. Demo sign-in selects exactly one role at a time. Menus, submenus, and individual actions should be permission-driven; unauthorized entries must be absent rather than shown disabled. The frontend preview can demonstrate these rules but cannot secure data or actions.

| Role | Home and menu areas | Key work and handoffs |
|---|---|---|
| **Reception** (Receptionist + Records officer) | Reception desk; Appointments; Patients; Documents; OPD queue; Claim data gaps; Payment status (view only). | Sole patient creation and check-in workspace. Check-in places the same patient encounter on Triage. Captures insurer, member number, and expiry. |
| **Nurse** (Triage nurse + Ward nurse + bed board duties) | Triage queue; Ward & bed board; Nursing tasks; Admission requests; Discharge checklist; OPD queue (view only). | Records vitals, priority, and red flags; vitals appear in Patient 360 and feed the doctor's encounter. Completing triage sends the patient to the doctor's queue. |
| **Doctor / Consulting** | My queue; Consultation; Results inbox; My admissions; OPD queue (view only). | Supports multiple diagnoses, lab requests, prescriptions, and procedures in selectable structured rows; save/pause and resume; age validation; orders route to Lab and Pharmacy; results return to the same encounter. |
| **Lab** | Worklist (Ordered, Collected, Received, In process, Awaiting verification, Verified today); Specimens; Result entry & verification; Critical results; Test catalogue (permission-gated); Inventory. | Tracks specimen and result states. Tracked supplies decrement per performed test; untracked supplies do not. Verified results return to the doctor's inbox. |
| **Pharmacy** (Pharmacist + Pharmacy assistant) | Prescription queue (New, In progress, Partial, Dispensed); Dispensing panel; Stock alerts; Stock levels (view only); Formulary mapping flags; Inventory. | Dispense and verify controls require their own grants. Tracked stock decrements on dispense; untracked stock does not. Stock adjustments belong in the Admin inventory console. |
| **Cashier / Accountant** (Cashier + Finance officer) | Pending charges; Payment panel & receipts; My till & shift; Refunds; Shift reconciliation; Price list; Billed vs claimed (view only). | Collects charges from consultation, lab, drugs, procedures, and admissions. Refund approval is separately permission-gated. |
| **Claims Officer** | Pipeline (Not ready, Ready, Exported, Import passed/warned/failed, Submitted); Claims list/detail; Mapping queue; Export batches; Import reports; Month progress. | Claim generation, validation, and print preview only; no submit button. Upstream demographics, insurance, diagnoses, labs, drugs, and procedures populate claims. Missing data is surfaced to Reception as claim data gaps. |
| **Hospital Administrator** (Administrator + Management viewer + Store keeper + Bed manager) | Management dashboard; Hospital profile; Departments, wards, beds; Users, roles, permissions; Service catalogue & prices; Reference mappings; Thresholds & settings; Inventory console; Audit viewer; Break-glass review; Sync conflicts; Realtime SLA monitor; Backup status. | Management tiles/trends are view-only; bed/admission tools and inventory ledger are included. Users and permissions are seeded for review and adjustment by department heads. |

Radiology, Emergency, Theatre, Maternity, HR, and Blood bank are reserved for later releases. The preview signs into one role workspace at a time. Permission grants for roles and individual actions (for example verify, dispense, refund approval, edit, and delete) are independent.

## Global interface and workflow requirements

- Every role shares a top bar with global patient search, notifications, connection status, break-glass, and profile.
- Selecting a patient name anywhere opens Patient 360 as a page, never a modal. Navigation scrolls to the top.
- Patient 360 remains a tabbed patient detail page. Patient directory cards remain four per row and 50 per page; cards show a status badge without an accent bar or list actions.
- Age checks apply to every age-sensitive action, item, and rule across consultation, lab, drugs, procedures, and dispensing. An inapplicable item cannot be selected or submitted. Age limits must come from explicit, approved clinical/catalog metadata; do not infer or invent medical restrictions.
- The target is desktop-only. Do not add mobile-specific checks or new mobile breakpoints as part of this role-dashboard work.
- Claims remain generate/validate/print-preview only. Do not add a submit button.
- Preserve the shared patient and encounter identities across all workspaces. Role-specific dashboards must not fork the underlying data.
- The workflow chain is Reception → Nurse → Doctor → Lab ↔ Doctor → Pharmacy → Cashier → Claims Officer → Administrator. The Administrator provides oversight.

## Shared design and workflow rules

- Use one shared patient identifier and one encounter identifier from registration through check-in, triage, consultation, orders, results, dispensing, billing, and claims.
- Keep the role-specific home pages separate while preserving one source of truth for patient, encounter, order, stock movement, charge, payment, and claim records.
- Derive actionable counts and charts from the same authorized persisted records that power each queue. Do not duplicate hard-coded counts in the Overview.
- Make handoffs explicit and state-driven. Examples: checked in → triage → clinician; lab requested → processing → result ready → clinician reviewed; prescription sent → dispensed; encounter completed → claim review; service charge → invoice → payment.
- Store actor, timestamp, prior/new state, and reason for clinically or financially significant changes in an audit trail.
- Keep the shared shell (brand, theme, notification center, profile, global patient search, connection status, break-glass entry) but make notifications and search results respect the signed-in user’s access.
- Preserve the explicit product boundary that generated claims are review/preview artifacts only; never imply that archiving an XML file submits it.

## Recommended implementation sequence

1. **Build preview-only role navigation:** use the approved eight-role structure to demonstrate hidden menus, merged grants, role-specific homes, and per-action visibility. Make clear this is not authentication or security.
2. **Resolve identity and security:** choose authentication and server-enforced authorization, including a reviewed alternative compatible with the no-RLS migration constraint. Define and test the permission matrix before production role guards.
3. **Establish durable shared records:** design and test patient, encounter, appointment, vitals, consultation, orders/results, inventory movements, admission, charges/payments, claims archive, and audit data. Preserve existing encounter relationships.
4. **Convert one workflow at a time:** Reception → Nurse → Doctor → Lab/Pharmacy → Cashier/Claims; then connect bed management. Avoid separate role-specific copies of shared workflows.
5. **Create role analytics and reports:** define metric formulas and permissions, then calculate them from persisted operational data. Add freshness and source labels.
6. **Verify and document:** test role/menu/direct-route access, end-to-end handoffs, state transitions, reload/cross-session persistence, data isolation, XML validation, and deployment. Capture screenshots for each completed dashboard and update the README with verified screenshots.

## Preview boundary

The current implementation is still a local role-workspace preview. Any role selector is a demo control, not a signed-in identity. Do not represent hidden menus as sufficient protection, and do not connect real patient data until authentication, server-enforced authorization, persistence, and audit controls are approved and implemented. Local browser synchronization does not provide shared staff workspaces.oved and verified.
