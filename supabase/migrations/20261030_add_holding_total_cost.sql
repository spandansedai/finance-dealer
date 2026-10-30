-- Record what a NEPSE purchase actually cost (trade value plus broker commission,
-- DP and SEBON fees) separately from the per-share buy price.
-- Nullable: holdings saved before this keep using shares * average_purchase_price.

ALTER TABLE public.holdings
  ADD COLUMN IF NOT EXISTS total_cost NUMERIC CHECK (total_cost IS NULL OR total_cost >= 0);
