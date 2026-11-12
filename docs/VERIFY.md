# Items that must be confirmed outside the build sandbox

Nothing in this list is assumed correct. Each item says what to check and where. Items are added as milestones are built.

## Cannot be proven in the sandbox

| # | Item | Check |
|---|------|-------|
| X1 | Supabase Auth, Realtime Broadcast timing (5 s target, 10 s limit), Edge Functions | Deploy to a staging Supabase project and run the latency test from the deploy checklist |
| X2 | Arkesel SMS delivery | Send a test message from a staging account with a real sender ID |
| X3 | CLAIM-it accepts the exported XML | Import a test batch into a real CLAIM-it installation and read the import report |
| X4 | Realtime channel policy mechanics on the chosen Supabase plan | Staging test |

## From the CLAIM-it XML specification v2.1 (supplied)

| # | Finding | Decision |
|---|---------|----------|
| C1 | Section 2.3 lists **Age** as required, but the XML structure in 2.1 has no age tag | Not emitted. Confirm CLAIM-it derives age from date of birth |
| C2 | The spec example writes `dateOfBirth` as `2005-5-11` (no zero padding) while 2.3 says dates are `YYYY-mm-dd` | Zero-padded ISO dates are emitted |
| C3 | Each `<diagnosis>` element contains a child also named `<diagnosis>` (the description). Same in `<procedure>` | Emitted exactly as the spec shows |
| C4 | `physicianID` is in the structure but has no stated format and is not in the required list | Optional, free text. Confirm format with NHIA |
| C5 | `principalGDRG` is required for IPD claims with multiple unique GDRGs and must be one of the GDRGs already on the claim | Enforced by a database check. Confirm behaviour on import |
| C6 | `extraData` and vitals apply only to Value Based Care facilities. `glucoseType` defaults to RBS when empty | Controlled by the hospital setting `is_vbc_participant` |
| C7 | Member number or HIN must be 8 or 10 digits. Claim check code is optional and 5 digits | Database constraints |
| C8 | Prescription is required for every medicine: `dose` + `frequency` + `duration`, or `unparsed` | Database constraint. Units: frequency HOURLY or DAILY. Duration DAYS, WEEKS or MONTHS |
| C9 | The ClaimIt openapi (`claimit-openapi.json`) sends `username` and `password` for `/token` as **query parameters** and does not define the JSON claim field names | Use only over TLS or localhost. Confirm the JSON requirement document with NHIA before building a JSON path. The XML path is the primary export |
| C10 | `claimID` must be unique across all batches | Server-allocated, immutable |

## From the architecture and dashboard specs

The `[VERIFY]` lists in `docs/architecture/ARCHITECTURE_v1.1.md` (section 12), `docs/product/DASHBOARDS_AND_SCREENS.md` (section 13) and `docs/product/DESIGN_SYSTEM_SPEC.md` (section 14) all stand. Triage scale, critical values, overdue thresholds, printers and NHIS eligibility checks are hospital decisions and are left configurable.

## Database blueprint Part 3

Not supplied. Doctor, Pharmacy, Laboratory, Cashier, Claims, and their related workflows have demo-only browser workflows based on the architecture and dashboard specs. They are not server-backed and do not provide production-safe clinical, prescribing, dispensing, inventory, payment, reconciliation, refund, or insurance transactions.

The Cashier screens update shared browser-local demo invoices, payment receipts, refund requests, and shift counts. Receipt printing is a browser print view only. Refund requests are not approvals or payouts.

Claims screens use editable demo snapshots rather than the specified immutable Supabase snapshots. The local XML preview/export and CSV import parser are not a complete CLAIM-it XML v2.1 implementation and have not been tested with CLAIM-it. No claim submission is available. Do not use demo files or amounts for real billing or insurance processing.

## Added with the role workspaces

| # | Item | Check |
|---|------|-------|
| W1 | Inpatient, nursing task, discharge checklist, refund approval and shift reconciliation tables are designed from `ROLE_WORKSPACES.md`, not from the blueprint (Part 3 missing) | Review the schema in M3 before building on it |
| W2 | The brief says the Doctor "Results inbox" and "Admission requests" depend on permissions the blueprint catalogue does not name (`clinical.order`, `nursing.observe` are used) | Confirm or add dedicated permission codes |
| W3 | Documents have no permission codes in the blueprint, so the Documents menu uses `patients.view` | Add `documents.*` codes if documents need separate control |
| W4 | Insurance "Near Expiry" window is a hospital setting | Set the number of days in Thresholds and settings |
| W5 | Doctor diagnosis examples, allergy history, and results use seeded browser-local data | Confirm the approved ICD-10 catalogue, patient allergy reconciliation, and clinical workflow with the hospital before go-live |
| W6 | Cashier receipts, payments, refund requests, and shift reconciliation use browser-local demo data | Implement and test server-confirmed idempotent payment, audited receipts, refund approval/payout, and finance reconciliation before go-live |
| W7 | Claims snapshots, XML export, and report parsing are illustrative browser-local workflows | Implement the full immutable CLAIM-it v2.1 snapshot/export/import contract and pass the supplied staging and CLAIM-it acceptance tests before go-live |
| W8 | Patient charts combine role-permitted workspace records, and data-entry flows use dialogs | Verify role-specific tab access and cross-workspace updates in a signed-in browser; the chart and dialogs do not make browser-local workflows server-backed |

## Added with the database core

| # | Item | Check |
|---|------|-------|
| D1 | `grant execute` on `realtime.send` to the function owner may be refused on a hosted project | Run `all_migrations.sql` on a staging project and read the notices. Notifications still work: delivery failures never break a transaction, and screens poll |
| D2 | `postgres` must be able to `grant hms_definer to postgres` and change function ownership on the hosted project | Staging run |
| D3 | The Data API must expose only the `api` schema | Dashboard, Project Settings, Data API: Exposed schemas = `api` |
| D4 | Role permission mapping is a starting point | Review with the department heads before go-live |
| D5 | `pg_cron` jobs (purge, partitions) cannot run in the sandbox | Schedule `select core.purge_expired()` daily on staging |
| D6 | Audit tables follow blueprint principles because Part 3 was not supplied | Review the audit design when Part 3 is available |
| D7 | `insurance.near_expiry_days` is seeded at 60 | Confirm with the hospital |
