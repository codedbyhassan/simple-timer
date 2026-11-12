# Architecture decisions

Decisions for this build. Where the supplied specs (architecture v1.0 and v1.1, database blueprint, dashboard spec, design system spec) conflict with an owner instruction, the owner instruction wins and the change is recorded here.

## Owner overrides of the specs

| Spec said | Owner decision | Effect |
|---|---|---|
| TypeScript | Plain JavaScript and JSX | No `.ts` or `.tsx` in the app. JSDoc for shapes. Edge Functions are written as plain JS inside `index.ts` so they paste into the Supabase dashboard editor. |
| Tailwind, Radix, CVA, Storybook | No Tailwind. Straight CSS and JS | Design tokens are CSS variables. Components take variant props. A built-in component gallery page replaces Storybook. |
| Teal-green brand | White (light), black (dark), blue accents | Blue drives actions, active navigation, focus rings, links, charts and the hero banner. Status colours stay semantic. |
| RLS and grants spread across migrations | No RLS in any migration except the last | The final seal migration holds RLS enable and force, every policy, the `realtime.messages` policy and all grants. |
| Deployment | Everything deployed from the Supabase dashboard | `supabase/all_migrations.sql` is generated in order for pasting. Edge Functions are single self-contained files. |

## Carried over from the specs (approved)

- Single hospital, no tenancy.
- Modular monolith. One PostgreSQL database with domain-owned schemas.
- Only the `api` schema is exposed. Writes go through `api` functions. The actor is always `auth.uid()`.
- Encounter state machine with all status changes through one transition function.
- Realtime through Broadcast with a 5 second polling safety net. Payloads carry identifiers only.
- Claims are built from data already in the database and exported as CLAIM-it XML v2.1.
- Dashboards never call each other. They read the database and are notified by realtime.
- `@ui` is the only import path for UI. Modules contain no colours, radii or shadows of their own.

## Phase 1 scope (this zip)

Schemas: identity, core, patients, encounters, clinical, nursing, laboratory, pharmacy, inventory, finance, insurance, audit, integration, api.
Dashboards: Admin console, Reception, Patient 360, OPD queue, Triage, Doctor workspace, Laboratory, Pharmacy, Inventory, Cashier, Claims office, Management.
Extra module: patient SMS through Arkesel for the front desk.
Later (not in this zip): emergency, radiology, theatre, maternity, HR. The ward and bed board, admissions and discharge checklist moved into scope with the role workspaces (see `product/ROLE_WORKSPACES.md`).

## Later owner decisions

| Decision | Effect |
|---|---|
| Desktop only, no mobile layouts | No mobile breakpoints anywhere. Electron minimum window is 1280 by 720. |
| Claims are generate and validate only | No submit button and no ClaimIt submission client. The XML is exported as a file. The openapi stays in `docs/claims` for reference. |
| Auth screens | Sign in, forgot password and reset password only. No public sign up: accounts are created by an administrator. |
| Active navigation item | Filled with the accent blue (spec had a black pill). Blue is meant to be visible in the product, and navigation is where it is used most evenly. |
| Navigation | Eight role workspaces, each with its own menus (`product/ROLE_WORKSPACES.md`), replacing the flat list of dashboards. A workspace switcher appears for people with more than one role. |
| Type | Plus Jakarta Sans for titles and numbers, Manrope for everything else, bundled with the app (no network needed on the desktop). Nothing heavier than 600. Body text 14 px, page titles 26 px. Soft grouped canvas with white cards, in the style of Apple's grouped lists. |
| Reference elements | Metric cards, pill bar chart, gauge, segmented and stripe bars, heat grid and ranked list (HR reference), ticket receipt with a scannable Code 39 barcode, profile-style patient cards, folder tiles with an info panel. Gallery at `/design-system` (administrators). |
