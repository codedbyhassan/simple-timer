import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && key)

// Only the browser-safe anon key is ever used here. The service role key never enters this app.
export const supabase = isSupabaseConfigured
  ? createClient(url, key, {
      // Only the api schema is exposed (docs/ARCHITECTURE_DECISIONS.md), so every call goes there.
      db: { schema: 'api' },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The desktop app uses hash routing, so it must not parse the URL hash as a session.
        detectSessionInUrl: __HMS_TARGET__ !== 'electron',
        flowType: 'implicit',
      },
    })
  : null
