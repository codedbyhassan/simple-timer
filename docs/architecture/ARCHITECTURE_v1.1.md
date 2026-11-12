# Ascend HMS: Architecture Specification v1.1

**Status:** Proposed amendment to v1.0. Review, then freeze.
**Location:** `docs/architecture/ARCHITECTURE_v1.1.md`
**Supersedes:** Sections 3.1, 7, 9, 17, 18, 19 and 20 of v1.0 where they conflict with this document. All other v1.0 sections stand.

**Inputs for this revision**
- Ascend HMS Architecture Specification v1.0
- CLAIM-it Data Exchange Protocols, XML Specification v2.1 (NHIS)
- CLAIM-it Integration API (OpenAPI)
- Existing claims implementation (`claims.tsx`, `claim-form-sheet.tsx`, blank NHIS form)
- New requirements R1 to R6 below

---

## 0. How to read this document

Statements are tagged:
- **[SPEC]**: taken directly from the CLAIM-it v2.1 document.
- **[DECISION]**: an architectural decision made here.
- **[VERIFY]**: could not be confirmed from the supplied material. It must be confirmed against a real CLAIM-it installation or NHIA before the related build is accepted. Nothing tagged [VERIFY] may be assumed correct.

Section 12 lists every [VERIFY] item in one place.

---

## 1. New and changed requirements

| ID | Requirement | Source |
|----|-------------|--------|
| R1 | Cross-screen realtime propagation must complete within **10 seconds maximum**. The engineering target is **5 seconds**. | Owner |
| R2 | Departmental dashboards must communicate about a patient **automatically**, end to end, with no manual refresh or re-entry. | Owner |
| R3 | All claim content must originate from data already held in Supabase. No claim field is typed in from memory, paper or another system. | Owner |
| R4 | The claim output must be an **XML file** that CLAIM-it accepts on import with minimal or no correction. | Owner |
| R5 | The previous claims build was shallow. Claims must be modelled to the full CLAIM-it v2.1 structure. | Owner |
| R6 | The hospital participates in the **Value Based Care (VBC)** programme. The `extraData` vitals block is mandatory-in-scope. | Owner |

---

## 2. Amendments to v1.0

### 2.1 Schema phasing (replaces v1.0 §3.1 rollout)

The 22 schemas remain the **target ownership map**. They are not all created on day one. Each schema adds grants, RLS policies, tests and migration surface.

**Phase 1 schemas (create now):** `identity`, `core`, `patients`, `encounters`, `clinical`, `laboratory`, `pharmacy`, `finance`, `insurance`, `audit`, `api`.

All other schemas are created when their module is introduced, per the roadmap.

**Claims live in the `insurance` schema.** No separate `claims` schema.

### 2.2 No tenancy (reinforced)

The previous claims code carries `hospital_id`, a hospital lookup and the product name "LuminaLabs". None of these may be carried into Ascend HMS. The single hospital's configuration record supplies: facility name, NHIS facility ID, claims mode flags (`is_vbc_participant`, default claim batching rules).

### 2.3 Outbox scope (replaces v1.0 §9 wording)

The transactional outbox is **not** the mechanism for screen updates, because a polling dispatcher cannot reliably meet R1. The outbox is reserved for **external side effects**: NHIS exports, SMS, email, third-party integrations. Screen updates use the realtime path in Section 4.

### 2.4 Roadmap change (replaces v1.0 §19 ordering for affected items)

- Release 0 gains: realtime SLA instrumentation and the encounter state machine.
- Release 3 (OPD) gains: the encounter hub and `patient_timeline`.
- **Claim data capture is distributed across Releases 2 to 7** (see Section 6.3). Claims are not a late add-on. Each module must capture the fields claims will need at the moment of care.
- Release 6 (Finance and Pharmacy) gains: the full claims module, XML export and import-report loop.

---

## 3. The encounter hub and patient timeline (R2)

### 3.1 Principle

Dashboards never call each other. Every dashboard reads from the database and is notified by realtime. The **encounter** is the hub that all departmental work attaches to.

### 3.2 Encounter state machine

`encounters.encounters.status`:

```
registered -> triaged -> in_consultation -> investigations_pending
          -> investigations_complete -> awaiting_dispensing
          -> awaiting_billing -> closed
          (any non-closed state) -> cancelled
          (inpatient path) in_consultation -> admitted -> discharged -> closed
```

