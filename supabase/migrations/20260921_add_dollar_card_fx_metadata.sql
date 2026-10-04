-- Store the NPR conversion used for Dollar Card expenses without changing NPR totals.

ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_type_check
  CHECK (type IN ('bank', 'wallet', 'cash', 'card', 'dollar_card', 'other'));

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS original_amount NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS original_currency TEXT,
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(14, 6),
  ADD COLUMN IF NOT EXISTS exchange_rate_date DATE,
  ADD COLUMN IF NOT EXISTS exchange_rate_status TEXT;

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_original_amount_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_original_amount_check
  CHECK (original_amount IS NULL OR original_amount > 0);

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_original_currency_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_original_currency_check
  CHECK (original_currency IS NULL OR original_currency = 'USD');

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_exchange_rate_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_exchange_rate_check
  CHECK (exchange_rate IS NULL OR exchange_rate > 0);

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_exchange_rate_status_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_exchange_rate_status_check
  CHECK (exchange_rate_status IS NULL OR exchange_rate_status IN ('live', 'stale', 'manual'));

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_usd_conversion_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_usd_conversion_check
  CHECK (
    (original_currency IS NULL AND original_amount IS NULL AND exchange_rate IS NULL AND exchange_rate_date IS NULL AND exchange_rate_status IS NULL)
    OR (original_currency = 'USD' AND original_amount IS NOT NULL AND exchange_rate IS NOT NULL AND exchange_rate_date IS NOT NULL AND exchange_rate_status IS NOT NULL)
  );
