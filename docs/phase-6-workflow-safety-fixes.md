# Phase 6 — Workflow safety and permission remediation

Branch: `main`

This phase begins implementation of the findings in [the end-to-end workflow audit](./architecture/end-to-end-workflow-audit.md). It is an incremental remediation record, not a declaration that the application is production-ready.

## Implemented

| Finding | Change | Verification |
|---|---|---|
| Opening a consultation automatically marked every ready lab result reviewed | Removed the mutation from visit opening. Each ready investigation now has an explicit **Mark reviewed** action, visible only with `clinical.results.review`. The encounter leaves `Awaiting results` only after every associated result is ready and explicitly reviewed. | CI run [41594231347](https://github.com/codedbyhassan/simple-timer/actions/runs/41594231347) passed. |
| Active clinical work disappeared after its appointment date | Doctor, consultation and results queues no longer expire active work at midnight. Queue eligibility is based on active encounter state, not the appointment's calendar date. | CI run [41594368411](https://github.com/codedbyhassan/simple-timer/actions/runs/41594368411) passed. |
| Synthetic medicine prices could appear as retail prices | Removed random retail top-ups from the pharmacy seed catalogue. New seeded items have no retail price until configured. | CI run [41594216451](https://github.com/codedbyhassan/simple-timer/actions/runs/41594216451) passed. |
| Existing synthetic test prices could still enter billing | Legacy prescriptions carrying `pricingMode: synthetic-test` now return a non-billable result with no retail total or patient due. | CI run [41594307399](https://github.com/codedbyhassan/simple-timer/actions/runs/41594307399) passed. |
| Till view permission also enabled opening and closing shifts | Added `cashier.shift.manage`. Viewing a till, recording payments, and opening/closing shifts are now distinct permission checks. The cashier role receives the new manage permission by default. | CI run [41594547970](https://github.com/codedbyhassan/simple-timer/actions/runs/41594547970) passed; role permission regression test added. |
| Refund request UI did not enforce its request permission | Refund creation is now hidden and guarded unless `cashier.refund.request` is present. Approval is guarded by `cashier.refund.approve`, and only requested items can be decided. | CI run [41594533924](https://github.com/codedbyhassan/simple-timer/actions/runs/41594533924) passed. |

## Remaining high-priority remediation

1. **Replace the split finance/till paths with one transaction ledger.** Define charge, invoice, allocation, payment, receipt, refund and insurer responsibility as linked records. Use integer pesewas, atomic writes, idempotency keys and immutable receipt references. Do not attempt to reconcile two local stores by UI-only copying.
2. **Move identity, authorization and patient data to a trusted backend.** The current role picker and browser stores remain a local preview model. Production access requires authenticated staff identities, tenant/hospital scoping, server-side authorization and database row-level security. Frontend permission checks are not a security boundary.
3. **Build a proper critical-result lifecycle.** Capture acknowledgement by a responsible clinician, recipient, contact attempt, escalation, action and closure; do not treat ordinary result review as critical-result acknowledgement.
4. **Complete specimen and laboratory inventory lifecycle.** Model collection, receipt, rejection, recollection, accession, processing and cancellation. Stock consumption and reversal must follow confirmed performed tests.
5. **Unify claims mappings and clinical code masters.** Make effective-dated, versioned G-DRG/NHIS/medicine/procedure mappings the authoritative source. Add procedure records and complete required claim fields before export.
6. **Separate consultation completion from overall visit closure.** Pharmacy, billing, payment and claims must not be implied complete merely because the clinician saved a completed consultation.
7. **Reconcile Patient 360 with the finance ledger.** Show actual invoices, allocations, receipts, insurer balances, refunds and claim status from the same authoritative records.
8. **Add end-to-end tests for role handoffs.** Cover reception → nursing → consultation → lab → clinician review → pharmacy → cashier → claims, including permissions, rejected specimens, partial payments, refunds and retries.

## Verification boundary

The linked CI runs verify lint, automated tests, type checking and production build. They do not prove live-browser workflow correctness, clinical safety, multi-user concurrency, backend authorization or production data integrity. These changes continue to operate within the existing browser-preview architecture until the backend migration is implemented.