Rules:
1. Status changes only through `encounters.transition_encounter(encounter_id, event, expected_version, actor)`. Direct `UPDATE` on `status` is revoked from all application roles.
2. The function validates the transition against an `encounters.allowed_transitions` table, checks the actor's permission and care relationship, and increments `version` for optimistic concurrency. A stale `expected_version` is rejected.
3. In **one transaction** the function: updates the encounter, appends to `patient_timeline`, writes the audit event, emits realtime notifications (Section 4), and updates claim readiness (Section 5.6).

### 3.3 Patient timeline

`encounters.patient_timeline`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| patient_id | uuid FK | indexed |
| encounter_id | uuid FK | indexed |
| event_type | text | uses v1.0 §9.2 names |
| entity_schema / entity_table / entity_id | text / text / uuid | pointer to the source row |
| summary | text | non-sensitive display text |
| actor_id | uuid | |
| committed_at | timestamptz | server `now()` at commit; used for SLA measurement |

Index: `(patient_id, committed_at desc)`, `(encounter_id, committed_at desc)`.

### 3.4 Propagation matrix

Every row is an automated path. If a row cannot be implemented, the module is not complete.

| Event | Source module | Dashboards updated automatically | Target |
|-------|---------------|----------------------------------|--------|
| `patient.registered` | Patients | Reception, OPD queue | ≤5 s |
| `encounter.opened` | OPD | OPD queue, Triage queue, Finance (charge initiation) | ≤5 s |
| `triage.completed` | Nursing | Doctor workspace, OPD queue | ≤5 s |
| `consultation.finalized` | Clinical | Lab queue, Pharmacy queue, Finance, Claims readiness | ≤5 s |
| `lab.order.created` | Clinical | Laboratory worklist, Finance | ≤5 s |
| `lab.result.verified` | Laboratory | Requesting doctor, patient timeline, Claims readiness | ≤5 s |
| `prescription.created` | Clinical | Pharmacy worklist | ≤5 s |
| `pharmacy.dispensed` | Pharmacy | Pharmacy stock, Doctor, Finance, Claims readiness | ≤5 s |
| `invoice.issued` / `payment.recorded` | Finance | Cashier, encounter status, Reception | ≤5 s |
| `admission.created` / `bed.allocated` | Inpatient | Ward board, Bed management, Finance | ≤5 s |
| `patient.discharged` | Inpatient | Ward board, Finance, **Claims (outcome and dates)** | ≤5 s |
| `claim.status_changed` | Insurance | Claims office dashboard, encounter timeline | ≤5 s |

### 3.5 Care-relationship rule

Realtime channel access and row access both require an authorised relationship to the patient or department (v1.0 §5.3). Emergency break-glass access emits its own audit event and review task.

---

## 4. Realtime architecture for the 10-second limit (replaces v1.0 §7)

### 4.1 Targets

| Measure | Target | Hard limit |
|---------|--------|------------|
| Commit to screen updated, p50 | ≤2 s | |
| Commit to screen updated, p95 | ≤5 s | |
| Commit to screen updated, any event | | **10 s** |
| Recovery after connection loss | ≤5 s after reconnect | 10 s |

These are engineering targets to be **verified by load test** (Section 11), not guarantees.

### 4.2 Two-path design [DECISION]

**Path 1: push (normal).**
1. The state-changing database function, inside its transaction, calls Supabase Realtime Broadcast from the database (`realtime.send(...)` or `realtime.broadcast_changes(...)`).
2. The message goes to private channels:
   - `dept:{department_id}`
   - `patient:{patient_id}`
   - `encounter:{encounter_id}`
3. The client receives the notification and **invalidates and refetches** the affected query.

**Path 2: safety net (polling).**
- If the channel state is not `SUBSCRIBED`, or no event or heartbeat has arrived for 5 seconds on a visible screen, the client polls the relevant query every 5 seconds.
- On reconnect the client always performs a full refetch of every query attached to that screen.
- A missed event therefore appears within roughly 5 to 6 seconds, inside the 10-second limit.

**Visibility rule:** hidden browser tabs may throttle timers. The application must refetch immediately when a tab becomes visible.

### 4.3 Payload rule

