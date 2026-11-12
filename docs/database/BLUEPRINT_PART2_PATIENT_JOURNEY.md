# Ascend HMS: Database Blueprint v1.0
## Part 2 of 3: `patients`, `appointments`, `encounters`, `nursing`, `clinical`, `laboratory`

**Status:** Proposed. Review, then freeze.
**Location:** `docs/database/BLUEPRINT_02_PATIENT_JOURNEY.md`
**Depends on:** Part 1 (conventions, security framework, machinery), Dashboard and Screen Specification v1.0.
**Notation:** as in Part 1. Tables are specifications, not final DDL.

---

## 0. Amendments and additions

| # | Amendment | Reason |
|---|-----------|--------|
| A5 | **`core.event_handlers`** is added (Section 3.7). `record_event` calls registered handlers, so modules react to events without importing each other | Modular monolith: `encounters` must not depend on `finance` or `insurance` |
| A6 | **`core.substances`** and **`core.ref_dose_units`** are added | Allergy checking and structured doses need shared catalogues that `patients`, `clinical` and `pharmacy` all use |
| A7 | **Pharmacy catalogue tables are created before `clinical`**, dispensing tables after (Part 3 §1) | `clinical.prescription_items` references the formulary. `pharmacy.dispensings` references prescriptions. Ownership stays with `pharmacy`. Only migration order is split |
| A8 | **Patient merge execution is deferred.** Phase 1 prevents and flags duplicates. It does not re-point records (Section 1.6) | Re-pointing every record across every module is a hazardous operation that needs its own design once most modules exist |

`core.substances` and `core.ref_dose_units` are small catalogues:

```
core.substances
  id uuid PK, name text UNIQUE NOT NULL, substance_class text NULL, is_active boolean NOT NULL DEFAULT true

core.ref_dose_units
  code text PK            -- 'Tablet','Capsule','Vial','mL','Sachet', ...  (exported as "<value> <unit>")
  description text NOT NULL
```

---

## 1. Schema `patients`

Owns: patient identity, demographics, identifiers, insurance membership, next of kin, allergies, history, duplicate links.

### 1.1 Tables

```
patients.patients                                              -- class P (read through can_access_patient); search via api view
  id                  uuid PK
  public_id           text UNIQUE NOT NULL                     -- ASC-PAT-000001, server generated
  surname             text NOT NULL
  other_names         text NOT NULL
  sex                 enum patient_sex ('M','F','U') NOT NULL  -- 'U' unknown; blocks claims until corrected
  date_of_birth       date NULL
  dob_is_estimated    boolean NOT NULL DEFAULT false
  estimated_age_years smallint NULL
  phone               text NULL
  phone_norm          text GENERATED ALWAYS AS (regexp_replace(phone, '[^0-9]', '', 'g')) STORED
  alt_phone           text NULL, email text NULL
  address_line        text NULL, town text NULL, region text NULL
  photo_document_id   uuid NULL REFERENCES core.documents
  sensitivity         text NOT NULL DEFAULT 'standard' CHECK (sensitivity IN ('standard','sensitive'))
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','deceased'))
  deceased_at         ts NULL
  name_search         text GENERATED ALWAYS AS (lower(surname || ' ' || other_names)) STORED
  standard columns, row_version
  CHECK (date_of_birth IS NOT NULL OR estimated_age_years IS NOT NULL)
  CHECK (date_of_birth IS NULL OR date_of_birth <= current_date)
  CHECK (NOT dob_is_estimated OR estimated_age_years IS NOT NULL)
```

CLAIM-it requires a date of birth. When the date is estimated, the claim builder must apply a documented rule [VERIFY V13: how NHIA expects estimated dates of birth to be reported]. Until confirmed, a claim for a patient with an estimated date raises warning `CLM-W06`.

```
patients.patient_identifiers
  id uuid PK, patient_id uuid NOT NULL REFERENCES patients.patients,
  id_type text NOT NULL CHECK (id_type IN ('ghana_card','passport','voter','driver_licence','other')),
  id_value text NOT NULL, verified boolean NOT NULL DEFAULT false,
  voided_at ts NULL, voided_by uuid NULL, void_reason text NULL, standard columns
  UNIQUE (id_type, id_value) WHERE voided_at IS NULL            -- one live owner per identifier

patients.insurance_memberships
  id uuid PK, patient_id uuid NOT NULL REFERENCES patients.patients,
  payer_type text NOT NULL CHECK (payer_type IN ('NHIS','PRIVATE','OTHER')),
  payer_name text NULL,                                         -- FK to insurance.payers added later
  member_no text NOT NULL,                                      -- the card or HIN used for claims
  is_dependant boolean NOT NULL DEFAULT false,                  -- CLAIM-it isDependant
  principal_patient_id uuid NULL REFERENCES patients.patients,  -- card holder, if also a patient
  principal_name text NULL,
  valid_from date NULL, valid_to date NULL,
  eligibility_status text NOT NULL DEFAULT 'unverified'
     CHECK (eligibility_status IN ('unverified','format_valid','verified_active','expired','invalid')),
  verified_at ts NULL, verified_by uuid NULL,
  is_primary boolean NOT NULL DEFAULT true,
  voided_at ts NULL, voided_by uuid NULL, void_reason text NULL, standard columns
  CHECK (payer_type <> 'NHIS' OR member_no ~ '^([0-9]{8}|[0-9]{10})$')       -- [SPEC: 8 or 10 digits]
  UNIQUE (patient_id) WHERE is_primary AND voided_at IS NULL     -- one primary membership at a time
```

`eligibility_status` never shows "verified_active" unless a real NHIA check exists and is confirmed [VERIFY U4]. Until then the highest value reachable is `format_valid`.

```
patients.next_of_kin
  id uuid PK, patient_id uuid NOT NULL REFERENCES patients.patients, full_name text NOT NULL,
  relationship text NOT NULL, phone text NOT NULL, is_primary boolean NOT NULL DEFAULT false,
  voided_at ts NULL, standard columns

patients.allergies
  id uuid PK, patient_id uuid NOT NULL REFERENCES patients.patients,
  substance_id uuid NULL REFERENCES core.substances, substance_text text NULL,
  reaction text NULL,
  severity text NOT NULL CHECK (severity IN ('mild','moderate','severe','life_threatening')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved','entered_in_error')),
  recorded_by uuid NOT NULL, recorded_at ts NOT NULL DEFAULT now(), standard columns
  CHECK (substance_id IS NOT NULL OR substance_text IS NOT NULL)

patients.medical_history
  id uuid PK, patient_id uuid NOT NULL REFERENCES patients.patients,
  condition_text text NOT NULL, icd10_code text NULL REFERENCES core.ref_icd10,
  onset_date date NULL, status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved','entered_in_error')),
  notes text NULL, standard columns

patients.duplicate_links
  id uuid PK, patient_a uuid NOT NULL REFERENCES patients.patients, patient_b uuid NOT NULL REFERENCES patients.patients,
  score numeric(4,3) NOT NULL, reasons text[] NOT NULL,
  status text NOT NULL DEFAULT 'suspected' CHECK (status IN ('suspected','confirmed_duplicate','not_duplicate')),
  reviewed_by uuid NULL, reviewed_at ts NULL, review_note text NULL,
  CHECK (patient_a < patient_b), UNIQUE (patient_a, patient_b)
```

