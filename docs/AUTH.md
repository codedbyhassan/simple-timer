# Local profiles and access

Ascend HMS is a frontend-only, local-first application. It does not connect to Supabase or another backend.

## Profiles

- On first launch, the application creates one local demonstration profile for each supported staff role.
- Selecting a profile opens its workspace and applies the role's frontend navigation and permission map.
- The profile list is stored in IndexedDB on the current browser or desktop installation.
- Administrators can create, edit, suspend and remove local profiles from Administration → Users.

## Important limitations

Local profile selection is a workflow and demonstration aid, not secure authentication. Anyone with access to the same browser profile or desktop installation can potentially access local records. Frontend permission checks are not a security boundary.

There is no password reset, email invitation, remote identity provider, multi-user synchronisation or server-side authorisation.

## Local data

Operational records, profiles, configuration and audit records are stored in IndexedDB. Use Administration → Backup to export or restore the current installation's data. Exported JSON backups are not encrypted by the application; protect them as sensitive files.

## Development

No .env file is required. Run `npm run dev` and select a local staff profile.