Broadcast payloads contain **identifiers and event type only**: event ID, type, entity ID, encounter ID, committed_at, version. **No patient names, diagnoses or results travel in realtime payloads.** The client fetches data through normal RLS-protected queries. This means a leaked or misrouted broadcast discloses nothing clinical.

### 4.4 Channel authorisation

- All channels are **private**.
- Authorisation is enforced with RLS on `realtime.messages`, using the same permission and care-relationship functions as table RLS.
- Users subscribe only to channels for their department assignment and their current patient context. No user subscribes to everything.
- A channel-authorisation test is mandatory (Section 11).

### 4.4a Scaling note

Postgres Changes performs per-subscriber authorisation and scales poorly. It is used only for low-volume administrative screens. Clinical and operational screens use Broadcast.

### 4.5 Idempotency and ordering

- Each event carries `event_id` and entity `version`. The client discards events older than the version it already holds.
- Duplicate events are harmless because the client's response is always "refetch".

### 4.6 SLA instrumentation (mandatory from Release 0)

1. Every event carries `committed_at` (server time).
2. The client records `received_at` and `rendered_at` using an offset calibrated against server time on session start, to remove device clock skew.
3. Latency is reported to a metrics sink in batches (no patient data).
4. Dashboards and alerts:
   - alert when rolling p95 > 5 s
   - alert on **any** event > 10 s
   - alert on reconnect rate and polling-fallback rate
5. The SLA is measured in production continuously, not only in testing.

### 4.7 Network reality

External internet latency or outage is outside software control. During a full outage the system cannot meet R1. It must show a clear **connection state indicator** and apply the offline rules of v1.0 §8, never silently showing stale data as current.

---

## 5. Claims domain (insurance schema)

### 5.1 Purpose and principle

The claim is a **frozen, versioned snapshot** assembled by the database from clinical, laboratory, pharmacy and encounter records. The print form, the XML file and the on-screen review all render from that single stored snapshot, so they cannot disagree. Staff correct source records or reference mappings, not claim text.

CLAIM-it computes the claim cost itself from GDRG codes under its billing rules [SPEC]. Ascend therefore does **not** send amounts in the XML and does **not** maintain its own NHIA tariff catalogue for pricing. Hospital-billed amounts are kept only for reconciliation against CLAIM-it's returned cost.

### 5.2 Tables

All in `insurance`. UUID primary keys, UTC timestamps, no floats for money, `created_at/by`, `updated_at/by` on every table.

**`claims`**: one row per claim version header.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| claim_id | text, **unique, immutable** | the CLAIM-it `claimID`. Format `ASC-CLM-000001`, allocated transactionally. Unique across all batches [SPEC] |
| version | int | increments on each regenerated snapshot |
| encounter_id | uuid FK | one claim per encounter per payer |
| patient_id | uuid FK | |
| status | enum | see Section 9 |
| claim_check_code | text null | CHECK `~ '^[0-9]{5}$'` [SPEC: 5 digits] |
| pre_authorization_codes | text[] | exported as comma-separated |
| physician_id | text null | [VERIFY format] |
| member_no | text | CHECK `~ '^([0-9]{8}|[0-9]{10})$'` [SPEC: 8 or 10 digits] |
| surname, other_names | text | |
| date_of_birth | date | |
| gender | enum `M`,`F` | |
| hospital_rec_no | text | patient's hospital number |
| is_dependant | boolean | |
| type_of_service | enum `OPD`,`IPD`,`DIA`,`PHC` | |
| is_unbundled | boolean | |
| includes_pharmacy | boolean | |
| type_of_attendance | enum `EAE`,`CFU`,`ANC`,`PNC` | |
| service_outcome | enum `DISC`,`DIED`,`TFOT`,`ABSC` | |
| principal_gdrg | text null | |
| snapshot_at | timestamptz | |
| snapshot_hash | text | SHA-256 over canonical content |
| claimit_cost | numeric(14,2) null | filled from import report |
| hospital_billed_total | numeric(14,2) | reconciliation only |

**Child tables** (all FK to `claims.id`, with `seq` for stable order):

