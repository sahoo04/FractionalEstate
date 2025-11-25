import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Supabase client for client-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Only validate in production or when actually using
const isConfigured = supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'your_project_url_here' && 
  supabaseAnonKey !== 'your_anon_key_here'

export const supabase = isConfigured 
  ? createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

// Supabase client for server-side operations (with service role key)
export const supabaseAdmin = isConfigured
  ? createSupabaseClient<Database>(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )
  : null

// Helper function to create client (returns admin client for API routes)
export function createClient() {
  return supabaseAdmin
}
