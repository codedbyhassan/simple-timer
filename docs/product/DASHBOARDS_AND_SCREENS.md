# Ascend HMS: Dashboard and Screen Specification v1.0

**Status:** Proposed. Review, then freeze.
**Location:** `docs/product/DASHBOARDS_AND_SCREENS.md`
**Depends on:** Architecture v1.0 and v1.1 (realtime SLA, encounter hub, claims design).
**Precedes:** Database Blueprint (the tables behind each dashboard are derived from this document).

---

## 0. How to read this document

Tags used throughout:
- **[DECISION]**: a design decision made here.
- **[VERIFY]**: could not be confirmed from the material supplied. It must be confirmed with hospital staff or equipment before the related screen is accepted. Nothing tagged [VERIFY] may be assumed correct.

Every dashboard in Section 6 follows one fixed template so that nothing is left to interpretation:

1. Purpose
2. Users and permissions
3. Release
4. Layout (screen regions)
5. Cards and components
6. Realtime subscriptions (channels and events)
7. Actions and their effects elsewhere
8. Works with (upstream and downstream dashboards)
9. States (loading, empty, error, offline)
10. Claim data captured here
11. Definition of done

Realtime rules, channel names, event names and the 5 s / 10 s limits come from Architecture v1.1 Sections 3 and 4 and are not repeated in full here.

---

## 1. Design direction

### 1.1 Principles

| # | Principle | What it means in a hospital |
|---|-----------|------------------------------|
| P1 | **Clarity first** | Labels say what the user does ("Verify result", "Dispense medicines"), not what the system does ("Submit"). |
| P2 | **The patient is always identifiable** | Every clinical screen shows the patient banner. No action on the wrong patient. |
| P3 | **One primary action per screen region** | One dominant button per card or screen. Everything else is quieter. |
| P4 | **Deference** | Chrome steps back. Clinical content leads. Controls appear when relevant. |
| P5 | **Nothing is silently stale** | Every live screen shows when it was last updated and whether it is connected. |
| P6 | **Server confirms, UI never pretends** | Critical operations (v1.0 Category C) are never shown as done until the server confirms. |
| P7 | **Fix it where it happens** | Missing claim data and unmapped codes are raised at the point of care, not at month-end. |
| P8 | **Fast on ordinary hardware** | Designed for modest hospital computers and shared workstations, not developer machines. |

### 1.2 Visual language [DECISION]

The Apple HIG principles of clarity, deference and depth guide the look. Liquid Glass and glassmorphism are **limited to the navigation layer**, because Apple's own guidance reserves glass for the layer that floats above content, and because translucent surfaces make dense clinical text harder to read.

| Layer | Treatment |
|-------|-----------|
| Navigation (top bar, side rail, toolbars) | Glass is allowed: blur 12 to 20 px, 55 to 75 % opacity, thin border, solid fallback colour |
| Overlays (modals, drawers) | Dimmed scrim. Panel surface is **solid**. Glass only on the panel header if desired |
| Content (cards, tables, forms, patient banner, results) | **Solid, opaque surfaces only.** No glass on any surface that holds clinical or financial data |
| Critical states | Solid, high-contrast, never translucent |

Rules that follow from this:
- No more than 3 glass elements in any viewport.
- Blur never exceeds 20 px. `backdrop-filter` is never animated.
- No dark text on glass. Text on glass is white or the high-contrast token, over a calm background.
- The glass skill's guidance that glass needs a vibrant backdrop conflicts with a calm clinical environment. We keep the area behind glass calm. **If the glass effect is not visible against a calm background, the navigation layer falls back to a solid surface.** That is acceptable and preferred over adding colour to make glass visible.
- A **Reduced effects** mode (automatic under `prefers-reduced-transparency` or `prefers-reduced-motion`, and a user setting) replaces all glass with solid surfaces. Low-end hospital machines may struggle with blur, so a solid fallback is always defined.

### 1.3 Colour

Semantic tokens only, never raw hex in components, with light and dark themes.

| Token | Meaning | Never used for |
|-------|---------|----------------|
| `accent` | Primary action and active selection (1 to 2 uses per screen) | Status |
| `success` | Completed, verified, available | Decoration |
| `warning` | Needs attention soon, overdue approaching | |
| `critical` | Immediate action, critical result, safety alert | Anything routine |
| `info` | Neutral notices | |
| `neutral` | Everything else | |

**Colour is never the only signal.** Every status uses colour + icon + text label. Triage priority and result flags (H, L, critical) always show the text.

Dark theme is required (night shifts). Contrast must meet WCAG AA at least (4.5:1 text, 3:1 interface components).

### 1.4 Typography and spacing

- System font stack (Segoe UI on Windows machines, SF on Apple devices). No web fonts to download.
- Body 15 to 16 px. Dense mode 14 px. Nothing below 12 px.
- Tabular numerals for all numbers, amounts, vitals and times so columns align.
- Concentric radii: outer card 16 px, inner control 12 px, inner element 8 px.
- Spacing scale 4 / 8 / 16 / 24 / 40.

### 1.5 Density [DECISION]

The skill's guidance that "dense screens lose" applies to marketing pages. Hospital queues and worklists are information-dense by nature. We therefore define two modes:

| Mode | Use | Row height |
|------|-----|-----------|
| Comfortable | Touch devices, ward tablets, reception | 52 px |
| Compact | Desktop worklists (pharmacy, lab, cashier, claims) | 40 px |

Density is a per-user preference. Default is set per role.

### 1.6 Devices and sizes [DECISION, with [VERIFY]]

| Device | Roles | Design target |
|--------|-------|---------------|
| Desktop or laptop, **1366 × 768 minimum** | Reception, cashier, pharmacy, lab, doctors, claims, admin | Primary |
| Tablet, 10 inch landscape (1024 × 768) | Nurses, ward rounds | Touch targets 44 × 44 px |
| Phone | Management read-only summary, notifications | Summary only |

[VERIFY] the actual screen sizes and devices in use at each station before final layouts. 1366 × 768 is assumed as the lowest common laptop resolution and must be confirmed.

Touch targets are at least 44 × 44 px on touch devices. On pointer-only desktop compact mode, the minimum is 36 px with a 44 px hit area where space allows.

### 1.6a Locale

- Dates `DD/MM/YYYY`, matching the NHIS form. Times 24 hour. Zone Africa/Accra.
- Currency GHS with two decimals.
- Interface language English. [VERIFY] whether Twi or other languages are required for any screen.

### 1.7 Motion

- Motion communicates change, never decorates.
- New items fade and slide up 8 px over 200 ms and show a short highlight (2 s). Exits are shorter than entrances.
- Only `transform` and `opacity` are animated.
- Respect `prefers-reduced-motion`: no movement, highlight stays.

### 1.8 Keyboard-first

Reception, cashier, pharmacy and laboratory staff process many items per hour.

| Key | Action |
|-----|--------|
| `/` | Focus patient search |
| `↑ ↓` | Move through a queue or table |
| `Enter` | Open the focused item |
| `Ctrl + Enter` | Confirm the primary action (only after the confirmation requirements of Section 4 are met) |
| `Esc` | Close drawer or dialog |
| `Alt + 1…9` | Switch tabs in the current workspace |

Every action has a visible focus ring and a keyboard path.

---

## 2. Application shell