| Table | Columns |
|-------|---------|
| `claim_service_dates` | seq, service_date (first = admission/visit, second = discharge) |
| `claim_specialties` | seq, specialty_code enum (`ENTH`,`ASUR`,`DENT`,`OPHT`,`ORTH`,`MEDI`,`PAED`,`PSUR`,`OBGY`,`RSUR`,`OPDC`) |
| `claim_investigations` | seq, service_date, gdrg_code, source_lab_order_item_id |
| `claim_procedures` | seq, service_date, gdrg_code, icd10, diagnosis_text, source_procedure_id |
| `claim_diagnoses` | seq, gdrg_code, icd10, description, source_diagnosis_id |
| `claim_medicines` | seq, medicine_code, dispensed_qty, service_date, dose, frequency, duration, unparsed, source_dispensing_id |
| `claim_vitals` | seq, recorded_at (timestamptz), weight_kg, height_m, systolic_mmhg, diastolic_mmhg, glucose_mmol_l, glucose_type enum (`FBS`,`RBS`,`2HPP`,`HBA1C`) |
| `claim_referral` | referral_ccc, facility_id, facility_name |

Constraints on child tables:
- `claim_medicines`: either (`dose`, `frequency`, `duration`) all present and format-valid, **or** `unparsed` present. [SPEC: prescription required for every medicine]
- `dose` matches `^[0-9.]+ [A-Za-z]+$`; `frequency` matches `^[0-9]+ (HOURLY|DAILY)$`; `duration` matches `^[0-9]+ (DAYS|WEEKS|MONTHS)$`. [SPEC]
- `claim_procedures`: `service_date`, `icd10` and `diagnosis_text` all NOT NULL. [SPEC: required for every procedure entry]

**Export and import tables:**

| Table | Purpose |
|-------|---------|
| `claim_exports` | batch_id, period (year, month), file_path, sha256, spec_version (`2.1`), claim_count, generated_by, generated_at |
| `claim_export_items` | export_id, claim_id, claim_version |
| `claim_import_reports` | export_id, report_date, passed/failed/warned/saved counts, total_cost, time_taken (mirrors the CLAIM-it import report) |
| `claim_import_results` | report_id, claim_id, outcome (`PASSED`,`WARNING`,`ERROR`), cost, init_cost, `errors` jsonb, `warnings` jsonb |

**Reference tables** (versioned, with `valid_from` / `valid_to` and a source reference):

| Table | Purpose |
|-------|---------|
| `ref_gdrg` | GDRG code, type (procedure, investigation, diagnosis/ medicine-inclusive), description |
| `ref_nhia_medicine` | NHIA medicine code, description, form/strength |
| `ref_icd10` | valid ICD-10 codes |
| `map_service_to_gdrg` | hospital service/procedure/lab test, to GDRG |
| `map_drug_to_nhia_medicine` | hospital formulary item, to NHIA medicine code |
| `map_department_to_specialty` | department, to specialty code |

Reference data is **imported from official NHIA sources and version-recorded**. Ascend does not invent or prefill codes. A missing mapping blocks the claim (Section 8) and is surfaced to the person who can fix it.

### 5.3 Immutability

- Once `status` reaches `exported`, the snapshot rows are **read-only** (enforced by trigger and RLS).
- A correction creates **version n+1** under the same `claim_id`, with the reason recorded.
- Whether CLAIM-it replaces an existing claim when the same `claimID` is re-imported is a [VERIFY] item. The import report's `initCost` field suggests it does.
- Deleting a claim from CLAIM-it (API `/claims/{claimID}/delete`) is never automatic. It is a permissioned, audited action.

### 5.4 Snapshot builder

`insurance.build_claim(encounter_id uuid) returns uuid`

Runs in one transaction, `SECURITY INVOKER` with an explicit permission check, and:
1. Locks the encounter row.
2. Reads patient, encounter, diagnoses, procedures, completed laboratory orders, **actual dispensing events** (not prescriptions), vitals and referral data.
3. Applies reference mappings.
4. Writes the claim and child rows.
5. Runs the validator (Section 8) and stores the result.
6. Computes `snapshot_hash`.
7. Writes audit and timeline events.

It is idempotent: if the source data hash is unchanged it returns the existing version.

### 5.5 Source-of-truth rules

- Investigations come only from **verified** lab results.
- Medicines come only from **dispensing records**.
- Diagnoses and procedures come only from **finalised** consultation documentation.
- Outcome and discharge date come only from the discharge workflow.
- No claim field has a free-text entry box in the claims screen. The only fields the claims office types are those that genuinely originate there (Section 6.2).

