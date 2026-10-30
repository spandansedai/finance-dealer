-- Monthly data retention: keep the current and previous English (Gregorian) month of
-- ledger history, delete everything older.
--
-- Runs at 04:00 UTC (09:45 Nepal time) on the 1st of each month, one hour after the
-- monthly summary email (03:00 UTC), which covers the previous month and so only
-- reads data this job keeps.
--
-- Example, run on 1 November: keeps 1 Oct onwards, deletes 30 Sep and older.
--
-- What is deleted: transactions (income/expense), transfers and balance adjustments
-- dated before the cutoff, including verified ones. Holdings, accounts, salary plans
-- and email preferences are never touched.
--
-- Account balances are preserved: before deleting, each account gets one verified
-- "Opening balance" adjustment, dated on the cutoff, equal to everything the deleted
-- rows added to it. Next month that adjustment is itself older than the new cutoff,
-- so it is folded into the next opening balance and the chain stays exact.
--
-- The whole run is one transaction: either everything is carried forward and deleted,
-- or nothing changes.

create or replace function public.prune_old_ledger_data(p_cutoff date default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- First day of the previous month, in Nepal time.
  v_cutoff date := coalesce(
    p_cutoff,
    (date_trunc('month', now() at time zone 'Asia/Kathmandu') - interval '1 month')::date
  );
  v_carried integer;
  v_transactions integer;
  v_transfers integer;
  v_adjustments integer;
begin
  with movements as (
    select t.user_id, t.account_id,
           case when t.type = 'income' then t.amount else -t.amount end as amount
      from public.transactions t
     where t.date < v_cutoff and t.account_id is not null
    union all
    select tr.user_id, tr.from_account_id, -tr.amount
      from public.transfers tr
     where tr.date < v_cutoff
    union all
    select tr.user_id, tr.to_account_id, tr.amount
      from public.transfers tr
     where tr.date < v_cutoff
    union all
    select a.user_id, a.account_id, a.amount
      from public.balance_adjustments a
     where a.date < v_cutoff
  ),
  totals as (
    select user_id, account_id, round(sum(amount), 2) as amount
      from movements
     group by user_id, account_id
  )
  insert into public.balance_adjustments (user_id, account_id, amount, date, note, verified)
  select user_id, account_id, amount, v_cutoff,
         'Opening balance carried forward from entries before ' || to_char(v_cutoff, 'FMDD Mon YYYY'),
         true
    from totals
   where amount <> 0;
  get diagnostics v_carried = row_count;

  delete from public.transactions where date < v_cutoff;
  get diagnostics v_transactions = row_count;

  delete from public.transfers where date < v_cutoff;
  get diagnostics v_transfers = row_count;

  delete from public.balance_adjustments where date < v_cutoff;
  get diagnostics v_adjustments = row_count;

  return jsonb_build_object(
    'cutoff', v_cutoff,
    'opening_balances_created', v_carried,
    'transactions_deleted', v_transactions,
    'transfers_deleted', v_transfers,
    'adjustments_deleted', v_adjustments
  );
end;
$$;

-- Only the scheduler (running as the database owner) may call this.
revoke execute on function public.prune_old_ledger_data(date) from public, anon, authenticated;

create extension if not exists pg_cron;

select cron.unschedule('prune-old-ledger-data')
where exists (select 1 from cron.job where jobname = 'prune-old-ledger-data');

select cron.schedule(
  'prune-old-ledger-data',
  '0 4 1 * *',
  $$ select public.prune_old_ledger_data(); $$
);
