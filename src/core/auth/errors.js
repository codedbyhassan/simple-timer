// One error type for everything the auth layer can fail with, and plain wording for each kind.
export class AuthFailure extends Error {
  constructor(kind, message) {
    super(message || kind)
    this.name = 'AuthFailure'
    this.kind = kind
  }
}

const WORDING = {
  invalid_credentials: { title: 'Could not sign in', message: 'The email or password is incorrect.' },
  rate_limited: { title: 'Too many attempts', message: 'Wait a minute, then try again.' },
  network: { title: 'No connection', message: 'The server could not be reached. Check your internet connection and try again.' },
  disabled: { title: 'Account disabled', message: 'This account is turned off. Contact your hospital administrator.' },
  unconfirmed: { title: 'Email not confirmed', message: 'Confirm your email address first, or ask your administrator to do it.' },
  weak_password: { title: 'Password too weak', message: 'Choose a longer password with a mix of letters and numbers.' },
  same_password: { title: 'Choose a different password', message: 'The new password must be different from your current one.' },
  expired_link: { title: 'Link expired', message: 'This reset link is no longer valid. Request a new one.' },
  not_configured: { title: 'Setup needed', message: 'The public app address is not set for this installation. Contact your administrator.' },
  unknown: { title: 'Something went wrong', message: 'Try again. If it keeps happening, contact your hospital administrator.' },
}

export const describeAuthError = (err) => WORDING[err?.kind] || WORDING.unknown

// Turns whatever Supabase (or the network) throws into an AuthFailure.
export function normalizeAuthError(err) {
  if (err instanceof AuthFailure) return err
  const code = err?.code || ''
  const msg = String(err?.message || '')
  const status = err?.status
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) return new AuthFailure('invalid_credentials', msg)
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || status === 429) return new AuthFailure('rate_limited', msg)
  if (code === 'email_not_confirmed') return new AuthFailure('unconfirmed', msg)
  if (code === 'user_banned') return new AuthFailure('disabled', msg)
  if (code === 'weak_password') return new AuthFailure('weak_password', msg)
  if (code === 'same_password') return new AuthFailure('same_password', msg)
  if (code === 'otp_expired') return new AuthFailure('expired_link', msg)
  if (err?.name === 'AuthRetryableFetchError' || status === 0 || /failed to fetch|network/i.test(msg)) return new AuthFailure('network', msg)
  return new AuthFailure('unknown', msg)
}
