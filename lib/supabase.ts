/**
 * @file lib/supabase.ts
 * @description Supabase client initialization for PostgreSQL persistence and Auth.
 * Reads environment variables for production/development and provides fallback values
 * to prevent prerendering errors during static Next.js build compilation.
 */

import { createClient } from "@supabase/supabase-js";

// Fallback values prevent Next.js worker crashes during static prerendering when env variables
// are not available in the static build environment.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "placeholder-key";

/**
 * Singleton instance of the Supabase client configured with project URL and public key.
 * Used across the app for authentication, session checks, and RLS database queries.
 */
export const supabase = createClient(supabaseUrl, supabaseKey);
