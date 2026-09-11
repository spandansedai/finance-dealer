'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MetricCard } from '@/components/MetricCard';
import { PortfolioAllocationChart } from '@/components/PortfolioAllocationChart';
import { CashFlowChart } from '@/components/CashFlowChart';
import { StockHolding, Transaction } from '@/types';
import {
  calculateSavingsSummary,
  calculatePortfolioAnalytics,
  calculateTotalByType,
  formatNepaliCurrency,
} from '@/lib/calculations/finance';
import { supabase } from '@/lib/supabase';

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

export default function HomePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [holdings, setHoldings] = useState<StockHolding[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadUserData = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();

      if (!isMounted) return;

      const currentUserId = data.user?.id ?? null;
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

        if (isMounted) {
          if (txRes.data) {
            setTransactions(
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
            setHoldings(holdingsRes.data.map(rowToHolding));
          }
        }
      } else {
        setTransactions([]);
        setHoldings([]);
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    loadUserData();

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
          setTransactions(
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
          setHoldings(holdingsRes.data.map(rowToHolding));
        }
      } else {
        setTransactions([]);
        setHoldings([]);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const totalIncome = calculateTotalByType(transactions, 'income');
  const totalExpenses = calculateTotalByType(transactions, 'expense');

  // Pure Math Calculations - Savings Engine
  const {
    monthlyIncome,
    monthlyExpenses,
    monthlySavings,
    savingsRate,
    annualSavings,
  } = calculateSavingsSummary(totalIncome, totalExpenses);

  // Pure Math Calculations - Portfolio Engine
  const {
    totalInvested,
    totalCurrentValue,
    totalProfitLoss,
    totalProfitLossPercentage,
    holdings: analyzedHoldings,
  } = calculatePortfolioAnalytics(holdings);

  const isSavingsDeficit = monthlySavings < 0;
  const isPortfolioProfit = totalProfitLoss > 0;
  const isPortfolioLoss = totalProfitLoss < 0;

  // Combined Financial Position
  const totalCombinedAssets = totalCurrentValue + Math.max(0, annualSavings);
  const hasAnyData = transactions.length > 0 || holdings.length > 0;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-3 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Financial Dashboard
              </h1>
              <span className="text-xs px-2.5 py-0.5 font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                v0.6 Active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Unified overview of your monthly cash flow, savings rate, and NEPSE portfolio performance.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/expenses"
              className="flex-1 sm:flex-initial text-center px-4 py-2 text-xs sm:text-sm font-medium rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs"
            >
              + Track Expenses
            </Link>
            <Link
              href="/portfolio"
              className="flex-1 sm:flex-initial text-center px-4 py-2 text-xs sm:text-sm font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shadow-xs"
            >
              Manage Portfolio
            </Link>
          </div>
        </div>

        {loading && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Loading your financial data...
          </div>
        )}

        {!userId && !loading && (
          <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="text-zinc-600 dark:text-zinc-400">
              <strong>Sign in</strong> to sync and securely store your personal financial data across devices.
            </div>
            <Link
              href="/login"
              className="px-3 py-1.5 font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition self-start sm:self-auto"
            >
              Sign In / Sign Up
            </Link>
          </div>
        )}

        {/* 8 Key Metric Cards Section */}
        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Key Financial Metrics
            </h2>
            <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
              NPR (Rs.)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Monthly Income */}
            <MetricCard
              label="Monthly Income"
              amount={monthlyIncome}
              currency="Rs."
              type="income"
              badgeText="Inflow"
              subtitle="Earnings, salary & side income"
            />

            {/* Card 2: Monthly Expenses */}
            <MetricCard
              label="Monthly Expenses"
              amount={monthlyExpenses}
              currency="Rs."
              type="expense"
              badgeText="Outflow"
              subtitle="Living, rent & utilities"
            />

            {/* Card 3: Monthly Savings */}
            <MetricCard
              label="Monthly Savings"
              amount={monthlySavings}
              currency="Rs."
              type={isSavingsDeficit ? 'deficit' : 'savings'}
              badgeText={
                isSavingsDeficit
                  ? 'Deficit'
                  : monthlySavings === 0
                  ? 'Break-even'
                  : 'Surplus'
              }
              subtitle={
                isSavingsDeficit
                  ? 'Expenses exceed income'
                  : 'Net monthly investable capital'
              }
            />

            {/* Card 4: Savings Rate */}
            <MetricCard
              label="Savings Rate"
              formattedValue={`${savingsRate.toFixed(2)}%`}
              currency=""
              type={isSavingsDeficit ? 'deficit' : savingsRate >= 20 ? 'savings' : 'neutral'}
              badgeText={
                monthlyIncome <= 0
                  ? '0%'
                  : savingsRate >= 40
                  ? 'Excellent'
                  : savingsRate > 0
                  ? 'Positive'
                  : 'Negative'
              }
              subtitle={
                monthlyIncome <= 0
                  ? 'Income is 0 NPR'
                  : `${savingsRate.toFixed(2)}% of income saved`
              }
            />

            {/* Card 5: Total Invested */}
            <MetricCard
              label="Total Invested"
              amount={totalInvested}
              currency="Rs."
              type="neutral"
              badgeText="Cost Basis"
              subtitle="Total capital deployed in NEPSE"
            />

            {/* Card 6: Current Portfolio Value */}
            <MetricCard
              label="Current Portfolio Value"
              amount={totalCurrentValue}
              currency="Rs."
              type="neutral"
              badgeText={`${holdings.length} Stocks`}
              subtitle="Current valuation at market price"
            />

            {/* Card 7: Total Portfolio Profit / Loss */}
            <MetricCard
              label="Total Profit / Loss"
              amount={totalProfitLoss}
              currency="Rs."
              type={isPortfolioLoss ? 'deficit' : isPortfolioProfit ? 'income' : 'neutral'}
              badgeText={
                isPortfolioProfit
                  ? 'Net Gain'
                  : isPortfolioLoss
                  ? 'Net Loss'
                  : 'Even'
              }
              subtitle={
                isPortfolioProfit
                  ? 'Unrealized capital gain'
                  : isPortfolioLoss
                  ? 'Unrealized capital loss'
                  : 'Zero change'
              }
            />

            {/* Card 8: Portfolio Profit / Loss % */}
            <MetricCard
              label="Portfolio Return %"
              formattedValue={
                totalInvested > 0
                  ? `${totalProfitLossPercentage >= 0 ? '+' : ''}${totalProfitLossPercentage.toFixed(2)}%`
                  : '0.00%'
              }
              currency=""
              type={isPortfolioLoss ? 'deficit' : isPortfolioProfit ? 'income' : 'neutral'}
              badgeText={
                totalInvested <= 0
                  ? '0%'
                  : totalProfitLossPercentage > 0
                  ? `+${totalProfitLossPercentage.toFixed(2)}%`
                  : `${totalProfitLossPercentage.toFixed(2)}%`
              }
              subtitle="Overall return on equity"
            />
          </div>
        </section>

        {/* Visual Charts Section (2 Charts) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Chart 1: Income vs Expenses vs Savings */}
          <div className="p-4 sm:p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 sm:pb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Cash Flow Breakdown
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
                  Income vs Expenses vs Net Monthly Savings
                </p>
              </div>
              <Link
                href="/expenses"
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
              >
                Log Entry →
              </Link>
            </div>
            <CashFlowChart
              income={monthlyIncome}
              expenses={monthlyExpenses}
              savings={monthlySavings}
            />
          </div>

          {/* Chart 2: Portfolio Stock Allocation */}
          <div className="p-4 sm:p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 sm:pb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Portfolio Allocation
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
                  Percentage distribution by stock valuation
                </p>
              </div>
              <Link
                href="/portfolio"
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
              >
                View Holdings →
              </Link>
            </div>
            <PortfolioAllocationChart
              holdings={analyzedHoldings}
              totalCurrentValue={totalCurrentValue}
            />
          </div>
        </section>

        {/* Overall Financial Summary Section */}
        <section className="p-4 sm:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>🛡️ Overall Financial Position &amp; Health</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Holistic analysis of your liquid cash flow and equity assets.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 self-start sm:self-auto border border-emerald-300 dark:border-emerald-800">
              {!hasAnyData
                ? 'No Data Logged'
                : savingsRate >= 30
                ? 'Strong Financial Health'
                : savingsRate > 0
                ? 'Moderate Health'
                : 'Review Spending'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Position 1: Total Assets & Capacity */}
            <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2 sm:space-y-3">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                Total Asset &amp; Savings Position
              </span>
              <div className="font-mono text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 break-words">
                {formatNepaliCurrency(totalCombinedAssets)}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Includes <strong>{formatNepaliCurrency(totalCurrentValue)}</strong> in active NEPSE equities plus <strong>{formatNepaliCurrency(Math.max(0, annualSavings))}</strong> projected 1-year savings surplus.
              </p>
            </div>

            {/* Position 2: Monthly Surplus Velocity */}
            <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2 sm:space-y-3">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                Investment Capacity
              </span>
              <div className="font-mono text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 break-words">
                {formatNepaliCurrency(Math.max(0, monthlySavings))}/mo
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {monthlySavings > 0 ? (
                  <>
                    At this rate, you can accumulate <strong>{formatNepaliCurrency(annualSavings)}</strong> annually to deploy into blue-chip NEPSE stocks.
                  </>
                ) : (
                  <>
                    No monthly surplus recorded yet. Log your income and expenses to unlock investment capacity.
                  </>
                )}
              </p>
            </div>

            {/* Position 3: Portfolio Return Status */}
            <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2 sm:space-y-3">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                Portfolio Net Performance
              </span>
              <div className={`font-mono text-xl sm:text-2xl font-extrabold break-words ${isPortfolioProfit ? 'text-emerald-600 dark:text-emerald-400' : isPortfolioLoss ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                {isPortfolioProfit ? '+' : ''}{formatNepaliCurrency(totalProfitLoss)}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {totalInvested > 0 ? (
                  <>
                    A total return of <strong>{totalProfitLossPercentage >= 0 ? '+' : ''}{totalProfitLossPercentage.toFixed(2)}%</strong> across {holdings.length} {holdings.length === 1 ? 'holding' : 'holdings'} against a cost basis of {formatNepaliCurrency(totalInvested)}.
                  </>
                ) : (
                  <>
                    No stock holdings recorded yet. Use the NEPSE portfolio page to add your holdings.
                  </>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Feature Navigation Modules */}
        <section className="space-y-3 sm:space-y-4">
          <h2 className="text-sm sm:text-base font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
            Dedicated Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <Link
              href="/expenses"
              className="p-5 sm:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-emerald-500/50 transition group shadow-xs"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-semibold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                  Income &amp; Expense Tracking →
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold">
                  Ready
                </span>
              </div>
              <p className="mt-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Log transactions, compute category breakdowns, and calculate net surplus.
              </p>
            </Link>

            <Link
              href="/portfolio"
              className="p-5 sm:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-purple-500/50 transition group shadow-xs"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-semibold group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                  NEPSE Stock Portfolio →
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 font-semibold">
                  Ready
                </span>
              </div>
              <p className="mt-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Manage stock holdings, current price updates, profit/loss calculations, and weight %.
              </p>
            </Link>

            <Link
              href="/salary"
              className="p-5 sm:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500/50 transition group shadow-xs"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                  Salary &amp; Tax Management →
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                  Planned
                </span>
              </div>
              <p className="mt-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Configure salary structure, allowances, and Nepal income tax brackets.
              </p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
