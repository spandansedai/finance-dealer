/**
 * @file lib/database/index.ts
 * @description Database configuration and validation utilities for Supabase connectivity.
 */

/**
 * Configuration options for connecting to the Supabase database.
 */
export interface DatabaseConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

/**
 * Checks whether the required Supabase environment variables are present in the current runtime.
 *
 * @returns True if both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
 */
export const isDatabaseConfigured = (): boolean => {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
};
