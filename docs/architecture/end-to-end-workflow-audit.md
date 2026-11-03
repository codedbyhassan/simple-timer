# Ascend HMS — End-to-end workflow and role audit

**Audit target:** `codedbyhassan/simple-timer`, branch `main`  
**Audit date:** 3 November 2026  
**Scope:** All registered role navigation destinations, shared shell, patient/encounter stores, reception, nursing, consultation, laboratory, pharmacy, inpatient, finance, claims, administration, reports, and the browser-local persistence layer.

## 1. Executive assessment

The application has a useful connected *preview workflow*: Reception, Nursing, Clinical, Laboratory, Pharmacy, Patient 360 and Claims read several common browser stores. That is a meaningful foundation. It is not yet a complete hospital operating system, and the workflow is not safe to treat as a production clinical or financial record.

The most serious issue is not visual. It is that the same visit is not carried through one authoritative encounter, charge, payment and claim lifecycle. The current cashier pages use two different charge/payment models; patient billing history does not read the finance ledger; claims use a separate local archive; and several administrator tools describe monitoring or reconciliation they do not actually perform.

### Severity key

- **Critical:** can create a materially incorrect clinical, financial, access-control or claim outcome, or makes production use unsafe.
- **High:** breaks a major handoff, produces misleading operational state, or prevents a core task from being completed reliably.
- **Medium:** weakens validation, auditability, discoverability, usability or reporting.
- **Low:** refinement or consistency issue.

### Highest-priority findings

| ID | Severity | Finding | Why it matters |
|---|---|---|---|
| WF-01 | Critical | The app is still a local demo: role selection is not authentication and permissions are client-side. | There is no server-side identity, authorization, shared patient database or production audit boundary. |
| WF-02 | Critical | FinancePage and TillShiftPage use separate charge/payment sources and do not reconcile with each other. | A payment can appear in one cashier workflow but not another; consultation/lab/pharmacy charges are incomplete or inconsistent. |
| WF-03 | High | A clinician opening an encounter automatically marks every ready lab result as reviewed. | The system records a clinical review event without an explicit review/acknowledgement action. |
| WF-04 | High | Consultation, triage and queue views are date-bound to the current day. | A paused encounter or patient waiting overnight can disappear from the relevant queue the next day. |
| WF-05 | High | Reference mappings and inventory claim codes are separate sources of truth. | A mapping can exist in the admin/claims mapping table but still not be used on orders or claim XML. |
| WF-06 | High | Critical lab results have no explicit acknowledgement/escalation lifecycle. | A critical flag is displayed, but there is no accountable acknowledgement, escalation or closure event. |
| WF-07 | High | Patient 360 billing history is not connected to the invoice/payment ledger. | Staff cannot rely on the patient chart to show the complete financial position. |
| WF-08 | High | Claims preparation omits procedures and several fields needed by the wider claim form. | Generated claim data can be incomplete even when the current validation passes. |
| WF-09 | High | The cashier till actions are not separately guarded by payment-recording permission. | A role with till-view access can also record payments and close the till. |
| WF-10 | High | The operational audit, sync-conflict and SLA tools are partial local checks, not authoritative controls. | Administrators may believe risks are monitored when they are not. |

## 2. Audit method and limits

I traced the route registry in `src/access/roleAccess.js`, the route dispatch and shell in `src/App.jsx`, each page component registered by those routes, and the stores each page reads or mutates. I also reviewed the existing route tests and CI workflow.

This is a **source-level workflow audit**. It verifies the implemented code paths and data handoffs. It is not a claim that a live browser session was clicked through at every viewport, that a real Supabase environment was exercised, or that clinical and NHIA/NHIS rules have been independently certified. Those require a running browser, representative test data, approved code masters and a real integration test environment.

The current repository itself documents a browser-local preview architecture. The Supabase folders contain placeholders rather than operational migrations, functions or database tests. Do not connect real patient data to this build.

## 3. End-to-end patient journey

### 3.1 Reception → patient registration → appointment / walk-in

**Pages:** Reception overview, Reception desk, Appointments, Patients, OPD queue, Documents, Claim data gaps, Payment status.  
**Sources:** `FrontDeskPage.jsx`, `frontDeskStore.js`, `PatientsPage.jsx`, `patientStore.js`, `WorkspacePages.jsx`.

**What is connected**
- Reception and patient registration use the same patient store.
- Appointments store a patient ID, patient name and phone snapshot.
- Check-in changes the appointment state to `Checked in`; the OPD queue reads that same appointment record.
- The date and status filters, patient lookup and appointment duplicate-clinician/time check are present.
- Walk-ins are created directly in the checked-in state.
- Patient directory and patient detail routes share the same patient identity.

