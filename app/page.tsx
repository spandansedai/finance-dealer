/**
 * @file app/page.tsx
 * @description Central Hub / Dashboard for the Finance-Dealer application.
 * Aggregates and visualizes key financial metrics including income, expenses, 
 * savings rate, and NEPSE portfolio performance. Supports both authenticated 
 * Supabase sessions and ephemeral Guest Mode state.
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LedgerRow } from '@/components/LedgerRow';
import { FinancialInsights } from '@/components/FinancialInsights';
import { PortfolioAllocationChart } from '@/components/PortfolioAllocationChart';
import { CashFlowChart } from '@/components/CashFlowChart';
import { StockHolding, Transaction } from '@/types';
import {
  calculateSavingsSummary,
  calculatePortfolioAnalytics,
  calculateTotalByType,
  formatNepaliCurrency,
} from '@/lib/calculations/finance';
import { NEPAL_TAX_FISCAL_YEAR } from '@/lib/config/nepalTax';
import { generateInsights } from '@/lib/insights';
import { supabase } from '@/lib/supabase';
import { useGuestMode } from '@/context/GuestModeContext';

/**
 * Transforms a raw database row into a structured StockHolding object.
 * Maps both snake_case (database) and camelCase (guest/previous versions) keys.
 * 
 * @param row - Raw data object from Supabase or guest state.
 * @returns Standardized StockHolding object.
 */
const rowToHolding = (row: any): StockHolding => ({
  id: row.id,
  symbol: (row.symbol || '').toUpperCase(),
  companyName: row.company_name ?? row.companyName ?? row.symbol,
  shares: Number(row.shares ?? row.units ?? 0),
  averagePurchasePrice: Number(
    row.average_purchase_price ?? row.averagePurchasePrice ?? row.buy_price ?? row.buyPrice ?? 0
  ),
  currentPrice: Number(row.current_price ?? row.currentPrice ?? 0),
  sector: row.sector ?? undefined,
});

/**
 * The primary Dashboard page component.
 * Manages data fetching for transactions and holdings, identifies user auth status,
 * and passes data to calculation engines for visualization.
 */
