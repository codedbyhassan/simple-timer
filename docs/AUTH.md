# Local profiles and access

Ascend HMS does not provide remote authentication or a backend account service.

## How access works

- The first launch creates local staff profiles in IndexedDB.
- A user selects a profile from the sign-in screen.
- The selected profile determines the role-based navigation and frontend permissions.
- Administrators can create, edit, suspend and remove local profiles.
- At least one active hospital administrator profile must remain.
- Selecting a profile does not verify a person's identity and does not require a password.

## Security limitations

Local profiles are for interface demonstration and single-installation workflow evaluation only. They are not secure authentication. Anyone who can use the same browser profile or desktop installation may select a profile and access its locally stored records. Frontend permission checks can be bypassed by a technically capable user.

Do not use this application to store real patient information, credentials or other sensitive production data.

## Data recovery

Profiles are stored in the `local.profiles` IndexedDB document. Use Administration → Backup and restore to export or restore the complete local database. Keep backup files private; they are not encrypted by the application.