Present on every screen.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ TOP BAR (glass)  Hospital name | Global patient search ( / ) |            │
│                  Connection chip | Notifications | Break-glass | User     │
├──────────┬────────────────────────────────────────────────────────────────┤
│ SIDE RAIL│  PATIENT BANNER (only on patient-scoped screens, solid)        │
│ (glass)  ├────────────────────────────────────────────────────────────────┤
│ Dashboards│                                                               │
│ permitted │              CONTENT AREA (solid surfaces)                    │
│ only      │                                                               │
└──────────┴────────────────────────────────────────────────────────────────┘
```

### 2.1 Components

| Component | Behaviour |
|-----------|-----------|
| **Navigation** | Shows only dashboards the user's permissions allow. Items never appear disabled. A user never sees a screen they cannot use. |
| **Global patient search** | Name, patient number, phone, NHIS number, date of birth. p95 under 1 s (v1.0 §6.3). Results show name, age, sex, patient number, last visit. Possible duplicates are flagged. Opening a result is logged. |
| **Connection chip** | `Live` (connected), `Reconnecting` (polling every 5 s), `Offline` (no network). Shown with icon and text. Clicking shows details and last successful update. |
| **Notification centre** | Per-user list with three tiers (Section 5). Unacknowledged critical items persist until acknowledged. |
| **Break-glass** | Emergency access to a patient outside normal care relationship. Requires a reason, creates an audit event and a review task, and shows a persistent "Emergency access" marker on that patient banner. |
| **Patient banner** | Name, age and sex, patient number, photo if held, **allergy chip** (always visible, red if any), NHIS status, current encounter and status chip, sensitive-record marker. Solid surface, sticky. |
| **Session and shift** | Session expiry warning at 2 minutes. Locking the screen preserves the unsaved draft. Shared workstation support: fast user switching without losing the other user's session state. |

### 2.2 Navigation by role

| Dashboard | Reception | Triage/Nurse | Doctor | Lab | Pharmacy | Cashier | Claims | Ward | Store | Management | Admin |
|-----------|:--------:|:-----------:|:------:|:---:|:--------:|:-------:|:------:|:----:|:-----:|:----------:|:-----:|
| D1 Reception desk | ● | | | | | | | | | | |
| D2 OPD queue board | ● | ● | ○ | | | | | | | ○ | |
| D3 Triage and nursing | | ● | ○ | | | | | ○ | | | |
| D4 Doctor workspace | | | ● | | | | | | | | |
| D5 Laboratory | | | ○ | ● | | | | | | | |
| D6 Radiology (later) | | | ○ | | | | | | | | |
| D7 Pharmacy | | | ○ | | ● | | | | ○ | | |
| D8 Cashier | ○ | | | | | ● | ○ | | | | |
| D9 Claims office | | | | | | | ● | | | ○ | |
| D10 Ward and beds | | ● | ● | | | ○ | | ● | | ○ | |
| D11 Emergency (later) | | ● | ● | | | | | | | | |
| D12 Inventory | | | | | ○ | | | | ● | ○ | |
| D13 Management | | | | | | | | | | ● | |
| D14 Administration | | | | | | | | | | | ● |
| Patient 360 (shared) | ○ | ● | ● | ○ | ○ | ○ | ○ | ● | | | |

● primary dashboard. ○ read-only or limited view, governed by permission and care relationship.

---

## 3. Shared component library

Located in `src/shared/components` and `src/shared/design-system`. Each component is a pure presenter, with data supplied by a container in its module (presenter/container split). Modules import shared components only through their public exports and never import each other's internals (v1.0 §4).

| Component | Purpose | Key behaviour |
|-----------|---------|---------------|
| `PatientBanner` | Identity and safety summary | Sticky, solid. Allergy chip never collapses. |
| `StatusChip` | Encounter, order, claim status | Icon + text + colour. Single source of status vocabulary. |
| `PriorityBadge` | Triage and order priority | Text always shown. |
| `QueueCard` | One patient or item in a queue | Name, age/sex, wait timer, status chip, priority, one primary action. Wait timer turns `warning` then `critical` at configured thresholds. |
| `Worklist` | Virtualised, server-paginated table | Server-side filtering and sorting, keyboard navigation, density modes, sticky header, "n new items" pill. |
| `KpiTile` | Single metric | Value, unit, trend, "as of" time, click-through. |
| `Timeline` | Patient timeline | Reads `patient_timeline`, grouped by day, filterable by event type. |
| `ActionBar` | Primary + secondary actions | Exactly one primary button. |
| `CriticalActionDialog` | Confirm Category C operations | Shows what will happen, requires explicit confirm, shows "Confirming…", resolves only on server confirmation. |
| `AlertStrip` | Safety and system alerts | Persistent until resolved, severity styled. |
| `ConnectionChip` | Live / Reconnecting / Offline | Always in the top bar. |
| `LastUpdated` | "Updated 3 s ago" | On every live card and table. |
| `ClaimReadinessMeter` | Claim completeness | Percentage and itemised missing fields, linking to where to fix them. |
| `StructuredField` | Unit-aware input | Value + unit (kg, m, mmHg, mmol/L), range hints, soft warnings. |
| `CodePicker` | Searchable coded inputs | ICD-10, GDRG-mapped services, NHIA medicines, with server-side search. |
| `DoseInput` | Prescription dose/frequency/duration | Produces the structured format; free-text fallback is flagged "Non-standard". |
| `EmptyState`, `ErrorState`, `SkeletonX` | States | Skeletons for any content of known shape. No bare spinners for content areas. |
| `BedTile` | Bed map cell | Status by icon + text + colour. |
| `PrintSheet` | Print layouts | A4 and label presets. |

---

## 4. Live-screen behaviour rules

These rules apply to **every** dashboard.

### 4.1 Receiving updates

1. When an event arrives, the screen refetches the affected data (v1.1 §4.2). It does not patch from the payload, because payloads carry identifiers only.
2. **No layout jump.** If the user is hovering, focused on, or interacting with a row, new items are **not** inserted above them. Instead, an "n new items" pill appears at the top. Clicking it loads them. When the user is idle, items insert automatically.
3. Updated rows get a 2 s highlight. Removed rows fade out after 300 ms with a "Moved to X" note where relevant.
4. A row the user is actively editing is never replaced by a refetch. A conflict banner offers "Reload" or "Keep my changes".

### 4.2 Freshness

- `LastUpdated` on every live panel.
- If no event or heartbeat has arrived for 5 s on a visible screen, the chip changes to `Reconnecting` and polling starts (v1.1 §4.2).
- When data may be stale, the screen adds a persistent notice. It never displays potentially stale data as current without the notice.

### 4.3 Server-authoritative operations (no optimistic UI)

For Category C operations (v1.0 §8.2): financial posting, refunds, dispensing, stock deduction, bed allocation, final clinical authorisation, critical record changes:

1. The user confirms in a `CriticalActionDialog`.
2. The client generates an **idempotency key** once, at confirmation.
3. The button shows "Confirming…" and the dialog stays open.
4. Success is displayed **only** after the server confirms.
5. If the network drops mid-request the state becomes **"Not yet confirmed"**, with a **Check status** action. Retrying reuses the same idempotency key, so a duplicate is impossible.
6. Never show a success message, print a receipt or print a label before confirmation.

For safe, reversible interactions (selecting a filter, opening a panel, saving a draft), optimistic UI is allowed. This is a deliberate exception to the general "optimistic UI" guidance of the UI skill, because clinical and financial consequences of a wrongly shown success are unacceptable.

### 4.4 Work claiming

To prevent two people working the same item (for example, two pharmacists on one prescription), worklist items show **"Being handled by [name]"** when opened. This is a soft lease with a 5 minute expiry, renewed while the item is open. The database transaction remains the hard guard, so a second person who tries to complete the same operation is told it was already done. [DECISION]

### 4.5 Errors and feedback

- Field errors are shown inline next to the field. No toasts for validation.
- Toasts are only for brief confirmations of completed, server-confirmed actions.
- System and safety errors are persistent `AlertStrip`s with the next step.
- Messages say what happened and what to do, with no codes alone.

### 4.6 Wrong-patient protection

- The patient banner is always visible.
- Dispensing, result verification, specimen collection and any critical action require **two identifiers** displayed for confirmation (name and one of date of birth or patient number).
- Allergy conflicts interrupt prescribing and dispensing with a blocking alert that needs a documented override.

---

## 5. Notification policy

| Tier | Examples | Presentation | Acknowledgement |
|------|----------|--------------|-----------------|
| **Critical** | Critical lab value, allergy conflict on dispensing, break-glass review overdue, realtime SLA breach (admin) | Blocking dialog or persistent strip; optional sound | **Required**, recorded with user and time |
| **Important** | New result for my patient, prescription waiting, stock below minimum, claim import failed | Badge plus unobtrusive toast, listed in the notification centre | Not required |
| **Routine** | Queue changes, status updates | Row update only, no notification | None |

Rules against alert fatigue:
- Routine events never create notifications.
- Notifications are addressed to roles and departments plus the specific responsible clinician, never broadcast to everyone.
- The same event never notifies the same user twice.
- Critical notifications are rare by design. Thresholds are configured by administrators and reviewed.

---

## 6. Dashboards

### D0. Patient 360 and encounter workspace (shared screen)

**1. Purpose.** The single place to see everything about one patient and one encounter. Every dashboard links here. It is how departments "talk" about a patient without talking to each other.

**2. Users and permissions.** Any clinical or administrative user with `patients.view` plus a care relationship, department assignment or break-glass access. What each user sees is filtered by permission (billing tab needs finance permission, and so on).

**3. Release.** Grows from Release 2 (profile) to Release 6 (billing and claims).

**4. Layout.**
```
┌ PATIENT BANNER ─────────────────────────────────────────────────────────┐
├──────────────┬──────────────────────────────────────────┬───────────────┤
│ TIMELINE     │ TABS: Summary | Notes | Orders | Results │ CONTEXT RAIL  │
│ (live)       │ Medications | Vitals | Documents |       │ Alerts        │
│              │ Billing | Insurance and claim            │ Pending items │
│              │                                          │ Claim readiness│
└──────────────┴──────────────────────────────────────────┴───────────────┘
```

**5. Cards and components.**
- *Summary tab:* current encounter status, reason for visit, diagnoses, active medications, active alerts, next steps.
- *Notes:* clinical documentation with amendment history. Finalised notes are read-only. Changes are addenda.
- *Orders:* lab and imaging orders with live status.
- *Results:* verified results only, with flags and trend where numeric.
- *Medications:* prescribed vs dispensed.
- *Vitals:* table and trend chart with units.
- *Documents:* from private storage, access-checked per document.
- *Billing:* charges, invoice, payments, balance (finance permission).
- *Insurance and claim:* membership, claim status, `ClaimReadinessMeter`.
- *Context rail:* allergy and safety alerts, pending actions for this patient, claim readiness.

**6. Realtime subscriptions.** `patient:{id}`, `encounter:{id}`. All events for that patient refetch the relevant tab only.

**7. Actions and effects.** Mostly navigation and read. Actions initiated here (order, prescribe, finalise) are performed in the owning module and appear here through the timeline. Opening a sensitive record or break-glass writes audit events.

**8. Works with.** All dashboards (each links to it).

**9. States.** Skeleton per tab. Access denied shows what permission or relationship is missing and offers break-glass where policy allows. Sensitive-record restriction shows a clear "restricted" panel without leaking existence details beyond policy.

**10. Claim data.** Shows readiness. No data capture of its own.

**11. Done when.** Every Section 3.4 event of Architecture v1.1 appears on the timeline within 5 s. Access checks tested for allowed and denied. Printing of summary works.

---

### D1. Reception desk

**1. Purpose.** Register new patients, check in returning patients, book appointments, start the visit.

**2. Users.** Receptionist, records officer. Permissions: `patients.view`, `patients.create`, `appointments.manage`.

**3. Release.** 2 (registration), 3 (check-in and appointments).

**4. Layout.**
```
┌ Search / Register (large, focused on load) ──────────────────────────────┐
├───────────────────────────────┬──────────────────────────────────────────┤
│ TODAY'S APPOINTMENTS (live)   │ REGISTRATION / CHECK-IN PANEL            │
│ expected, arrived, no-show    │ (wizard or patient summary)              │
├───────────────────────────────┴──────────────────────────────────────────┤
│ RECENTLY REGISTERED (live)  | Pending front-desk tasks                  │
└──────────────────────────────────────────────────────────────────────────┘
```

**5. Cards and components.**
- *Search bar* (`/`): returns patients with duplicate flags.
- *Registration wizard* in three steps, all on one screen with progress:
  1. **Identity:** name, sex, date of birth (or estimated age with flag), phone, address, photo optional. Live **duplicate detection** before save: shows likely matches and requires an explicit "different person" confirmation.
  2. **Coverage and contacts:** NHIS membership number (8 or 10 digits, validated as typed), membership type, **dependant flag and principal member link**, expiry if held, next of kin, other insurance.
  3. **Visit:** department or clinic, appointment link or walk-in, type of attendance, reason for visit.
- *Appointment list:* expected, arrived, late, no-show, with one-click check-in.
- *Check-in card:* confirms identity with two identifiers, then opens the encounter.
- *NHIS status chip:* membership number present and format-valid. [VERIFY] whether a live NHIA eligibility check is available. Until confirmed, the chip shows "Format valid", never "Active".

**6. Realtime subscriptions.** `dept:reception`, `dept:{department}` for appointment changes.

**7. Actions and effects.**

| Action | Effect elsewhere |
|--------|------------------|
| Register patient | `patient.registered`. Patient becomes searchable everywhere. |
| Check in or open encounter | `encounter.opened`: appears on **D2 OPD queue** and **D3 Triage**, and creates the registration or card-fee charge visible on **D8 Cashier**. |
| Book appointment | Appears on the target department's schedule and **D2**. |
| Mark no-show | Removes from queues, updates **D2**, recorded on timeline. |

**8. Works with.** D2, D3, D8, D0.

**9. States.** Search empty: "No patient found. Register new?" with the typed text carried over. Connection lost: registration drafts are kept locally as a **draft only** (Category A), and the button reads "Waiting for connection". Registration is not complete until the server issues the patient number.

**10. Claim data captured here.** Sex, date of birth, NHIS number, dependant flag, principal member, hospital record number, type of attendance. All mandatory when the patient is NHIS-covered, otherwise optional.

**11. Done when.** New patient registered in 90 s or less; returning patient checked in in 20 s or less [DECISION targets, to be validated with real staff]. Duplicate detection tested. The OPD queue shows the patient within 5 s of check-in. The patient number is generated only on the server.

---

### D2. OPD queue board

**1. Purpose.** Show every outpatient in the building, where they are and how long they have waited, so bottlenecks are visible and no patient is lost.

**2. Users.** OPD coordinator, records officer, nurses, charge nurse. Read-only view for doctors and management.

**3. Release.** 3.

**4. Layout.**
```
┌ Filters: department | priority | overdue only | my patients ─────────────┐
├────────────┬────────────┬────────────┬────────────┬──────────────────────┤
│ Registered │ Triage     │ Waiting    │ In         │ Investigations /     │
│            │            │ doctor     │ consultation│ Pharmacy / Billing  │
│ QueueCards │ QueueCards │ QueueCards │ QueueCards │ QueueCards           │
└────────────┴────────────┴────────────┴────────────┴──────────────────────┘
 KPI strip: waiting now | average wait | longest wait | overdue count
