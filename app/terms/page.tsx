/**
 * @file app/terms/page.tsx
 * @description Terms & Conditions of Service for FinanceDealer.
 * Specifies acceptable usage, financial software disclaimers, intellectual property,
 * limitations of liability, and jurisdiction.
 */

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { DocPage, DocSection } from '@/components/DocPage';
import { Notice } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Terms & Conditions | FinanceDealer',
  description: 'Terms and Conditions governing the use of the FinanceDealer application.',
};

const SECTIONS: DocSection[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of terms',
    body: (
      <p>
        By accessing, browsing, or utilizing the FinanceDealer platform (&quot;FinanceDealer&quot;, &quot;the Service&quot;, or &quot;we&quot;), you acknowledge that you have read, understood, and agreed to be bound by these Terms and Conditions. If you do not agree with any portion of these terms, you must refrain from using the platform.
      </p>
    ),
  },
  {
    id: 'nature-of-service',
    title: 'Nature of service & non-advisory disclaimer',
    body: (
      <Notice tone="warn" className="block space-y-2">
        <p className="font-semibold text-ink">Critical financial notice</p>
        <p>
          FinanceDealer is an independent mathematical computation, budgeting, and portfolio tracking software application. <strong>FinanceDealer is NOT a registered investment advisor, stock broker, financial planner, or tax advisory entity with the Securities Board of Nepal (SEBON), Nepal Rastra Bank (NRB), or the Institute of Chartered Accountants of Nepal (ICAN).</strong>
        </p>
        <p>
          Nothing contained within FinanceDealer constitutes financial advice, stock purchase/sale recommendations, investment endorsements, or tax directives. All financial decisions are made at your own discretion and risk.
        </p>
      </Notice>
    ),
  },
  {
    id: 'accounts',
    title: 'User accounts & data security',
    body: (
      <>
        <p>When creating an account on FinanceDealer, you agree to:</p>
        <ul>
          <li>Provide accurate and current information (such as your valid email address).</li>
          <li>Maintain the confidentiality of your credentials and restrict unauthorized access to your account.</li>
          <li>Accept responsibility for all activities that occur under your account session.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'market-data',
    title: 'Market data & NEPSE pricing',
    body: (
      <p>
        Any market data, including live or closing prices for Nepal Stock Exchange (NEPSE) listed securities, is provided for convenience and personal ledger calculations only. While we aim for accuracy and reasonable update intervals, market data may experience delays, temporary interruptions, or inaccuracies. We disclaim all liability for discrepancies between platform figures and official exchange records.
      </p>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use policy',
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>Use the platform for any unlawful purpose or in violation of applicable laws of Nepal.</li>
          <li>Attempt to reverse-engineer, decompile, or breach security controls, row-level security, or API limits.</li>
          <li>Deploy automated scraping bots, crawlers, or load-stressing attacks against the platform infrastructure.</li>
          <li>Misrepresent information or impersonate another individual or entity.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <p>
        To the maximum extent permitted by applicable law, FinanceDealer and its creators shall not be liable for any direct, indirect, incidental, consequential, or punitive damages, including loss of profits, investment losses, data corruption, or operational interruptions resulting from your use of or inability to use the platform.
      </p>
    ),
  },
  {
    id: 'governing-law',
    title: 'Governing law',
    body: (
      <p>
        These Terms &amp; Conditions shall be governed by and construed in accordance with the laws of Nepal. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the competent courts of Nepal.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact & questions',
    body: (
      <p>
        For legal inquiries or clarifications regarding these Terms, please contact us via our{' '}
        <Link href="/contact">Contact &amp; Feedback page</Link>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <DocPage
      title="Terms & conditions"
      note="The rules for using FinanceDealer, what it is and is not, and where responsibility sits."
      updated="September 17, 2026"
      sections={SECTIONS}
    />
  );
}
