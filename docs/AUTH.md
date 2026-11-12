# Authentication

Screens: `/signin`, `/forgot-password`, `/reset-password`. Staff accounts are created by an administrator (no public sign up).

## Supabase dashboard settings (Authentication)

1. **Sign ups**: turn off "Allow new users to sign up". Create staff from the admin console (Edge Function, milestone M4).
2. **URL configuration**: set the Site URL to the deployed address. Add `https://YOUR-DOMAIN/reset-password` to Redirect URLs. Add `http://localhost:5173/reset-password` for development.
3. **Email**: the built-in sender is rate limited and for testing only. Configure custom SMTP before go-live.
4. **Reset email template**: keep the `{{ .ConfirmationURL }}` link.
5. **Password length**: set the minimum in the dashboard to match `MIN_PASSWORD_LENGTH` in `src/core/auth/passwordPolicy.js`.

## Environment

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_PUBLIC_APP_URL` (see `.env.example`). The desktop build needs `VITE_PUBLIC_APP_URL` because reset links must open in a browser, not in the app window.

## Behaviour worth knowing

- The reset screen says the same thing whether or not an email exists, so it cannot be used to find out who has an account.
- A reset link signs the person in. Until they choose a new password the app keeps them on the reset page.
- After the password is updated the session is closed and the person signs in again.
- Without Supabase settings, `npm run dev` uses a demo backend (`demo@ascend.test` / `Ascend#2026`). It is removed from production builds. A production build with no settings shows a setup notice instead.

## Tests

`tests/e2e/auth_flows.py` (Playwright, 39 checks) covers validation, error wording, toast position and dismissal, show and hide password, keyboard order, session persistence, the forgot and reset flows, expired links and dark mode. `npm run check:contrast` checks WCAG contrast for every text and surface pair in both themes.