### 1.2 Functions

| Function | Cat. | Permission | What it does | Events |
|----------|------|-----------|--------------|--------|
| `api.search_patients(term, filters, page, page_size)` | A | `patients.search` | Returns **limited columns only** (public_id, name, age, sex, phone, last visit date, duplicate flag, NHIS format status) through trigram, phone and identifier lookups. Logs the search term hash, not the term | none |
| `api.find_duplicate_candidates(surname, other_names, dob, phone, member_no)` | A | `patients.create` | Scores candidates (name similarity, double-metaphone match, same date of birth, same phone, same member number). Returns candidates above the configured threshold | none |
| `api.register_patient(payload, idempotency_key, duplicate_override_reason)` | **C** | `patients.create` | Issues `ASC-PAT-…`. If candidates exist and no override reason, raises `possible_duplicate` with the candidate list. Creates patient, identifiers, membership, next of kin, in one transaction | `patient.registered` |
| `api.update_patient(patient_id, changes, expected_version)` | B | `patients.update` | Whitelisted columns only. Writes before and after to audit | `patient.updated` |
| `api.record_membership(...)` / `api.end_membership(...)` | B | `patients.update` | Validates number format, keeps history by ending the old row | `patient.membership_changed` |
| `api.add_allergy` / `api.update_allergy_status` | B | `clinical.consult` or `nursing.triage` | Allergy changes notify any clinician with an open encounter | `patient.allergy_changed` |
| `api.add_medical_history` | B | `clinical.consult` | | `patient.history_changed` |
| `api.flag_duplicate(a, b, reason)` / `api.review_duplicate(id, outcome, note)` | B | `patients.merge` | Records the link. **Does not merge** | `patient.duplicate_flagged` |
| `api.mark_deceased(patient_id, at)` | C | `patients.update` | Also closes open encounters through the discharge path | `patient.deceased` |

Channels for `patient.registered`: `dept:{reception}` and `dept:{records}`. Opening the encounter notifies the clinical departments.

### 1.3 Indexes

```
ix_patients_name_trgm        GIN (name_search gin_trgm_ops)
ix_patients_phone_norm       btree (phone_norm)
ix_patients_dob              btree (date_of_birth)
ix_patients_surname_dob      btree (lower(surname), date_of_birth)
ix_identifiers_value         unique partial (see above)
ix_membership_member_no      btree (payer_type, member_no)
ix_allergies_patient_active  btree (patient_id) WHERE status = 'active'
foreign-key indexes on every patient_id
```

Target: `api.search_patients` p95 under 1 second (Architecture v1.0 §6.3), verified by the load test on at least 500,000 synthetic patient rows [DECISION: test at 10× expected volume].

### 1.4 RLS and audit

- `patients.*` tables: class P. Direct reads by clinicians go through `identity.can_access_patient`.
- `api.search_patients` is `SECURITY DEFINER` with `patients.search`, returning only the limited columns. This is how reception can find a patient without clinical access.
- Every read of a `sensitive` patient writes `audit.access_log`.
- Every change to demographics, membership and allergies writes before and after values to `audit.events`.

### 1.5 Claim data supplied by this schema

`surname`, `otherNames`, `dateOfBirth`, `gender`, `hospitalRecNo` (= `public_id`), `memberNo`, `isDependant`.

### 1.6 Duplicate handling in Phase 1 [DECISION]

- **Prevent:** duplicate candidate search runs inside `api.register_patient`.
- **Flag:** `duplicate_links` records suspected duplicates found later.
- **Do not merge.** No function re-points visits, results or bills between two patient records in Phase 1. A merge needs a registry of every table with a patient reference, a tested re-point procedure, and an audit and reversal design. This is scheduled as its own design (Release 8) once modules exist.

---

## 2. Schema `appointments`

```
appointments.appointment_statuses                              -- lookup
  code text PK, name text NOT NULL, is_terminal boolean NOT NULL
  -- scheduled, confirmed, arrived, in_progress, completed, no_show, cancelled

appointments.appointments                                      -- class P
  id uuid PK, public_id text UNIQUE NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients.patients,
  department_id uuid NOT NULL REFERENCES core.departments,
  clinician_id uuid NULL REFERENCES identity.staff_profiles,
  scheduled_start ts NOT NULL, scheduled_end ts NOT NULL,
  reason text NULL, status_code text NOT NULL REFERENCES appointments.appointment_statuses DEFAULT 'scheduled',
  arrived_at ts NULL,
  encounter_id uuid NULL,                                      -- FK added after encounters exists
  cancel_reason text NULL, booked_by uuid NOT NULL, standard columns, row_version
  CHECK (scheduled_end > scheduled_start)
  EXCLUDE USING gist (clinician_id WITH =, tstzrange(scheduled_start, scheduled_end) WITH &&)
     WHERE (clinician_id IS NOT NULL AND status_code NOT IN ('cancelled','no_show'))   -- no double booking
```

| Function | Cat. | Permission | Events |
|----------|------|-----------|--------|
| `api.book_appointment` | B | `appointments.manage` | `appointment.created` to `dept:{department}` |
| `api.reschedule_appointment`, `api.cancel_appointment`, `api.mark_no_show` | B | `appointments.manage` | `appointment.updated` |
| `api.check_in_appointment(appointment_id, attendance_type, idempotency_key)` | C | `encounters.open` | Calls `open_encounter`, sets `arrived_at`, links `encounter_id`. Emits `appointment.arrived` and `encounter.opened` |

Index: `(department_id, scheduled_start)`, `(patient_id, scheduled_start)`, `(clinician_id, scheduled_start)`.
`api.todays_appointments(department_id, date)` is the reception view (Dashboard D1).

---

## 3. Schema `encounters`: the hub

Owns the encounter lifecycle, the patient timeline and the single publishing function. Everything a patient does in the hospital attaches to an encounter.

### 3.1 Lookup tables