```

**5. Cards and components.**
- Columns map to the encounter state machine (v1.1 §3.2).
- `QueueCard`: name, age/sex, patient number, priority badge, wait timer, status chip, department, allergy marker.
- Overdue thresholds configurable per stage [VERIFY values with clinical leads]. Wait timers change from neutral to `warning` to `critical` and always show the elapsed text.
- A sort rule: priority first, then wait time.
- KPI strip with `KpiTile`.

**6. Realtime subscriptions.** `dept:{each department the user is assigned to}`.

**7. Actions and effects.**

| Action | Effect |
|--------|--------|
| Reassign department | `encounter.transferred`: moves to the other department's queue and notifies it |
| Mark no-show / cancel | `encounter.cancelled`: removes from all queues |
| Escalate priority | Moves up D3 and D4 queues |
| Open card | Opens D0 |

Drag-and-drop between columns is **not** supported, because a stage change is a clinical event owned by the responsible module. The board reflects state. It does not set it.

**8. Works with.** D1 (arrivals), D3, D4, D5, D7, D8.

**9. States.** Empty column: "No patients". Large volumes: columns show the first 20 cards with "Show more", server-paginated.

**10. Claim data.** None directly.

**11. Done when.** Every stage change anywhere in the hospital appears here in 5 s or less, tested for each state transition. No card appears in two columns. Overdue logic tested with a simulated clock.

---

### D3. Triage and nursing station

**1. Purpose.** Capture vitals and priority quickly and accurately, and manage nursing tasks.

**2. Users.** Triage nurse, ward nurse. Permissions: `nursing.triage`, `nursing.observe`.

**3. Release.** 4 (triage and observations), 7 (ward tasks).

**4. Layout.**
```
┌ WAITING FOR TRIAGE (live list)  │  TRIAGE FORM for selected patient ──────┐
│ sorted by arrival, priority flag│  banner | vitals grid | complaints |    │
│                                 │  priority | red flags | Complete triage │
├─────────────────────────────────┴─────────────────────────────────────────┤
│ NURSING TASKS DUE (observations, medications, handover notes)            │
└───────────────────────────────────────────────────────────────────────────┘
```

**5. Cards and components.**
- *Waiting list* with wait timers.
- *Vitals grid* using `StructuredField`: temperature, pulse, respiratory rate, SpO₂, **systolic and diastolic blood pressure**, **weight (kg)**, **height (m)**, **glucose (mmol/L) with type** (FBS, RBS, 2HPP, HBA1C), BMI shown automatically as a display value. Only raw readings are stored.
- Each reading records time. Several readings can be added for one encounter.
- *Range hints and soft warnings:* out-of-range or implausible values prompt "Check value" but do not block.
- *Priority selector:* categories shown with text labels. [VERIFY] which triage scale the hospital uses.
- *Red-flag checklist* that raises priority and alerts the doctor.
- *Nursing tasks:* due and overdue observations, with completion actions and handover notes.

**6. Realtime subscriptions.** `dept:triage`, `dept:{ward}` for ward tasks, `encounter:{id}` for the open patient.

**7. Actions and effects.**

| Action | Effect |
|--------|--------|
| Complete triage | `triage.completed`: encounter becomes *triaged*, patient appears on **D4** doctor queue with priority and vitals, **D2** moves the card, vitals are available to claims (VBC) |
| Record critical vitals | Critical alert to the assigned doctor and charge nurse on **D4** and **D10** |
| Complete a nursing task | Updates ward board and timeline |

**8. Works with.** D1 (arrivals), D2, D4, D10.

**9. States.** Form drafts autosave locally (Category A). Triage completion is a server confirmation. Offline shows "Cannot complete triage while offline" with the draft retained.

**10. Claim data captured here.** All vitals for the `extraData` block (VBC): weight, height, systolic, diastolic, glucose and glucose type, each with a recorded time.

**11. Done when.** Triage complete to doctor queue appearance in 5 s or less. Units are stored and exported correctly. Validation ranges tested. Keyboard-only completion works.

---

### D4. Doctor workspace

**1. Purpose.** See my patients, consult, order, prescribe, record diagnoses and procedures, and finish the encounter, with results coming to me automatically.

**2. Users.** Doctors. Permissions: `clinical.consult`, `clinical.finalize`, plus ordering and prescribing permissions.

**3. Release.** 4.

**4. Layout.**
```
┌ MY QUEUE (live) ───────────┬ CONSULTATION (selected patient) ────────────┐
│ priority + waiting time    │ banner                                       │
│ ─────────────────────────  │ Complaints | History | Examination | Vitals │
│ RESULTS INBOX (live)       │ Diagnosis | Orders | Prescriptions |        │
│ new, critical first        │ Procedures | Referral | Disposition         │
│                            │ [ Finalise consultation ]                    │
└────────────────────────────┴──────────────┬───────────────────────────────┘
                                            │ CONTEXT RAIL: alerts, pending,
                                            │ claim readiness
