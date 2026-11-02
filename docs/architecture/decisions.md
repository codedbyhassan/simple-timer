# Architecture decisions

## Project baseline

- Product: Ascend HMS, a single-hospital management system for one physical location.
- Architecture: modular monolith backed by Supabase and PostgreSQL.
- Web client: React, JavaScript, JSX, Vite, and plain CSS. TypeScript and Tailwind are intentionally not used.
- Desktop client: Electron wrapping the same built web application.
- Web hosting: Netlify and Vercel configuration is included.
- Connectivity: online-first; offline behavior will be limited to workflows that can be reconciled safely.
- Expected capacity: design for a 500+ staff-user installation; performance targets still require representative load testing.

## Database security and the migration constraint

The project owner explicitly requires that **no migration contain RLS statements**. This is recorded as a release constraint, not as evidence that the database is secure.

No patient data may be connected and no production-readiness claim may be made until a separately reviewed, repeatable database access-control design is approved and verified. Supabase service-role or secret keys must never be shipped to a browser or desktop renderer. The required security controls, access tests, and deployment procedure must be resolved before real patient records are used.

## Interface direction

- Use the supplied Ascend HMS brand sheet and the extracted HMS/stethoscope mark.
- Light mode uses white surfaces; dark mode uses near-black surfaces.
- Hospital blue carries useful meaning in data and primary actions, not decorative chrome.
- Patient, appointment, and operational data shown before backend integration are labelled as sample/demo data.
- The application header keeps notifications, theme control, and the profile menu (Profile, Settings, Log out) accessible.
- No remote font or analytics request is required by the interface foundation.

## Deployment boundaries

- Supabase schema changes, functions, and secrets are managed separately from the Vite hosting build.
- Netlify and Vercel serve only the client build; they do not replace Supabase.
- Electron disables Node integration and enables context isolation and sandboxing in its renderer.
- Integration credentials, including future Arkesel SMS credentials, belong in trusted server-side Supabase functions, never in the frontend.
