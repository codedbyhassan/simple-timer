# Architecture decisions

Ascend HMS is a frontend-only, local-first application. It has no backend, API service, hosted database or remote authentication dependency.

## Core decisions

- Plain JavaScript and JSX with React and Vite.
- IndexedDB is the authoritative store for operational records, local profiles, facility settings, service prices, claims mappings, notifications and audit history.
- All role workspaces share a versioned hospital workspace document for records that cross workflow boundaries.
- Separate IndexedDB documents hold local profile data, facility configuration, hospital settings, notifications and audit history.
- Workspace updates merge changed records by ID to reduce lost updates between tabs on the same installation.
- Local profile selection applies role-specific navigation and frontend permissions. It is not secure authentication and is not an authorisation boundary.
- Browser and Electron installations have independent local databases. There is no device-to-device synchronisation.
- Export and restore use a versioned JSON archive of the IndexedDB documents.
- No operational sample records are seeded. New installations start empty.
- The design system remains shared through `@ui`, CSS tokens and common templates.

## Data ownership

| Data | IndexedDB key |
|---|---|
| Shared clinical and operational workspace | `hospital.workspace.v2` |
| Local staff profiles | `local.profiles` |
| Active local profile | `local.session` |
| Facility departments and other admin collections | `admin.*` |
| Hospital profile | `admin.hospital-profile` |
| Operating preferences | `admin.settings` |
| Notifications | `local.notifications` |
| Audit history | `admin.audit` |

## Explicit limitations

- Local profiles do not verify identity or protect data from another person using the same browser or desktop profile.
- Browser-local data is not synchronised, backed up automatically or encrypted by the application.
- Frontend role checks can be bypassed by a technically capable user.
- Local payment and claim records are demonstrations of interface workflows, not payment settlement or NHIA submission.
- The application is not a production-safe electronic medical record system.

## Interface principles

- No fabricated operational metrics or seeded patient activity.
- Empty states explain how to create the first record.
- Settings must state when a value is stored but not yet consumed by a workflow.
- Destructive actions require confirmation.
- Responsive layouts support 320px, 680px, 1024px and wider screens.
- Shared UI components use semantic HTML, keyboard focus and status labels.