### 5.6 Claim readiness

Each encounter has a live `claim_readiness` view that lists missing or invalid claim fields. It is shown to clinical and records staff **during the encounter**, so gaps are fixed at the point of care and not at month-end. It is refreshed by the same transition function and broadcast on `encounter:{id}`.

---

## 6. Claim field source matrix (R3)

### 6.1 Automatic fields

| XML element | Source | Rule |
|-------------|--------|------|
| `claimID` | `insurance.claims.claim_id` | allocated once, never reused |
| `memberNo` | `patients` insurance membership | 8 or 10 digits; block if absent |
| `surname`, `otherNames` | `patients.patients` | |
| `dateOfBirth` | `patients.patients.date_of_birth` | |
| `gender` | `patients.patients.gender` | `M`/`F` only |
| `hospitalRecNo` | `patients.patients.public_id` | |
| `isDependant` | `patients` membership relationship | captured at registration |
| `typeOfService` | encounter category | explicit enum, never guessed from free text |
| `isUnbundled`, `includesPharmacy` | claim rules per service type | derived from the explicit rules table |
| `typeOfAttendance` | encounter | captured at encounter opening |
| `serviceOutcome` | discharge record | |
| `dateOfService` (repeating) | encounter / admission and discharge dates | |
| `specialtyAttended` (repeating) | `map_department_to_specialty` | |
| `investigation` | verified lab order items | date and GDRG via mapping |
| `procedure` | finalised procedures | GDRG, ICD-10, diagnosis text |
| `diagnosis` | finalised diagnoses | GDRG, ICD-10, description |
| `medicine` + `prescription` | dispensing + prescription | NHIA code via mapping |
| `principalGDRG` | rule or clinician selection | see Section 8 |
| `extraData/vitals` | `nursing` observations | VBC only (R6) |
| `referralInfo` | referral record | where applicable |

### 6.2 Fields that originate with the claims office

- `claimCheckCode` (the CCC, obtained through the NHIA phone process, 5 digits)
- `preAuthorizationCodes` (received from the scheme)
- `physicianID` if not held on the staff profile [VERIFY]

These are entered **once**, against the claim, with validation and audit. They are the only manually entered claim fields.

### 6.3 Capture obligations per module

A module's definition of done includes capturing what claims need.

| Module / Release | Must capture |
|------------------|--------------|
| Patients (R2) | gender, date of birth, NHIS member/HIN number, dependant flag, parent/principal member link |
| OPD (R3) | type of attendance, service category, attending department |
| Nursing (R4) | structured vitals: weight, height, systolic, diastolic, glucose with glucose type, with recording time |
| Clinical (R4) | coded diagnoses (ICD-10), procedures with date, prescriptions in structured dose/frequency/duration form, referral details |
| Laboratory (R5) | order items with dates mapped to GDRG |
| Pharmacy (R6) | dispensing with NHIA medicine code mapping |
| Inpatient (R7) | admission date, discharge date, **outcome** |
| Staff / HR | physician ID |

---

## 7. XML generation specification [SPEC v2.1]

### 7.1 Generator

- Implemented as a **Supabase Edge Function** `claims-export`, which calls a database function that returns the claim snapshot as structured JSON. The function renders it with a tested XML serialiser (no string concatenation).
- Input: a set of `claim_id`s with `status = ready`.
- Output: one UTF-8 XML file, stored in the private bucket `administrative-documents/claims-exports/{year}/{month}/`, with SHA-256 and a `claim_exports` row.
- Encoding declaration: `<?xml version="1.0" encoding="UTF-8" ?>`.
- All text content is XML-escaped.

### 7.2 Structure (element order follows the specification sample)

