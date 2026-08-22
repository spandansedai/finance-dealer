/**
 * Supabase client and database helper interfaces (Prepared for v0.4)
 */

export interface DatabaseConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export const isDatabaseConfigured = (): boolean => {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
};
