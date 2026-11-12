# Clinic flow plan (owner brief, received during the build)

Desktop-only application. No mobile responsiveness and no mobile breakpoints.

Global
- Scroll to top on every route change. Page-level routes for detail views, no modals for patient details.
- Age validation wherever an item or rule is age-sensitive: block selection and submission when it does not apply.

Patient list
- Card view by default, no accent bar (the status badge is enough), no action buttons on cards, click opens the detail page.
- Status is insurance based: Insured, Non-Insured, Near Expiry. Stat cards for all three.
- Filters: search, insurance status, provider, age range, gender, department, date range and more.
- 4 cards per row, 50 patients per page.

Patient detail (own page, tabbed)
- Personal info, vitals, consultations, labs, drugs, procedures, billing and receipts, NHIS claims, plus appointments and documents.
- Edit, check-in and other actions live here.

Roles and flow
- Front desk: same shell as the admin dashboard. Check-in and appointments.
- Nurse: vitals after check-in, then consultation. Vitals also shown on the patient detail page.
- Doctor: multiple diagnoses, lab requests and prescriptions per consultation, chosen from dropdowns so claims map cleanly. Save and pause while waiting for results. Real-time lab feedback. Grid layout for the multiple entries.
- Pharmacy: receives prescriptions, tracked and untracked items, dispensing reduces tracked stock.
- Lab: receives orders, tracked and untracked items, real-time results back to the doctor.
- Claims: auto-fill from patient data, multiple diagnoses, labs and prescriptions propagate onto the XML. **No submit button.** Generate and validate only.