```
encounters.encounter_classes                                   -- lookup
  code text PK, name text NOT NULL,
  claim_service_type enum claim_service_type ('OPD','IPD','DIA','PHC') NULL    -- mapping used by claims
  -- outpatient→OPD, inpatient→IPD, diagnostic_only→DIA, pharmacy_only→PHC, emergency → [VERIFY] depends on admission

encounters.encounter_statuses                                  -- lookup
  code text PK, name text NOT NULL, is_terminal boolean NOT NULL, display_order int NOT NULL,
  registry_key text NOT NULL                                   -- key in the UI status registry, e.g. 'encounter.triaged'
  -- registered, triaged, in_consultation, investigations_pending, awaiting_dispensing,
  -- awaiting_billing, admitted, closed, cancelled

encounters.allowed_transitions
  from_status text NOT NULL, event_code text NOT NULL, to_status text NOT NULL,
  required_permission text NULL, PRIMARY KEY (from_status, event_code)
```

### 3.2 Core tables

```
encounters.encounters                                          -- class P, D
  id                    uuid PK
  public_id             text UNIQUE NOT NULL                   -- ASC-ENC-000001
  patient_id            uuid NOT NULL REFERENCES patients.patients
  encounter_class       text NOT NULL REFERENCES encounters.encounter_classes
  attendance_type       enum attendance_type ('EAE','CFU','ANC','PNC') NOT NULL   -- captured at opening
  department_id         uuid NOT NULL REFERENCES core.departments
  status_code           text NOT NULL REFERENCES encounters.encounter_statuses DEFAULT 'registered'
  status_changed_at     ts NOT NULL                            -- used for wait timers
  priority_code         text NULL REFERENCES core.ref_triage_priorities
  assigned_clinician_id uuid NULL REFERENCES identity.staff_profiles
  appointment_id        uuid NULL REFERENCES appointments.appointments
  insurance_membership_id uuid NULL REFERENCES patients.insurance_memberships   -- membership in force at opening
  payer_type            text NULL
  reason_for_visit      text NULL
  opened_at             ts NOT NULL DEFAULT now(), opened_by uuid NOT NULL
  closed_at             ts NULL
  outcome               enum service_outcome ('DISC','DIED','TFOT','ABSC') NULL     -- CLAIM-it serviceOutcome
  outcome_at            ts NULL
  standard columns, row_version
  CHECK (closed_at IS NULL OR status_code IN ('closed','cancelled'))
  CHECK ((outcome IS NULL) = (outcome_at IS NULL))
  UNIQUE (patient_id, department_id) WHERE status_code NOT IN ('closed','cancelled')
                                      AND encounter_class = 'outpatient'    -- no duplicate open outpatient visit
```

```
encounters.encounter_status_history                            -- class P, append-only
  id bigint generated always as identity PK, encounter_id uuid NOT NULL REFERENCES encounters.encounters,
  from_status text NULL, to_status text NOT NULL, event_code text NOT NULL,
  changed_at ts NOT NULL, changed_by uuid NOT NULL,
  seconds_in_previous int NULL                                 -- supports wait-time KPIs without scanning timeline

encounters.patient_timeline                                    -- class P, append-only
  id bigint generated always as identity PK, patient_id uuid NOT NULL, encounter_id uuid NULL,
  event_type text NOT NULL, entity_schema text NULL, entity_table text NULL, entity_id uuid NULL,
  summary text NOT NULL,                                       -- non-sensitive display text
  actor_id uuid NOT NULL, committed_at ts NOT NULL
```

`patient_timeline` has no foreign key to `patients` so that corrections to patient records can never be blocked by history, and no update or delete is possible (`core.block_mutation`).

### 3.3 Encounter state design [DECISION]

Before consultation the status moves in a fixed order: `registered` → `triaged` → `in_consultation`.

After consultation, the status is **derived from open work**, because patients may have several things pending at once. `encounters.refresh_status(encounter_id)` recomputes it in this priority order:

1. `investigations_pending`: any lab or imaging item not yet verified.
2. `awaiting_dispensing`: any active prescription not fully dispensed.
3. `awaiting_billing`: any charge unpaid where payment is required.
4. `closed`: nothing outstanding and the consultation is finalised (and, for admissions, discharged).

`refresh_status` is called by handlers on `lab.result.verified`, `pharmacy.dispensed`, `payment.recorded`, `consultation.finalized`. It goes through `transition_encounter` using the `recompute` event so the allowed-transition table still guards every change.

### 3.4 Functions

| Function | Cat. | Permission | What it does |
|----------|------|-----------|--------------|
| `api.open_encounter(patient_id, encounter_class, attendance_type, department_id, appointment_id, reason, idempotency_key)` | **C** | `encounters.open` | Issues `ASC-ENC-…`. Snapshots the patient's primary membership. Creates the care relationship for the department. Emits `encounter.opened` |
| `encounters.transition_encounter(encounter_id, event_code, expected_version)` | internal definer | checked per transition | Validates against `allowed_transitions` and the caller's permission, locks the row, checks `expected_version`, updates status, writes `encounter_status_history`, returns new version. **Only function allowed to change `status_code`** |
| `encounters.refresh_status(encounter_id)` | internal | | Section 3.3 |
| `api.transfer_encounter(encounter_id, to_department_id, reason, expected_version)` | C | `encounters.transfer` | Moves department. Both department queues update. Emits `encounter.transferred` to both departments |
| `api.cancel_encounter(encounter_id, reason, expected_version)` | C | `encounters.cancel` | Allowed only if nothing irreversible has happened (no dispensing, no verified results, no posted payments). Otherwise the error explains what blocks it |
| `api.set_encounter_outcome(encounter_id, outcome, at)` | C | clinical or inpatient permission | Used by discharge and disposition. Sets `outcome` and `outcome_at` |
| `api.assign_clinician(encounter_id, clinician_id)` | B | `clinical.consult` or `encounters.transfer` | Creates care relationship |

Direct `UPDATE encounters SET status_code = …` is impossible: privileges are revoked and a trigger rejects status changes that do not come from `transition_encounter` (checked through a transaction-local setting `app.in_transition = 'on'` set inside the function).

### 3.5 Views (read side of the dashboards)

| View or function | Used by | Notes |
|------------------|---------|-------|
| `api.encounter_queue(department_id, status_codes[], page)` | D2, D3, D4 | Returns minimal card data: encounter public_id, patient display name, age, sex, priority, status, `status_changed_at`, allergy flag, assigned clinician. Server-sorted by priority then wait |
| `api.patient_timeline(patient_id, before, limit)` | D0 | Keyset pagination on `committed_at` |
| `api.encounter_summary(encounter_id)` | D0 | Status, counts of pending orders, prescriptions, unpaid charges |
| `api.queue_metrics(department_id)` | D2 | Waiting count, average and longest wait (from `encounter_status_history`), overdue count using `core.settings` thresholds |

