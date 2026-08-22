// ============================================================================
// EVENTUALLY.VET - Supabase Client Configuration
// Cloud backend for authentication, data sync, and file storage
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// These should be environment variables in production
// For development, replace with your Supabase project values
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export { SUPABASE_URL, SUPABASE_ANON_KEY };
