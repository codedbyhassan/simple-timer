# Ascend HMS: Database Blueprint v1.0
## Part 1 of 3: Conventions, Security Framework, Cross-cutting Machinery, `identity`, `core`

**Status:** Proposed. Review, then freeze.
**Location:** `docs/database/BLUEPRINT_01_FOUNDATIONS.md`
**Depends on:** Architecture v1.0 and v1.1, Dashboard and Screen Specification v1.0.
**Parts:** Part 2 covers `patients`, `appointments`, `encounters`, `nursing`, `clinical`, `laboratory`. Part 3 covers `pharmacy`, `inventory`, `finance`, `insurance`, `audit`, `integration`, `api`, transaction boundaries, indexing, RLS catalogue, tests, seed data and migration order.

---

## 0. Reading guide

- **[DECISION]**: a decision made here.
- **[VERIFY]**: not confirmable from the material supplied. Resolve before the related migration is accepted.
- Table definitions use a compact notation inside code blocks. They are **specifications**, not final DDL. The final SQL is written migration by migration (Part 3, Section 12) and tested before merge.
- Types are PostgreSQL types. `ts` means `timestamptz`.

### 0.1 Amendments to earlier documents

| # | Amendment | Reason |
|---|-----------|--------|
| A1 | **Phase 1 schemas are 15, not 11** (v1.1 §2.1). Added: `appointments`, `nursing`, `inventory`, `integration`. Final list: `identity`, `core`, `audit`, `patients`, `appointments`, `encounters`, `nursing`, `clinical`, `laboratory`, `pharmacy`, `inventory`, `finance`, `insurance`, `integration`, `api` | The dashboards need triage and vitals (`nursing`), the stock ledger (`inventory`), scheduling (`appointments`) and the outbox (`integration`) |
| A2 | **`ref_icd10` lives in `core`**, not `insurance` (v1.1 §5.2) | Clinical coding uses it, claims only validate against it |
| A3 | **`patient_timeline` and the single publishing function live in `encounters`** | Avoids circular dependencies (Section 4.3) |
| A4 | Later schemas (`emergency`, `inpatient`, `theatre`, `maternity`, `radiology`, `hr`, `reporting`) are **outlined only** (Part 3 §13) | Per the roadmap they arrive in Releases 7 to 9 |

---

## 1. Principles

1. **The database is the source of truth.** Every rule that protects data lives in the database. The browser is never trusted.
2. **Writes go through functions.** Application roles cannot `INSERT`, `UPDATE` or `DELETE` domain tables directly. They call named, permissioned database functions (Section 3.2).
3. **Dependency order.** Schemas and migrations follow the dependency order in Part 3 §12. Nothing references something that does not exist yet.
4. **Append, don't overwrite.** Clinical amendments, financial transactions, stock movements and audit events are append-only.
5. **No hidden state in the frontend.** Totals, balances, stock, status, human-readable numbers and permissions are computed by the database.
6. **Small, testable migrations.** One concern per migration, each with tests.
7. **Single hospital.** No `tenant_id` or `hospital_id` columns anywhere.

---

## 2. Conventions

### 2.1 Naming

| Item | Rule | Example |
|------|------|---------|
| Schemas, tables, columns | `snake_case`, tables plural | `encounters.encounters` |
| Primary key | `id` | |
| Foreign key | `<entity>_id` | `patient_id` |
| Booleans | `is_` or `has_` prefix | `is_active` |
| Timestamps | `_at` suffix | `verified_at` |
| Actor columns | `_by` suffix, referencing `identity.staff_profiles(id)` | `verified_by` |
| Constraints | `pk_`, `fk_`, `uq_`, `ck_` + table + purpose | `ck_payments_amount_positive` |
| Indexes | `ix_<table>_<columns>` | `ix_encounters_department_status` |
| Functions | verb first | `api.dispense_prescription` |

### 2.2 Primary keys

- `id uuid primary key default gen_random_uuid()` on every table.
- The server generates identifiers. The browser never supplies a primary key for an authoritative record.
- Exception: join tables with a natural composite key.

### 2.3 Human-readable identifiers

Generated **only on the server, transactionally**, by `core.next_public_id(kind)` (Section 4.1).

