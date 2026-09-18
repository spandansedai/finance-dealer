-- ==============================================================================
-- Nepali Personal Finance & NEPSE OS - Complete Database Schema Reference
-- ==============================================================================

-- 1. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own transactions"
  ON public.transactions
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON public.transactions (user_id, date DESC);

-- 2. Holdings Table (NEPSE Portfolio)
CREATE TABLE IF NOT EXISTS public.holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  company_name TEXT,
  shares NUMERIC NOT NULL CHECK (shares > 0),
  average_purchase_price NUMERIC NOT NULL CHECK (average_purchase_price >= 0),
  current_price NUMERIC NOT NULL CHECK (current_price >= 0),
  sector TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own holdings"
  ON public.holdings
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_holdings_user_symbol
  ON public.holdings (user_id, symbol);

-- 3. User Email Preferences Table
CREATE TABLE IF NOT EXISTS public.user_email_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('weekly', 'monthly')),
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email preferences"
  ON public.user_email_preferences
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own email preferences"
  ON public.user_email_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own email preferences"
  ON public.user_email_preferences
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own email preferences"
  ON public.user_email_preferences
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_user_email_preferences_cron
  ON public.user_email_preferences (enabled, frequency, last_sent_at);

-- 4. Salary Planning Tables
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
  ON public.salary_profiles FOR ALL TO authenticated
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
  ON public.savings_goals FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON public.savings_goals (user_id);
