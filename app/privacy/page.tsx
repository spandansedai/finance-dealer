/**
 * @file app/privacy/page.tsx
 * @description Privacy Policy page explaining data handling, storage, encryption,
 * authentication, guest mode privacy, and user rights.
 */

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | FinanceDealer',
  description: 'Learn how FinanceDealer handles, stores, and protects your personal financial data.',
};

export default function PrivacyPolicyPage() {
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
              Privacy Policy
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 font-semibold border border-emerald-300 dark:border-emerald-800">
              v1.3 Standard
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Last Updated: {lastUpdated}
          </p>
        </div>

        {/* Policy Content */}
        <div className="space-y-8 text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              1. Our Commitment to Financial Privacy
            </h2>
            <p>
              At FinanceDealer (&quot;we&quot;, &quot;our&quot;, or &quot;the platform&quot;), we believe that your financial information is deeply personal. We operate with a strict privacy-first principle: we do not sell, rent, monetize, or broker your personal financial records, transaction logs, or stock holdings to any third-party advertisers or data brokers.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              2. Information We Collect
            </h2>
            <div className="space-y-2.5">
              <p>Depending on how you use FinanceDealer, we may process the following types of information:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li>
                  <strong>Account Credentials:</strong> When you register an account, your email address and encrypted authentication credentials are saved securely via our authentication provider (Supabase Auth).
                </li>
                <li>
                  <strong>Financial Ledger Data:</strong> Income amounts, expense figures, category classifications, transaction dates, and custom notes that you manually input.
                </li>
                <li>
                  <strong>Investment Portfolio Records:</strong> NEPSE stock ticker symbols, share quantities, purchase costs, and fallback prices that you log into your portfolio.
                </li>
                <li>
                  <strong>Email Preferences:</strong> Recurring summary schedule configurations (e.g. weekly or monthly digests) if you opt-in via Settings.
                </li>
                <li>
                  <strong>Technical &amp; Session Data:</strong> Standard HTTP request headers, IP address, device viewport, and browser user-agent strings for security and site reliability.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              3. Guest Mode (Ephemeral In-Memory Storage)
            </h2>
            <p>
              If you utilize FinanceDealer without signing in (&quot;Guest Mode&quot;), your transaction data and stock positions are held entirely in your local browser memory (RAM) and React state context.
            </p>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
              💡 <strong>Note on Guest Mode:</strong> No financial numbers entered in Guest Mode are transmitted to or saved on our cloud database. Closing or refreshing your browser tab resets your guest session completely.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              4. Data Storage &amp; Security Architecture
            </h2>
            <p>
              For authenticated users, all data is stored within Supabase (PostgreSQL) databases backed by modern enterprise-grade security:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>
                <strong>Row-Level Security (RLS):</strong> Postgres database policies enforce strict row isolation. Only your unique user token can query or mutate your transactions and holdings.
              </li>
              <li>
                <strong>Encryption in Transit &amp; at Rest:</strong> All web traffic is encrypted using HTTPS/TLS 1.3, and underlying databases are encrypted at rest with AES-256.
              </li>
              <li>
                <strong>No Plaintext Passwords:</strong> Authentication passwords are encrypted with industry-standard cryptographic hashing and are never visible to platform administrators.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              5. Third-Party Service Providers
            </h2>
            <p>We rely on trusted third-party cloud infrastructure to operate FinanceDealer:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>
                <strong>Supabase:</strong> Managed PostgreSQL database, authentication, and security infrastructure.
              </li>
              <li>
                <strong>Resend:</strong> Secure transactional email delivery service used exclusively for delivering your requested financial summary reports.
              </li>
              <li>
                <strong>Vercel / Cloud Hosting:</strong> Application hosting, edge computing, and content delivery networks.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              6. Your Rights &amp; Data Control
            </h2>
            <p>
              You maintain full sovereignty over your financial data. At any time, you can:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>Delete individual transaction or stock records directly from the application interface.</li>
              <li>Use the &quot;Clear all records&quot; action to wipe your ledger history.</li>
              <li>Disable or modify automated email summary dispatches in Settings.</li>
              <li>Request full account and associated record deletion by reaching out through our contact channels.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              7. Updates to This Policy
            </h2>
            <p>
              We may revise this Privacy Policy from time to time to reflect system enhancements or regulatory updates. The &quot;Last Updated&quot; date at the top of this document indicates the effective date of the latest iteration.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              8. Contact Us
            </h2>
            <p>
              If you have any questions, privacy concerns, or data requests regarding this Privacy Policy, please reach out via our{' '}
              <Link href="/contact" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                Contact &amp; Support page
              </Link>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
