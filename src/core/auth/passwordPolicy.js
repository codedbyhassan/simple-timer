// The hospital's password policy is an open item (docs/VERIFY.md). Change it here, once.
export const MIN_PASSWORD_LENGTH = 8

export const passwordChecks = (password, confirm) => [
  { id: 'length', label: `At least ${MIN_PASSWORD_LENGTH} characters`, met: password.length >= MIN_PASSWORD_LENGTH },
  { id: 'match', label: 'Both passwords match', met: password.length > 0 && password === confirm },
]

export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