| Kind | Format | Table.column |
|------|--------|--------------|
| `PAT` | `ASC-PAT-000001` | `patients.patients.public_id` |
| `ENC` | `ASC-ENC-000001` | `encounters.encounters.public_id` |
| `APT` | `ASC-APT-000001` | `appointments.appointments.public_id` |
| `LAB` | `ASC-LAB-000001` | `laboratory.lab_orders.public_id` |
| `RX` | `ASC-RX-000001` | `clinical.prescriptions.public_id` |
| `DSP` | `ASC-DSP-000001` | `pharmacy.dispensings.public_id` |
| `INV` | `ASC-INV-000001` | `finance.invoices.public_id` |
| `PAY` | `ASC-PAY-000001` | `finance.payments.public_id` |
| `RCT` | `ASC-RCT-000001` | `finance.payments.receipt_no` |
| `CLM` | `ASC-CLM-000001` | `insurance.claims.claim_id` |
| `ADM` | `ASC-ADM-000001` | `inpatient.admissions.public_id` (later) |

Rules: the numeric part is zero-padded to six digits and grows beyond that. Every `public_id` has a `UNIQUE` constraint. Identifiers are never reused, even for cancelled records.

`ASC-CLM-…` as the CLAIM-it `claimID`: the CLAIM-it specification calls it a unique string and its sample is numeric. [VERIFY V12] that CLAIM-it accepts letters and hyphens in `claimID`. If not, the claim ID becomes a plain numeric sequence and `public_id` is kept separately.

### 2.4 Standard columns

Every table carries:

```
id          uuid  PK
created_at  ts    NOT NULL DEFAULT now()
created_by  uuid  NULL REFERENCES identity.staff_profiles(id)   -- default identity.current_staff_id()
updated_at  ts    NOT NULL DEFAULT now()                         -- maintained by trigger
updated_by  uuid  NULL REFERENCES identity.staff_profiles(id)    -- maintained by trigger
```

Tables that can be edited concurrently also carry `row_version int NOT NULL DEFAULT 1`, incremented by trigger. Functions that change them take an `expected_version` and fail on mismatch (optimistic concurrency).

System processes (jobs, Edge Functions) act as a named service staff profile, never as a null actor, so every change has a responsible identity.

### 2.5 Timestamps and time zones

- All timestamps are `timestamptz`, stored in UTC.
- Dates of service and birth are `date`.
- Display in `Africa/Accra` is done by the application using `core.hospital_profile.timezone`.
- `committed_at` on events uses `clock_timestamp()` captured inside the transaction, not `now()` (which is the transaction start). This keeps SLA measurements honest.

### 2.6 Money and quantities

| Item | Type |
|------|------|
| Money | `numeric(14,2)`, with `currency char(3) NOT NULL DEFAULT 'GHS'` where more than one currency could exist |
| Unit prices | `numeric(14,4)` |
| Stock and dispensed quantities | `numeric(14,3)` |
| Never | `float`, `real`, `money` |

### 2.7 Deletion and voiding

- No hard `DELETE` on clinical, financial, stock, claim or audit data. `DELETE` is revoked from all application roles on every table.
- Corrections are **voids** or **amendments**: `voided_at`, `voided_by`, `void_reason` (reason mandatory), or a new version row.
- Removal of data is done only by a documented, permissioned retention procedure (Part 3 §11).

### 2.8 Enumerations: when to use what [DECISION]

| Case | Mechanism | Why |
|------|-----------|-----|
| Small sets fixed by an external standard (CLAIM-it codes `OPD/IPD/DIA/PHC`, `EAE/CFU/ANC/PNC`, `DISC/DIED/TFOT/ABSC`, `M/F`) | Native PostgreSQL `enum` | Stable, self-validating |
| Sets that evolve or carry attributes (statuses, event types, priorities, payment methods) | **Lookup table** with `code text PK` and a foreign key | Values can be added without migration risk. Allows attributes such as `is_terminal` |
| Free text that must be one of a few values but is private to one table | `text` + `CHECK` | Simple |

Native enum values are never removed or renamed once released.

### 2.9 JSON rules

`jsonb` is allowed for: audit before/after snapshots, external payloads, import-report errors, and configuration. It is **not** allowed for data that is queried, joined, constrained or reported on. That data gets real columns.

### 2.10 Extensions

`pgcrypto` (`gen_random_uuid`, hashing), `pg_trgm` (patient search), `fuzzystrmatch` (duplicate detection), `btree_gist` (non-overlapping ranges), `pgtap` (tests, development and staging only), `pg_cron` (scheduled jobs) [VERIFY availability on the chosen Supabase plan].

---

## 3. Access architecture

### 3.1 Exposed surface [DECISION]

- **Only the `api` schema is exposed** through the Supabase Data API. All other schemas are **not** in the exposed schema list.
- `anon` has **no** privileges on anything.
- `authenticated` has `USAGE` on `api` only, plus `SELECT` on specific `api` views and `EXECUTE` on specific `api` functions.
- Privileges are granted **explicitly**. The migration that creates an object also grants. No reliance on platform defaults. (This holds regardless of the Data API default-exposure question in open item V10 of Architecture v1.1.)

### 3.2 Reads and writes