```

**5. Cards and components.**
- *My queue:* patients assigned to me or my department, ordered by priority then wait. Shows triage vitals summary on the card.
- *Results inbox:* newly verified results for my patients, **critical first**, with acknowledge action.
- *Consultation sections* with autosaved drafts:
  - **Diagnosis:** `CodePicker` for ICD-10. At least one coded diagnosis required to finalise.
  - **Orders:** lab and imaging picker from the service catalogue, with priority.
  - **Prescriptions:** `DoseInput` producing dose, frequency and duration in the structured format. Free text is allowed but marked "Non-standard", and shows a claim warning. Allergy check runs on selection.
  - **Procedures:** from the service catalogue, each with date. Each needs an associated diagnosis.
  - **Referral:** facility name and identifiers, where applicable.
  - **Disposition:** discharge home, admit, refer, follow-up, with outcome recorded where applicable.
- *Finalise* is the single primary button, a Category C operation. After finalisation, notes are read-only and changes are addenda.
- *Context rail:* `ClaimReadinessMeter` listing what the claim still needs from this consultation (for example, "Diagnosis has no ICD-10", "Prescription 2 is non-standard").

**6. Realtime subscriptions.** `dept:{my department}`, `encounter:{open}`, personal channel for my results.

**7. Actions and effects.**

| Action | Effect |
|--------|--------|
| Request lab test | `lab.order.created`: appears on **D5** worklist and creates a charge for **D8** |
| Prescribe | `prescription.created`: appears on **D7** pharmacy queue |
| Finalise consultation | `consultation.finalized`: updates **D2**, enables lab, pharmacy and billing flows, refreshes claim readiness on **D9** |
| Admit | Creates an admission request on **D10** |
| Acknowledge critical result | Recorded with time and user, clears the alert on **D5** |

**8. Works with.** D2, D3, D5, D6, D7, D8, D10, D0.

**9. States.** Consultation drafts persist locally and on the server where online. Finalising offline is not allowed (Category C). Results inbox empty state: "No new results".

**10. Claim data captured here.** ICD-10 diagnoses, procedures with dates, structured prescriptions, referral details, disposition and outcome, attendance type confirmation, specialty (from department).

**11. Done when.** Verified lab result appears in the results inbox within 5 s. Prescription appears on pharmacy within 5 s. Finalise is atomic and idempotent. Allergy conflict blocks. Claim readiness list updates live while editing.

---

### D5. Laboratory worklist

**1. Purpose.** Run the lab from order to verified result with a clear chain of custody.

**2. Users.** Laboratory technician, lab scientist. Permissions: `lab.process`, `lab.verify`.

**3. Release.** 5.

**4. Layout.**
```
┌ Filters: priority | test | status | ward ──────────────────────────────┐
├───────────────────────────────────────────────────────────────────────────┤
│ Stage tabs:  Ordered | Collected | Received | In process |               │
│              Awaiting verification | Verified today                      │
│ WORKLIST (virtualised table)                          │ DETAIL DRAWER    │
└───────────────────────────────────────────────────────┴──────────────────┘
 KPI strip: pending | overdue | critical outstanding | turnaround today
