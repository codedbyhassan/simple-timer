# Phase 2 fixes

Phase 2 focuses on operational workflows and restrained interface refinement. The existing visual identity and browser-preview limitations are preserved.

## Delivered

- [x] Cashier till supports partial payments against a charge balance.
- [x] Prevents a payment from exceeding the outstanding balance.
- [x] Calculates remaining balances across recorded till payments instead of treating any prior payment as full settlement.
- [x] Adds unique receipt references and downloadable text receipts for till payments.
- [x] Refines dashboard metric cards, patient cards, clinical and department cards, and workspace panels with simpler spacing and quieter surfaces.
- [x] Reduces toast dimensions while preserving the current appearance and sets automatic dismissal to three seconds.

## Remaining Phase 2 workflow scope

- [ ] Appointment lifecycle validation, duplicate booking protection, rescheduling and cancellation handling.
- [ ] Nursing task/MAR linkage, due-time handling and administration audit trail.
- [ ] Laboratory specimen identifiers, collection/receipt states and catalogue validation.
- [ ] Pharmacy stock movement ledger, batch/lot and expiry tracking, and receiving/dispensing reconciliation.
- [ ] Ward and bed configuration instead of fixed demo ward definitions.
- [ ] Receipt persistence and invoice integration, payment-method reconciliation and supervisor review.
- [ ] Claims code-mapping validation, import/export reconciliation and clear submission-state tracking.

## Preview limitation

The application currently uses browser-local stores. These improvements strengthen the preview workflows but do not create shared, server-authoritative financial or clinical records. Production use still requires authenticated server-side authorization, durable database transactions and audited APIs.