**Findings**
1. **[Medium] The “Checked in” statistic overcounts.** The value adds `Checked in`, `In triage`, `With clinician` and `Completed`. The label says “Checked in”, but it includes visits already handed off or completed. This makes the reception dashboard semantically wrong.
2. **[High] Appointment management is incomplete.** The page can create appointments and advance selected statuses, but there is no full edit/reschedule/cancel workflow. “Cancelled” exists as a filter/status value, but no visible action creates that state. A duplicate check exists for clinician/date/time, but there is no equivalent duplicate patient booking check.
3. **[Medium] Queue timestamps are not a complete encounter timeline.** The record has appointment date/time and a checked-in time, but no durable timestamps for each subsequent handoff. That makes waiting-time reporting and later reconstruction unreliable.
4. **[Medium] Reception's Claim data gaps check is weaker than claim validation.** Its member-number expression accepts alphanumeric/hyphen values of six or more characters, while claim validation requires exactly 8 or 10 digits. A patient can therefore pass the reception gap check and still fail claim generation. It also does not comprehensively check dependant status, code completeness or all fields required by the claim validator.
5. **[Medium] Expired cover is collapsed into “Non-insured”.** `getPatientInsuranceStatus` returns “Non-insured” for expired policies as well as missing cover. This hides the distinction between never insured and expired insurance in the directory and dashboard.
6. **[Medium] Document uploads are browser-local.** The file is stored as a data URL in localStorage, with an 800 KB cap. There is no document storage service, server-side access policy, malware scanning, file-type policy or durable document audit. The file input is not reset after a successful save, and FileReader failure is not surfaced through an explicit error handler.
7. **[Medium] Patient duplicate detection is narrow.** Phone-number uniqueness is checked only when a phone number is supplied. That is useful but not a robust identity-matching process; names and DOB are not reconciled, and phone reuse/shared family phones are possible.
8. **[Medium] Appointment data is local.** Reception changes synchronize between tabs in one browser profile only. A nurse on another workstation does not receive the visit.

**Recommended target**
- Use a single appointment/encounter identity with explicit status transitions and timestamps.
- Add reschedule/cancel actions with reason, actor and audit record.
- Define separate metrics for checked-in, triage, clinician, completed and cancelled.
- Make Claim data gaps call the same validation rules as claim preparation.
- Distinguish active, near-expiry, expired and missing insurance.
- Move documents and patient records to secure backend storage before real patient data is used.

### 3.2 Reception → Nursing triage

**Pages:** Triage queue, Nurse overview, Nurse OPD queue, Nursing tasks, Admission requests, Discharge checklist.  
**Sources:** `NursePage.jsx`, `OperationsPages.jsx`, `WorkspacePages.jsx`, `frontDeskStore.js`.

**What is connected**
- Nurse reads appointments created by Reception.
- `Checked in` visits can be moved into `In triage`.
- Vitals are saved onto the appointment and the appointment moves to `With clinician`.
- Patient 360 reads vitals from the same appointment record.
- Nurse can request an admission; the inpatient page reads that request.

**Findings**
1. **[High] The nursing queue only reads today's appointments.** The module-level `today` value is fixed when the module loads, and `dayAppointments` filters to that date. An encounter left in triage or handed off late in the day can disappear after midnight, despite remaining unfinished in storage.
2. **[High] No triage acuity / priority / red-flag workflow exists.** The vitals form captures numeric observations and notes, but there is no triage category, escalation reason, allergy alert, pain escalation rule, emergency handoff or explicit priority. The screen is a vitals capture form, not a complete triage assessment.
3. **[High] The nurse-to-doctor handoff has no explicit acknowledgement.** Saving vitals changes the appointment to `With clinician`, but there is no handoff timestamp, recipient acknowledgement or handoff note status. The doctor queue infers readiness from the status alone.
4. **[Medium] The vitals checks validate input format, not clinical plausibility.** HTML min/max constraints help, but the app does not interpret abnormal values or produce a warning/escalation. The UI explicitly says clinical alerts are not provided.
5. **[Medium] The handoff list is not a durable work queue.** It only includes today's visits with vitals. It does not provide an outstanding handoff acknowledgement, ownership or age-of-wait.
6. **[Medium] Nursing tasks are a separate mini-system.** The task list can create and complete MAR-like tasks, but the medication task is not a true medication-administration record linked to a verified dispense, dose schedule, administration time, administering staff and omission reason. “Done” is not proof of administration.
7. **[Medium] The task list is not a clinical encounter timeline.** Task completion is stored in workspace data, while vitals and visits are stored elsewhere. It does not automatically appear as a structured event in Patient 360.
8. **[Medium] Ward admission is a separate path from the OPD encounter.** Admission requests and bed assignments are stored in the inpatient store, but they do not convert the original OPD encounter to inpatient status or create a linked inpatient episode.

**Recommended target**
- Separate the triage queue from a current-day appointment schedule; keep all open encounters visible until closed.
- Add priority, red flags, allergy review, escalation and handoff acknowledgement.
- Record each vital with author, time, units, source and correction history.
- Make MAR tasks derive from dispensed prescriptions and require a structured administration outcome.
- Link admission requests and bed assignments to the originating encounter and inpatient episode.

### 3.3 Nursing → Doctor / Consultation

**Pages:** Doctor overview, My queue, Consultation, Results inbox, My admissions.  
**Source:** `CarePages.jsx`, `careStore.js`.

**What is connected**
- The doctor queue reads visits whose appointment status is `With clinician` or `In consultation`.
- A new visit and an existing consultation draft are separated into queue and resume states.
- The active patient context shows vitals and counts of prior consultations and prescriptions.
- The clinician can save/pause, add diagnoses, request labs, prescribe medicines and complete the consultation.
- The consultation is linked to patient and appointment IDs.

