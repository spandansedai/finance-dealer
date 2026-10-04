/**
 * @file app/disclaimer/page.tsx
 * @description Financial, Investment, and Tax Disclaimer.
 * Provides explicit legal disclaimers regarding NEPSE market volatility, absence of fiduciary duty,
 * and informational nature of financial calculations and insights.
 */

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Financial Disclaimer | FinanceDealer',
  description: 'Financial, tax, and investment disclaimers for FinanceDealer.',
};

export default function DisclaimerPage() {
  const lastUpdated = 'September 17, 2026';

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4 sm:p-8 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Breadcrumb / Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Page Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Financial &amp; Investment Disclaimer
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 font-semibold border border-amber-300 dark:border-amber-800">
              Important Notice
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Last Updated: {lastUpdated}
          </p>
        </div>

        {/* Highlight Callout */}
        <div className="p-5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/25 text-amber-950 dark:text-amber-200 space-y-2 text-sm leading-relaxed">
          <p className="font-bold flex items-center gap-2">
            <span>🛡️</span>
            <span>Summary Disclaimer</span>
          </p>
          <p>
            FinanceDealer is a calculation, ledger, and analytical software application. All calculations, performance metrics, projections, and automated observations are provided strictly for informational and personal budgeting purposes. <strong>Nothing on this website constitutes investment advice, stock trading recommendations, or tax counseling.</strong>
          </p>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-8 text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              1. No Fiduciary Relationship or Advisory Status
            </h2>
            <p>
              Your use of FinanceDealer does not create any fiduciary, advisory, broker-dealer, or client relationship between you and FinanceDealer or its developers. We do not provide personalized financial planning or portfolio management services.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              2. NEPSE Equity Market Volatility &amp; Risks
            </h2>
            <p>
              Investments in equity shares, debentures, mutual funds, and other instruments listed on the Nepal Stock Exchange (NEPSE) carry inherent market risk, including the possible loss of principal capital:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>Past historical stock performance is not an indicator of future returns or dividend payouts.</li>
              <li>Calculations regarding unrealized profit/loss, portfolio returns, or projected annual savings are mathematical estimates based strictly on user inputs and recent price snapshots.</li>
              <li>You should conduct independent due diligence or consult a SEBON-licensed investment advisor before executing trades.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              3. Rule-Based Insights Engine Disclaimer
            </h2>
            <p>
              The automated observations surfaced within the platform (such as spending surge notifications, savings rate observations, or portfolio weight warnings) are rule-based mathematical evaluations of user-entered numbers against standard numerical thresholds.
            </p>
            <p>
              These observations do not represent AI predictions, market sentiment forecasts, or purchase/sell triggers. They are intended solely to help you observe trends in your own records.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              4. Nepal Income Tax Estimates
            </h2>
            <p>
              Any tax calculators, bracket summaries, or salary deductions provided on the platform are simplified educational models based on general provisions of the Nepal Income Tax Act, 2058. Actual tax liabilities may differ based on individual allowances, marital status, medical tax credits, social security fund (SSF) contributions, and annual Finance Act amendments. Always verify your tax filings with a licensed Chartered Accountant (CA) or tax practitioner.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              5. User Input Accuracy
            </h2>
            <p>
              The accuracy of outputs, charts, savings summaries, and portfolio valuations depends entirely on the precision and timeliness of the financial figures entered by the user. FinanceDealer does not independently audit or verify transactions or holding quantities entered into the system.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
