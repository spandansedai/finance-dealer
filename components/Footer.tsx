/**
 * @file components/Footer.tsx
 * @description Global footer providing structured site navigation, legal links,
 * copyright notice, version indicator, and compliance disclaimers.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Logomark } from '@/components/Logomark';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto w-full border-t border-rule bg-sheet-alt text-ink-soft">
      <div className="mx-auto max-w-[88rem] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5 lg:gap-10">
          {/* Brand & Mission Column */}
          <div className="space-y-3 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 text-ink">
              <Logomark size={24} />
              <span className="font-display text-base font-semibold">FinanceDealer</span>
              <span className="tag">v1.3</span>
            </Link>
            <p className="max-w-sm text-xs leading-relaxed text-ink-soft">
              Nepali personal finance and NEPSE operating system. Passbook accounting, live
              USD/NPR conversion, tax planning, and equity portfolio management.
            </p>
            <p className="text-[11px] font-mono text-ink-faint">
              Made for earners and investors in Nepal.
            </p>
          </div>

          {/* Features / App Links */}
          <div className="space-y-2.5">
            <h4 className="font-display text-sm font-semibold text-ink">Platform ledger</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/" className="transition-colors hover:text-khata">
                  Dashboard overview
                </Link>
              </li>
              <li>
                <Link href="/expenses" className="transition-colors hover:text-khata">
                  Passbook &amp; accounts
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className="transition-colors hover:text-khata">
                  NEPSE floor sheet
                </Link>
              </li>
              <li>
                <Link href="/salary" className="transition-colors hover:text-khata">
                  Salary &amp; tax planner
                </Link>
              </li>
              <li>
                <Link href="/settings" className="transition-colors hover:text-khata">
                  Settings &amp; audit logs
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div className="space-y-2.5">
            <h4 className="font-display text-sm font-semibold text-ink">Policy &amp; terms</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/privacy" className="transition-colors hover:text-khata">
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition-colors hover:text-khata">
                  Terms &amp; conditions
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="transition-colors hover:text-khata">
                  Financial disclaimer
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Support */}
          <div className="space-y-2.5">
            <h4 className="font-display text-sm font-semibold text-ink">Support</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/faq" className="transition-colors hover:text-khata">
                  Frequently asked questions
                </Link>
              </li>
              <li>
                <Link href="/contact" className="transition-colors hover:text-khata">
                  Contact &amp; feedback
                </Link>
              </li>
              <li>
                <Link href="/login" className="transition-colors hover:text-khata">
                  Account / sign in
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Disclaimer & Copyright Bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-rule pt-5 text-[11px] text-ink-faint sm:flex-row">
          <p className="font-mono">&copy; {new Date().getFullYear()} FinanceDealer. All records secured.</p>
          <p className="max-w-lg text-center leading-relaxed sm:text-right">
            FinanceDealer is a personal financial ledger and accounting calculation tool. Not
            registered with SEBON or NRB. Information is for personal tracking purposes only.
          </p>
        </div>
      </div>
    </footer>
  );
};