| Operation | Path |
|-----------|------|
| Read | `api` **views** created `WITH (security_invoker = true)` so that RLS of the underlying tables applies to the caller |
| Read with parameters or pagination | `api` **functions** `RETURNS TABLE …` |
| Write | `api` **functions** only |

Domain tables have **RLS enabled and forced**, and **no** insert/update/delete policies for `authenticated`. Defence in depth: even a mistaken direct grant cannot write.

### 3.3 Function security rules

1. Default is `SECURITY INVOKER`.
2. `SECURITY DEFINER` is permitted only where a function must write across schemas the caller cannot touch (publishing events, audit, ledger writes). Such functions:
   - set `search_path = ''` and use fully qualified names,
   - are owned by a restricted, non-superuser role,
   - make their **first statement** a permission check (`identity.require_permission(...)`) and, where patient-scoped, an access check (`identity.require_patient_access(...)`),
   - are granted `EXECUTE` to `authenticated` only,
   - are listed in a registry test (Part 3 §10) so that any new definer function without a permission check fails CI.
3. No function trusts a user id passed as a parameter. The actor is always `auth.uid()`.
4. No authorisation decision uses `user_metadata` or any user-editable claim.

### 3.4 Row-level security classes

Every table belongs to exactly one class. The class decides its policy template.

| Class | Rule for `SELECT` | Examples |
|-------|-------------------|----------|
| **R: Reference** | Any authenticated active staff | departments, service catalogue, ICD-10 |
| **P: Patient-scoped** | `identity.can_access_patient(patient_id)` | encounters, consultations, results |
| **D: Department-scoped** | Staff assigned to the department, or permission override | worklists, queues |
| **F: Finance** | `identity.has_permission('finance.view')` and patient access where relevant | invoices, payments |
| **C: Claims** | `identity.has_permission('claims.view')` | claims, exports |
| **A: Admin** | `identity.has_permission('admin.manage_config')` | settings, roles |
| **L: Log** | `identity.has_permission('audit.view')`, never writable | audit tables |
| **S: Self** | Row belongs to `auth.uid()` | own notifications, own work claims |

All policies wrap helper calls as `(select identity.has_permission('…'))` so PostgreSQL evaluates them once per statement rather than once per row.

### 3.5 Contextual access (care relationship) [DECISION]

`identity.can_access_patient(patient_id)` is true when the user has `patients.view` **and** at least one of:

1. `patients.view_all` (for example the records officer),
2. an active **care relationship** for that patient (explicit assignment, consulting clinician, ordering clinician),
3. assignment to a department that has an **open encounter** for that patient,
4. a **post-encounter window** (setting `access.post_encounter_hours`, default [VERIFY policy, assumed 24]),
5. an unexpired **break-glass session** for that patient.

**Search is narrower than access.** `patients.search` allows locating a patient through a limited view (`api.patient_search`: name, age, sex, patient number, phone) so a receptionist can register or check in someone without clinical access. Clinical data needs `can_access_patient`.

**Sensitive records:** a patient or record flagged sensitive additionally requires `patients.view_sensitive` or an active break-glass session, and every read is written to `audit.access_log`.

The function is created in the migration **after** `encounters` exists, because it reads open encounters (Part 3 §12).

### 3.6 Authentication settings (project configuration, checked at go-live)

- Public sign-up **disabled**. Accounts are created only by an administrator through a server-side Edge Function using the service key, which never reaches the browser.
- Email or password policy and multi-factor authentication: [VERIFY policy with the hospital]. Administrators and finance roles should require multi-factor authentication.
- Session lifetime and refresh settings tied to the session-expiry behaviour in the Dashboard Spec §2.1.

### 3.7 Realtime authorisation

- Realtime channels are **private**.
- `realtime.messages` has an RLS policy that parses `realtime.topic()` (`dept:{uuid}`, `patient:{uuid}`, `encounter:{uuid}`, `user:{uuid}`, `role:{code}`) and allows a subscription only when `identity.can_subscribe(topic)` is true. That function applies the same department and patient-access rules as the tables.
- Payloads carry identifiers only (Architecture v1.1 §4.3).
- [VERIFY V9] the exact `realtime.send` and `realtime.messages` policy mechanics on the chosen plan in staging.

---

## 4. Cross-cutting machinery

These objects are used by every module. They are built first.

### 4.1 `core.next_public_id`

```
core.id_counters
  kind        text PK           -- 'PAT','ENC',...
  prefix      text NOT NULL     -- 'ASC-PAT-'
  last_value  bigint NOT NULL DEFAULT 0
  width       int NOT NULL DEFAULT 6
```

