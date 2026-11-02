# Phase 4 fixes

Phase 4 standardizes role entry, global navigation, table density and time presentation while preserving the existing browser-preview architecture.

## Delivered

- [x] Toast notifications auto-dismiss after three seconds.
- [x] Signing in from `/signin` redirects to the selected role's home route and dispatches a location update so the dashboard renders immediately.
- [x] Removed the "Workspace ready" header status.
- [x] Removed break-glass from the header, role navigation, permission catalog, administrator review page, dialog and preview store.
- [x] Centered global patient search in the navbar while retaining right-aligned utility and profile actions.
- [x] Reduced front-desk, claims, inpatient, finance, reports and patient-history tables to four visible columns.
- [x] Added a per-row details disclosure for administrator workspace tables with more than four fields; action columns remain visible.
- [x] Standardized appointment, audit, report, clinical and claims timestamps to 12-hour time with AM/PM.
- [x] Added explicit AM/PM entry for appointment times and nursing task due times. Existing stored values remain in 24-hour format for sorting and compatibility.

## Validation and boundaries

- The role selector remains a demo preview, not staff authentication. Browser-local permissions are not a security boundary.
- Four-column layouts and row details require visual review at desktop, tablet and mobile widths.
- Automated lint, typecheck and production build must pass on the final commit. Manual browser interaction, accessibility and visual regression checks are not claimed by CI.
- Phase 2 workflow items not implemented by this phase remain tracked in `docs/phase-2-fixes.md`.
