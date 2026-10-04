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

-- 5. User-managed Accounts and Internal Transfers
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  type TEXT NOT NULL CHECK (type IN ('bank', 'wallet', 'cash', 'card', 'dollar_card', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own accounts" ON public.accounts FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts (user_id);

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions (account_id) WHERE account_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  to_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 250),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (from_account_id <> to_account_id)
);

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own transfers" ON public.transfers FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id
    AND EXISTS (SELECT 1 FROM public.accounts WHERE id = from_account_id AND user_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.accounts WHERE id = to_account_id AND user_id = (SELECT auth.uid())));
CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON public.transfers (user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_from_account_id ON public.transfers (from_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_account_id ON public.transfers (to_account_id);

-- Dollar Card expenses preserve the original USD amount and the NPR rate used.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS original_amount NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS original_currency TEXT CHECK (original_currency IS NULL OR original_currency = 'USD'),
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(14, 6) CHECK (exchange_rate IS NULL OR exchange_rate > 0),
  ADD COLUMN IF NOT EXISTS exchange_rate_date DATE,
  ADD COLUMN IF NOT EXISTS exchange_rate_status TEXT CHECK (exchange_rate_status IS NULL OR exchange_rate_status IN ('live', 'stale', 'manual')),
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (original_amount IS NULL OR original_amount > 0),
  CHECK ((original_currency IS NULL AND original_amount IS NULL AND exchange_rate IS NULL AND exchange_rate_date IS NULL AND exchange_rate_status IS NULL)
    OR (original_currency = 'USD' AND original_amount IS NOT NULL AND exchange_rate IS NOT NULL AND exchange_rate_date IS NOT NULL AND exchange_rate_status IS NOT NULL));

ALTER TABLE public.transfers
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;

-- 6. Dedicated Balance Adjustments Table
CREATE TABLE IF NOT EXISTS public.balance_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount <> 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 250),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.balance_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own balance adjustments"
  ON public.balance_adjustments FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (SELECT 1 FROM public.accounts WHERE id = account_id AND user_id = (SELECT auth.uid()))
  );

CREATE INDEX IF NOT EXISTS idx_balance_adjustments_user_id ON public.balance_adjustments (user_id);
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_account_id ON public.balance_adjustments (account_id);
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_date ON public.balance_adjustments (account_id, date DESC);
