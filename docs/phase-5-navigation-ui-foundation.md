# Phase 5 — Navigation and UI foundation

## Implemented on main

- Added a dedicated Hospital Administrator **Refund approvals** menu entry guarded by `cashier.refund.approve`.
- Reused the existing refund review workflow for the new administrator route rather than duplicating refund logic.
- Added `refund-approvals` as a registered workspace page alias.
- Granted the Lab role `lab.catalogue.manage` by default so the existing Test catalogue menu is visible.
- Added a version-4 preview permission migration so existing browser profiles receive the Lab catalogue grant and retain the Hospital Administrator refund-approval grant.
- Changed the Pharmacy **Dispensing panel** menu to require `pharmacy.dispense`, instead of only queue visibility.
- Changed the Cashier **Payment panel & receipts** menu to require `cashier.payment.record`, instead of only charge visibility.
- Introduced shared typography, spacing and radius tokens in the global stylesheet, and applied the shared font token to core application and role-workspace styles.

## Deliberately not represented as complete

The following require dedicated workflow implementation and/or durable backend support. The current preview data model is not enough to claim production functionality:

- Seven role-specific overview dashboards beyond the existing Management Dashboard.
- Dedicated claims pipeline, mapping queue, export batch manager, import reports and monthly progress.
- Dedicated laboratory specimen register, critical-result inbox and editable test catalogue.
- Dedicated pharmacy stock ledger, batch/lot tracking, expiry management and mapping queue.
- Separate cashier payment history and receipt register/reprint workflow.
- Actual user account lifecycle management and facility configuration.
- Server-backed notifications, audit events, synchronization monitoring and remote backup management.
- Global search across all record types.

## Design-system follow-up

The token layer is a foundation, not a completed visual redesign. The application still uses a system font fallback stack and does not bundle a web font. Module-specific CSS still contains independent font sizes, colors, radii and control styles. A follow-up pass should consolidate the shared components and validate light/dark themes at 360, 390, 430, 768, 1024, 1280, 1440 and 1920px.

## Validation boundary

GitHub Actions runs lint, typecheck and production build. These checks do not replace browser walkthroughs, screen-reader testing, responsive visual review or workflow acceptance testing. The preview role selector and localStorage permissions are not an authentication or authorization security boundary.