**Findings**
1. **[High] Open consultation work is date-bound.** The clinical visit selector filters to today's appointment date. A paused encounter can be persisted as `In progress` or `Awaiting results`, but the queue stops showing it on a later date. The same issue applies to results inbox.
2. **[High] Opening a visit marks lab results reviewed automatically.** In `openVisit`, a user with `clinical.results.review` causes all `Result ready` orders for that appointment to receive `reviewedAt`. There is no explicit result-by-result review action, interpretation, comment or acknowledgement. Merely opening the encounter can clear the “unreviewed” state.
3. **[High] A result-review-only user can trigger the same auto-review.** The logic is attached to `canReviewResults`, not to a deliberate review submission. The user may not have consultation-edit permission, yet opening the visit can change result review metadata.
4. **[High] Consultation completion requires a diagnosis and both code fields, but only validates format.** The two seeded diagnoses are a tiny catalogue. Custom diagnosis rows can be typed manually. The regex checks do not prove the ICD-10 or G-DRG code exists in the current official code master or is valid for the hospital's claim period.
5. **[High] Procedure entry is missing.** The consultation form does not create procedure records; claim creation always sends an empty procedure array; Patient 360 has a Procedures tab with no live source. The role design calls for selectable procedure rows, but that handoff is not implemented.
6. **[High] The patient context is not a complete clinical chart.** It shows a count of saved consultations and prescriptions, not the relevant prior diagnoses, allergies, medication list, active problems, previous results, contraindications or full history. The “View chart” action navigates away from the active consultation.
7. **[High] Prescribing lacks core medication-safety fields.** Dose, frequency, duration, quantity and free-text instructions are captured, but route, dose unit, formulation, administration schedule, allergy checking, interaction checking, age/weight checks and duplicate therapy checks are absent.
8. **[Medium] A lab order is saved with the current inventory code snapshot.** It captures the current claim code when ordered. Later mapping changes do not update that existing order. This is expected for immutable clinical snapshots only if the mapping version and effective date are preserved; those are not recorded.
9. **[Medium] No explicit cancellation/amendment lifecycle exists for consultation orders.** The code shown creates lab orders and prescriptions, but there is no safe cancel/reissue process with reason and audit trail.
10. **[Medium] Closing the consultation and completing the appointment are coupled.** The appointment is set to `Completed` as soon as the clinician completes the consultation, before pharmacy dispensing, billing, payment or claims preparation. The application therefore treats “consultation completed” as if the overall visit is complete.
11. **[Medium] The selected clinician identity is hard-coded/fallback-based.** The component defines a fixed clinician name and relies on the appointment clinician string. There is no authenticated staff identity or clinician assignment validation.

**Recommended target**
- Keep encounter state independent of calendar date.
- Separate “result viewed”, “clinically reviewed”, “acknowledged”, and “action taken”.
- Use approved diagnosis/procedure/medication masters with effective dates and code validation.
- Build a true encounter workspace with history, allergies, medications, problem list, results and orders in context.
- Model consultation completion separately from visit closure and billing completion.

### 3.4 Consultation → Laboratory

**Pages:** Lab overview, Worklist, Specimens, Result entry & verification, Critical results, Test catalogue, Inventory.  
**Sources:** `CarePages.jsx`, `careStore.js`, `workspaceStore.js`.

**What is connected**
- Clinical orders are created from laboratory inventory items and appear in the lab worklist.
- Worklist states include `Requested`, `Processing`, `Result entered` and `Result ready`.
- Processing assigns a specimen ID and decrements tracked stock once.
- Result entry and verification are separate actions.
- A verified result returns to the same encounter and is available in the clinician result inbox.

**Findings**
1. **[High] Specimen lifecycle is incomplete.** A specimen ID is created when processing starts. There are no separate collected, received, rejected, recollected or accessioned states, despite the Specimens page implying specimen management.
2. **[High] Stock is deducted when processing starts, not when a performed test is confirmed.** There is no cancel/void/reversal path if the sample is rejected, the order is cancelled or the test is not performed. This can leave stock inaccurate.
3. **[High] Critical-result workflow is display-only.** Critical results are filtered and shown, but there is no acknowledgement, clinician contact timestamp, escalation path, recipient, repeat confirmation or closure. The “reviewedAt” side effect in the doctor page is not a critical-result acknowledgement.
4. **[High] Result values are free text.** There are no analyte-specific units, reference intervals, numeric validation, instrument/method, specimen quality, result amendment version or verified-by identity. This limits safety and makes results difficult to compare longitudinally.
5. **[Medium] Verification is only a status transition.** It checks that a non-empty result exists and that the state is `Result entered`; it does not validate result completeness against a test-specific template.
6. **[Medium] No turnaround SLA stage timestamps.** The SLA page measures from `requestedAt` for all open lab orders, even after processing has started. It cannot distinguish collection delay, lab receipt delay, processing time and verification delay.
7. **[Medium] The seeded lab claim codes are blank.** Initial lab inventory has empty `claimCode` values. The claims mapping table contains local mappings, but the lab order creation reads only the inventory item's `claimCode`; it does not resolve the configured mapping table.
8. **[Medium] Inventory movements are local and incomplete.** Opening snapshots and issue movements exist, but there is no supplier receipt, lot/expiry, wastage, return, adjustment approval or count reconciliation workflow for the lab supplies.

**Recommended target**
- Model a specimen and test lifecycle independently from the order.
- Deduct stock on an explicit performed/consumed event, with reversal and wastage reasons.
- Introduce structured result templates, units, reference intervals and amendments.
- Add critical-result acknowledgement and escalation with an auditable recipient/time/outcome.
- Resolve claim codes from one versioned mapping service when an order is created.

### 3.5 Consultation → Pharmacy

**Pages:** Pharmacy overview, Prescription queue, Dispensing panel, Stock alerts, Stock levels, Formulary mapping flags, Inventory.  
**Sources:** `CarePages.jsx`, `careStore.js`, `nhisMedicineCatalog.json`.

