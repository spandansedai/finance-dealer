/**
 * @file app/about/page.tsx
 * @description About Us page for FinanceDealer highlighting mission, capabilities,
 * design philosophy, and technology stack.
 */

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About FinanceDealer | Nepali Personal Finance & NEPSE OS',
  description: 'Learn about the mission, features, and engineering behind FinanceDealer.',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4 sm:p-8 md:p-12">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Breadcrumb / Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Hero Section */}
        <div className="space-y-4 border-b border-zinc-200 dark:border-zinc-800 pb-8">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-base shadow-sm">
              FD
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              About FinanceDealer
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 font-semibold border border-emerald-300 dark:border-emerald-800">
              v1.3 Active
            </span>
          </div>
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-3xl">
            A high-performance, privacy-focused personal financial operating system built specifically for Nepali earners, savers, and NEPSE equity investors.
          </p>
        </div>

        {/* The Problem & Our Mission */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            🎯 Our Mission
          </h2>
          <p className="text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
            Most financial tracking software is tailored for US/European banking systems and currencies ($ or €), ignoring the realities of the Nepali economic context: NPR currency formats (Lakhs &amp; Crores), local expense classifications (Rent, Bhatbhateni groceries, Dashain expenses), and direct tracking of Nepal Stock Exchange (NEPSE) scrips.
          </p>
          <p className="text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <strong>FinanceDealer</strong> was engineered to bridge this gap. We combine everyday cash flow tracking with stock portfolio analytics, computing your true investable monthly surplus and giving you clarity over your wealth trajectory.
          </p>
        </section>

        {/* Core Pillars */}
        <section className="space-y-5">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            ⚡ Key Architecture &amp; Capabilities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-xs">
              <div className="text-2xl">💵</div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                NPR Cash Flow &amp; Savings Ledger
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Log daily income and expense transactions. Instantly calculate net monthly surplus, savings rate %, and annual compounding capacity.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-xs">
              <div className="text-2xl">📈</div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                NEPSE Portfolio Engine
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Track your stock positions, cost basis, live and fallback valuations, unrealized profit/loss, and portfolio weight allocations.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-xs">
              <div className="text-2xl">💡</div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Deterministic Insights Engine
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Factual, rule-based mathematical nudges flag month-over-month spending surges, savings benchmarks, and portfolio concentration risks.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-xs">
              <div className="text-2xl">🔒</div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Guest Mode &amp; RLS Cloud Sync
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Try the app immediately in zero-cloud Guest Mode, or sign in to sync encrypted records safely with Supabase Row-Level Security.
              </p>
            </div>
          </div>
        </section>

        {/* Technology Stack */}
        <section className="space-y-4 p-6 rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
            🛠️ Modern Open Web Stack
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            FinanceDealer is built with <strong>Next.js 16 (App Router &amp; Turbopack)</strong>, <strong>React 19</strong>, <strong>TypeScript</strong>, <strong>Tailwind CSS</strong>, <strong>Recharts</strong>, and <strong>Supabase (PostgreSQL with RLS)</strong>. All mathematical computations are executed purely client-side with zero unnecessary cloud roundtrips.
          </p>
        </section>

        {/* Call to Action */}
        <div className="pt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/expenses"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition shadow-xs"
          >
            Start Tracking Expenses →
          </Link>
          <Link
            href="/portfolio"
            className="px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shadow-xs"
          >
            Explore NEPSE Portfolio →
          </Link>
        </div>
      </div>
    </main>
  );
}
