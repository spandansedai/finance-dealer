-- ==============================================================================
-- Migration: Create user_email_preferences table for automated email reports
-- Description: Stores user preferences for recurring financial summary emails.
-- Follows Supabase Postgres best practices with strict RLS and performance indexing.
-- ==============================================================================

-- Create user_email_preferences table
CREATE TABLE IF NOT EXISTS public.user_email_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('weekly', 'monthly')),
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row-Level Security
ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: Authenticated users can view only their own preferences
CREATE POLICY "Users can view own email preferences"
  ON public.user_email_preferences
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- 2. INSERT Policy: Authenticated users can insert their own preferences
CREATE POLICY "Users can insert own email preferences"
  ON public.user_email_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 3. UPDATE Policy: Authenticated users can update their own preferences
CREATE POLICY "Users can update own email preferences"
  ON public.user_email_preferences
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 4. DELETE Policy: Authenticated users can delete their own preferences
CREATE POLICY "Users can delete own email preferences"
  ON public.user_email_preferences
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Index for cron job queries that scan for enabled users and due schedules
CREATE INDEX IF NOT EXISTS idx_user_email_preferences_cron
  ON public.user_email_preferences (enabled, frequency, last_sent_at);
