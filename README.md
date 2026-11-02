# Ascend HMS

Hospital management system foundation for Ascend Technologies.

> **Development status:** this is a local, synthetic-data workflow preview, not a clinical system and not ready for real patient data. Role selection is passwordless demo sign-in; it is not authentication or secure authorization. Supabase is not connected.

## Stack

- React + JavaScript/JSX + Vite
- Plain CSS design system (no Tailwind)
- Supabase project structure for future migrations, Edge Functions, seed data, and database tests
- Netlify and Vercel static deployment configuration
- Electron desktop wrapper for Windows

## Run locally

Requirements: Node.js 20.19+ (or 22.12+) and npm.

```powershell
npm install
npm run dev
```

Sign in at `/signin` by selecting one or more of the eight demo roles. The shared shell filters menus and supported actions against local permission grants; profile actions include settings, profile, and sign out. Toasts report demo sign-in/out results. Preview records for patients, appointments, care orders, lab/pharmacy inventory, inpatient beds/admissions/requests/checklists, and sample finance payments persist in browser `localStorage` and broadcast updates between tabs in the same browser profile. This is not a shared database: another device or browser profile will not see these changes. Role selections, local persistence, and hidden UI controls do not protect data or replace server-side authorization.

The Patients module demonstrates a 120-record synthetic insurance directory, coverage states, registration, and patient record tabs. Front Desk books appointments and checks in patients; Nursing records vitals and moves the encounter to the clinician queue. Clinical care supports resumable consultations, multiple coded diagnoses, lab requests, prescriptions, and result review. Laboratory processing deducts tracked stock and separates result entry from verification/return. Pharmacy separates prescription verification from dispensing; tracked stock is deducted once on dispensing. The app includes the 290 medicine entries present in the supplied NHIS tariff attachment; absence from the list does not establish that a medicine is unavailable. Each listed medicine has an explicitly labeled random GH₵5–30 synthetic test-only add-on, not an authoritative retail price and not for real billing. Laboratory tariffs and verified retail prices are not included in the attachment. Inventory items marked untracked do not deduct stock. Inpatient supports nurse admission requests, administrator bed assignment/discharge, nurse discharge checklists, and bed cleaning/ready states. Finance persists payments against a sample invoice ledger; it is not yet generated from consultation, lab, pharmacy, or inpatient charges. Navigation scrolls to the top when changing pages or patient records.

CLAIM-it-oriented fields follow the supplied schema shapes: diagnosis rows contain `gdrgCode`/`icd10`/`diagnosis`, investigations contain `serviceDate`/`gdrgCode`, and medicines contain `medicineCode`/`dispensedQty`/`serviceDate`/structured prescription details. The patient’s NHIS claims tab prefills demographics, the hospital record number, a valid 8/10-digit NHIS member number, and recorded dependant status from the patient record. It checks age-specific `MEDI`/`PAED` diagnoses and `A`/`C` procedure codes using the patient’s age on the service/procedure date. Missing or invalid member/dependant data must be corrected rather than inferred. The tab can validate a completed encounter and download locally generated XML only when required fields and code formats pass. The supplied guide includes schema examples, not the complete NHIA/NHIS code masters or authoritative test-to-GDRG mappings. Unmapped records are visibly marked and block export; schema validation cannot establish official catalog membership or claim acceptance. No XML is submitted to CLAIM-it and no credentials/API connection are configured.

Validated claim sheets now follow the supplied two-page NHIS paper-form layout. “Generate & save” stores the immutable claim snapshot and the exact generated XML in this browser’s local storage; the Claims dashboard can reopen the sheet, download its XML, and filter by generation month and year. A patient encounter can only be generated once; repeat attempts are skipped. This is a local preview archive, not shared between browsers/devices and not a production or multi-user claims database. Claims inputs are opened from a compact action rather than displayed inline.

The Claims dashboard shows an expected NHIS medicine-coverage estimate from saved tariffs and dispensed quantities. It intentionally excludes diagnosis and investigation G-DRG costs because authoritative service tariffs are not configured; it is not a full claim value or reimbursement guarantee. Claim sheets do not display the “Claim Form (Regulation 62)” heading.

Inpatient, Finance, and Reports are interactive frontend previews. Finance payments are persisted in this browser profile, but invoices remain illustrative samples and are not linked to actual consultation, lab, medication, procedure, or admission charges. Reports summarize synthetic/local preview data and offer CSV export; exports are not audited or production reports.

SMS can be drafted in the UI but is not sent; Arkesel and Supabase are not connected. Patient history without live session entries continues to show synthetic examples.

**Do not enter real patient information.** Demo sign-in is passwordless and local only. There is no Supabase data persistence, real identity, durable audit log, production authorization, claims submission, or Arkesel message sending. Some menu areas are explicit, non-operational placeholders; consult [the role dashboard audit](./docs/architecture/role-dashboard-audit.md) for implemented scope and remaining gaps.

## Validate and build

```powershell
npm run lint
npm run typecheck
npm run build
npm run preview
```

## Electron development

Start Vite in one terminal:

```powershell
npm run dev
```

Then start Electron in another:

```powershell
npm run electron:dev
```

Build a Windows installer with `npm run electron:package:win`. Packaging has not yet been validated on a clean Windows machine.

## Hosting

For Netlify, connect the GitHub repository; the included `netlify.toml` sets `npm run build` and `dist`.

For Vercel, import the GitHub repository; the included `vercel.json` configures the SPA fallback. The build output is `dist`.

Supabase is a separately configured backend. The browser build must contain only the project URL and publishable/anon key when Supabase integration is implemented. Never expose a service-role or secret key in frontend code.

## Supabase and production security

The `supabase/` directory is reserved for versioned SQL migrations, Edge Functions, seeds, and database tests. **The requested migration constraint is that no migration contain RLS.** This does not make an exposed patient-data database safe. Do not connect real patient records or deploy this as a production HMS until a reviewed, repeatable access-control design and tests have been agreed and implemented.

## Branding

The supplied source sheet is `public/m1-brand-assets.png`. Cropped variants in `public/brand/` provide the Ascend wordmarks, the HMS/stethoscope mark for browser and desktop icons, and the Windows ICO.

## Documentation

- [Architecture decisions](./docs/architecture/decisions.md)
- [Role dashboard audit and proposal](./docs/architecture/role-dashboard-audit.md)
- [Supabase project configuration](./supabase/config.toml)

Further module, database, workflow, privacy, deployment, testing, and screenshot documentation will be added as those milestones are implemented and verified.
