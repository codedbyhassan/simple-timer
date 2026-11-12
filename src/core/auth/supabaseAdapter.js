import { supabase } from './supabaseClient.js'
import { AuthFailure, normalizeAuthError } from './errors.js'

const RECOVERY_KEY = 'hms.recovery'
const store = {
  get: () => { try { return sessionStorage.getItem(RECOVERY_KEY) === '1' } catch { return false } },
  set: () => { try { sessionStorage.setItem(RECOVERY_KEY, '1') } catch { /* ignore */ } },
  clear: () => { try { sessionStorage.removeItem(RECOVERY_KEY) } catch { /* ignore */ } },
}

// Supabase removes the URL hash once it has read it, so capture any link error first.
const hash = new URLSearchParams((typeof window !== 'undefined' ? window.location.hash : '').replace(/^#/, ''))
const linkError = hash.get('error_code') || (hash.get('error') ? 'link_error' : null)

if (supabase) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') store.set()
    if (event === 'SIGNED_OUT') store.clear()
  })
}

const appUrl = () => {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL
  if (configured) return configured.replace(/\/$/, '')
  if (__HMS_TARGET__ === 'electron') throw new AuthFailure('not_configured')
  return window.location.origin
}

export const supabaseAuth = {
  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw normalizeAuthError(error)
    return data.session
  },
  onAuthChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session))
    return () => data.subscription.unsubscribe()
  },
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw normalizeAuthError(error)
    return data.user
  },
  async signOut() {
    store.clear()
    const { error } = await supabase.auth.signOut()
    if (error) throw normalizeAuthError(error)
  },
  async requestPasswordReset(email) {
    const redirectTo = `${appUrl()}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    if (error) throw normalizeAuthError(error)
  },
  async updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw normalizeAuthError(error)
    store.clear()
  },
  // Contract: api.my_access() returns { display_name, roles: [code], permissions: [code], department }.
  // The function is created in the database core migrations (milestone M3).
  async getAccess() {
    const { data, error } = await supabase.rpc('my_access')
    if (error) throw new Error(error.message)
    return {
      displayName: data?.display_name || '',
      roles: data?.roles || [],
      permissions: data?.permissions || [],
      department: data?.department || '',
    }
  },
  isRecovery: store.get,
  initialLinkError: () => linkError,
  // Resolves true once Supabase has turned the email link into a recovery session, false after a timeout.
  waitForRecovery(timeout = 5000) {
    if (linkError) return Promise.resolve(false)
    return new Promise((resolve) => {
      const started = Date.now()
      const tick = () => {
        if (store.get()) return resolve(true)
        if (Date.now() - started > timeout) return resolve(false)
        setTimeout(tick, 100)
      }
      tick()
    })
  },
}