```sql
create or replace function core.next_public_id(p_kind text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_prefix text; v_width int; v_next bigint;
begin
  update core.id_counters
     set last_value = last_value + 1
   where kind = p_kind
  returning prefix, width, last_value into v_prefix, v_width, v_next;
  if not found then raise exception 'Unknown id kind %', p_kind; end if;
  return v_prefix || lpad(v_next::text, v_width, '0');
end $$;
```

The counter row is locked until the calling transaction ends, so identifiers are **unique and gap-free**, and a rolled-back transaction does not consume a number. The cost is that identical-kind creations serialise briefly. At hospital volumes this is acceptable, and the load test (Part 3 §10) measures it. If it ever bottlenecks, `ENC` and `INV` can move to native sequences (gaps allowed) with a documented decision.

### 4.2 Idempotency

```
core.idempotency_keys
  id           uuid PK
  key          uuid NOT NULL                     -- generated by the client once per confirmed action
  actor_id     uuid NOT NULL REFERENCES identity.staff_profiles
  operation    text NOT NULL                     -- 'api.record_payment'
  request_hash text NOT NULL                     -- hash of normalised parameters
  status       text NOT NULL CHECK (status IN ('in_progress','completed','failed'))
  response     jsonb NULL
  created_at   ts NOT NULL DEFAULT now()
  expires_at   ts NOT NULL DEFAULT now() + interval '7 days'
  UNIQUE (actor_id, operation, key)
```

Pattern for every Category C function:

1. `core.begin_idempotent(key, operation, request_hash)` inserts the row, or finds an existing one.
2. If `completed` with the **same** `request_hash`: return the stored `response` and do nothing else.
3. If the same key arrives with a **different** `request_hash`: raise `idempotency_key_reuse`.
4. If `in_progress` (concurrent duplicate): wait on the row lock, then return the result.
5. Do the work. Call `core.complete_idempotent(key, response)` inside the same transaction.

Because the key row and the business changes commit together, a retry after a network drop can never double-post. Business tables that must be unique per action (payments, dispensings) **also** store the key and carry a `UNIQUE` constraint as a second guard.

### 4.3 The single publishing function

Every state-changing function ends by calling **one** function (defined in `encounters`, Part 2 §3.6):

```
encounters.record_event(
  p_event_type   text,        -- 'lab.result.verified'
  p_entity_schema text, p_entity_table text, p_entity_id uuid,
  p_patient_id   uuid,        -- nullable for non-patient events
  p_encounter_id uuid,        -- nullable
  p_channels     text[],      -- {'dept:<uuid>','patient:<uuid>','encounter:<uuid>'}
  p_summary      text,        -- non-sensitive display text for the timeline
  p_audit        jsonb,       -- before/after or key facts for the audit record
  p_outbox       jsonb DEFAULT NULL   -- if set, also queue an external side effect
)
```

In **one transaction** it:
1. inserts an `audit.events` row,
2. inserts an `encounters.patient_timeline` row when `p_patient_id` is set,
3. sends the realtime notification (identifiers and event type only) to each channel with `realtime.send(...)`,
4. inserts an `integration.outbox_events` row when `p_outbox` is set.

One function means one place where "every important operation has an audit trail and every screen is notified" is guaranteed. A test (Part 3 §10) proves that each `api` write function calls it. `committed_at` is `clock_timestamp()` captured in step 1 and reused in all steps.

### 4.4 Work claims (soft leases for worklists)

```
core.work_claims
  id            uuid PK
  entity_schema text NOT NULL
  entity_table  text NOT NULL
  entity_id     uuid NOT NULL
  claimed_by    uuid NOT NULL REFERENCES identity.staff_profiles
  claimed_at    ts NOT NULL DEFAULT now()
  expires_at    ts NOT NULL
  UNIQUE (entity_schema, entity_table, entity_id)
```

`api.claim_work_item` inserts or renews, and fails if an unexpired claim by someone else exists. Default lease 5 minutes, renewed while the item is open. This is advisory. The authoritative guard remains the business transaction (Dashboard Spec §4.4).

### 4.5 Notifications

```
core.notifications
  id              uuid PK
  tier            text NOT NULL CHECK (tier IN ('critical','important','routine'))
  type            text NOT NULL                 -- 'lab.critical_result'
  title           text NOT NULL                 -- non-sensitive
  body            text NULL                     -- non-sensitive
  entity_schema   text NULL, entity_table text NULL, entity_id uuid NULL
  patient_id      uuid NULL                     -- pointer only, no names
  requires_ack    boolean NOT NULL DEFAULT false
  created_at      ts NOT NULL DEFAULT now()

core.notification_recipients
  notification_id uuid NOT NULL REFERENCES core.notifications
  staff_id        uuid NOT NULL REFERENCES identity.staff_profiles
  read_at         ts NULL
  acknowledged_at ts NULL
  PRIMARY KEY (notification_id, staff_id)
```