All are `security_invoker` views or `SECURITY INVOKER` functions, so RLS applies.

### 3.6 `encounters.record_event`: the single publishing function

Signature in Part 1 §4.3. Behaviour, in order, inside the caller's transaction:

1. `v_now := clock_timestamp()`.
2. Insert `audit.events` (actor `auth.uid()`, event type, entity pointer, patient and encounter ids, `p_audit` payload, `v_now`).
3. If `p_patient_id` is not null, insert `encounters.patient_timeline` (`summary` must be non-sensitive; a check rejects summaries longer than 200 characters).
4. For every channel in `p_channels`, call `realtime.send(payload, event_type, channel, true)` where `payload = {event_id, event_type, entity_schema, entity_table, entity_id, patient_id, encounter_id, version, committed_at}`. **No names, no values.**
5. Run registered handlers for the event type (Section 3.7).
6. If `p_outbox` is not null, insert `integration.outbox_events`.

Rules:
- A write function that does not call `record_event` is a defect, caught by the registry test (Part 3 §10).
- `record_event` never trusts the caller to build channel names. It exposes helpers `encounters.channels_for(encounter_id, extra_departments[])` that produce the right `dept:`, `patient:` and `encounter:` topics.

### 3.7 Event handlers (`core.event_handlers`) [A5]

```
core.event_handlers
  id uuid PK, event_pattern text NOT NULL,                     -- 'lab.order.created' or 'lab.*'
  handler text NOT NULL,                                       -- fully qualified function, e.g. 'finance.on_lab_order_created'
  is_critical boolean NOT NULL,                                -- failure aborts the transaction
  priority int NOT NULL DEFAULT 100, is_active boolean NOT NULL DEFAULT true,
  UNIQUE (event_pattern, handler)

core.handler_failures                                          -- non-critical handler errors
  id bigint generated always as identity PK, event_id uuid NOT NULL, handler text NOT NULL,
  error text NOT NULL, occurred_at ts NOT NULL DEFAULT now(), retried_at ts NULL, resolved boolean NOT NULL DEFAULT false
```

Handler contract: `handler(p_event jsonb) RETURNS void`, **idempotent**, fast (target under 50 ms), and uses only its own module's tables.

- **Critical handlers** (a failure rolls back the whole operation, because losing the effect would be worse than blocking it): creating a **charge** when a lab order or prescription is created, **stock deduction**, `encounters.refresh_status`.
- **Non-critical handlers** (run inside a savepoint, errors logged to `handler_failures` and queued for retry): **claim readiness refresh**, notification fan-out for routine updates.

Registered handlers (initial):

| Event | Handler | Critical |
|-------|---------|----------|
| `encounter.opened` | `finance.on_encounter_opened` (registration charge), `insurance.on_encounter_opened` (claim candidate) | yes / no |
| `lab.order.created` | `finance.on_lab_order_created` | yes |
| `prescription.created` | `pharmacy.on_prescription_created` (work item) | yes |
| `procedure.recorded` | `finance.on_procedure_recorded` | yes |
| `lab.result.verified` | `encounters.refresh_status`, `insurance.refresh_claim_readiness` | yes / no |
| `pharmacy.dispensed` | `encounters.refresh_status`, `insurance.refresh_claim_readiness` | yes / no |
| `payment.recorded` | `encounters.refresh_status` | yes |
| `consultation.finalized` | `encounters.refresh_status`, `insurance.refresh_claim_readiness` | yes / no |
| `patient.discharged` | `finance.on_discharge`, `insurance.on_discharge` (claim candidate with outcome and dates) | yes / no |

### 3.8 Indexes

```
ix_encounters_dept_status_open   btree (department_id, status_code, priority_code, status_changed_at)
                                 WHERE status_code NOT IN ('closed','cancelled')       -- every queue screen
ix_encounters_patient            btree (patient_id, opened_at DESC)
ix_encounters_clinician_open     btree (assigned_clinician_id) WHERE status_code NOT IN ('closed','cancelled')
ix_status_history_encounter      btree (encounter_id, changed_at)
ix_timeline_patient              btree (patient_id, committed_at DESC)
ix_timeline_encounter            btree (encounter_id, committed_at DESC)
```

### 3.9 Claim data supplied by this schema

`typeOfService` (through `claim_service_type`), `typeOfAttendance`, `serviceOutcome`, first and last `dateOfService` (opening and discharge), specialty (through the department).

---

## 4. Schema `nursing`

### 4.1 Tables

```
nursing.observations                                           -- class P, append-only with void
  id uuid PK, patient_id uuid NOT NULL, encounter_id uuid NOT NULL REFERENCES encounters.encounters,
  recorded_at ts NOT NULL DEFAULT clock_timestamp(), recorded_by uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('triage','clinic','ward','emergency')),
  temperature_c    numeric(4,1) NULL CHECK (temperature_c BETWEEN 25 AND 45),
  pulse_bpm        smallint NULL CHECK (pulse_bpm BETWEEN 20 AND 300),
  respiratory_rate smallint NULL CHECK (respiratory_rate BETWEEN 4 AND 80),
  spo2_pct         smallint NULL CHECK (spo2_pct BETWEEN 30 AND 100),
  systolic_mmhg    smallint NULL CHECK (systolic_mmhg BETWEEN 40 AND 300),
  diastolic_mmhg   smallint NULL CHECK (diastolic_mmhg BETWEEN 20 AND 200),
  weight_kg        numeric(5,2) NULL CHECK (weight_kg > 0 AND weight_kg <= 500),
  height_m         numeric(3,2) NULL CHECK (height_m BETWEEN 0.30 AND 2.50),
  glucose_mmol_l   numeric(4,1) NULL CHECK (glucose_mmol_l BETWEEN 0.5 AND 60),
  glucose_type     enum glucose_type ('FBS','RBS','2HPP','HBA1C') NULL,
  pain_score       smallint NULL CHECK (pain_score BETWEEN 0 AND 10),
  flags            text[] NOT NULL DEFAULT '{}',               -- computed by the database, not the client
  notes text NULL,
  voided_at ts NULL, voided_by uuid NULL, void_reason text NULL
  CHECK ((systolic_mmhg IS NULL) = (diastolic_mmhg IS NULL))
  CHECK (systolic_mmhg IS NULL OR systolic_mmhg > diastolic_mmhg)
  CHECK (glucose_mmol_l IS NULL OR glucose_type IS NOT NULL)   -- trigger defaults to 'RBS' when omitted [SPEC default]
  CHECK (num_nonnulls(temperature_c, pulse_bpm, respiratory_rate, spo2_pct, systolic_mmhg,
                      weight_kg, height_m, glucose_mmol_l, pain_score) >= 1)
```

