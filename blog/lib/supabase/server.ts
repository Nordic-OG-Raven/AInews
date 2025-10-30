import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client for Edge Runtime (Cloudflare Workers)
 * Uses simple auth without cookie handling
 */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    }
  )
}