Recipients are **resolved at creation** (specific clinician, plus staff holding a role in a department). Only recipients can read a notification (class S). Notification text never contains patient names or results. It points to the record, which is opened under normal access rules. Critical notifications with `requires_ack` stay in the user's list until acknowledged, and the acknowledgement is audited.

### 4.6 Settings and thresholds

```
core.settings
  key          text PK                -- 'access.post_encounter_hours'
  value        jsonb NOT NULL
  value_type   text NOT NULL          -- 'int','bool','text','json'
  description  text NOT NULL
  updated_at/by (standard)
```

Typed validation lives in the `api.update_setting` function. Examples seeded in Part 3 §11: queue overdue minutes per stage, stock minimum rules, critical-value acknowledgement timeout, realtime polling fallback seconds, VBC participation flag, post-encounter access hours.

### 4.7 Row-version and audit triggers

- `core.touch_row()` trigger: sets `updated_at`, `updated_by`, increments `row_version`.
- `core.block_mutation()` trigger: raises on `UPDATE` or `DELETE` for append-only tables (audit, stock ledger, financial transactions, result history, amendments).
- `core.block_delete()` trigger on all domain tables as a second guard beyond revoked privileges.

---

## 5. Schema `identity`

Owns: staff, roles, permissions, department assignment, care relationships, elevated access, break-glass.

### 5.1 Tables

```
identity.staff_profiles                                       -- class A (read: R-limited)
  id               uuid PK REFERENCES auth.users(id) ON DELETE RESTRICT   -- 1:1 with Supabase Auth user
  staff_number     text UNIQUE NOT NULL
  surname          text NOT NULL
  other_names      text NOT NULL
  staff_type       text NOT NULL                 -- lookup: doctor, nurse, pharmacist, lab_tech, cashier, ...
  professional_reg_no text NULL                  -- licensing body number [VERIFY body and format]
  physician_id     text NULL                     -- value for CLAIM-it physicianID [VERIFY V5]
  phone            text NULL
  email            text NOT NULL
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','left'))
  mfa_required     boolean NOT NULL DEFAULT false
  last_seen_at     ts NULL
  standard columns
  UNIQUE (lower(email))

identity.roles                                                -- class A
  id uuid PK, code text UNIQUE NOT NULL, name text NOT NULL, description text,
  is_system boolean NOT NULL DEFAULT false      -- system roles cannot be deleted

identity.permissions                                          -- class A, seeded by migration only
  id uuid PK, code text UNIQUE NOT NULL         -- 'pharmacy.dispense'
  module text NOT NULL, description text NOT NULL

identity.role_permissions
  role_id uuid REFERENCES identity.roles, permission_id uuid REFERENCES identity.permissions,
  PRIMARY KEY (role_id, permission_id)

identity.user_roles
  id uuid PK, staff_id uuid NOT NULL REFERENCES identity.staff_profiles,
  role_id uuid NOT NULL REFERENCES identity.roles,
  granted_at ts NOT NULL DEFAULT now(), granted_by uuid, revoked_at ts NULL, revoked_by uuid NULL
  -- partial unique: only one active row per (staff_id, role_id)
  UNIQUE (staff_id, role_id) WHERE revoked_at IS NULL

identity.user_department_assignments
  id uuid PK, staff_id uuid NOT NULL, department_id uuid NOT NULL REFERENCES core.departments,
  is_primary boolean NOT NULL DEFAULT false,
  started_at ts NOT NULL DEFAULT now(), ended_at ts NULL
  UNIQUE (staff_id, department_id) WHERE ended_at IS NULL

identity.elevated_grants                                      -- time-limited extra permission
  id uuid PK, staff_id uuid NOT NULL, permission_id uuid NOT NULL,
  reason text NOT NULL, valid_from ts NOT NULL, valid_until ts NOT NULL,
  granted_by uuid NOT NULL, revoked_at ts NULL, revoked_by uuid NULL
  CHECK (valid_until > valid_from AND valid_until <= valid_from + interval '30 days')

identity.care_relationships
  id uuid PK, staff_id uuid NOT NULL, patient_id uuid NOT NULL,   -- FK to patients added after patients exists
  encounter_id uuid NULL,
  source text NOT NULL CHECK (source IN ('assigned','consulting','ordering','admitting','nursing','manual')),
  valid_from ts NOT NULL DEFAULT now(), valid_until ts NULL,
  created_by uuid

identity.break_glass_sessions
  id uuid PK, staff_id uuid NOT NULL, patient_id uuid NOT NULL,
  reason text NOT NULL CHECK (length(trim(reason)) >= 10),
  started_at ts NOT NULL DEFAULT now(),
  expires_at ts NOT NULL CHECK (expires_at <= started_at + interval '4 hours'),
  ended_at ts NULL,
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','reviewed','flagged')),
  reviewed_by uuid NULL, reviewed_at ts NULL, review_note text NULL
```