**What is connected**
- Prescriptions are created by consultation and appear in the pharmacy queue.
- Pharmacy verification accepts `Requested` or `Sent to pharmacy` and moves the prescription to `Verified`.
- Dispensing is a separate action and changes status to `Dispensed`.
- Tracked stock is deducted at dispense, with a movement record.
- A billing estimate is attached to the prescription using the patient’s NHIS status and saved retail/tariff fields.

**Findings**
1. **[Critical] Seeded medicine retail prices are synthetic random add-ons.** `careStore.js` creates a random top-up per medicine and marks it `synthetic-test`. That is suitable only for a clearly isolated demo. It must never feed a real patient invoice, patient top-up or NHIS claim without replacing the synthetic price source and removing the test mode.
2. **[High] Verification does not reserve stock.** Verification checks current availability, but does not reserve quantity. Several prescriptions can all become Verified against the same on-hand stock. Dispensing rechecks availability, which prevents a negative balance, but verified work can become blocked unexpectedly.
3. **[High] No partial dispensing or substitution workflow.** The dispense action uses the full prescribed quantity. There is no partial fill, balance due, substitution approval, return, cancellation or reason-coded reversal.
4. **[High] No batch/lot/expiry tracking.** Stock is one quantity per item. The app cannot select an expiry lot, perform FEFO, quarantine a batch or trace a recall.
5. **[Medium] Medication safety is not connected to the patient chart.** The dispensing view does not check allergies, duplicate ingredients, contraindications, age/weight or interaction warnings.
6. **[Medium] Formulary mapping flags are not a full formulary workflow.** The mapping view can show missing claim codes, but there is no approval lifecycle, formulary status, effective date or evidence source.
7. **[Medium] Pharmacy inventory is not an end-to-end procurement ledger.** Opening stock and dispensing movements exist, but supplier receipts, supplier invoices, stock counts, returns, wastage and approval controls are absent.

**Recommended target**
- Replace all synthetic retail price inputs with approved, effective-dated prices.
- Reserve stock at verification or make verification explicitly provisional and recheck on dispense.
- Add partial dispense and reversal flows.
- Add lot/expiry and stock reconciliation.
- Connect the patient medication profile and allergy review to both prescribing and dispensing.

### 3.6 Consultation / Lab / Pharmacy → Cashier and billing

**Pages:** Pending charges, Payment panel & receipts, My till & shift, Shift reconciliation, Refunds, Price list, Billed vs claimed, Patient 360 Bills & receipts.  
**Sources:** `OperationsPages.jsx`, `WorkspacePages.jsx`, `workspaceStore.js`, `careStore.js`, `PatientDetailPage.jsx`.

**This is the most serious workflow break in the current preview.**

There are two separate charge/payment paths:

- `FinancePage` builds invoices from seeded sample invoices plus dispensed prescriptions with calculable billing. Its payment updates `financeStore` and `paymentReceiptsStore`.
- `TillShiftPage` builds charges from completed consultations and lab orders using `useServiceCharges`, then stores payments inside `workspace.tills`.

These stores are not reconciled with each other.

**Findings**
1. **[Critical] Cashier payments are split across two ledgers.** A payment recorded in Pending charges / Payment panel does not update a till payment record. A payment recorded through My till & shift does not update the FinancePage invoice balance or receipt register. The same service can therefore show different balances depending on which cashier page is opened.
2. **[Critical] Charge sources are incomplete and inconsistent.** Till charges include completed consultations and all non-cancelled lab orders, but do not include dispensed prescriptions. FinancePage includes dispensed prescriptions and seeded sample invoices, but does not derive consultation and lab charges from the actual encounter orders. The cashier does not have one complete bill.
3. **[High] Patient 360 billing is not the finance ledger.** Its Bills & receipts tab maps dispensed prescriptions to a billing row. It does not read invoices, partial payments, till receipts or the finance receipt store. A staff member cannot use Patient 360 to see the complete amount billed, paid and outstanding.
4. **[High] Consultation charges are hard-coded to `OPD-GP`.** The till charge builder assigns that code to every completed consultation regardless of department or service type. Specialist or other visit charges can be priced incorrectly.
5. **[High] Missing catalogue prices silently become zero.** `priceFor` returns a fallback of zero. If a service code is missing or unmapped, the service can become a zero-value charge rather than a blocked invoice with a visible pricing exception.
6. **[High] Till view permission includes write actions.** The menu route is granted by `cashier.shift.view`, but My till & shift can open a till, record payments and close it. There is no separate `cashier.payment.record` guard in that page. A custom role grant intended to be view-only is not actually view-only there.
7. **[High] Refund request creation is not guarded by the request permission.** The Refunds page gates approval using `cashier.refund.approve`, but the request form and submit action do not check `cashier.refund.request`. The same page is used for the administrator refund-approvals route.
8. **[High] The till is not an auditable cash-control workflow.** Till payments and close/reconcile actions are browser-local. There is no immutable payment ledger, reversal/void, supervisor review, payment provider reference, terminal reconciliation or bank/mobile-money settlement.
9. **[Medium] Currency handling uses floating-point decimals.** Amounts are stored and calculated as JavaScript numbers with decimal fractions, not integer pesewas or a decimal-safe money type. This can introduce rounding differences in financial totals.
10. **[Medium] Payment receipt stores are not atomic.** FinancePage updates the invoice store and then separately writes the receipt store. If the second write fails, the invoice can be updated without a corresponding receipt.
11. **[Medium] Till reconciliation covers cash variance only.** It calculates opening float plus cash payments. Mobile money and card are displayed as totals but are not reconciled against provider/bank settlement references.
12. **[Medium] Sample invoices are seeded by patient array index.** If patient ordering changes before the finance store is first initialized, a seeded invoice may be associated with a different patient than intended.

