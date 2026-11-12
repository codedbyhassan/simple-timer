# Ascend HMS

Ascend HMS is a frontend-only, local-first hospital workflow application by Ascend Technologies. It is built with React, Vite and Electron. It does not require a backend, Supabase project, API key or environment file.

## Operating model

- **IndexedDB is the source of truth** for operational records, local profiles, configuration, audit history and backup metadata.
- All role workspaces read and write the same local hospital dataset where their workflows overlap.
- Local profiles provide role-based navigation and frontend workflow restrictions. They are not secure authentication.
- Records are stored in the current browser profile or desktop installation. They do not synchronise between devices.
- A new installation starts with empty operational records. No sample patient, clinical, financial or inventory activity is presented as live data.
- Use Administration → Backup to export or restore the current local database.

This application is intended for frontend workflow demonstration and local evaluation. It is not a secure production clinical record system. Browser storage can be accessed by anyone with access to the same device profile, and local permission checks are not a security boundary.

## Quick start

```bash
npm install
npm run dev
```

No `.env` file is required. Select a local staff profile on the sign-in screen.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the web application |
| `npm run build:dev` | Build using the development Vite mode |
| `npm run preview` | Preview the production web build |
| `npm run lint` | Run ESLint |
| `npm run check:contrast` | Check defined colour-token contrast pairs |
| `npm run build:electron` | Build the Electron renderer |
| `npm run electron:dev` | Run the desktop application against Vite |
| `npm run electron:start` | Build and launch the desktop application |
| `npm run electron:pack` | Package a desktop installer |

## Local data and recovery

The IndexedDB database is named `ascend-hms-local`. It stores application documents in a versioned object store. Use the backup screen to export the complete local database to JSON or restore a compatible backup.

Exported backup files are not encrypted by the application. Protect them as sensitive files and do not store them in public or shared locations.

## Project structure

- `src/app` — routes, workspace pages and administration
- `src/core/access` — local role and permission mapping
- `src/core/auth` — local profile session handling
- `src/core/storage` — IndexedDB database, backup and local profile APIs
- `src/shared/design-system` — shared UI components, tokens and themes
- `electron` — desktop shell

See `docs/AUTH.md` for local profile limitations and `docs/VERIFY.md` for validation guidance.