### 5.2 Functions

| Function | Class | Purpose |
|----------|-------|---------|
| `identity.current_staff_id()` | invoker | Returns `auth.uid()` if an active staff profile exists, else null |
| `identity.has_permission(code)` | definer | Section 3.5. Considers active roles and unexpired elevated grants |
| `identity.require_permission(code)` | definer | Raises `insufficient_privilege` with a clear message |
| `identity.in_department(dept_id)` | definer | Active assignment check |
| `identity.can_access_patient(patient_id)` | definer | Section 3.5 (created after `encounters`) |
| `identity.require_patient_access(patient_id)` | definer | Raises on failure and records a denied-access audit event |
| `identity.can_subscribe(topic)` | definer | Realtime channel authorisation (Section 3.7) |
| `api.start_break_glass(patient_id, reason)` | definer | Creates session, writes audit event, creates review task, notifies reviewers, returns expiry |
| `api.end_break_glass(session_id)` | definer | |
| `api.review_break_glass(session_id, outcome, note)` | definer, needs `audit.review_break_glass` | |
| `api.grant_elevated_permission(...)` | definer, needs `admin.manage_users` | Time-limited, audited |
| `api.assign_role` / `api.revoke_role` / `api.assign_department` | definer, needs `admin.manage_users` | Fails if it would remove the last active administrator |

### 5.3 Rules and constraints

- **Last administrator guard:** a trigger prevents revoking the last active `hospital_admin` role or suspending the last active holder.
- A suspended or departed staff member loses all access immediately because every check requires `status = 'active'`. Session revocation is performed through an Edge Function calling the auth admin API.
- `staff_profiles.id` equals the auth user id. A profile cannot be created for a user that does not exist.
- Role and permission **changes are audited** and emit a realtime event on `user:{staff_id}` so the target user's navigation updates within 5 seconds (Dashboard Spec D14).

### 5.4 Permission catalogue (seeded)

| Module | Permissions |
|--------|-------------|
| patients | `patients.search`, `patients.view`, `patients.view_all`, `patients.view_sensitive`, `patients.create`, `patients.update`, `patients.merge` |
| appointments | `appointments.view`, `appointments.manage` |
| encounters | `encounters.open`, `encounters.transfer`, `encounters.cancel` |
| nursing | `nursing.triage`, `nursing.observe` |
| clinical | `clinical.consult`, `clinical.finalize`, `clinical.order`, `clinical.prescribe`, `clinical.refer` |
| laboratory | `lab.view`, `lab.collect`, `lab.process`, `lab.verify`, `lab.manage_catalogue` |
| pharmacy | `pharmacy.view`, `pharmacy.verify`, `pharmacy.dispense`, `pharmacy.manage_formulary` |
| inventory | `inventory.view`, `inventory.receive`, `inventory.transfer`, `inventory.adjust`, `inventory.approve_adjustment` |
| finance | `finance.view`, `finance.collect`, `finance.refund`, `finance.approve_refund`, `finance.reconcile`, `finance.manage_prices` |
| claims | `claims.view`, `claims.build`, `claims.enter_ccc`, `claims.export`, `claims.import_report`, `claims.delete_external`, `claims.manage_mappings` |
| inpatient (later) | `inpatient.admit`, `inpatient.allocate_bed`, `inpatient.discharge` |
| reports | `reports.view`, `reports.export` |
| admin | `admin.manage_users`, `admin.manage_config`, `admin.manage_catalogue` |
| audit | `audit.view`, `audit.review_break_glass` |
| system | `system.view_sla` |

### 5.5 System roles (seeded, adjustable by administrators)

`hospital_admin`, `records_officer`, `receptionist`, `triage_nurse`, `ward_nurse`, `doctor`, `lab_technician`, `pharmacist`, `pharmacy_assistant`, `cashier`, `finance_officer`, `claims_officer`, `store_keeper`, `bed_manager`, `management_viewer`. The mapping of permissions to roles is a seed file reviewed with the hospital [VERIFY with department heads].

---

## 6. Schema `core`

Owns: hospital configuration, organisation, catalogues, shared reference data, and the cross-cutting machinery of Section 4.

### 6.1 Hospital and organisation