**Recommended target**
- Create one immutable charge ledger from consultation, lab, pharmacy, procedure and inpatient service events.
- Generate an invoice from those charges and link all payments, receipts, refunds and reversals to the invoice.
- Use integer pesewas or a decimal-safe monetary representation.
- Require price resolution; do not silently create zero-value services.
- Split till view, payment recording, till close and reconciliation permissions.
- Make Patient 360 billing read the same invoice and payment records as the cashier.
- Enforce payment idempotency and atomic transaction boundaries on the backend.

### 3.7 Cashier / Clinical completion → Claims

**Pages:** Patient 360 NHIS claims, Claims overview, Claims pipeline, Claims list & detail, Mapping queue, Export batches, Import reports, Month progress.  
**Sources:** `PatientDetailPage.jsx`, `ClaimsDashboard.jsx`, `ClaimsWorkspacePage.jsx`, `claimXml.js`, `claimsStore.js`.

**What is connected**
- Claim preparation starts from a completed consultation in Patient 360.
- It gathers result-ready lab orders and dispensed prescriptions from the same consultation.
- It validates required fields and formats, builds XML and saves a claim snapshot.
- Duplicate generation for the same patient/encounter is skipped.
- Claims dashboard reads the saved archive; export batches package selected XML records.
- CSV import is deliberately stored as a separate reconciliation snapshot and does not silently overwrite claim statuses.

**Findings**
1. **[High] Procedure claims are not implemented.** Claim creation always sets `procedure: []`; there is no procedure-order source or consultation procedure form. The paper-style claim sheet includes procedure rows, but the data pipeline cannot populate them.
2. **[High] Several claim-sheet fields are not captured by the preparation form.** The XML builder supports fields such as physician ID, pre-authorization, attendance type, service outcome, specialty, unbundled status and referral information, but the UI does not collect all of them. A valid XML according to the current validator may still be incomplete for a real submission workflow.
3. **[High] Medicine XML omits important displayed claim details.** The paper sheet has description, price, quantity and total cost columns, while the XML builder emits medicine code, quantity, service date and prescription directions. It does not serialize medicine description or price/total values.
4. **[High] Claim mappings are not a single source of truth.** Admin reference mappings live in `workspace.mappings`; claims mapping can separately update `care.inventory.claimCode`; new orders copy the inventory code. Adding a reference mapping does not automatically update the inventory code, and changing an inventory mapping does not rewrite already-created order snapshots. This can result in a mapping visible in one page but absent from the actual claim.
5. **[High] Claim service date is derived from consultation updated time.** `createClaimFromEncounter` uses `consultation.updatedAt` or `createdAt`. Saving/resuming a consultation can change that timestamp; it is not a dedicated encounter service date.
6. **[High] IPD claim data is not linked to the inpatient admission.** IPD admission and discharge dates are manually entered in claim details. They are not sourced from the admission/bed record, and the inpatient episode is not linked to the consultation.
7. **[Medium] Claim code checks are format checks, not official code validation.** The validator explicitly warns that official NHIA/NHIS code-master membership is not verified. Age-specific prefixes are checked, but that is not a substitute for a current official code master.
8. **[Medium] Claim data gaps and claim validation disagree.** Reception may mark an NHIS number as acceptable under a loose alphanumeric expression, while claim validation accepts only 8 or 10 digits. The dependant status is also optional in patient registration but mandatory for claim generation.
9. **[Medium] Mapping changes only affect future orders.** This is stated in the claims workflow, but the UI needs to show which mapping version was captured on each order and provide a controlled correction process.
10. **[Medium] CSV import does not reconcile claims.** It validates the presence of claim ID and status columns and stores rows. It does not match records, detect duplicate/unknown IDs, normalize statuses, report row-level mismatches or update a claim lifecycle. The UI correctly says it does not change claim records, but the page name can be mistaken for a reconciliation function.
11. **[Medium] Export batch selection can become stale.** Selection is retained while month filters change; the batch builder selects from all archive records by selected IDs, not only the currently visible filtered list. This may export records that are no longer visible after a filter change.
12. **[Medium] Claim preview download permission is inconsistent in Patient 360.** The claim preview modal renders a Download XML action without checking `claims.export`. The Claims dashboard does check that permission. This should be corrected before role permissions are treated as meaningful.
13. **[Medium] Claims archive is browser-local.** The claims archive, export batches and import reports are not shared between users/devices and are not backed up together by the current backup export.

**Recommended target**
- Add structured procedure capture and link all claim lines to the source encounter/order.
- Complete the claim data model against the current official schema and required form fields.
- Use one effective-dated mapping service with provenance and version snapshots.
- Store explicit service date and inpatient episode relationships.
- Make claim preparation, validation, export and external submission separate audited states.
- Apply export permission consistently to every XML/print/download action.

## 4. Role-by-role dashboard and menu audit

### Reception
- **Overview:** uses local appointment, patient and visit records. The “Checked in” metric is overinclusive as described in WF-01.
- **Reception desk:** combines appointment schedule and queue operations; useful, but appointment lifecycle actions are incomplete.
- **Appointments:** date/search/status view and booking. No reschedule/cancel workflow.
- **Patients:** directory, search, filters, paging, registration and edit. Insurance status collapses expired and uninsured.
- **Documents:** browser-local file attachment only; not a secure document management service.
- **OPD queue:** useful view of checked-in/in-triage/with-clinician visits; no complete encounter history.
- **Claim data gaps:** useful starting point but does not use the same validation contract as claim generation.
- **Payment status:** routes to FinancePage, which is not a complete live bill view.

