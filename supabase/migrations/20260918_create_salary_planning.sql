-- =============================================================================
-- Salary planning records: one profile and zero or more named goals per user.
-- These tables intentionally do not alter the transactions or holdings schemas.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.salary_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_salary NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (monthly_salary >= 0),
  monthly_allowances NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (monthly_allowances >= 0),
  monthly_deductions NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (monthly_deductions >= 0),
  expected_monthly_expense NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (expected_monthly_expense >= 0),
  savings_target_amount NUMERIC(14, 2),
  savings_target_percentage NUMERIC(5, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (savings_target_amount IS NULL OR savings_target_amount >= 0),
  CHECK (savings_target_percentage IS NULL OR savings_target_percentage BETWEEN 0 AND 100)
);

ALTER TABLE public.salary_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own salary profile"
  ON public.salary_profiles
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  target_amount NUMERIC(14, 2) NOT NULL CHECK (target_amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own savings goals"
  ON public.savings_goals
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Supports the RLS ownership predicate and the page's per-user goal retrieval.
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id
  ON public.savings_goals (user_id);