```
core.hospital_profile                                         -- class A, exactly one row
  id uuid PK
  singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton)   -- enforces one row
  name text NOT NULL
  nhis_facility_id text NULL                                  -- facility ID [VERIFY format e.g. NN-NN-NNNNN]
  timezone text NOT NULL DEFAULT 'Africa/Accra'
  currency char(3) NOT NULL DEFAULT 'GHS'
  is_vbc_participant boolean NOT NULL DEFAULT false           -- Value Based Care [set true: owner confirmed]
  address text, phone text, email text, logo_document_id uuid NULL
  standard columns

core.departments                                              -- class R (read), A (write)
  id uuid PK, code text UNIQUE NOT NULL, name text NOT NULL,
  parent_id uuid NULL REFERENCES core.departments,
  department_type text NOT NULL CHECK (department_type IN
    ('clinical','diagnostic','pharmacy','ward','support','admin')),
  claim_specialty text NULL,       -- CLAIM-it specialty code, validated against core.ref_claim_specialties
  is_active boolean NOT NULL DEFAULT true
  standard columns

core.locations                                                -- wards, rooms, beds, clinic rooms, service points
  id uuid PK, department_id uuid NOT NULL REFERENCES core.departments,
  parent_id uuid NULL REFERENCES core.locations,
  location_type text NOT NULL CHECK (location_type IN ('ward','room','bed','clinic_room','service_point','store')),
  code text NOT NULL, name text NOT NULL, capacity int NULL, is_active boolean NOT NULL DEFAULT true
  UNIQUE (code)
```

Bed *state* (occupied, cleaning) belongs to `inpatient` (Release 7). `core.locations` holds only the physical structure.

### 6.2 Catalogues

```
core.service_catalogue                                        -- everything the hospital can charge or perform
  id uuid PK, code text UNIQUE NOT NULL, name text NOT NULL,
  service_kind text NOT NULL CHECK (service_kind IN
    ('registration','consultation','procedure','laboratory','imaging','bed_day','medicine_dispensing','other')),
  department_id uuid NULL REFERENCES core.departments,
  is_billable boolean NOT NULL DEFAULT true, is_active boolean NOT NULL DEFAULT true

core.service_prices                                           -- versioned, never overwritten
  id uuid PK, service_id uuid NOT NULL REFERENCES core.service_catalogue,
  price numeric(14,2) NOT NULL CHECK (price >= 0), currency char(3) NOT NULL DEFAULT 'GHS',
  payer_class text NOT NULL DEFAULT 'cash',                   -- cash, insurance, ... [VERIFY]
  valid_from date NOT NULL, valid_to date NULL,
  EXCLUDE USING gist (service_id WITH =, payer_class WITH =, daterange(valid_from, valid_to, '[]') WITH &&)
  -- no overlapping price periods for the same service and payer class

core.ref_icd10                                                -- imported from the official list, versioned
  code text PK                  -- stored WITH the dot e.g. 'K01.0'
  description text NOT NULL, chapter text NULL, is_billable boolean NOT NULL DEFAULT true,
  valid_from date NOT NULL, valid_to date NULL, source_version text NOT NULL
  -- CHECK code ~ '^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$'

core.ref_claim_specialties                                    -- CLAIM-it specialty codes (seeded from spec v2.1)
  code text PK CHECK (code IN ('ENTH','ASUR','DENT','OPHT','ORTH','MEDI','PAED','PSUR','OBGY','RSUR','OPDC')),
  description text NOT NULL

core.ref_triage_priorities                                    -- scale configurable [VERIFY U1]
  code text PK, name text NOT NULL, rank int NOT NULL UNIQUE, colour_tone text NOT NULL, target_wait_minutes int NULL
```

ICD-10 codes are stored **with the dot** (as the XML requires). The paper-form renderer strips it for display only (Architecture v1.1 §7.3).

### 6.2a Documents metadata (storage index)

```
core.documents                                                -- metadata for files in Supabase Storage
  id uuid PK
  bucket text NOT NULL CHECK (bucket IN ('patient-records','clinical-documents','laboratory-reports',
                                         'radiology-files','staff-documents','administrative-documents'))
  storage_path text NOT NULL UNIQUE, original_filename text NOT NULL,
  mime_type text NOT NULL, file_size_bytes bigint NOT NULL CHECK (file_size_bytes > 0),
  sha256 text NOT NULL,
  patient_id uuid NULL,            -- FK added after patients exists
  encounter_id uuid NULL,          -- FK added after encounters exists
  category text NOT NULL, classification text NOT NULL DEFAULT 'standard' CHECK (classification IN ('standard','sensitive')),
  retention_class text NOT NULL, verification_status text NOT NULL DEFAULT 'unverified',
  uploaded_by uuid NOT NULL, uploaded_at ts NOT NULL DEFAULT now(),
  voided_at ts NULL, voided_by uuid NULL, void_reason text NULL
```