### Nurse
- **Overview:** useful local queue snapshot; current-day scope can hide unfinished work overnight.
- **Triage queue:** vitals capture and handoff; no triage acuity, escalation or allergy workflow.
- **Ward & bed board:** shows bed states; bed cleaning can be marked ready. The bed board is not linked to billing or a complete inpatient episode.
- **Nursing tasks:** separate local task list; not a full MAR.
- **Admission requests:** submits a local request for the bed manager.
- **Discharge checklist:** records checklist items, but nurse cannot discharge; discharge is controlled by bed-management permission.
- **OPD queue:** read-only view is sensible, but it shares the reception appointment component rather than a dedicated nursing handoff view.

### Doctor / Consulting
- **Overview:** local queue and order counts; does not distinguish active, overdue and paused encounters well.
- **My queue:** filters new clinician-ready encounters; only current-day appointments.
- **Consultation:** can save/pause, diagnose and create lab/pharmacy orders; missing procedures, clinical history depth and medication safety controls.
- **Results inbox:** results become “reviewed” when the visit opens; not a deliberate review workflow.
- **My admissions:** uses the inpatient module but is not linked to the doctor’s encounter list or admission record.

### Laboratory
- **Overview:** counts open orders, entered results, critical results and stock alerts. Some counts include every record regardless of whether it needs action.
- **Worklist:** requested orders; good handoff start, but no cancellation or full accession states.
- **Specimens:** processing creates specimen ID; lacks collection/receipt/rejection workflow.
- **Result entry & verification:** separates entry from verification, but values are unstructured and verification does not validate test-specific fields.
- **Critical results:** filtered display only; no acknowledgement/escalation.
- **Test catalogue:** catalogue editing is permission-gated, but claim code mapping is not resolved from the configured mapping table.
- **Inventory:** useful card/list surface; stock movement and lot traceability are incomplete.

### Pharmacy
- **Overview:** useful queue and stock counts, but synthetic price data is present in the seed model.
- **Prescription queue:** receives clinical orders; status filtering is understandable.
- **Dispensing panel:** verification and dispense are separate, and stock is rechecked on dispense; no reservation or partial dispense.
- **Stock alerts:** depends on configured reorder levels; no expiry/lot alerts.
- **Stock levels:** view-only destination; no lot/batch history.
- **Formulary mapping flags:** shows missing codes but is not a full approval/mapping workflow.
- **Inventory:** local item CRUD and stock values; lacks procurement and controlled stock movement approval.

### Cashier / Accountant
- **Overview:** metrics include appointment/patient/claim counts, not a true outstanding charge and collection dashboard.
- **Pending charges:** reads FinancePage invoices and dispensed prescription billing, not the till service-charge queue.
- **Payment panel & receipts:** updates finance invoice/payment receipt stores, separate from till payments.
- **My till & shift:** charges are derived from consultations and lab orders, not pharmacy dispenses; write permission is not separately checked.
- **Refunds:** request action is not permission-gated; approval is separately gated.
- **Shift reconciliation:** reconciles local till cash only; no provider settlement reconciliation.
- **Price list:** reads local catalogue; does not surface missing/invalid price mappings as blocking errors.
- **Billed vs claimed:** compares invoice rows to known medicine tariff estimates only. It is not a full claim-versus-bill reconciliation.

### Claims Officer
- **Overview:** based on locally saved claim snapshots.
- **Pipeline:** correctly states external submission is not connected; stages are descriptive, not a persisted claim state machine.
- **Claims list & detail:** archive list and XML view; local only.
- **Mapping queue:** can update inventory codes for future orders; does not resolve all existing mappings or order snapshots.
- **Export batches:** packages saved XML; not an external submission.
- **Import reports:** stores parsed CSV snapshots only; does not reconcile claim states.
- **Month progress:** counts claim generation by archive date, not submission/adjudication.

### Hospital Administrator
- **Management dashboard:** reads local records. Low-stock calculation includes tracked items with reorder level zero, while role dashboards exclude zero reorder thresholds; counts can disagree.
- **Hospital profile:** local facility settings only; not guaranteed to populate every receipt/claim export.
- **Departments, wards, beds:** functional local preview configuration, but not linked to real facility master data.
- **Users, roles, permissions:** staff directory and local role-grant editor only; it does not create accounts or secure server-side access.
- **Service catalogue & prices:** inline edits can save on each keystroke; numeric values and duplicate codes are not robustly validated. Missing service codes can resolve to zero.
- **Reference mappings:** separate from inventory claim-code fields; not a shared mapping source of truth.
- **Thresholds & settings:** values are clamped to zero rather than validated against sensible operational ranges; some settings are not consumed consistently.
- **Reports:** only appointment, clinical and claims data sets; no finance/inpatient dataset and no server reporting source.
- **Refund approvals:** uses the same RefundsPage as cashier requests; request form is still visible.
- **Inventory console:** local inventory controls, not a full store/procurement ledger.
- **Audit viewer:** displays local audit entries; not all important mutations generate audit events.
- **Sync conflicts:** checks JSON readability and orphan appointment patient IDs; it does not inspect the full set of related records or real multi-workstation conflicts.
- **Realtime SLA monitor:** refresh-driven local calculation, not realtime. Doctor wait uses checked-in time; lab and pharmacy wait use original order timestamps rather than stage timestamps.
- **Backup status:** exports only a subset of local stores. Payment receipts, export batches, import reports, role grants and UI preferences are omitted; restore accepts unvalidated key/value content.

