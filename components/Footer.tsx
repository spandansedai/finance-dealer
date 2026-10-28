/**
 * @file components/Footer.tsx
 * @description Global footer providing structured site navigation, legal links,
 * copyright notice, version indicator, and compliance disclaimers.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Logomark } from '@/components/Logomark';
import { Heading, Tag } from '@/components/ui';

const COLUMNS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: 'Platform ledger',
    links: [
      { href: '/', label: 'Dashboard overview' },
      { href: '/expenses', label: 'Passbook & accounts' },
      { href: '/portfolio', label: 'NEPSE floor sheet' },
      { href: '/salary', label: 'Salary & tax planner' },
      { href: '/settings', label: 'Settings & email reports' },
    ],
  },
  {
    title: 'Policy & terms',
    links: [
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/terms', label: 'Terms & conditions' },
      { href: '/disclaimer', label: 'Financial disclaimer' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/about', label: 'About FinanceDealer' },
      { href: '/faq', label: 'Frequently asked questions' },
      { href: '/contact', label: 'Contact & feedback' },
      { href: '/login', label: 'Account / sign in' },
    ],
  },
];

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto w-full border-t border-rule bg-sheet text-ink-soft">
      <div className="mx-auto max-w-page px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5 lg:gap-10">
          {/* Brand & Mission Column */}
          <div className="space-y-3 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 text-ink">
              <Logomark size={24} />
              <span className="font-display text-base font-semibold">FinanceDealer</span>
              <Tag>v1.3</Tag>
            </Link>
            <p className="max-w-sm text-xs leading-relaxed text-ink-soft">
              Nepali personal finance and NEPSE operating system. Passbook accounting, live
              USD/NPR conversion, tax planning, and equity portfolio management.
            </p>
            <p className="font-mono text-meta text-ink-faint">
              Made for earners and investors in Nepal.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} className="space-y-2.5" aria-label={column.title}>
              <Heading as="h2" size="sm">
                {column.title}
              </Heading>
              <ul className="space-y-1.5 text-xs">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="footer-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom Disclaimer & Copyright Bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-rule pt-5 text-meta text-ink-faint sm:flex-row">
          <p className="font-mono">&copy; {new Date().getFullYear()} FinanceDealer. Kept in rupees and lakhs.</p>
          <p className="max-w-lg text-center leading-relaxed sm:text-right">
            FinanceDealer is a personal financial ledger and accounting calculation tool. Not
            registered with SEBON or NRB. Information is for personal tracking purposes only.
          </p>
        </div>
      </div>
    </footer>
  );
};
