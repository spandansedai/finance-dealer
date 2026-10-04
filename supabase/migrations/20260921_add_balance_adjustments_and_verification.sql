-- Add verification flag to transactions and transfers, and create dedicated balance_adjustments table.

-- 1. Add verification column to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Add verification column to transfers
ALTER TABLE public.transfers
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Dedicated balance adjustments table (for reconciling account balances without polluting income/expenses)
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
