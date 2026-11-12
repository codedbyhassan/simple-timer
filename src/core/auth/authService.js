import { isSupabaseConfigured } from './supabaseClient.js'
import { supabaseAuth } from './supabaseAdapter.js'

// The demo adapter only exists in development. In a production build `import.meta.env.DEV` is false,
// so this branch and the demo credentials are removed from the bundle.
const demo = import.meta.env.DEV && !isSupabaseConfigured ? (await import('./demoAdapter.js')).demoAuth : null

export const authMode = isSupabaseConfigured ? 'supabase' : demo ? 'demo' : 'unconfigured'
export const authService = isSupabaseConfigured ? supabaseAuth : demo
