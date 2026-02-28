// Client-side Supabase — utilisable dans les Client Components
import { createBrowserClient } from '@supabase/ssr'

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Alias court pour les composants client
export { createBrowserSupabaseClient as createBrowserClient }