Storage policies mirror table access: a file is readable only if `identity.can_access_patient(patient_id)` (patient documents) or the matching permission (administrative documents). Buckets are private. Storage objects are **not** covered by database backups, so a separate object backup is required (Architecture v1.0 §11, v1.0 §15).

### 6.3 Machinery tables (defined in Section 4)

`core.id_counters`, `core.idempotency_keys`, `core.work_claims`, `core.notifications`, `core.notification_recipients`, `core.settings`.

### 6.4 `core` functions

| Function | Purpose |
|----------|---------|
| `core.next_public_id(kind)` | Section 4.1 |
| `core.begin_idempotent` / `core.complete_idempotent` | Section 4.2 |
| `core.touch_row()`, `core.block_mutation()`, `core.block_delete()` | Section 4.7 |
| `core.notify(tier, type, title, body, recipients, entity…, requires_ack)` | Creates notification and recipients, emits `user:{id}` realtime events |
| `api.list_notifications`, `api.ack_notification`, `api.mark_notification_read` | Own notifications only |
| `api.claim_work_item(schema, table, id)` / `api.release_work_item(...)` | Section 4.4 |
| `api.update_setting(key, value)` | Needs `admin.manage_config`, validates type, audited |

### 6.5 Realtime and SLA measurement

```
core.realtime_latency_samples                                 -- written by an Edge Function from client reports
  id bigint generated always as identity PK,
  recorded_at ts NOT NULL DEFAULT now(),
  event_type text NOT NULL, channel_kind text NOT NULL,       -- 'dept','patient','encounter','user'
  committed_at ts NOT NULL, received_at ts NOT NULL, rendered_at ts NULL,
  transport text NOT NULL CHECK (transport IN ('push','poll')),
  latency_ms int GENERATED ALWAYS AS (extract(epoch FROM (rendered_at - committed_at)) * 1000)::int STORED
```

No patient identifiers and no staff identifiers are stored in samples. A scheduled job aggregates them into p50, p95 and max per five minutes for the SLA monitor (Dashboard Spec D14) and raises a `critical` notification to `system.view_sla` holders when any sample exceeds 10 seconds. Raw samples are kept for 30 days.

---

## 7. Migrations covered by this part

| # | Migration | Depends on | Tests |
|---|-----------|-----------|-------|
| M001 | Extensions and roles (`api_reader` and restricted definer owner roles), schema creation, default privilege lockdown | none | privilege test: `anon` has nothing |
| M002 | `identity` tables, permission catalogue seed, system roles seed | M001 | seed idempotency, last-admin guard |
| M003 | `core` organisation, catalogues, settings, id counters, machinery tables | M002 | id generation concurrency test |
| M004 | `core` functions: touch, block, notify, idempotency, work claims | M003 | idempotency replay and key-reuse tests |
| M005 | Identity functions (`has_permission`, `require_permission`, department checks), staff provisioning contract | M002 to M004 | allowed and denied tests per permission |

`can_access_patient`, `can_subscribe` and break-glass functions arrive in the migration after `encounters` (Part 3 §12).

---

## 8. Part 1 open items [VERIFY]

| # | Item |
|---|------|
| B1 | Whether CLAIM-it accepts letters and hyphens in `claimID` (V12) |
| B2 | Professional registration body and number format for `professional_reg_no`, and the source and format of CLAIM-it `physicianID` (V5) |
| B3 | NHIS facility ID format |
| B4 | `pg_cron`, `pgtap` and realtime function availability on the chosen Supabase plan |
| B5 | Multi-factor authentication policy per role |
| B6 | Post-encounter access window and sensitive-record policy |
| B7 | Payer classes and pricing rules (cash vs insurance vs other) |
| B8 | ICD-10 edition and distribution source to import |
| B9 | Which departments map to which CLAIM-it specialty codes |

---

## 9. Decisions to freeze (Part 1)

| Decision | Status |
|----------|--------|
| Only `api` schema exposed. Domain tables unreachable directly | Proposed |
| Writes only through permissioned functions. No direct DML grants | Proposed |
| `SECURITY DEFINER` only with `search_path=''`, first-line permission check, and a registry test | Proposed |
| Care-relationship access, narrow search view, break-glass with review | Proposed |
| Gap-free server-generated public IDs via counter table | Proposed |
| Idempotency keys stored with business transaction and second unique guard | Proposed |
| One publishing function guarantees audit, timeline, realtime and outbox | Proposed |
| Append-only rule and no hard delete on clinical, financial, stock, claim, audit data | Proposed |
| Enum policy: native for external standards, lookup tables for evolving sets | Proposed |
| `ref_icd10` in `core`, stored with the dot | Proposed |
| No `tenant_id` or `hospital_id` anywhere | **Approved** |