```
<claims>
  <claim>
    claimID
    claimCheckCode
    preAuthorizationCodes
    physicianID
    memberNo
    surname
    otherNames
    dateOfBirth            (YYYY-MM-DD)
    gender                 (M|F)
    hospitalRecNo
    isDependant            (0|1)
    typeOfService          (OPD|IPD|DIA|PHC)
    isUnbundled            (0|1)
    includesPharmacy       (0|1)
    typeOfAttendance       (EAE|CFU|ANC|PNC)
    serviceOutcome         (DISC|DIED|TFOT|ABSC)
    dateOfService          (repeat)
    specialtyAttended      (repeat, where applicable)
    investigation          (repeat: serviceDate, gdrgCode)
    procedure              (repeat: serviceDate, gdrgCode, icd10, diagnosis)
    diagnosis              (repeat: gdrgCode, icd10, diagnosis)
    medicine               (repeat: medicineCode, dispensedQty, serviceDate,
                            prescription{dose, frequency, duration | unparsed})
    principalGDRG          (optional)
    extraData              (VBC: vitals repeat)
    referralInfo           (where applicable: claimCheckCode, facilityID, facilityName)
  </claim>
</claims>
```

### 7.3 Formatting rules [DECISION unless tagged]

| Item | Rule |
|------|------|
| Dates | `YYYY-MM-DD`, **always zero-padded**. The specification's own sample shows `2005-5-11`. The required format is `YYYY-mm-dd` [SPEC], so Ascend always pads |
| ICD-10 in XML | with the dot, e.g. `K01.0` [SPEC sample] |
| ICD-10 on paper form | without the dot (per the form's box layout), handled by the print renderer only |
| `preAuthorizationCodes` | comma-separated, no spaces |
| Optional empty elements | omitted, not emitted empty, unless CLAIM-it requires them [VERIFY] |
| Vitals `date` | ISO 8601 UTC, e.g. `2022-07-26T00:00:00.000Z` [SPEC] |
| Vitals values | value and unit in the text as in the sample: `10.2 kg`, `0.13 m`, `42 mmHg`, `4.6 mmol/L` [SPEC] |
| `glucoseType` | `FBS`, `RBS`, `2HPP`, `HBA1C`; omitted means `RBS` [SPEC] |
| Age | The field table lists Age as required but the XML sample has **no age element**. Ascend follows the XML sample and does not emit age [VERIFY] |

### 7.4 Batch rules

- A batch groups claims by **claim month** (year and month), consistent with CLAIM-it's batch delete endpoint (`/batch/{year}/{month}/delete`). How CLAIM-it assigns batches on XML import is [VERIFY].
- A claim may appear in only one **active** export. Re-exporting a corrected version records a new `claim_export_items` row.
- Export is permissioned (`claims.export`), audited and rate-limited. Exports contain patient data, so the file lives only in the private bucket and is downloaded through a short-lived signed URL.

### 7.5 What Ascend does not do

- Does not call the CLAIM-it API from the browser. The API OpenAPI document targets `localhost:31719`, which is a service on a hospital PC and unreachable from a hosted web app. The route is **file export, then import in CLAIM-it**.
- Does not send credentials in query strings.
- A future on-premise bridge (a small service on the claims-office PC) is possible. It would require its own security design and is out of scope for v1.1.

---

## 8. Validation rules catalogue

`insurance.validate_claim(claim_id)` returns a list of `{severity, code, field, message, source_link}`. A claim cannot move to `ready` with any **blocker**. Warnings are shown and must be acknowledged.

### 8.1 Blockers [SPEC]

| Code | Rule |
|------|------|
| CLM-001 | `claimID` present and unique across all claims |
| CLM-002 | Member number/HIN is 8 or 10 digits |
| CLM-003 | Surname, other names, hospital record number, date of birth present |
| CLM-004 | `isDependant` set |
| CLM-005 | At least one date of service, formatted `YYYY-MM-DD` |
| CLM-006 | `typeOfService` set |
| CLM-007 | If CCC present, exactly 5 digits |
| CLM-008 | Every procedure has date, GDRG that is a **procedure** GDRG, ICD-10 and diagnosis |
| CLM-009 | Every ICD-10 code exists in `ref_icd10` |
| CLM-010 | Diagnosis present, except for `DIA` (diagnostic-only) claims |
| CLM-011 | `DIA` claims have at least one investigation |
| CLM-012 | Every medicine has a prescription (structured or `unparsed`) |
| CLM-013 | Dose, frequency and duration formats valid (Section 5.2) |
| CLM-014 | Every GDRG and medicine code exists in the reference tables and is valid on the service date |
| CLM-015 | `IPD` claims with more than one **unique** GDRG have a `principalGDRG` |
| CLM-016 | If `principalGDRG` is set, it is one of the GDRGs used on the claim |
| CLM-017 | Vitals present only if the hospital is VBC; values within plausible numeric ranges |
| CLM-018 | Service outcome present for `IPD` |
| CLM-019 | Discharge date not before admission date |
| CLM-020 | No source record changed since the snapshot (otherwise rebuild) |

### 8.2 Warnings [DECISION]

| Code | Rule |
|------|------|
| CLM-W01 | Claim older than the configured submission window |
| CLM-W02 | Hospital-billed total differs materially from CLAIM-it's last computed cost |
| CLM-W03 | VBC participant but fewer vitals readings than programme expectation [VERIFY] |
| CLM-W04 | Specialty not mapped for a department used |
| CLM-W05 | CCC not yet entered |

### 8.3 Mapping gaps

A missing GDRG, NHIA medicine or specialty mapping appears on a **mapping work queue** for the person responsible (pharmacy for drugs, laboratory for tests, records for diagnoses). Resolving a mapping automatically re-runs readiness for every affected open claim.

---

## 9. Claim lifecycle

```
draft -> ready -> exported -> imported
imported -> import_passed | import_warned | import_failed
import_failed -> draft            (correction creates version n+1)
import_passed | import_warned -> submitted -> accepted | rejected | paid
rejected -> draft                 (correction creates version n+1)
```

- Transitions run only through `insurance.transition_claim(claim_id, event, expected_version)`.
- `import_*` states are set only by processing a CLAIM-it import report (Section 9.1).
- `submitted` and later states record the manual submission to NHIA (the hospital still submits outside Ascend).
- Every transition writes audit, timeline and a realtime event.

### 9.1 Import-report loop

CLAIM-it returns an import report with per-claim outcome, errors (`code`, `info`, `help`), warnings, final cost and `initCost` [SPEC from OpenAPI]. Ascend provides an **upload of the report** (JSON). The report processor:
1. Matches each result to a claim by `claimID`.
2. Stores outcome, errors, warnings and cost.
3. Moves the claim to the matching state.
4. Surfaces each CLAIM-it error as a task against the specific source record or mapping that caused it.
5. Records the CLAIM-it cost and flags differences against the hospital-billed total.

---

## 10. Claims security and audit

| Control | Requirement |
|---------|-------------|
| Permissions | `claims.view`, `claims.build`, `claims.enter_ccc`, `claims.export`, `claims.import_report`, `claims.delete_external`, `claims.manage_mappings` |
| RLS | claim rows readable only with a claims permission and care relationship or claims-office assignment |
| Audit | every build, edit of a claims-office field, validation override, export, download and report import |
| Exports | private bucket, signed URLs with short expiry, download logged |
| Bulk export | rate-limited and alerts on unusual volume |
| Logs | no patient data in technical logs |
| Retention | claims and exports follow the documented retention policy; **not deleted** by users |

---

## 11. Testing and acceptance gates

### 11.1 Automated tests (added to v1.0 §17)

1. **Golden-file test:** the specification's sample claim is loaded as a fixture. The generated XML must match the expected file, except for deliberate corrections (zero-padded dates), which are listed in the test.
2. **Round-trip:** claim snapshot to XML to parsed back equals the snapshot.
3. **Validator tests:** one passing and one failing case for every rule CLM-001 to CLM-020.
4. **Enum and format tests** for every constrained field.
5. **Idempotency:** building the same encounter twice yields one version; repeated export does not duplicate claim IDs.
6. **RLS tests:** allowed and denied access for each claims permission.
7. **Concurrency:** two simultaneous `build_claim` calls produce one claim; two simultaneous transitions with the same `expected_version` allow exactly one.
8. **Realtime tests:** channel authorisation (denied cross-department), payload contains no clinical data, reconnect refetch.
9. **SLA test:** with 500 concurrent sessions and mixed departmental load, p95 propagation ≤5 s and no event >10 s, including a forced channel drop that must recover through polling.
10. **Propagation test:** one automated end-to-end test per row of Section 3.4.

### 11.2 Acceptance gates before claims go live

These are **manual and non-negotiable**. Documents and unit tests cannot prove that CLAIM-it accepts the file. Only CLAIM-it can.

| Gate | Condition |
|------|-----------|
| G1 | Confirm the installed CLAIM-it version supports the XML spec v2.1 |
| G2 | Import a generated file for each service type (`OPD`, `IPD`, `DIA`, `PHC`) into a real CLAIM-it instance with **zero errors** |
| G3 | Import a VBC claim with vitals and confirm acceptance |
| G4 | Resolve every [VERIFY] item in Section 12 |
| G5 | Pilot: 50 real historical encounters through the full flow, reconciling CLAIM-it cost to expected tariff |
| G6 | Claims office sign-off |

### 11.3 Mandatory workflow tests (extends v1.0 §17)

16. Discharge a patient and verify the claim is built with correct outcome and dates.
17. Dispense medicine and verify it appears on the claim with the correct NHIA code and prescription.
18. Verify a lab result and verify the investigation appears on the claim.
19. Export a batch and import it into CLAIM-it with no errors.
20. Process a CLAIM-it failure report and verify tasks are raised against the correct source records.
21. Cross-screen propagation completes within 10 seconds for every Section 3.4 row.

---

## 12. Open items [VERIFY]

| # | Item | Why it matters | Resolve with |
|---|------|----------------|--------------|
| V1 | Age: the field table says required, but the XML sample has no age element | A missing required field fails import | Test import in CLAIM-it; NHIA contact |
| V2 | Behaviour when the same `claimID` is re-imported (replace or reject) | Controls the correction workflow | Test import |
| V3 | How CLAIM-it assigns batches from an XML import | Controls batching rules | Test import |
| V4 | Whether empty optional elements are accepted or must be omitted | Output cleanliness | Test import |
| V5 | `physicianID` format and source | Possibly required by scheme rules | NHIA contact |
| V6 | Source and update cadence of GDRG, NHIA medicine and ICD-10 reference data | Core reference integrity | NHIA / CLAIM-it distribution |
| V7 | VBC programme expectations for the number and timing of vitals | Warning rule CLM-W03 | NHIA VBC documentation |
| V8 | Installed CLAIM-it version versus spec v2.1 | Determines the spec to follow | Check installed application |
| V9 | `realtime.send` / `broadcast_changes` behaviour and limits on the chosen Supabase plan | Underpins the 5 s target | Staging test |
| V10 | The v1.0 statement that Supabase changed Data API exposure defaults on 30 October 2026 | Not confirmed from supplied material | Check Supabase documentation; configure grants explicitly regardless |
| V11 | Whether the spec's `<diagnosis>` inside `<procedure>` and the `<diagnosis>` container is parsed as intended | Same element name used at two levels | Test import |

---

## 13. Decisions register additions (extends v1.0 §20)

| Decision | Status |
|----------|--------|
| Encounter is the hub; all state changes via transition functions | Proposed |
| `patient_timeline` for every patient-affecting event | Proposed |
| Realtime: DB-originated Broadcast plus 5 s polling fallback | Proposed |
| Realtime payloads carry identifiers only | Proposed |
| Realtime SLA: 5 s target, 10 s hard limit, measured continuously | **Approved** (owner requirement) |
| Outbox reserved for external side effects | Proposed |
| Claims in `insurance` schema, versioned immutable snapshots | Proposed |
| Claim content derived only from Supabase records | **Approved** (owner requirement) |
| Output format is CLAIM-it XML spec v2.1 | **Approved** (owner requirement) |
| CLAIM-it computes cost; Ascend does not maintain pricing tariffs | Proposed |
| Reference data imported from official sources, versioned, never invented | Proposed |
| Export-and-import file route; no browser calls to CLAIM-it API | Proposed |
| Phase 1 uses 11 schemas | Proposed |
| VBC vitals capture in scope | **Approved** (owner requirement) |

---

## 14. What this document does not promise

- It does not guarantee that CLAIM-it will accept every file. Gates G1 to G6 exist because only a real import can prove that.
- The 5 s and 10 s targets are engineering targets verified by load testing and continuous measurement, and they depend on the hospital's internet connection.
- SQL and structures here are specification-level. Final DDL belongs in the Database Blueprint and version-controlled migrations.

## 15. Next documents

1. **Database Blueprint**, now including: `encounters` state machine tables, `patient_timeline`, the full `insurance` claims schema (Section 5), reference tables, RLS and the transition functions.
2. **Claims module workflow document**: screens, mapping work queues, import-report handling.
3. **Realtime operations runbook**: metrics, alerts, polling fallback, incident response.