Two layers of validation, deliberately different:
- **Hard bounds** (above) reject physiologically impossible values. These are database constraints and cannot be bypassed.
- **Abnormal ranges** are rules in `nursing.vital_rules` (below). They produce `flags` and alerts, never a rejection.

```
nursing.vital_rules                                            -- class R, admin-managed
  id uuid PK, parameter text NOT NULL,                         -- 'systolic_mmhg', 'spo2_pct', ...
  age_min_days int NOT NULL DEFAULT 0, age_max_days int NULL,
  low numeric NULL, high numeric NULL, critical_low numeric NULL, critical_high numeric NULL,
  valid_from date NOT NULL, valid_to date NULL                 -- ranges depend on age: [VERIFY clinical sign-off]

nursing.red_flags                                              -- lookup
  code text PK, description text NOT NULL, raises_priority_to text NULL REFERENCES core.ref_triage_priorities

nursing.triage_assessments                                     -- class P, versioned
  id uuid PK, patient_id uuid NOT NULL, encounter_id uuid NOT NULL REFERENCES encounters.encounters,
  observation_id uuid NULL REFERENCES nursing.observations,
  priority_code text NOT NULL REFERENCES core.ref_triage_priorities,
  chief_complaint text NOT NULL, red_flags text[] NOT NULL DEFAULT '{}',
  assessed_by uuid NOT NULL, assessed_at ts NOT NULL DEFAULT clock_timestamp(),
  version int NOT NULL DEFAULT 1, supersedes_id uuid NULL REFERENCES nursing.triage_assessments,
  UNIQUE (encounter_id, version)
```

BMI is **never stored**. It is calculated in the read view from weight and height.

### 4.2 Functions

| Function | Cat. | Permission | What it does | Events |
|----------|------|-----------|--------------|--------|
| `api.record_observation(encounter_id, values, idempotency_key)` | B | `nursing.observe` | Inserts an observation. Computes `flags` from `vital_rules`. Critical values create a `critical` notification to the assigned clinician and the department charge nurse | `observation.recorded` |
| `api.complete_triage(encounter_id, observation, priority, complaint, red_flags, expected_version, idempotency_key)` | **C** | `nursing.triage` | In one transaction: inserts observation, inserts triage assessment, applies red-flag priority escalation, sets the encounter priority, calls `transition_encounter(…, 'triage_completed')`, creates care relationship | `triage.completed` to `dept:{clinic}`, `encounter`, `patient` |
| `api.void_observation(id, reason)` | B | `nursing.observe` | Marks void with reason. Original stays | `observation.voided` |
| `api.vitals_for_encounter(encounter_id)` | read | patient access | Series with BMI computed in the view | none |

### 4.3 Claim data supplied by this schema (Value Based Care)

`extraData/vitals`: `recorded_at` (date), `weight_kg`, `height_m`, `systolic_mmhg`, `diastolic_mmhg`, `glucose_mmol_l`, `glucose_type` (default `RBS`). Units are added by the XML builder (`10.2 kg`, `0.13 m`, `120 mmHg`, `4.6 mmol/L`) and are not stored with the numbers.

---

## 5. Schema `clinical`

### 5.1 Tables

```
clinical.consultations                                         -- class P
  id uuid PK, encounter_id uuid NOT NULL REFERENCES encounters.encounters,
  patient_id uuid NOT NULL, clinician_id uuid NOT NULL REFERENCES identity.staff_profiles,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','finalised')),
  started_at ts NOT NULL DEFAULT now(),
  chief_complaint text NULL, history_present_illness text NULL, examination text NULL,
  assessment text NULL, plan text NULL,
  disposition text NULL CHECK (disposition IN ('discharge_home','admit','refer','follow_up','died','absconded')),
  follow_up_date date NULL,
  finalised_at ts NULL, finalised_by uuid NULL, standard columns, row_version
  CHECK ((status = 'finalised') = (finalised_at IS NOT NULL))
  UNIQUE (encounter_id, clinician_id)

clinical.consultation_addenda                                  -- append-only
  id uuid PK, consultation_id uuid NOT NULL REFERENCES clinical.consultations,
  author_id uuid NOT NULL, reason text NOT NULL, addendum_text text NOT NULL, created_at ts NOT NULL DEFAULT now()

clinical.diagnoses
  id uuid PK, consultation_id uuid NOT NULL REFERENCES clinical.consultations,
  encounter_id uuid NOT NULL, patient_id uuid NOT NULL,
  icd10_code text NOT NULL REFERENCES core.ref_icd10,
  description text NOT NULL,                                   -- snapshot of the ICD-10 description at diagnosis time
  diagnosis_type text NOT NULL CHECK (diagnosis_type IN ('principal','secondary','provisional')),
  voided_at ts NULL, voided_by uuid NULL, void_reason text NULL, standard columns
  UNIQUE (consultation_id) WHERE diagnosis_type = 'principal' AND voided_at IS NULL

clinical.procedures_performed
  id uuid PK, consultation_id uuid NOT NULL, encounter_id uuid NOT NULL, patient_id uuid NOT NULL,
  service_id uuid NOT NULL REFERENCES core.service_catalogue,
  performed_at ts NOT NULL, performed_by uuid NOT NULL,
  diagnosis_id uuid NOT NULL REFERENCES clinical.diagnoses,    -- [SPEC: every procedure needs its major diagnosis]
  notes text NULL, voided_at ts NULL, voided_by uuid NULL, void_reason text NULL, standard columns

clinical.prescriptions                                         -- class P
  id uuid PK, public_id text UNIQUE NOT NULL, encounter_id uuid NOT NULL, patient_id uuid NOT NULL,
  prescriber_id uuid NOT NULL REFERENCES identity.staff_profiles,
  status text NOT NULL DEFAULT 'active' CHECK (status IN
     ('active','verified','partially_dispensed','dispensed','cancelled','expired')),
  prescribed_at ts NOT NULL DEFAULT now(),
  allergy_checked_at ts NULL, allergy_override_reason text NULL, allergy_override_by uuid NULL,
  notes text NULL, standard columns, row_version

clinical.prescription_items
  id uuid PK, prescription_id uuid NOT NULL REFERENCES clinical.prescriptions,
  formulary_item_id uuid NOT NULL REFERENCES pharmacy.formulary_items,
  dose_value numeric(8,3) NULL, dose_unit text NULL REFERENCES core.ref_dose_units,
  frequency_value smallint NULL, frequency_unit text NULL CHECK (frequency_unit IN ('HOURLY','DAILY')),
  duration_value smallint NULL, duration_unit text NULL CHECK (duration_unit IN ('DAYS','WEEKS','MONTHS')),
  unparsed_text text NULL,                                     -- free-text prescription [SPEC alternative]
  quantity_prescribed numeric(14,3) NOT NULL CHECK (quantity_prescribed > 0),
  route text NULL, instructions text NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','dispensed','partially_dispensed','cancelled'))
  CHECK ( (dose_value IS NOT NULL AND dose_unit IS NOT NULL AND frequency_value IS NOT NULL
           AND frequency_unit IS NOT NULL AND duration_value IS NOT NULL AND duration_unit IS NOT NULL)
          OR unparsed_text IS NOT NULL )                       -- [SPEC: structured OR unparsed, never neither]

clinical.referrals
  id uuid PK, encounter_id uuid NOT NULL, patient_id uuid NOT NULL,
  direction text NOT NULL CHECK (direction IN ('out','in')),
  facility_name text NOT NULL, facility_id text NULL,
  referral_ccc text NULL CHECK (referral_ccc ~ '^[0-9]{5}$'),  -- [VERIFY: same format as claim CCC]
  reason text NOT NULL, urgency text NULL, referred_by uuid NOT NULL, referred_at ts NOT NULL DEFAULT now(),
  standard columns
```

