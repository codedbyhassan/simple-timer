import { localAuth } from './localAuth.js'

// Ascend HMS is intentionally a local-first frontend. No remote authentication provider is loaded.
export const authMode = 'local'
export const authService = localAuth
