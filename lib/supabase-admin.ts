/**
 * @file lib/supabase-admin.ts
 * @description Supabase Admin Client initialized with the private service_role key.
 * Used exclusively in server-side operations (e.g., cron jobs, background workers)
 * to securely perform batch processing across opted-in users without being restricted by RLS.
 * 
 * IMPORTANT: NEVER expose SUPABASE_SERVICE_ROLE_KEY to client components or prefix it with NEXT_PUBLIC_.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Returns a Supabase administrative client instance using the private service role key.
 * Throws a descriptive error if environment variables are not configured.
 */
export function getSupabaseAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://placeholder-project.supabase.co';

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY environment variable is not configured on the server.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