export default function HomePage() {
  const { guestTransactions, guestHoldings } = useGuestMode();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dbTransactions, setDbTransactions] = useState<Transaction[]>([]);
  const [dbHoldings, setDbHoldings] = useState<StockHolding[]>([]);

  // Orchestrate data loading and auth state listening
  useEffect(() => {
    let isMounted = true;

    /**
     * Loads user-specific data from Supabase if authenticated.
     */
    const loadUserData = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();

      if (!isMounted) return;

      const currentUserId = data.user?.id ?? null;
      setUserId(currentUserId);

      // Fetch from Supabase if we have a valid session
      if (currentUserId) {
        const [txRes, holdingsRes] = await Promise.all([
          supabase
            .from('transactions')
            .select('id, type, amount, category, description, date'),
          supabase
            .from('holdings')
            .select('*'),
        ]);

        if (isMounted) {
          if (txRes.data) {
            setDbTransactions(
              txRes.data.map((row: any) => ({
                id: row.id,
                type: row.type,
                amount: Number(row.amount),
                category: row.category,
                description: row.description,
                date: row.date,
              }))
            );
          }
          if (holdingsRes.data) {
            setDbHoldings(holdingsRes.data.map(rowToHolding));
          }
        }
      } else {
        // Clear DB state if user signs out
        setDbTransactions([]);
        setDbHoldings([]);
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    loadUserData();

    // Listen for sign-in/sign-out events to re-fetch or clear data
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUserId = session?.user?.id ?? null;
      setUserId(currentUserId);

      if (currentUserId) {
        const [txRes, holdingsRes] = await Promise.all([
          supabase
            .from('transactions')
            .select('id, type, amount, category, description, date'),
          supabase
            .from('holdings')
            .select('*'),
        ]);

        if (txRes.data) {
          setDbTransactions(
            txRes.data.map((row: any) => ({
              id: row.id,
              type: row.type,
              amount: Number(row.amount),
              category: row.category,
              description: row.description,
              date: row.date,
            }))
          );
        }
        if (holdingsRes.data) {
          setDbHoldings(holdingsRes.data.map(rowToHolding));
        }
      } else {
        setDbTransactions([]);
        setDbHoldings([]);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // When authenticated, use Supabase data. When in guest mode, use in-memory guest state.
  const activeTransactions = userId ? dbTransactions : guestTransactions;
  const activeHoldings = userId ? dbHoldings : guestHoldings;

  const totalIncome = calculateTotalByType(activeTransactions, 'income');
  const totalExpenses = calculateTotalByType(activeTransactions, 'expense');

  // Pure Math Calculations - Savings Engine
  const savingsSummary = calculateSavingsSummary(totalIncome, totalExpenses);
  const {
    monthlyIncome,
    monthlyExpenses,
    monthlySavings,
    savingsRate,
    annualSavings,
  } = savingsSummary;

  // Pure Math Calculations - Portfolio Engine
  const portfolioSummary = calculatePortfolioAnalytics(activeHoldings);
  const {
    totalInvested,
    totalCurrentValue,
    totalProfitLoss,
    totalProfitLossPercentage,
    holdings: analyzedHoldings,
  } = portfolioSummary;

  const isSavingsDeficit = monthlySavings < 0;
  const isPortfolioProfit = totalProfitLoss > 0;
  const isPortfolioLoss = totalProfitLoss < 0;

  // Combined Financial Position
  const totalCombinedAssets = totalCurrentValue + Math.max(0, annualSavings);
  const hasAnyData = activeTransactions.length > 0 || activeHoldings.length > 0;

  // Rule-based factual financial observations
  const insights = useMemo(() => {
    return generateInsights({
      transactions: activeTransactions,
      savingsSummary,
      portfolioSummary,
      holdings: activeHoldings,
    });
  }, [activeTransactions, savingsSummary, portfolioSummary, activeHoldings]);

  return (
    <main className="page bound">
      <span className="binding-label">FY 2083/84</span>
      <div className="space-y-6">
        {/* Masthead */}
        <header className="masthead">
          <div>
            <h1>Account overview</h1>
            <p className="masthead-note">
              Everything on one page: what came in, what went out, what is left to invest, and
              what the NEPSE holdings are worth today.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="stamp">
              Shrawan&ndash;Ashar
              <span className="hair" aria-hidden="true" />
              {NEPAL_TAX_FISCAL_YEAR.replace('FY ', '')}
            </span>
            <Link href="/expenses" className="btn btn-ink btn-sm">
              Write an entry
            </Link>
          </div>
        </header>

        {loading && (
          <p className="fig fig-sm fig-mute">Reading the book&hellip;</p>
        )}

        {/* Guest Mode Indicator Banner */}
        {!userId && !loading && (
          <div className="note note-warn">
            <span>
              This is a <strong>scratch page</strong>. Entries and holdings stay in memory and are
              gone when you reload.
            </span>
            <Link href="/login" className="btn btn-warn btn-sm">
              Sign in to keep them
            </Link>
          </div>
        )}

        {/* Double-entry spread: cash flow on the left page, equity on the right. */}
        <section className="grid grid-cols-1 border border-rule bg-sheet lg:grid-cols-2">
          <div className="border-b border-rule lg:border-b-0 lg:border-r">
            <div className="sheet-hd">
              <h2 className="sheet-title">
                Cash flow
              </h2>
              <span className="sheet-sub">
                {activeTransactions.length}{' '}
                {activeTransactions.length === 1 ? 'entry' : 'entries'} recorded
              </span>
            </div>
            <div className="sheet-bd">
              <div className="ledger">
                <LedgerRow
                  label="Income"
                  amount={monthlyIncome}
                  unit="Rs"
                  tone="gain"
                  note="Salary, side work, freelance and returns."
                />
                <LedgerRow
                  label="Expenses"
                  amount={monthlyExpenses}
                  unit="Rs"
                  tone="loss"
                  note="Rent, living costs, bills and card spending."
                />
                <LedgerRow
                  label={isSavingsDeficit ? 'Shortfall' : 'Left to invest'}
                  amount={monthlySavings}
                  unit="Rs"
                  tone={isSavingsDeficit ? 'loss' : 'gain'}
                  total
                  large
                />
                <LedgerRow
                  label="Savings rate"
                  value={`${savingsRate.toFixed(2)}%`}
                  tone={isSavingsDeficit ? 'loss' : savingsRate >= 20 ? 'gain' : 'mute'}
                  note={
                    monthlyIncome <= 0
                      ? 'No income recorded yet.'
                      : `You are keeping ${savingsRate.toFixed(2)}% of what you earn.`
                  }
                />
              </div>
            </div>
          </div>

          <div>
            <div className="sheet-hd">
              <h2 className="sheet-title">
                Equity
              </h2>
              <span className="sheet-sub">
                {activeHoldings.length} {activeHoldings.length === 1 ? 'scrip' : 'scrips'} held
              </span>
            </div>
            <div className="sheet-bd">
              <div className="ledger">
                <LedgerRow
                  label="Invested"
                  amount={totalInvested}
                  unit="Rs"
                  tone="mute"
                  note="What the shares cost you."
                />
                <LedgerRow
                  label="Market value"
                  amount={totalCurrentValue}
                  unit="Rs"
                  note="What they are worth at the latest price."
                />
                <LedgerRow
                  label={isPortfolioLoss ? 'Unrealised loss' : 'Unrealised gain'}
                  amount={totalProfitLoss}
                  unit="Rs"
                  signed
                  tone={isPortfolioLoss ? 'loss' : isPortfolioProfit ? 'gain' : 'mute'}
                  total
                  large
                />
                <LedgerRow
                  label="Return"
                  value={
                    totalInvested > 0
                      ? `${totalProfitLossPercentage >= 0 ? '+' : '\u2212'}${Math.abs(
                          totalProfitLossPercentage
                        ).toFixed(2)}%`
                      : '0.00%'
                  }
                  tone={isPortfolioLoss ? 'loss' : isPortfolioProfit ? 'gain' : 'mute'}
                  note={
                    totalInvested > 0
                      ? 'Against your total cost basis.'
                      : 'Add a holding to see a return.'
                  }
                />
              </div>
            </div>
          </div>

          {/* Carried forward — the line that joins the two pages. */}
          <div className="border-t border-rule bg-sheet-alt px-3.5 py-2.5 lg:col-span-2">
            <p className="text-[13px] leading-relaxed text-ink-soft">
              {monthlySavings > 0 ? (
                <>
                  Carried forward:{' '}
                  <span className="fig fig-sm fig-gain">
                    {formatNepaliCurrency(monthlySavings)}
                  </span>{' '}
                  a month, or{' '}
                  <span className="fig fig-sm">{formatNepaliCurrency(annualSavings)}</span> over a
                  year, available to put into NEPSE. Combined position today:{' '}
                  <span className="fig fig-sm">{formatNepaliCurrency(totalCombinedAssets)}</span>.
                </>
              ) : hasAnyData ? (
                <>
                  Nothing carried forward this month &mdash; expenses are running at or above
                  income.
                </>
              ) : (
                <>Nothing written in the book yet.</>
              )}
            </p>
          </div>
        </section>

        {/* Financial Observations & Insights Engine Section */}
        <FinancialInsights insights={insights} hasAnyData={hasAnyData} />

        {/* Charts. Two different jobs, so two different frames. */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="sheet">
            <div className="sheet-hd">
              <div>
                <h3 className="sheet-title">Where the month went</h3>
                <p className="sheet-sub">In against out, and what survived.</p>
              </div>
              <Link href="/expenses" className="link-ink">
                Write an entry
              </Link>
            </div>
            <div className="sheet-bd">
              <CashFlowChart
                income={monthlyIncome}
                expenses={monthlyExpenses}
                savings={monthlySavings}
              />
            </div>
          </div>

          <div className="sheet">
            <div className="sheet-hd">
              <div>
                <h3 className="sheet-title">Weight by scrip</h3>
                <p className="sheet-sub">How the holdings divide up at today&rsquo;s prices.</p>
              </div>
              <Link href="/portfolio" className="link-ink">
                Floor sheet
              </Link>
            </div>
            <div className="sheet-bd">
              <PortfolioAllocationChart
                holdings={analyzedHoldings}
                totalCurrentValue={totalCurrentValue}
              />
            </div>
          </div>
        </section>

        {/* Other pages of the book */}
        <nav className="grid grid-cols-1 border border-rule bg-sheet md:grid-cols-3">
          <Link
            href="/expenses"
            className="group border-b border-rule p-3.5 transition-colors last:border-b-0 hover:bg-sheet-alt md:border-b-0 md:border-r md:last:border-r-0"
          >
            <h3 className="font-display text-lg font-semibold text-ink transition-colors group-hover:text-khata">
              Income &amp; expenses
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
              Write entries, reconcile account balances against a statement, and record Dollar
              Card spending at the NRB rate.
            </p>
          </Link>
          <Link
            href="/portfolio"
            className="group border-b border-rule p-3.5 transition-colors hover:bg-sheet-alt md:border-b-0 md:border-r"
          >
            <h3 className="font-display text-lg font-semibold text-ink transition-colors group-hover:text-khata">
              NEPSE floor sheet
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
              Scrip holdings with live prices, cost basis, profit and loss, and weight across
              the portfolio.
            </p>
          </Link>
          <Link
            href="/salary"
            className="group p-3.5 transition-colors hover:bg-sheet-alt"
          >
            <h3 className="font-display text-lg font-semibold text-ink transition-colors group-hover:text-khata">
              Salary &amp; tax
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
              Plan monthly pay and savings targets, and estimate income tax against the current
              Nepal schedule.
            </p>
          </Link>
        </nav>
      </div>
    </main>
  );
}
