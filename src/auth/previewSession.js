// Staff session backed by Lovable Cloud auth. Keeps the original export names so App wiring stays stable.
import { supabase } from '../integrations/supabase/client.ts'
import { roleDefinitions } from '../access/roleAccess.js'

const listeners = new Set()
let snapshot // undefined = still loading, null = signed out
let realtimeChannel = null

function notify(next) {
  snapshot = next
  listeners.forEach((listener) => listener())
}

async function loadStaff(user) {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', user.id),
  ])
  const known = new Set(roleDefinitions.map((role) => role.id))
  const roleIds = (roles || []).map((row) => row.role).filter((role) => known.has(role)).slice(0, 1)
  return {
    id: user.id,
    email: user.email || '',
    displayName: profile?.full_name || user.email || 'Staff member',
    staffId: profile?.staff_id || '',
    department: profile?.department || '',
    status: profile?.status || 'Active',
    mustChangePassword: Boolean(profile?.must_change_password),
    roleIds,
  }
}

function watchOwnRecords(userId) {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel)
  const refresh = async () => {
    const { data } = await supabase.auth.getUser()
    if (data.user) notify(await loadStaff(data.user))
  }
  realtimeChannel = supabase
    .channel(`own-staff-${userId}-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles', filter: `user_id=eq.${userId}` }, refresh)
    .subscribe()
}

async function applyUser(user) {
  if (!user) {
    if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null }
    notify(null)
    return
  }
  try {
    notify(await loadStaff(user))
    watchOwnRecords(user.id)
  } catch (error) {
    console.error('Could not load staff profile.', error)
    notify(null)
  }
}

if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED') return
    // Defer DB calls out of the auth callback.
    setTimeout(() => applyUser(session?.user || null), 0)
  })
  supabase.auth.getUser().then(({ data }) => applyUser(data.user || null)).catch(() => notify(null))
}

export const getPreviewSession = () => snapshot
export function subscribeToPreviewSession(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email or password is incorrect.' : error.message)
  await supabase.rpc('touch_sign_in')
  return data.user
}

export async function setupFirstAdmin({ email, password, fullName }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(), password,
    options: { emailRedirectTo: window.location.origin, data: { full_name: fullName.trim() } },
  })
  if (error) throw new Error(error.message)
  return { needsConfirmation: !data.session }
}

export async function changePassword(currentPassword, newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword, current_password: currentPassword })
  if (error) throw new Error(error.message)
  await supabase.rpc('mark_password_changed')
  const { data } = await supabase.auth.getUser()
  if (data.user) notify(await loadStaff(data.user))
}

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
  if (error) throw new Error(error.message)
}

export async function signOutOfPreview() {
  await supabase.auth.signOut()
}
