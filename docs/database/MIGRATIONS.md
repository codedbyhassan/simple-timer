# Database migrations

Run in file order. The last file, `99990101000000_seal_security.sql`, is the seal and must always be last.

| File | What it does | Tables |
|---|---|---|
| `…0001_extensions_roles_schemas` | Extensions, the restricted function owner `hms_definer`, the 15 schemas, privilege lockdown (functions are no longer executable by PUBLIC by default) | none |
| `…0002_identity` | Staff, roles, permissions, department assignment, elevated grants, care relationships, break-glass. Seeds the permission catalogue, 15 system roles and the role-permission mapping. Last administrator guard | 10 |
| `…0003_core` | Hospital profile (one row), departments, locations, service catalogue and prices (no overlapping prices), ICD-10 reference, CLAIM-it specialties, documents index, id counters, idempotency keys, work claims, notifications, settings, realtime latency samples | 14 |
| `…0004_core_functions` | Row triggers (updated_at, updated_by, row_version), append-only and no-delete guards, notifications that never break a transaction, idempotency, work claims, housekeeping | 0 |
| `…0005_identity_functions` | `has_permission`, `require_permission`, `in_department`, `bootstrap_admin`, `api.my_access` | 0 |
| `…0006_audit` | Append-only `audit.events` and `audit.access_log`, notification and work-claim api functions, typed audited `api.update_setting` | 2 |
| `99990101…_seal_security` | RLS enabled and forced on every table, all policies, every grant to the API, and a final check that refuses to finish if anything is open | 0 |

## The rule

No file except the seal contains row level security, a policy, or a grant to `anon`, `authenticated`, `service_role` or `public`. `tests/check_migrations.sh` fails the build if one does. When a later milestone adds a table or an api function, its policy and grant go into the seal file.

## Choices that differ from the blueprint

| Blueprint | Built | Why |
|---|---|---|
| `identity.current_staff_id()` is a plain invoker function | It is a definer function | Row policies and triggers run as the signed-in person, who cannot read identity tables |
| Functions use `auth.uid()` | They use `identity.jwt_subject()`, which reads the same request settings | The restricted owner role then needs no privilege on the `auth` schema, which a hosted project may not allow granting |
| `api_reader` role | Not created | Signed-in staff use the standard `authenticated` role. A second read role had no job |
| Grants in each migration | Plumbing grants to `hms_definer` stay in each migration. Everything that reaches the API is in the seal | Owner decision: nothing is exposed until the seal |
| Views are `security_invoker` and the schemas are not usable | Signed-in staff can use `identity`, `core` and `audit` and read the policy-covered tables | Invoker views read the tables as the caller. The Data API must expose only the `api` schema, set in the dashboard (see `DEPLOYMENT.md`) |
| `update_setting` publishes through `encounters.record_event` | It writes the audit event directly for now | `record_event` arrives with the encounters migration, which will replace the function |

## Custom error codes

`HMS01` idempotency key reused with a different request. `HMS02` work item held by someone else.

## Tests

`npm run db:test` builds a scratch database, applies the shim and every migration, and runs the SQL tests. Last run: `TEST_RESULTS.txt`. The tests run as the real roles (`anon`, `authenticated`) with a request token, inside transactions that roll back.

Not yet covered by tests (the machinery exists, tests are the next step): id generation concurrency, idempotent retries under parallel load, work claim leases, notifications and realtime fan-out, audit append-only guarantees and `api.update_setting`.