The structured dose is exported as `"<dose_value> <dose_unit>"` (`1 Tablet`), the frequency as `"<n> HOURLY|DAILY"` and the duration as `"<n> DAYS|WEEKS|MONTHS"`, exactly as the CLAIM-it format requires.

### 5.2 Functions

| Function | Cat. | Permission | What it does | Events |
|----------|------|-----------|--------------|--------|
| `api.start_consultation(encounter_id)` | B | `clinical.consult` | Creates the consultation, creates a consulting care relationship, assigns the clinician, calls `transition_encounter('consultation_started')` | `consultation.started` |
| `api.save_consultation_draft(consultation_id, fields, expected_version)` | B | `clinical.consult` | Only while `draft`. Server-side autosave | none (no realtime noise) |
| `api.add_diagnosis` / `api.void_diagnosis` | B | `clinical.consult` | Validates ICD-10 exists and is valid on the date. Copies the description | `diagnosis.recorded` |
| `api.add_procedure` | B | `clinical.consult` | Requires `diagnosis_id`. Creates charge through handler | `procedure.recorded` |
| `api.check_prescription_safety(patient_id, formulary_item_ids[])` | read | `clinical.prescribe` | Allergy conflicts through `core.substances` links, duplicate therapy. Returns conflicts and severities | none |
| `api.create_prescription(encounter_id, items[], allergy_override_reason, idempotency_key)` | **C** | `clinical.prescribe` | Runs the safety check inside. A conflict **blocks** unless the caller supplies an override reason **and** holds the override permission. Validates structured-or-free-text rule | `prescription.created` to `dept:pharmacy`, `encounter`, `patient` |
| `api.cancel_prescription(id, reason)` | C | `clinical.prescribe` | Blocked if already dispensed | `prescription.cancelled` |
| `api.create_referral` | B | `clinical.refer` | | `referral.created` |
| `api.finalise_consultation(consultation_id, expected_version, idempotency_key)` | **C** | `clinical.finalize` | Validation list below. Sets `finalised_at`, sets encounter outcome from disposition, recomputes encounter status | `consultation.finalized` |
| `api.add_addendum(consultation_id, reason, text)` | B | `clinical.consult` | Only after finalisation. Original text is never changed | `consultation.addendum` |

**`finalise_consultation` blockers:**
1. At least one **principal diagnosis** with a valid ICD-10 code.
2. Every procedure has a diagnosis and a date.
3. Every prescription item satisfies the structured-or-free-text rule.
4. A disposition is chosen.
5. The consulting clinician is the caller or holds an override permission.
6. No unresolved allergy conflict.

**Warnings** (shown, require acknowledgement, never block): non-standard (free-text) prescription items, missing referral details when disposition is `refer`, claim readiness gaps.

**Disposition to outcome** [DECISION]: `discharge_home` → `DISC`, `refer` → `TFOT`, `died` → `DIED`, `absconded` → `ABSC`, `admit` → left empty until inpatient discharge, `follow_up` → `DISC`.

### 5.3 Indexes

```
ix_consultations_encounter     btree (encounter_id)
ix_diagnoses_encounter         btree (encounter_id) WHERE voided_at IS NULL
ix_procedures_encounter        btree (encounter_id) WHERE voided_at IS NULL
ix_prescriptions_status        btree (status, prescribed_at) WHERE status IN ('active','verified','partially_dispensed')
ix_prescription_items_rx       btree (prescription_id)
ix_referrals_encounter         btree (encounter_id)
```

### 5.4 Claim data supplied by this schema

`diagnosis` (ICD-10 plus description, GDRG through mapping), `procedure` (date, GDRG through `core.service_catalogue` mapping, ICD-10 and description from the linked diagnosis), `medicine` prescription block (`dose`, `frequency`, `duration` or `unparsed`), `referralInfo`.

---

## 6. Schema `laboratory`

### 6.1 Tables

