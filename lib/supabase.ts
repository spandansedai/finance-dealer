import { createClient } from "@supabase/supabase-js";

/**
 * Shared Supabase client used across the whole app (auth, transactions, holdings, etc).
 *
 * The placeholder fallbacks below are intentional: createClient() throws if given an
 * empty/undefined URL or key, which would crash the entire app at import time in any
 * environment where the real env vars aren't set yet (e.g. first local checkout before
 * .env.local exists). Falling back to obviously-fake placeholder values lets the app
 * still boot and show a clear "not configured" / auth-error state instead of a hard crash.
 * These placeholders are never valid credentials and will simply fail auth/requests.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseKey);
