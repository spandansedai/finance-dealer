-- User-managed accounts and internal transfers. Transactions remain income/expense only.

CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  type TEXT NOT NULL CHECK (type IN ('bank', 'wallet', 'cash', 'card', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own accounts"
  ON public.accounts FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts (user_id);

-- Nullable by design: all existing transactions remain valid and unassigned.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions (account_id)
  WHERE account_id IS NOT NULL;

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

CREATE POLICY "Users can manage own transfers"
  ON public.transfers FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (SELECT 1 FROM public.accounts WHERE id = from_account_id AND user_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.accounts WHERE id = to_account_id AND user_id = (SELECT auth.uid()))
  );

CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON public.transfers (user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_from_account_id ON public.transfers (from_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_account_id ON public.transfers (to_account_id);