```
laboratory.lab_tests                                           -- class R
  id uuid PK, code text UNIQUE NOT NULL, name text NOT NULL,
  service_id uuid NOT NULL UNIQUE REFERENCES core.service_catalogue,    -- price and claim GDRG mapping hang off the service
  specimen_type text NOT NULL, container text NULL, turnaround_minutes int NULL, is_active boolean NOT NULL DEFAULT true

laboratory.lab_test_components
  id uuid PK, test_id uuid NOT NULL REFERENCES laboratory.lab_tests, code text NOT NULL, name text NOT NULL,
  result_type text NOT NULL CHECK (result_type IN ('numeric','text','coded')),
  unit text NULL, decimals smallint NULL, display_order int NOT NULL DEFAULT 0, UNIQUE (test_id, code)

laboratory.reference_ranges
  id uuid PK, component_id uuid NOT NULL REFERENCES laboratory.lab_test_components,
  sex text NOT NULL CHECK (sex IN ('M','F','any')), age_min_days int NOT NULL DEFAULT 0, age_max_days int NULL,
  low numeric NULL, high numeric NULL, critical_low numeric NULL, critical_high numeric NULL,
  valid_from date NOT NULL, valid_to date NULL                  -- [VERIFY laboratory sign-off for every range]

laboratory.lab_orders                                          -- class P, D
  id uuid PK, public_id text UNIQUE NOT NULL, encounter_id uuid NOT NULL, patient_id uuid NOT NULL,
  requested_by uuid NOT NULL REFERENCES identity.staff_profiles,
  priority text NOT NULL CHECK (priority IN ('routine','urgent','stat')),
  status text NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered','partial','complete','cancelled')),
  clinical_notes text NULL, ordered_at ts NOT NULL DEFAULT now(), location_id uuid NULL REFERENCES core.locations,
  standard columns, row_version

laboratory.lab_order_items
  id uuid PK, order_id uuid NOT NULL REFERENCES laboratory.lab_orders,
  test_id uuid NOT NULL REFERENCES laboratory.lab_tests, service_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'ordered' CHECK (status IN
     ('ordered','collected','received','in_process','awaiting_verification','verified','rejected','cancelled')),
  status_changed_at ts NOT NULL DEFAULT now(), cancel_reason text NULL, row_version int NOT NULL DEFAULT 1
  UNIQUE (order_id, test_id)

laboratory.specimens
  id uuid PK, order_id uuid NOT NULL REFERENCES laboratory.lab_orders,
  specimen_type text NOT NULL, barcode text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'collected' CHECK (status IN ('collected','received','rejected')),
  collected_at ts NOT NULL, collected_by uuid NOT NULL, received_at ts NULL, received_by uuid NULL,
  rejection_reason text NULL, identity_confirmed boolean NOT NULL DEFAULT false   -- two-identifier check done
  CHECK (identity_confirmed)

laboratory.specimen_items
  specimen_id uuid NOT NULL REFERENCES laboratory.specimens, order_item_id uuid NOT NULL REFERENCES laboratory.lab_order_items,
  PRIMARY KEY (specimen_id, order_item_id)

laboratory.lab_results                                         -- append-only after verification
  id uuid PK, order_item_id uuid NOT NULL REFERENCES laboratory.lab_order_items,
  component_id uuid NOT NULL REFERENCES laboratory.lab_test_components,
  version int NOT NULL DEFAULT 1,
  value_numeric numeric NULL, value_text text NULL,
  unit text NULL, ref_low numeric NULL, ref_high numeric NULL,   -- snapshot at entry, so later range edits never alter history
  flag text NOT NULL DEFAULT 'N' CHECK (flag IN ('N','L','H','LL','HH','A')),   -- computed by the database
  status text NOT NULL DEFAULT 'entered' CHECK (status IN ('entered','verified','superseded')),
  entered_by uuid NOT NULL, entered_at ts NOT NULL DEFAULT now(),
  verified_by uuid NULL, verified_at ts NULL,
  supersedes_id uuid NULL REFERENCES laboratory.lab_results, amend_reason text NULL,
  UNIQUE (order_item_id, component_id, version)
  CHECK (value_numeric IS NOT NULL OR value_text IS NOT NULL)
  CHECK (status <> 'verified' OR (verified_by IS NOT NULL AND verified_at IS NOT NULL))
  CHECK (supersedes_id IS NULL OR amend_reason IS NOT NULL)

laboratory.critical_notifications
  id uuid PK, result_id uuid NOT NULL REFERENCES laboratory.lab_results,
  clinician_id uuid NOT NULL, notified_by uuid NULL, method text NULL CHECK (method IN ('phone','in_person','system')),
  notified_at ts NULL, acknowledged_at ts NULL, acknowledged_by uuid NULL, note text NULL
```

A trigger (`laboratory.protect_verified_results`) allows an `UPDATE` on a result row only for the transition `entered → verified` (setting verifier and time). Any other change to a verified row is rejected. Corrections create a **new version** that supersedes the old one.

### 6.2 Functions

| Function | Cat. | Permission | What it does | Events |
|----------|------|-----------|--------------|--------|
| `api.create_lab_order(encounter_id, items[], priority, notes, idempotency_key)` | **C** | `clinical.order` | Creates order and items. Charge creation runs through the critical handler `finance.on_lab_order_created` | `lab.order.created` to `dept:laboratory`, `encounter`, `patient` |
| `api.cancel_lab_order_item(id, reason)` | C | `clinical.order` | Only before collection. Reverses charge through finance function | `lab.order.cancelled` |
| `api.collect_specimen(order_id, item_ids[], barcode, identity_confirmed, idempotency_key)` | C | `lab.collect` | Requires the two-identifier confirmation flag. Label printing happens only after this returns | `lab.specimen.collected` |
| `api.receive_specimen(specimen_id)` | B | `lab.process` | | `lab.specimen.received` |
| `api.reject_specimen(specimen_id, reason)` | C | `lab.process` | Items return to `ordered` with a re-collection need. Notifies the requester (`important`) | `lab.specimen.rejected` |
| `api.enter_result(order_item_id, results[], expected_version)` | B | `lab.process` | Inserts results with `flag` and range snapshot **computed by the database** from `reference_ranges` for the patient's age and sex. Item moves to `awaiting_verification` | `lab.result.entered` (department only) |
| `api.verify_result(order_item_id, expected_version, idempotency_key)` | **C** | `lab.verify` | Four-eyes check when setting `lab.four_eyes` is on (verifier differs from enterer) [VERIFY U7]. Marks results verified. Updates item and order status. Creates `critical_notifications` and a `critical` notification with required acknowledgement when a critical flag exists | `lab.result.verified` to `dept:laboratory`, `patient`, `encounter`, `user:{requesting clinician}` |
| `api.amend_result(result_id, new_values, reason, idempotency_key)` | C | `lab.verify` | New version supersedes the old. Notifies the requester that a result was amended | `lab.result.amended` |
| `api.record_critical_notification(result_id, method, note)` | B | `lab.process` | Documents who was told and how | `lab.critical.notified` |
| `api.acknowledge_critical(result_id)` | B | `clinical.consult` | Clinician acknowledgement, audited | `lab.critical.acknowledged` |

### 6.3 Views

| View or function | Used by |
|------------------|---------|
| `api.lab_worklist(stage, priority, page)` | D5. Joined to patient display fields through the narrow search projection |
| `api.results_inbox(clinician_id)` | D4. Verified results for the clinician's patients, critical first |
| `api.encounter_results(encounter_id)` | D0 Results tab. Verified results only. Unverified results are never visible to clinicians as final |
| `api.lab_metrics()` | D5, D13. Pending, overdue, outstanding critical, turnaround |

### 6.4 Indexes

```
ix_lab_items_stage      btree (status, status_changed_at) WHERE status NOT IN ('verified','cancelled')   -- worklists
ix_lab_orders_encounter btree (encounter_id)
ix_lab_orders_priority  btree (priority, ordered_at) WHERE status IN ('ordered','partial')
ix_lab_results_item     btree (order_item_id, component_id, version DESC)
ix_specimens_barcode    unique
ix_critical_pending     btree (clinician_id) WHERE acknowledged_at IS NULL
```

### 6.5 Claim data supplied by this schema

