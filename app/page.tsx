import { MetricCard } from '@/components/MetricCard';
import { calculateNetSavings, calculateSavingsRate } from '@/lib/calculations/finance';
import Link from 'next/link';

export default function HomePage() {
  // Dummy metrics for v0.1 placeholder
  const dummyIncome = 16500;
  const dummyExpenses = 19500;
  const dummyNetSavings = calculateNetSavings(dummyIncome, dummyExpenses);
  const dummySavingsRate = calculateSavingsRate(dummyIncome, dummyExpenses);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">Financial Overview</h1>
              <span className="text-xs px-2.5 py-0.5 font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                v0.1 Initialized
              </span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Nepali Personal Finance & NEPSE Portfolio Management OS
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/expenses"
              className="px-4 py-2 text-sm font-medium rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm"
            >
              Add Expense
            </Link>
            <Link
              href="/portfolio"
              className="px-4 py-2 text-sm font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              View Portfolio
            </Link>
          </div>
        </div>

        {/* 3 Dummy Metrics */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
            Monthly Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              label="Total Income"
              amount={dummyIncome}
              currency="NPR"
              type="income"
              changePercentage={8.5}
              subtitle="Monthly salary + freelance income"
            />
            <MetricCard
              label="Total Expenses"
              amount={dummyExpenses}
              currency="NPR"
              type="expense"
              changePercentage={-4.2}
              subtitle="Rent, groceries, utilities, and dining"
            />
            <MetricCard
              label="Net Savings"
              amount={dummyNetSavings}
              currency="NPR"
              type="savings"
              subtitle={`Savings rate: ${dummySavingsRate}% of total income`}
            />
          </div>
        </section>

        {/* Modular Navigation Cards */}
        <section className="space-y-4 pt-4">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
            Feature Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/salary"
              className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition group"
            >
              <h3 className="text-base font-semibold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                Salary & Income Breakdown →
              </h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Track monthly earnings, tax brackets, and additional cash flows.
              </p>
            </Link>

            <Link
              href="/expenses"
              className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-rose-500/50 dark:hover:border-rose-500/50 transition group"
            >
              <h3 className="text-base font-semibold group-hover:text-rose-600 dark:group-hover:text-rose-400 transition">
                Expense Tracking (v0.2) →
              </h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Categorize day-to-day spending with local state input forms.
              </p>
            </Link>

            <Link
              href="/portfolio"
              className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition group"
            >
              <h3 className="text-base font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                NEPSE Stock Portfolio (v0.3) →
              </h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Monitor stock holdings, live LTP updates, and pure math gain/loss metrics.
              </p>
            </Link>
          </div>
        </section>

        {/* Technical Architecture Info */}
        <section className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/60">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              System Architecture Status
            </h3>
            <span className="text-xs font-mono text-zinc-500">Next.js App Router • Tailwind CSS • Recharts</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Pure Math Engine loaded via <code className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded">lib/calculations</code>. Supabase cache DB & NEPSE collector pipeline ready for integration.
          </p>
        </section>
      </div>
    </main>
  );
}