## 5. Shared shell, navigation and permissions

### Sidebar and menu usefulness
- The role registry contains distinct destinations and the route round-trip tests verify unique menu IDs and paths.
- Each role's main menu is mostly aligned to the implemented page module. The most useful route groups are the shared Reception → Nursing → Clinical → Lab/Pharmacy → Claims path and the Administrator oversight tools.
- The role dashboard quick-access arrays are hard-coded separately from the role navigation registry. When an administrator removes a permission, a quick-access action can remain visible even though navigation rejects it. Quick links should be derived from the same permission-filtered navigation model.
- The nurse OPD queue and doctor OPD queue use the same front-desk page with different filters. That is functional but not an ideal role-specific work surface.
- The app has no connection-state indicator, despite the global navigation requirements in the architecture notes. Notifications are derived from local records and are not server-delivered.
- Global search covers patients, appointments, lab orders, prescriptions and claims. It does not cover invoices, payments, admissions, documents or nursing tasks.

### Permission findings
- `roleAccess.js` controls which menu items are visible and App.jsx blocks routes not present in the visible navigation.
- This is useful for demonstrating role behavior only. The role selector does not authenticate a staff identity, and the grants are stored in localStorage.
- There is no server-side authorization, row-level isolation, authenticated actor, trusted audit context or database policy in this repository.
- Some pages conflate read and write grants. In particular, `cashier.shift.view` exposes till actions. Refund request and approval permissions are not consistently enforced in the shared page.
- Patient 360 claim preview download controls are less restrictive than the Claims dashboard controls.

## 6. Persistence, integrity and audit controls

### Browser store architecture
`createBrowserStore` persists data in localStorage and broadcasts updates to tabs using BroadcastChannel. This gives useful same-browser continuity, but it is not a multi-user database.

Limitations:
- No cross-device or cross-workstation sharing.
- No transaction boundary across multiple stores.
- No server-side concurrency control, idempotency or conflict resolution.
- No authoritative actor identity or durable audit.
- Schema validation is shallow and no migration framework exists.
- Browser storage can be cleared, edited or corrupted by the user.

### Audit trail
The workspace audit list is local and capped at 500 entries. Some actions call `updateWorkspace` with an audit entry; other direct store updates do not. It is not an immutable clinical/financial audit trail and should not be presented as one.

### Sync conflict scan
The scan only checks JSON parseability for a fixed subset of stores and checks appointments for unknown patient IDs. It does not validate orphan lab orders, prescriptions, consultations, claims, bed assignments, payments, receipts or mappings. It also omits several local stores from the scan.

### Backup and restore
The backup tool is a localStorage export, not a disaster-recovery backup. It omits at least the separate payment receipt store and the claims batch/import-report stores. Restore trusts the imported `data` object and does not validate a known schema/version or restrict keys to an allowlist before writing them.

## 7. Reports and operational metrics

1. Reception's “Checked in” metric includes later workflow states.
2. Administrator and role dashboards use different low-stock predicates; zero reorder-level items can be flagged in one dashboard but excluded in another.
3. Doctor, lab and pharmacy overview counts do not consistently distinguish work awaiting action from work already in progress.
4. Reports cover appointments, clinical events and claims, but omit finance, till, inpatient, bed occupancy, refunds and reconciliation.
5. The seven-day report is built from appointments only; it does not represent total visits or patient throughput across departments.
6. Coverage reporting checks expiry dates but does not provide a distinct expired category or insurer eligibility verification.
7. CSV export quotes/escapes text but does not neutralize spreadsheet formula prefixes. Treat exports as data files, not trusted spreadsheets.
8. Date constants are created at module load in several modules. Long-running sessions can retain yesterday's date until reload.

## 8. Responsive UI and component quality

The sidebar scrollbar is now visually hidden while the navigation remains scrollable, including on touch devices and with keyboard scrolling. This is the only code change made as part of this audit request.

The previous work introduced responsive Patient 360 and catalogue styles, but this source audit does not certify every page at desktop, tablet and mobile sizes. A separate visual pass is still required for:
- wide clinical queue + consultation split layouts;
- long diagnosis/order forms and modal heights;
- lab/pharmacy inventory grids;
- inpatient bed boards and wide tables;
- claims sheet preview and export tables;
- admin data tables, nested details and permission lists;
- 320–390 px mobile overflow, focus order and keyboard operation.

The app uses several independent CSS systems per module. Shared tokens exist, but page-level spacing, table wrappers, modals and responsive breakpoints still need a consistent component contract. The current automated suite does not include visual regression tests.

## 9. Remediation plan — order matters

### P0 — Stop unsafe assumptions before real data
1. Decide and implement real authentication and server-enforced authorization. Do not rely on role selection/localStorage grants.
2. Replace all local stores with a server-authoritative data model and define the approved access-control strategy before any patient data is connected.
3. Remove synthetic/random medicine retail prices from every bill/claim path. Load approved, effective-dated tariffs and prices.
4. Build one charge → invoice → payment → receipt → refund ledger and retire the duplicate cashier payment path.
5. Add explicit critical-result acknowledgement and explicit clinician result review; remove the auto-review side effect on opening an encounter.

