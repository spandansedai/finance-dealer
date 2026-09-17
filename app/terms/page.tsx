/**
 * @file app/terms/page.tsx
 * @description Terms & Conditions of Service for FinanceDealer.
 * Specifies acceptable usage, financial software disclaimers, intellectual property,
 * limitations of liability, and jurisdiction.
 */

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions | FinanceDealer',
  description: 'Terms and Conditions governing the use of the FinanceDealer application.',
};

export default function TermsPage() {
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
              Terms &amp; Conditions
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 font-semibold border border-emerald-300 dark:border-emerald-800">
              v1.3 Standard
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Last Updated: {lastUpdated}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, browsing, or utilizing the FinanceDealer platform (&quot;FinanceDealer&quot;, &quot;the Service&quot;, or &quot;we&quot;), you acknowledge that you have read, understood, and agreed to be bound by these Terms and Conditions. If you do not agree with any portion of these terms, you must refrain from using the platform.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              2. Nature of Service &amp; Non-Advisory Disclaimer
            </h2>
            <div className="p-4 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/25 text-amber-950 dark:text-amber-200 space-y-2 text-xs sm:text-sm">
              <p className="font-bold">
                ⚠️ CRITICAL FINANCIAL NOTICE:
              </p>
              <p>
                FinanceDealer is an independent mathematical computation, budgeting, and portfolio tracking software application. <strong>FinanceDealer is NOT a registered investment advisor, stock broker, financial planner, or tax advisory entity with the Securities Board of Nepal (SEBON), Nepal Rastra Bank (NRB), or the Institute of Chartered Accountants of Nepal (ICAN).</strong>
              </p>
              <p>
                Nothing contained within FinanceDealer constitutes financial advice, stock purchase/sale recommendations, investment endorsements, or tax directives. All financial decisions are made at your own discretion and risk.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              3. User Accounts &amp; Data Security
            </h2>
            <p>
              When creating an account on FinanceDealer, you agree to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>Provide accurate and current information (such as your valid email address).</li>
              <li>Maintain the confidentiality of your credentials and restrict unauthorized access to your account.</li>
              <li>Accept responsibility for all activities that occur under your account session.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              4. Market Data &amp; NEPSE Pricing
            </h2>
            <p>
              Any market data, including live or closing prices for Nepal Stock Exchange (NEPSE) listed securities, is provided for convenience and personal ledger calculations only. While we aim for accuracy and reasonable update intervals, market data may experience delays, temporary interruptions, or inaccuracies. We disclaim all liability for discrepancies between platform figures and official exchange records.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              5. Acceptable Use Policy
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>Use the platform for any unlawful purpose or in violation of applicable laws of Nepal.</li>
              <li>Attempt to reverse-engineer, decompile, or breach security controls, row-level security, or API limits.</li>
              <li>Deploy automated scraping bots, crawlers, or load-stressing attacks against the platform infrastructure.</li>
              <li>Misrepresent information or impersonate another individual or entity.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              6. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, FinanceDealer and its creators shall not be liable for any direct, indirect, incidental, consequential, or punitive damages, including loss of profits, investment losses, data corruption, or operational interruptions resulting from your use of or inability to use the platform.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              7. Governing Law
            </h2>
            <p>
              These Terms &amp; Conditions shall be governed by and construed in accordance with the laws of Nepal. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the competent courts of Nepal.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              8. Contact &amp; Questions
            </h2>
            <p>
              For legal inquiries or clarifications regarding these Terms, please contact us via our{' '}
              <Link href="/contact" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                Contact &amp; Feedback page
              </Link>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
