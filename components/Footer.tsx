/**
 * @file components/Footer.tsx
 * @description Global footer providing structured site navigation, legal links,
 * copyright notice, version indicators, and compliance disclaimers.
 */

'use client';

import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Brand & Mission Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-black text-sm shadow-xs">
                FD
              </span>
              <span className="font-bold">FinanceDealer</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 font-semibold border border-emerald-300 dark:border-emerald-800">
                v1.3
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm">
              Nepali Personal Finance &amp; NEPSE Operating System. Track cash flow in NPR, compute monthly surplus, analyze stock holdings, and gain factual financial insights.
            </p>
            <div className="text-xs text-zinc-400 dark:text-zinc-500">
              Made for investors and earners in Nepal 🇳🇵
            </div>
          </div>

          {/* Features / App Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
              Platform
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link
                  href="/"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/expenses"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                >
                  Expenses &amp; Income
                </Link>
              </li>
              <li>
                <Link
                  href="/portfolio"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                >
                  NEPSE Portfolio
                </Link>
              </li>
              <li>
                <Link
                  href="/salary"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                >
                  Salary &amp; Tax Planner
                </Link>
              </li>
              <li>
                <Link
                  href="/settings"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                >
                  Settings &amp; Email Reports
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
              Legal &amp; Policy
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                >
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/disclaimer"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                >
                  Financial Disclaimer
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
              Support &amp; Info
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link
                  href="/about"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                >
                  About FinanceDealer
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                >
                  Contact &amp; Feedback
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                >
                  Account / Sign In
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Disclaimer & Copyright Bar */}
        <div className="mt-10 pt-6 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400 dark:text-zinc-500">
          <p>
            &copy; {new Date().getFullYear()} FinanceDealer. All rights reserved.
          </p>
          <p className="text-center sm:text-right max-w-lg">
            FinanceDealer is a calculation and personal ledger tool. Not registered with SEBON or NRB. Information is for educational and tracking purposes only.
          </p>
        </div>
      </div>
    </footer>
  );
};