### P1 — Complete the encounter lifecycle
6. Replace date-only queue filters with explicit open-encounter states and timestamps; keep paused/awaiting-result encounters visible across days.
7. Add full appointment reschedule/cancel and status transition rules.
8. Add structured triage priority, allergies, red flags and escalation.
9. Add procedure capture and link procedure orders to claims and billing.
10. Add medication safety, reservation/partial dispensing, stock lot/expiry and reversal workflows.
11. Link inpatient admissions to the originating encounter and service charges.

### P2 — Reconcile claims and administration
12. Consolidate mapping records and inventory claim codes into one versioned mapping source.
13. Complete the claim field model, service dates, IPD linkage and official code-master validation.
14. Make claims import perform row-level reconciliation (or rename it explicitly as a report snapshot).
15. Make the audit log immutable and generated by server-side business events.
16. Expand sync checks to every related entity and replace local backup with tested database backup/restore.
17. Correct permission boundaries for till actions, refund requests, claim downloads and other write operations.

### P3 — UX, dashboards and quality gates
18. Derive every quick link from the permission-filtered menu registry.
19. Correct metric definitions and centralize KPI selectors so every dashboard uses the same formula.
20. Add invoice, inpatient, stock, claims and reconciliation reporting.
21. Add responsive visual regression coverage and keyboard/accessibility tests for all role pages.
22. Add workflow integration tests for the complete path below.

## 10. Required end-to-end acceptance tests

These should be automated against a disposable test environment with seeded records and a real backend. Each test must verify the record IDs, state transitions, actor, timestamp and downstream effect.

| Journey | Required acceptance |
|---|---|
| Reception registration | Create a patient; verify stable MRN, required demographics, optional insurance, duplicate handling and audit event. |
| Appointment | Book, reschedule, cancel, check in; verify one encounter identity and correct queue counts. |
| Nurse triage | Open checked-in visit, record vitals and priority, acknowledge allergies/red flags, hand off; verify timestamp and doctor queue. |
| Consultation | Open encounter, review patient history, save draft, pause, resume next day, add diagnoses/procedures and plan. |
| Lab order | Order test, verify it appears once in lab queue with correct patient/encounter/order IDs and mapping snapshot. |
| Specimen | Collect, receive, reject/recollect where needed, process and record stock consumption with movement and reason. |
| Lab result | Enter structured result, verify, mark critical if needed, acknowledge/escalate, return to same encounter; ensure opening the encounter alone does not mark it reviewed. |
| Pharmacy | Verify prescription, reserve stock, partial/full dispense, capture lot/expiry, record movement and billing calculation; test insufficient stock and reversal. |
| Consultation close | Ensure all required results are explicitly reviewed and all order states are accounted for; close encounter without falsely closing billing. |
| Billing | Generate one invoice from all billable services; verify correct tariff, insurer/patient split, duplicate prevention and immutable line items. |
| Payment | Record full/partial payment through one cashier path; verify invoice balance, receipt, till, shift totals and Patient 360 immediately agree. |
| Refund | Request with reason, approve/reject under separate role, issue reversal and retain original payment/receipt. |
| Claim | Generate from encounter + completed orders + dispense + procedures; validate official codes and all required fields; archive immutable snapshot. |
| Claim export/import | Export selected claims; import a report; match rows to claims and surface unknown, duplicate and mismatched statuses without silently overwriting. |
| Inpatient | Request admission from encounter, assign bed, track dates/charges, complete discharge checklist, discharge and release bed. |
| Role security | Test every role against every route and action, including direct URLs and manipulated client state; verify server denies unauthorized reads/writes. |
| Audit and backup | Verify all critical changes have actor/time/before/after/reason; restore a backup in a clean environment and reconcile record counts/checksums. |

## 11. Source areas reviewed

- Shared shell and route dispatch: `src/App.jsx`, `src/App.css`, `src/index.css`.
- Role navigation and permissions: `src/access/roleAccess.js`, `src/modules/role-workspaces/RoleDashboardPage.jsx`, `src/modules/role-workspaces/RoleWorkspacePages.jsx`.
- Reception: `src/modules/front-desk/FrontDeskPage.jsx`, `frontDeskStore.js`.
- Nursing: `src/modules/nursing/NursePage.jsx`.
- Patients: `src/modules/patients/PatientsPage.jsx`, `PatientDetailPage.jsx`, `patientStore.js`.
- Clinical/lab/pharmacy: `src/modules/clinical/CarePages.jsx`, `careStore.js`, `nhisMedicineCatalog.json`.
- Claims: `ClaimsDashboard.jsx`, `ClaimsWorkspacePage.jsx`, `ClaimFormSheet.jsx`, `claimXml.js`, `claimsStore.js`.
- Finance/inpatient/reports: `src/modules/operations/OperationsPages.jsx`.
- Administration and support pages: `src/modules/admin/WorkspacePages.jsx`, `workspaceStore.js`.
- Shared persistence: `src/modules/shared/browserStore.js`.
- Authentication preview: `src/auth/AuthPage.jsx`, `previewSession.js`.
- Automated checks: `tests/roleAccess.test.js`, `package.json`, `.github/workflows/ci.yml`.

## 12. Audit conclusion

The app has a coherent visual shell and several genuinely connected preview handoffs. It should be described as a **browser-local workflow prototype**, not a production-ready HMS. The critical work is to unify encounter, clinical result, inventory, billing and claims state; implement real identity and server-side authorization; and make every state transition explicit and auditable.

The sidebar scrollbar is hidden without disabling scrolling. No clinical, financial or workflow behavior was changed as part of this audit, because those changes need a deliberately sequenced remediation pass rather than isolated patches that could worsen data integrity.
