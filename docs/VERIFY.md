# Frontend verification checklist

This project has no backend. Validation focuses on the local browser/Electron experience and IndexedDB persistence.

## Build and static checks

- [ ] `npm ci` completes using the committed lockfile.
- [ ] `npm run lint` completes without errors or warnings.
- [ ] `npm run build` completes.
- [ ] `npm run build:dev` completes.
- [ ] `npm run check:contrast` completes.
- [ ] Electron renderer build completes.

## First-run behaviour

- [ ] A clean browser profile opens the workspace selector.
- [ ] All eight main workspace cards appear when all corresponding role profiles are active.
- [ ] Reception, Nursing, Pharmacy, Finance and Administration open role-dashboard cards when multiple roles are active.
- [ ] Doctor, Laboratory and Claims route directly to their single-role dashboards.
- [ ] Inactive roles and workspaces without active roles are not offered.
- [ ] No network or environment configuration is required.
- [ ] A first-run database is created in IndexedDB.
- [ ] Each role receives only its configured workspace navigation.
- [ ] Empty operational screens show an actionable empty state, not invented records.

## Persistence and data integrity

- [ ] Reload preserves local role profiles, selected profile, theme and sidebar preference.
- [ ] Reload preserves patient, appointment, encounter, clinical, laboratory, pharmacy, inventory, cashier and claims records.
- [ ] Two tabs on the same browser profile receive IndexedDB updates.
- [ ] Concurrent edits to different records do not overwrite unrelated changes.
- [ ] Invalid or unavailable IndexedDB produces a clear recovery message.
- [ ] A JSON backup exports all local documents.
- [ ] A compatible backup restores the complete local database.
- [ ] Invalid backup files are rejected without clearing existing data.

## Workflow verification

- [ ] Reception registration creates a patient record.
- [ ] Appointment check-in creates or updates an encounter.
- [ ] Nursing triage updates the encounter visible to the doctor.
- [ ] Consultation creates laboratory orders and prescriptions.
- [ ] Laboratory specimen and result changes appear in the doctor results view.
- [ ] Pharmacy dispensing updates prescription status and stock.
- [ ] Finance charges and payments update local balances and receipts.
- [ ] Refund requests appear in the administration approval queue.
- [ ] Claims mappings are shared between administration and claims preparation.
- [ ] Ward and bed records are shared between administration and nursing.
- [ ] Audit history records local operational and configuration changes.

## Responsive and accessibility verification

Test at 320px, 375px, 680px, 768px, 1024px, 1280px, 1440px and 1920px.

- [ ] No page-level horizontal overflow.
- [ ] Tables have contained horizontal scrolling when required.
- [ ] Navigation remains usable on touch screens.
- [ ] Dialogs fit within the viewport and restore focus.
- [ ] Keyboard-only operation is possible.
- [ ] Focus indicators remain visible in both themes.
- [ ] Forms expose labels, required state and inline validation.
- [ ] Empty, loading, error and success states are present.

## Security and intended use

Local profiles and browser-side permission checks are not secure authentication. Anyone with access to the same browser profile or desktop installation may access local records. This frontend is not suitable for storing real patient data or processing real payments without a separate security and compliance review.

## Browser smoke test

Install Playwright and Chromium once:

```bash
python -m pip install playwright
python -m playwright install chromium
```

Start the Vite server in one terminal:

```bash
npm run dev -- --host 127.0.0.1 --port 5199
```

Run the local-first browser checks in another terminal:

```bash
python tests/e2e/shell_flows.py
```

The CI workflow runs these checks in Chromium after lint, contrast and production/development builds.