```

**5. Cards and components.**
- *Worklist* grouped by patient with test rows, priority and wait timer.
- *Specimen collection:* identity check with two identifiers, collection time, label printing after server confirmation.
- *Receive and reject specimen:* rejection requires a reason and notifies the requesting doctor.
- *Result entry grid:* test components, units, reference ranges, automatic flags (High, Low, **Critical**) shown with text.
- *Verification:* a separate action from entry. Whether the verifier must differ from the entering user is configurable [VERIFY hospital policy]. Verification is Category C.
- *Critical results panel:* requires documented notification of the clinician (who, when, how) before the item can be closed.

**6. Realtime subscriptions.** `dept:laboratory`.

**7. Actions and effects.**

| Action | Effect |
|--------|--------|
| Verify result | `lab.result.verified`: result appears in the requesting **doctor's results inbox**, on the **patient timeline** and **D0 Results**, encounter moves to *investigations complete* when all items done, **claim investigation line** becomes available to **D9** |
| Critical value | Critical alert to the requesting doctor (D4) with acknowledgement tracking |
| Reject specimen | Notifies doctor and ward, creates re-collection task |

**8. Works with.** D4 (orders in, results out), D8 (charges), D9 (investigation lines), D10 (ward collections).

**9. States.** Analyzer interfaces are out of scope for v1. Manual entry only. [VERIFY] analyzer models for a later integration. Unverified results are never visible to clinicians as final.

**10. Claim data captured here.** Verified investigation, date of service, mapped GDRG. A test without a mapping shows an **"Unmapped for claims"** marker so the mapping can be fixed immediately.

**11. Done when.** Verified result reaches the doctor within 5 s. Critical flow cannot be closed without acknowledgement. Rejection and re-collection tested. Specimen identity checks tested.

---

### D6. Radiology (later release)

Follows the Laboratory pattern: order, schedule, perform, report, verify. Reports attach through private storage. Image viewing is out of scope until a PACS decision [VERIFY]. Effects mirror D5 (result to doctor, charge to cashier, investigation line to claims). Full template to be completed when the module is introduced.

---

### D7. Pharmacy

**1. Purpose.** Verify prescriptions, dispense accurately against real stock, and keep stock and claims correct.

**2. Users.** Pharmacist, pharmacy assistant. Permissions: `pharmacy.dispense`, plus stock view.

**3. Release.** 6.

**4. Layout.**
```
┌ PRESCRIPTION QUEUE (live) ──────┬ DISPENSING PANEL ─────────────────────┐
│ waiting, partial, ready         │ banner | allergy check | items | batch │
│                                 │ selection | quantity | counselling     │
│                                 │ [ Dispense ]                           │
├─────────────────────────────────┴────────────────────────────────────────┤
│ STOCK ALERTS: low stock | near expiry | stock-outs                      │
└──────────────────────────────────────────────────────────────────────────┘
```

**5. Cards and components.**
- *Queue* with priority, wait time and status (new, in progress, partial, dispensed).
- *Dispensing panel:* each item shows prescribed dose, frequency, duration, available stock and **suggested batch (first expiry, first out)**. The pharmacist can change batch with a reason.
- *Safety checks:* allergy conflict (blocking, override needs reason), duplicate therapy warning, quantity vs duration sense-check.
- *Partial dispensing and substitution* with reason.
- *Two-identifier confirmation* before Dispense.
- *Dispense* is a Category C `CriticalActionDialog`, executed as one database transaction: prescription check, stock check, batch selection, dispensed quantities, stock movement ledger, charge, prescription status.
- *Stock alerts:* below minimum, expiring within configured days, out of stock.
- *Claim mapping marker:* an item with no NHIA medicine code shows **"Unmapped for claims"** before dispensing, so it can be mapped.

**6. Realtime subscriptions.** `dept:pharmacy`.

**7. Actions and effects.**

| Action | Effect |
|--------|--------|
| Dispense | `pharmacy.dispensed`: **stock ledger movement** (D12 updates), **charge** to **D8**, doctor sees "dispensed" on **D4/D0**, encounter progress, **claim medicine line** with prescription becomes available to **D9** |
| Stock falls below minimum | Important notification to store (D12) |
| Out of stock for prescribed item | Notifies the prescribing doctor to substitute |

**8. Works with.** D4, D8, D9, D12, D0.

**9. States.** Dispense is blocked offline. Stock mismatch at confirm time is shown as "Stock changed. Review batches". Duplicate click is harmless thanks to the idempotency key.

**10. Claim data captured here.** Dispensed quantity, dispensing date, NHIA medicine code (through mapping), the prescription's dose, frequency and duration or the free-text form.

**11. Done when.** Concurrent dispensing of the same stock never over-deducts (database test). The doctor sees dispensed status within 5 s. Allergy block tested. Ledger and balance reconcile.

---

### D8. Cashier and billing

**1. Purpose.** Collect payments accurately, issue receipts, handle refunds under control, reconcile the till.

**2. Users.** Cashier, finance officer. Permissions: `finance.collect`, `finance.refund` (separately granted).

**3. Release.** 6.

**4. Layout.**
```
┌ PENDING CHARGES BY PATIENT (live) │ PAYMENT PANEL ────────────────────────┐
│ unpaid, partially paid            │ banner | itemised charges | total     │
│                                   │ method | amount | reference           │
│                                   │ [ Record payment ]                    │
├───────────────────────────────────┴───────────────────────────────────────┤
│ MY TILL: collected today | by method | shift reconciliation              │
└───────────────────────────────────────────────────────────────────────────┘
```

**5. Cards and components.**
- *Pending charges* grouped per patient and encounter with source (registration, lab, pharmacy, procedure).
- *Payment panel:* amounts are displayed from the server and **never computed in the browser**. Payment methods: cash, mobile money, card, insurance co-payment. [VERIFY] the exact methods and mobile money providers. [VERIFY] how NHIS-covered services are handled at the till, because NHIS pays through claims and patients typically pay only for non-covered items.
- *Receipt:* generated and printed only after server confirmation, with a traceable reference.
- *Refund flow:* requires the refund permission, a reason and approval where configured. Every refund is a new transaction, never an overwrite.
- *Shift reconciliation:* expected vs counted, discrepancies recorded, end-of-shift closing.

**6. Realtime subscriptions.** `dept:finance`, `encounter:{open}`.

**7. Actions and effects.**

| Action | Effect |
|--------|--------|
| Record payment | `payment.recorded`: balance updates on **D0 Billing**, encounter can proceed (for services that require prepayment), reception and doctor see paid status where relevant |
| Issue invoice | `invoice.issued`: visible on D0 |
| Refund | Audit event, notifies approver, updates D0 |

**8. Works with.** D1 (registration charge), D4, D5, D7, D10, D9 (reconciling billed vs claimed).

**9. States.** If the network drops during Record payment: "Not yet confirmed", **Check status**, retry reuses the idempotency key. No duplicate collection is possible.

**10. Claim data captured here.** None for the XML. Hospital-billed totals are used only to reconcile against the cost CLAIM-it returns.

**11. Done when.** Retrying after a network drop never double-collects (test). Receipt prints only after confirmation. Till reconciliation tested. Refund approval tested.

---

### D9. Claims office

**1. Purpose.** Turn completed encounters into correct CLAIM-it XML, track every claim to its outcome, and fix problems at their source.

**2. Users.** Claims officer, insurance officer. Permissions listed in Architecture v1.1 §10.

**3. Release.** 6.

**4. Layout.**
```
┌ PIPELINE (live counts, click to filter) ─────────────────────────────────┐
│ Not ready | Ready | Exported | Import passed | Warned | Failed | Submitted│
├───────────────────────────────┬──────────────────────────────────────────┤
│ CLAIM LIST (virtualised)      │ CLAIM DETAIL                              │
│ filters: month, service type, │ sections mirror the XML structure:        │
│ readiness, payer              │ Claim header | Member | Service | Dates | │
│                               │ Specialties | Investigations | Procedures │
│                               │ Diagnoses | Medicines | Vitals | Referral │
│                               │ + Validation panel + Print preview        │
├───────────────────────────────┴──────────────────────────────────────────┤
│ MAPPING QUEUE: unmapped GDRG | unmapped medicines | unmapped departments │
└───────────────────────────────────────────────────────────────────────────┘
```

**5. Cards and components.**
- *Pipeline strip:* counts per claim state (Architecture v1.1 §9).
- *Claim list:* readiness, blockers count, warnings, month, total hospital-billed, CLAIM-it cost once known.
- *Claim detail:* all fields shown **read-only**, sourced from Supabase, with a **"Fix at source"** link beside every problem that opens the originating record (for example the patient's date of birth, a diagnosis without ICD-10, a medicine without a prescription). The claims officer does not retype clinical data here.
- *Fields entered here:* Claims Check Code (5 digits), pre-authorisation codes, physician ID if not on the staff profile. Validated as typed and audited.
- *Validation panel:* blockers and warnings (rule codes CLM-001 to CLM-020 and CLM-W01 to W05).
- *Print preview:* the NHIS paper layout rendered from the **same snapshot** as the XML.
- *Export wizard:* select ready claims for a month, review count and blockers, generate XML, download with a short-lived link, shows file hash and claim count.
- *Import report upload:* upload CLAIM-it's report. Results are matched per claim and each CLAIM-it error becomes a task against the responsible source record or mapping.
- *Mapping queue:* GDRG, NHIA medicine and department-to-specialty mappings that block claims. Resolving one re-checks all affected claims immediately.
- *Month progress meter:* ready vs total for the month.

**6. Realtime subscriptions.** `dept:claims`, `claim:{id}` for open claim.

**7. Actions and effects.**

| Action | Effect |
|--------|--------|
| Generate or refresh claim snapshot | New claim version, timeline entry |
| Enter CCC or pre-authorisation | Updates readiness live |
| Mark ready | `claim.status_changed`. Locked against source edits until re-snapshot |
| Export batch | Claims move to *exported*, file stored, audit event, exports logged |
| Upload import report | Claims move to passed, warned or failed. Failure tasks appear on **D4, D5, D7, D1** depending on the cause |
| Resolve a mapping | Affected claims recompute readiness |

**8. Works with.** D1, D4, D5, D7, D8, D10, D13, D0.

**9. States.** A discharge creates a claim candidate automatically. It appears as *Not ready* with its missing items. No claim is silently dropped. Export with any blocker is impossible and the button states why.

**10. Claim data captured here.** CCC, pre-authorisation codes, physician ID (if applicable).

**11. Done when.** The golden-file test and all gates G1 to G6 of Architecture v1.1 §11.2 pass. A discharge reflects on this dashboard within 5 s. Every blocker has a working "Fix at source" link. Print preview and XML are generated from the same snapshot (test compares them).

---

### D10. Ward and bed board

**1. Purpose.** Know which beds are free, who is where, who is waiting for admission, and who is ready to go home.

**2. Users.** Ward nurses, charge nurses, admitting doctors, bed manager. Permissions: `inpatient.admit`, `inpatient.allocate_bed`, `inpatient.discharge`.

**3. Release.** 7.

**4. Layout.**
```
┌ ADMISSION REQUESTS (live)  │ BED MAP BY WARD ──────────────────────────┐
│ waiting for a bed          │ BedTile grid: Available | Occupied |       │
│                            │ Reserved | Cleaning | Out of service       │
├────────────────────────────┴───────────────────────────────────────────┤
│ DISCHARGE CHECKLIST (patients going home today)                         │
│ OBSERVATIONS DUE | HANDOVER NOTES                                       │
└──────────────────────────────────────────────────────────────────────────┘
 KPI strip: occupancy | available beds | pending admissions | discharges today
