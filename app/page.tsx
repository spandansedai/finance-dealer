'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MetricCard } from '@/components/MetricCard';
import {
  calculateSavingsSummary,
  formatNepaliCurrency,
} from '@/lib/calculations/finance';

export default function HomePage() {
  // Configurable monthly figures with sensible defaults
  const [monthlyIncomeInput, setMonthlyIncomeInput] = useState<string>('80000');
  const [monthlyExpensesInput, setMonthlyExpensesInput] = useState<string>('34200');

  const income = parseFloat(monthlyIncomeInput) || 0;
  const expenses = parseFloat(monthlyExpensesInput) || 0;

  // Pure Math Calculations
  const {
    monthlyIncome,
    monthlyExpenses,
    monthlySavings,
    savingsRate,
    annualSavings,
  } = calculateSavingsSummary(income, expenses);

  const isDeficit = monthlySavings < 0;
  const isZeroSavings = monthlySavings === 0;

  // Preset scenarios for instant testing and review
  const loadScenario = (inc: number, exp: number) => {
    setMonthlyIncomeInput(inc.toString());
    setMonthlyExpensesInput(exp.toString());
  };

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Financial Overview</h1>
              <span className="text-xs px-2.5 py-0.5 font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                v0.5 Active
              </span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Nepali Personal Finance &amp; NEPSE Portfolio Management OS
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/expenses"
              className="px-4 py-2 text-sm font-medium rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs"
            >
              + Track Income / Expense
            </Link>
            <Link
              href="/portfolio"
              className="px-4 py-2 text-sm font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
            >
              View Portfolio
            </Link>
          </div>
        </div>

        {/* 5 Key Metric Cards (V0.3 Requirement 4) */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Monthly Savings &amp; Cash Flow Engine
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Live computations based on your monthly cash inflow and expenditure.
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
              Currency: NPR (Rs.)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Monthly Income */}
            <MetricCard
              label="Monthly Income"
              amount={monthlyIncome}
              currency="Rs."
              type="income"
              badgeText="Inflow"
              subtitle="Total earnings & salary"
            />

            {/* 2. Monthly Expenses */}
            <MetricCard
              label="Monthly Expenses"
              amount={monthlyExpenses}
              currency="Rs."
              type="expense"
              badgeText="Outflow"
              subtitle="Living, rent & utilities"
            />

            {/* 3. Monthly Savings */}
            <MetricCard
              label="Monthly Savings"
              amount={monthlySavings}
              currency="Rs."
              type={isDeficit ? 'deficit' : 'savings'}
              badgeText={isDeficit ? 'Deficit' : isZeroSavings ? 'Break-even' : 'Surplus'}
              subtitle={
                isDeficit
                  ? 'Expenses exceed income'
                  : 'Income − Expenses available'
              }
            />

            {/* 4. Savings Rate */}
            <MetricCard
              label="Savings Rate"
              formattedValue={`${savingsRate.toFixed(2)}%`}
              currency=""
              type={isDeficit ? 'deficit' : savingsRate >= 20 ? 'savings' : 'neutral'}
              badgeText={
                monthlyIncome <= 0
                  ? 'No Income'
                  : savingsRate >= 40
                  ? 'Excellent'
                  : savingsRate > 0
                  ? 'Positive'
                  : isDeficit
                  ? 'Negative'
                  : '0%'
              }
              subtitle={
                monthlyIncome <= 0
                  ? 'Income is 0 NPR'
                  : `${savingsRate.toFixed(2)}% of total earnings`
              }
            />

            {/* 5. Projected Annual Savings */}
            <MetricCard
              label="Projected Annual Savings"
              amount={annualSavings}
              currency="Rs."
              type={annualSavings < 0 ? 'deficit' : 'savings'}
              badgeText="12 Months"
              subtitle={
                annualSavings < 0
                  ? 'Projected 1-yr deficit'
                  : 'Projected 1-yr accumulation'
              }
            />
          </div>

          {/* Status & Investment Capacity Banner */}
          {monthlySavings > 0 ? (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-800 dark:text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">💡</span>
                <span>
                  <strong>Surplus Active:</strong> You are saving{' '}
                  <strong>{formatNepaliCurrency(monthlySavings)}/month</strong> ({savingsRate.toFixed(2)}% savings rate), projecting{' '}
                  <strong>{formatNepaliCurrency(annualSavings)}/year</strong> for NEPSE investments.
                </span>
              </div>
              <Link href="/portfolio" className="font-semibold underline hover:text-emerald-950 dark:hover:text-emerald-200 shrink-0">
                Deploy in NEPSE →
              </Link>
            </div>
          ) : isDeficit ? (
            <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>
                <strong>Deficit Alert:</strong> Your monthly expenses exceed income by{' '}
                <strong>{formatNepaliCurrency(Math.abs(monthlySavings))}</strong> (Savings rate: {savingsRate.toFixed(2)}%). Annual projected shortfall is{' '}
                <strong>{formatNepaliCurrency(Math.abs(annualSavings))}</strong>.
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100/60 dark:bg-zinc-900/60 text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <span className="text-base">⚖️</span>
              <span>
                <strong>Break-Even:</strong> Monthly income equals monthly expenses. Savings rate is 0.00%.
              </span>
            </div>
          )}
        </section>

        {/* Interactive Scenario Tester / Income & Expense Calculator */}
        <section className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Quick Scenario Calculator
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Adjust monthly values or select presets to test different financial situations.
              </p>
            </div>

            {/* Quick Test Case Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-zinc-400">Presets:</span>
              <button
                type="button"
                onClick={() => loadScenario(30000, 18000)}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition"
              >
                Rs. 30k / 18k
              </button>
              <button
                type="button"
                onClick={() => loadScenario(50000, 50000)}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition"
              >
                Rs. 50k / 50k
              </button>
              <button
                type="button"
                onClick={() => loadScenario(30000, 35000)}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition"
              >
                Rs. 30k / 35k
              </button>
              <button
                type="button"
                onClick={() => loadScenario(0, 15000)}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition"
              >
                Rs. 0 Income
              </button>
              <button
                type="button"
                onClick={() => loadScenario(80000, 34200)}
                className="px-2.5 py-1 text-xs font-medium rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition"
              >
                Default
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Monthly Income Input */}
            <div>
              <label htmlFor="dashboard-income" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Monthly Income (NPR / Rs.)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500 font-semibold text-sm">
                  Rs.
                </div>
                <input
                  id="dashboard-income"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={monthlyIncomeInput}
                  onChange={(e) => setMonthlyIncomeInput(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition"
                />
              </div>
            </div>

            {/* Monthly Expenses Input */}
            <div>
              <label htmlFor="dashboard-expenses" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Monthly Expenses (NPR / Rs.)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500 font-semibold text-sm">
                  Rs.
                </div>
                <input
                  id="dashboard-expenses"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={monthlyExpensesInput}
                  onChange={(e) => setMonthlyExpensesInput(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 dark:focus:ring-rose-400 transition"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Feature Modules */}
        <section className="space-y-4 pt-2">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
            Feature Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/expenses"
              className="p-6 rounded-2xl border border-emerald-500/30 dark:border-emerald-500/30 bg-white dark:bg-zinc-900 hover:border-emerald-500 transition group shadow-xs"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                  Income &amp; Expense Tracking →
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold">
                  Ready
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Log transactions, compute category breakdowns, and feed cash flow into your savings.
              </p>
            </Link>

            <Link
              href="/salary"
              className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition group shadow-xs"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                  Salary &amp; Tax Management →
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                  Planned
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Track monthly earnings, allowances, and Nepal income tax brackets.
              </p>
            </Link>

            <Link
              href="/portfolio"
              className="p-6 rounded-2xl border border-emerald-500/30 dark:border-emerald-500/30 bg-white dark:bg-zinc-900 hover:border-emerald-500 transition group shadow-xs"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                  NEPSE Stock Portfolio →
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold">
                  Ready
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Monitor stock holdings, manual current price updates, and pure math gain/loss metrics.
              </p>
            </Link>
          </div>
        </section>

        {/* Technical Architecture Info */}
        <section className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              System Architecture Status
            </h3>
            <span className="text-xs font-mono text-zinc-500">
              Next.js App Router • Tailwind CSS • Pure Math Calculations Engine
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Pure calculation functions are decoupled in <code className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded">lib/calculations/finance.ts</code> to ensure clean reuse across UI, database, and future API integrations.
          </p>
        </section>
      </div>
    </main>
  );
}