`investigation`: `serviceDate` (the specimen collection date [VERIFY which date NHIA expects]) and `gdrgCode` (through `insurance.map_service_to_gdrg` on the item's `service_id`). Only items with status `verified` are claimable. A test with no GDRG mapping is flagged "Unmapped for claims" in the laboratory worklist.

---

## 7. Events emitted by this part

| Event | Emitted by | Channels |
|-------|-----------|----------|
| `patient.registered` | `register_patient` | `dept:reception`, `dept:records` |
| `appointment.created`, `appointment.arrived` | appointments | `dept:{department}`, `dept:reception` |
| `encounter.opened`, `encounter.transferred`, `encounter.cancelled` | encounters | `dept:{clinic}`, `dept:triage`, `patient`, `encounter` |
| `triage.completed`, `observation.recorded` | nursing | `dept:{clinic}`, `encounter`, `patient` |
| `consultation.started`, `consultation.finalized` | clinical | `encounter`, `patient`, `dept:{clinic}` |
| `lab.order.created`, `lab.specimen.*`, `lab.result.verified`, `lab.critical.*` | laboratory | `dept:laboratory`, `encounter`, `patient`, `user:{clinician}` |
| `prescription.created`, `prescription.cancelled` | clinical | `dept:pharmacy`, `encounter`, `patient` |
| `procedure.recorded`, `diagnosis.recorded` | clinical | `encounter`, `patient` |

Every event is also written to `audit.events`, appears on the patient timeline when patient-scoped, and carries identifiers only in its realtime payload.

---

## 8. Transaction boundaries in this part (summary)

| Operation | Atomic scope |
|-----------|--------------|
| Register patient | counter, patient, identifiers, membership, next of kin, event |
| Open encounter | counter, snapshot membership, encounter, care relationship, status history, registration charge (critical handler), claim candidate (non-critical), event |
| Complete triage | observation, flags, assessment, priority, status transition, history, care relationship, critical-vitals notification, event |
| Create lab order | order, items, charges (critical handler), event |
| Verify result | result status, flags, item and order status, critical notification, encounter status refresh (critical handler), claim readiness (non-critical), event |
| Create prescription | safety check, prescription, items, work item (critical handler), charge, event |
| Finalise consultation | validation, finalisation, outcome, status refresh, claim readiness, event |

---

## 9. Tests required for this part

1. **Constraint tests:** every `CHECK`, `UNIQUE`, `EXCLUDE` has a failing and a passing case (NHIS number format, structured-or-free-text prescription, procedure needs diagnosis, no overlapping appointments, one primary membership, blood pressure systolic > diastolic).
2. **RLS tests:** for every table, an allowed role, a denied role, and a denied role with a different department. Care relationship, department assignment, post-encounter window and break-glass each have a test.
3. **State machine tests:** every row of `allowed_transitions` passes. Every other transition fails. Direct `UPDATE` of `status_code` fails.
4. **Concurrency tests (multiple connections):** two `register_patient` calls produce distinct numbers with no gap. Two `open_encounter` calls for the same patient and department produce one encounter. Two `verify_result` calls on one item produce one verification. Two clinicians finalising the same consultation produce one finalisation.
5. **Idempotency tests:** replaying any Category C function with the same key returns the same result without a second effect. Reusing a key with different parameters fails.
6. **Handler tests:** a critical handler failure rolls back the operation. A non-critical handler failure is logged and the operation succeeds.
7. **Realtime tests:** payloads contain identifiers only. A user outside the department cannot subscribe to its channel. Event delivered within 5 seconds in staging.
8. **Audit completeness test:** every `api` write function inserts at least one `audit.events` row and one timeline row where patient-scoped (the registry test of Part 3 §10).
9. **Search performance test:** `api.search_patients` p95 under 1 second at 500,000 patients.
10. **Claim-data test:** a complete synthetic encounter yields every claim field listed in Sections 1.5, 3.9, 4.3, 5.4, 6.5.

---

## 10. Migrations covered by this part

| # | Migration | Depends on |
|---|-----------|-----------|
| M006 | `audit` tables and protections (specified in Part 3 §6) | M001 |
| M007 | `patients` tables, `core.substances`, `core.ref_dose_units`, indexes, functions | M003, M006 |
| M008 | `appointments` tables and functions (without the encounter FK) | M007 |
| M009 | `encounters` tables, `record_event`, `core.event_handlers`, `transition_encounter`, queue views | M006, M007, M008 |
| M010 | Identity patient-access functions (`can_access_patient`, `can_subscribe`, break-glass), realtime channel policy, deferred foreign keys to `patients` | M005, M009 |
| M011 | `nursing` | M009 |
| M012 | `pharmacy` catalogue tables only (formulary, substances link) (Part 3 §1) | M007 |
| M013 | `clinical` | M009, M012 |
| M014 | `laboratory` | M009 |
| M015 | Deferred FKs (`appointments.encounter_id`, `core.documents.patient_id` and `encounter_id`) | M009 |

---

## 11. Open items [VERIFY]

| # | Item |
|---|------|
| P1 | How NHIA expects an **estimated date of birth** to be reported on a claim (V13) |
| P2 | Whether an NHIA eligibility check is available (U4). Until then membership status never reads "verified active" |
| P3 | Age-banded vital sign ranges and critical thresholds. Needs clinical sign-off |
| P4 | Laboratory reference ranges and critical values. Needs laboratory sign-off |
| P5 | Which date NHIA expects as `serviceDate` for an investigation (collection, verification, order) |
| P6 | Encounter class for **emergency**: whether CLAIM-it sees it as `OPD` or `IPD` |
| P7 | Whether one open outpatient visit per patient per department per day is the correct rule for the hospital's workflow |
| P8 | Allergy matching rule: ingredient-level only, or ingredient plus drug class |
| P9 | Duplicate scoring thresholds. Tune on real registration data |
| P10 | Format of the referral CCC (assumed 5 digits like the claim CCC) |
| P11 | Whether four-eyes verification applies to all tests or only some (U7) |

---

## 12. Decisions to freeze (Part 2)

| Decision | Status |
|----------|--------|
| Encounter status is derived from open work after consultation, through `refresh_status` | Proposed |
| Only `transition_encounter` can change status, enforced by trigger and privilege | Proposed |
| Modules react to events through `core.event_handlers`, never by importing each other | Proposed |
| Critical handlers abort the transaction. Non-critical handlers log and retry | Proposed |
| Patient merge deferred. Phase 1 prevents and flags duplicates only | Proposed |
| Hard bounds as CHECK constraints. Abnormal ranges as data-driven rules | Proposed |
| Lab flags and range snapshots computed by the database | Proposed |
| Verified results immutable. Corrections create a new superseding version | Proposed |
| Prescription items must be structured or free text, never neither | Proposed |
| Every procedure requires a diagnosis | Proposed |
| BMI never stored | Proposed |
| Timeline has no FK to patients and is append-only | Proposed |