```

**5. Cards and components.**
- *Bed map:* tiles show bed number, status and, if occupied, patient initials and name on hover or focus. Names are not shown on shared wall displays unless policy allows [VERIFY].
- *Admission request queue* with priority and waiting time.
- *Allocate bed:* choose an available bed. It is a Category C operation. If another user has just taken it, the dialog shows "Bed no longer available" with alternatives. Double booking is impossible.
- *Transfer:* between beds or wards with reason.
- *Discharge checklist:* clinical summary done, medicines dispensed, bills cleared or arranged, **outcome recorded**, discharge date and time. Each item links to where it is done and ticks automatically when the system records it.
- *Observation tasks* and handover notes.

**6. Realtime subscriptions.** `dept:{ward}`, `dept:bedmanagement`.

**7. Actions and effects.**

| Action | Effect |
|--------|--------|
| Admit and allocate bed | `admission.created`, `bed.allocated`: bed turns Occupied on every board in 5 s or less, **D8** opens inpatient billing, **D4** shows admitted status, **D3** gets ward tasks |
| Transfer | Both ward boards update, timeline entry |
| Discharge | `patient.discharged`: bed becomes *Cleaning*, **D8** finalises charges, **D9 creates the claim candidate with outcome and admission and discharge dates** |
| Bed cleaned | Bed returns to Available |

**8. Works with.** D3, D4, D8, D9, D0.

**9. States.** No beds available: the allocate dialog explains and offers the waiting list. Offline: read-only with a stale notice.

**10. Claim data captured here.** Admission date, discharge date, **service outcome** (discharged, died, transferred out, absconded), specialty, duration of stay.

**11. Done when.** No bed can be double-allocated under concurrent load (test). A bed change shows on all boards in 5 s or less. Discharge cannot complete without outcome and date.

---

### D11. Emergency board (later release)

Follows the D2 and D10 patterns with compressed timelines: arrival, triage, resuscitation, treatment area, disposition. Critical-patient visibility and break-glass use are central. Full template to be completed when introduced.

---

### D12. Inventory and stores

**1. Purpose.** Maintain accurate stock for pharmacy and general supplies, based on a movement ledger.

**2. Users.** Store keeper, pharmacy lead. Permissions: stock view, receive, adjust, transfer.

**3. Release.** 6.

**4. Layout.** Stock overview with tabs: Levels | Expiry | Goods received | Transfers | Adjustments | Ledger.

**5. Cards and components.**
- *Levels:* item, location, balance, minimum, status.
- *Expiry:* batches expiring within configured days.
- *Goods receipt:* supplier, batch, expiry, quantity. Category C.
- *Transfer:* store to dispensary, atomic.
- *Adjustment:* requires reason and approval above a threshold.
- *Ledger view:* every movement (opening, received, dispensed, adjusted), always reconciling to balance.

**6. Realtime subscriptions.** `dept:inventory`, `dept:pharmacy`.

**7. Actions and effects.**

| Action | Effect |
|--------|--------|
| Goods received | Balance rises, **D7** shows availability, low-stock alerts clear |
| Adjustment | Audit, approver notified, **D13** stock-risk tile updates |
| Stock below minimum | Important notification to store and pharmacy |

**8. Works with.** D7, D13.

**9. States.** Reconciliation mismatch shows a persistent alert for investigation.

**10. Claim data.** Item identity feeds the drug-to-NHIA-code mapping.

**11. Done when.** Balance always equals ledger sum (database test). Concurrent transfers are safe.

---

### D13. Hospital management

**1. Purpose.** Show the whole hospital's operational and financial position without slowing operations.

**2. Users.** Hospital administrator, medical director, finance head. Read-only. Exports are permission-controlled and logged.

**3. Release.** 9 (with operational tiles earlier).

**4. Layout.**
```
┌ TODAY (live operational tiles) ─────────────────────────────────────────┐
│ patients in hospital | average OPD wait | beds occupied | lab pending |  │
│ prescriptions waiting | cash collected                                  │
├──────────────────────────────────────────────────────────────────────────┤
│ TRENDS (aggregated, "as of" time)                                       │
│ attendance | revenue by service | lab turnaround | pharmacy consumption │
├──────────────────────────────────────────────────────────────────────────┤
│ CLAIMS PERFORMANCE: by month and state, CLAIM-it vs billed difference,   │
│ rejected claims and reasons                                             │
│ RISKS: stock-outs | overdue critical acknowledgements | sync conflicts   │
└──────────────────────────────────────────────────────────────────────────┘
```

**5. Cards and components.** `KpiTile` with definitions on hover. Charts with accessible tables behind them. Every tile states its **time basis**: live tiles are operational queries and aggregate tiles show "as of HH:MM".

**6. Realtime subscriptions.** Live tiles refresh by the 5 s polling rule. Aggregates refresh on a schedule. Management screens do not subscribe to detailed clinical channels.

**7. Actions and effects.** Drill-down to the owning dashboard, subject to permission. Exports require permission and are audited.

**8. Works with.** All dashboards, as a consumer.

**9. States.** Aggregates not yet computed show "Not yet available", never zero.

**10. Claim data.** None captured.

**11. Done when.** Reports do not degrade operational performance in load tests. Every KPI has a written definition and source.

---

### D14. Administration console

**1. Purpose.** Configure the hospital and watch system health.

**2. Users.** Hospital administrator, IT administrator. Permission: `admin.manage_users` and related.

**3. Release.** 1, with ongoing additions.

**4. Sections.**
- **Hospital profile** (single record, facility ID, VBC participation flag, claim settings).
- **Departments, wards, rooms, beds.**
- **Users, roles, permissions** (permission matrix, department assignments, time-limited elevated access).
- **Service catalogue** and prices.
- **Reference mappings:** GDRG, NHIA medicine, department to specialty (shared with D9).
- **Thresholds:** queue overdue times, stock minimums, critical values.
- **Audit viewer** and **break-glass review queue**.
- **Sync conflicts.**
- **Realtime SLA monitor:** p50 and p95 propagation latency, events over 10 s, polling-fallback rate, reconnect rate, connected sessions. Critical alert when the 10 s limit is breached.
- **Backup and restore status.**

**5. Realtime.** SLA monitor refreshes on a 5 s polling cycle.

**6. Actions and effects.** Configuration changes take effect through database functions, are audited, and update navigation and permissions for affected users within 5 s.

**7. Done when.** Every administrative change is audited. Permission changes cannot lock out the last administrator. The SLA monitor reflects a simulated breach.

---

### Later modules

Theatre, maternity, blood bank, HR, attendance, rosters, procurement and facilities follow the same template and are specified when their releases begin.

---

## 7. Cross-dashboard effects matrix

What the user sees change on other screens when something happens. Every row is an automated test.

| Event | D1 | D2 | D3 | D4 | D5 | D7 | D8 | D9 | D10 | D0 |
|-------|----|----|----|----|----|----|----|----|-----|----|
| Patient registered | new in recent list | | | | | | | | | profile exists |
| Encounter opened | | card appears in *Registered* | appears in waiting list | | | | registration charge | claim candidate begins | | timeline |
| Triage completed | | card to *Waiting doctor* | removed from list | patient appears with vitals and priority | | | | vitals ready for VBC | | vitals tab |
| Lab ordered | | status *Investigations* | | order shown as pending | appears in worklist | | lab charge | | | orders tab |
| Lab result verified | | | | **result in inbox, critical first** | moves to *Verified* | | | investigation line ready | | results tab |
| Prescription created | | | | shown as prescribed | | **appears in queue** | | | | medications tab |
| Medicine dispensed | | status updates | | shown as dispensed | | moves to dispensed | pharmacy charge | **medicine line ready** | | medications tab |
| Payment recorded | updates | status updates | | | | | balance clears | | | billing tab |
| Admission and bed allocated | | | ward tasks | admitted status | | | inpatient billing opens | admission date recorded | **bed turns Occupied** | timeline |
| Patient discharged | | card closes | | encounter closes | | | charges finalised | **claim candidate with outcome and dates** | bed to *Cleaning* | timeline |
| Claim import failed | task if cause is registration | | | task if cause is clinical | task if cause is lab | task if cause is pharmacy | | **state to Failed with causes** | | claim tab |

Target for every cell: visible within 5 s, hard limit 10 s (Architecture v1.1 §4.1).

---

## 8. End-to-end walkthrough with time budget

A single outpatient visit on NHIS, showing how the dashboards respond. Times show the latest acceptable update delay at each hand-off, not how long staff take.

| Step | Who | Action | Updated automatically (within 5 s) |
|------|-----|--------|-----------------------------------|
| 1 | Receptionist (D1) | Registers patient, captures NHIS number, dependant flag, date of birth, sex, then opens encounter | D2 card in *Registered*. D3 waiting list. D8 registration charge. D9 claim candidate. |
| 2 | Cashier (D8) | Records registration payment | D1 and D2 show paid. D0 billing tab. |
| 3 | Nurse (D3) | Records vitals including BP, weight, height, glucose, completes triage | D4 doctor queue shows patient with priority and vitals. D2 card to *Waiting doctor*. Claim vitals ready. |
| 4 | Doctor (D4) | Consults, codes ICD-10 diagnosis, orders lab test, prescribes, finalises | D5 worklist shows order. D8 lab charge. D7 prescription queue. D2 card to *In consultation* then *Investigations*. D9 claim readiness updates. |
| 5 | Lab (D5) | Collects, enters result, **verifies** | D4 results inbox shows result. D0 results tab. D2 card moves. D9 investigation line ready. |
| 6 | Pharmacist (D7) | Dispenses | D4 shows dispensed. D12 ledger and stock. D8 pharmacy charge. D9 medicine line ready. |
| 7 | Cashier (D8) | Collects non-covered charges | Balance clears on D0. |
| 8 | Encounter closes | Last step completes | D2 removes card. D9 claim becomes *Ready* if no blockers. |
| 9 | Claims officer (D9) | Enters CCC, exports month batch, imports in CLAIM-it, uploads report | Failures create tasks on the responsible dashboards. |

If any step requires a person to refresh, retype data that exists elsewhere, or telephone another department to say "it's ready", the design has failed.

---

## 9. Offline and connectivity by dashboard

Applies Architecture v1.0 §8 categories.

| Dashboard | While offline the screen can | Cannot |
|-----------|-----------------------------|--------|
| D1 | Keep a registration **draft** | Issue a patient number, open an encounter |
| D2 | Show last data with stale notice | Refresh |
| D3 | Keep a triage **draft** | Complete triage |
| D4 | Keep consultation drafts | Finalise, order, prescribe |
| D5 | Show last worklist | Verify, collect, release results |
| D7 | Show last queue | Dispense |
| D8 | Show last queue | Record payment, refund |
| D9 | View claims already loaded | Export, change status |
| D10 | Read-only board | Allocate, transfer, discharge |
| D13 | Show last aggregates | Refresh |

A visible banner shows "Offline. Changes cannot be saved" and the downtime procedure reference (v1.0 §8.4). Patient data is not cached beyond approved workflows (v1.0 §8.3).

---

## 10. Performance and build rules for screens

- Lists are server-paginated and virtualised. No screen loads a whole table.
- First meaningful content within 3 s on the reference hardware [VERIFY the hardware]. Skeletons appear within 100 ms.
- Code splitting per module. Dashboards load only their own module code.
- Realtime subscriptions are created on mount and cleaned up on unmount through the central `RealtimeManager`.
- Presenter and container split: presenters are pure and testable. Containers fetch.
- State: server data through a query cache, never duplicated into local state. Local state only for UI.
- Hot lists (queues) refetch only the changed slice where possible, within the idempotent "refetch" rule.
- No glass on content layers (Section 1.2). Reduced effects mode tested on a low-end machine.

---

## 11. Accessibility

- Keyboard reachable everywhere, visible focus ring.
- Contrast AA minimum in both themes.
- Status never colour-only.
- Live regions announce important updates politely. Critical alerts are announced assertively.
- Reduced motion and reduced transparency respected.
- Forms have programmatic labels and inline error association.
- Tested with a screen reader on the core flows (registration, consultation, dispensing, payment).

---

## 12. Definition of done (every dashboard)

A dashboard is not finished until all are true:

1. Layout and components match this specification.
2. Every subscribed event updates the screen in 5 s or less, tested, with the 10 s hard limit never exceeded in the load test.
3. Every action's downstream effects (Section 7) are verified by automated tests.
4. Allowed and denied access tested, including care relationship and break-glass.
5. Offline behaviour matches Section 9.
6. Category C operations are server-confirmed, idempotent and never optimistic.
7. Claim data captured here is complete, and gaps surface on `ClaimReadinessMeter` at the point of care.
8. Loading, empty, error and stale states are implemented.
9. Keyboard and accessibility checks pass.
10. Tested in dark theme and reduced effects mode on 1366 × 768.
11. **Usability test with real staff from that department**, and their time-on-task compared with the targets here.

---

## 13. Open items [VERIFY]

| # | Item | Affects |
|---|------|---------|
| U1 | Triage scale used by the hospital | D3, D4, D2 colours and labels |
| U2 | Real device inventory and screen sizes per station | All layouts (1366 × 768 assumed) |
| U3 | Barcode scanners, label printers, receipt printers available | D5 specimen labels, D7 labels, D8 receipts, patient wristbands |
| U4 | Whether a live NHIS eligibility check is available | D1 coverage chip |
| U5 | Payment methods and mobile money providers | D8 |
| U6 | How NHIS-covered services are handled at the till | D8 |
| U7 | Four-eyes rule for lab verification | D5 |
| U8 | Critical value lists and notification policy | D5, D4, notifications |
| U9 | Overdue thresholds per queue stage | D2, D3, D5, D7 |
| U10 | Discharge checklist items required by hospital policy | D10 |
| U11 | Wall display and privacy policy for bed boards | D10 |
| U12 | Languages required beyond English | All |
| U13 | Radiology image viewing and PACS | D6 |
| U14 | Lab analyzer models for later integration | D5 |
| U15 | Reference hardware for performance budgets | Section 10 |
| U16 | Per-role task-time targets validated with staff | Section 12 |

---

## 14. Decisions to freeze

| Decision | Status |
|----------|--------|
| Glass limited to navigation layer, solid content surfaces, solid fallback | Proposed |
| Dashboards communicate only through the database and realtime, never directly | **Approved** (follows from owner requirement R2) |
| No optimistic UI for Category C operations | Proposed |
| Idempotency key per confirmed action, with "Not yet confirmed" state | Proposed |
| Patient banner with allergy chip on every clinical screen | Proposed |
| Two-identifier confirmation for dispensing, verification and collection | Proposed |
| "n new items" pill instead of layout jump while interacting | Proposed |
| Soft work-claiming with 5 minute lease on worklist items | Proposed |
| Claims officer fixes problems at source, not by retyping | Proposed |
| Board does not allow drag-and-drop stage changes | Proposed |
| Notification tiers with required acknowledgement only for critical | Proposed |
| 1366 × 768 minimum design size, 10 inch tablet for nurses | Proposed |
| Comfortable and compact density modes | Proposed |

---

## 15. Next documents

1. **Database Blueprint**, derived from this specification: worklist items and claims, encounter states, timeline, vitals, work claims, notifications, mapping tables, thresholds.
2. **Module workflow documents**, one per module, with detailed field lists and validation per screen.
3. **Design system document**: tokens, component specifications and the visual reference for each shared component.
