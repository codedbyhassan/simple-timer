import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const ROLES = ['reception', 'nurse', 'doctor', 'lab', 'pharmacy', 'cashier', 'claims', 'hospital-admin']
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    if (userError || !userData.user) return json({ error: 'Not signed in.' }, 401)
    const caller = userData.user
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: caller.id, _role: 'hospital-admin' })
    if (!isAdmin) return json({ error: 'Only hospital administrators can manage staff.' }, 403)
    const { data: callerProfile } = await admin.from('profiles').select('full_name').eq('id', caller.id).single()
    const audit = (action: string, detail: string, target_id: string | null) =>
      admin.from('audit_logs').insert({ actor_id: caller.id, actor_name: callerProfile?.full_name || caller.email, action, detail, target_id })

    const body = await req.json()
    const { action } = body

    if (action === 'create') {
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      const fullName = String(body.fullName || '').trim()
      const staffId = String(body.staffId || '').trim().toUpperCase()
      const role = String(body.role || '')
      if (!email || !fullName || !staffId || !ROLES.includes(role)) return json({ error: 'Name, email, staff ID and a valid role are required.' }, 400)
      if (password.length < 8) return json({ error: 'Initial password must be at least 8 characters.' }, 400)
      const { data: dup } = await admin.from('profiles').select('id').eq('staff_id', staffId).maybeSingle()
      if (dup) return json({ error: 'That staff ID is already in use.' }, 409)
      const { data: created, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: fullName, staff_id: staffId, department: body.department || '', phone: body.phone || '' },
        app_metadata: { provisioned: true },
      })
      if (error || !created.user) return json({ error: error?.message || 'Could not create the account.' }, 400)
      await admin.from('user_roles').insert({ user_id: created.user.id, role })
      await admin.from('profiles').update({ must_change_password: true }).eq('id', created.user.id)
      await audit('Staff account created', `${fullName} (${staffId}) · ${role}`, created.user.id)
      return json({ id: created.user.id })
    }

    const userId = String(body.userId || '')
    if (!userId) return json({ error: 'Missing staff member.' }, 400)

    if (action === 'reset_password') {
      const password = String(body.password || '')
      if (password.length < 8) return json({ error: 'Temporary password must be at least 8 characters.' }, 400)
      const { error } = await admin.auth.admin.updateUserById(userId, { password })
      if (error) return json({ error: error.message }, 400)
      await admin.from('profiles').update({ must_change_password: true, updated_at: new Date().toISOString() }).eq('id', userId)
      await audit('Temporary password issued', 'Staff must change it at next sign-in', userId)
      return json({ ok: true })
    }

    if (action === 'set_role') {
      const role = String(body.role || '')
      if (!ROLES.includes(role)) return json({ error: 'Invalid role.' }, 400)
      if (userId === caller.id && role !== 'hospital-admin') return json({ error: 'You cannot remove your own administrator role.' }, 400)
      await admin.from('user_roles').delete().eq('user_id', userId)
      await admin.from('user_roles').insert({ user_id: userId, role })
      await audit('Staff role changed', role, userId)
      return json({ ok: true })
    }

    if (action === 'set_status') {
      const status = String(body.status || '')
      if (!['Active', 'Suspended', 'On leave'].includes(status)) return json({ error: 'Invalid status.' }, 400)
      if (userId === caller.id && status !== 'Active') return json({ error: 'You cannot suspend your own account.' }, 400)
      await admin.auth.admin.updateUserById(userId, { ban_duration: status === 'Suspended' ? '876000h' : 'none' })
      await admin.from('profiles').update({ status, updated_at: new Date().toISOString() }).eq('id', userId)
      await audit('Staff status changed', status, userId)
      return json({ ok: true })
    }

    return json({ error: 'Unknown action.' }, 400)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
