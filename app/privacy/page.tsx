/**
 * @file app/privacy/page.tsx
 * @description Privacy Policy page explaining data handling, storage, encryption,
 * authentication, guest mode privacy, and user rights.
 */

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { DocPage, DocSection } from '@/components/DocPage';
import { Notice } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Privacy Policy | FinanceDealer',
  description: 'Learn how FinanceDealer handles, stores, and protects your personal financial data.',
};

const SECTIONS: DocSection[] = [
  {
    id: 'commitment',
    title: 'Our commitment to financial privacy',
    body: (
      <p>
        At FinanceDealer (&quot;we&quot;, &quot;our&quot;, or &quot;the platform&quot;), we believe that your financial information is deeply personal. We operate with a strict privacy-first principle: we do not sell, rent, monetize, or broker your personal financial records, transaction logs, or stock holdings to any third-party advertisers or data brokers.
      </p>
    ),
  },
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    body: (
      <>
        <p>Depending on how you use FinanceDealer, we may process the following types of information:</p>
        <ul>
          <li>
            <strong>Account credentials:</strong> When you register an account, your email address and encrypted authentication credentials are saved securely via our authentication provider (Supabase Auth).
          </li>
          <li>
            <strong>Financial ledger data:</strong> Income amounts, expense figures, category classifications, transaction dates, and custom notes that you manually input.
          </li>
          <li>
            <strong>Investment portfolio records:</strong> NEPSE stock ticker symbols, share quantities, purchase costs, and fallback prices that you log into your portfolio.
          </li>
          <li>
            <strong>Email preferences:</strong> Recurring summary schedule configurations (e.g. weekly or monthly digests) if you opt-in via Settings.
          </li>
          <li>
            <strong>Contact messages:</strong> If you use the contact form, the name, email address and message you submit, so we can reply.
          </li>
          <li>
            <strong>Technical &amp; session data:</strong> Standard HTTP request headers, IP address, device viewport, and browser user-agent strings for security and site reliability.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'guest-mode',
    title: 'Guest Mode (ephemeral in-memory storage)',
    body: (
      <>
        <p>
          If you utilize FinanceDealer without signing in (&quot;Guest Mode&quot;), your transaction data and stock positions are held entirely in your local browser memory (RAM) and React state context. Guest Mode opens with a sample book of made-up figures so you can explore every feature; it lives in the same memory and is never sent anywhere.
        </p>
        <Notice tone="brand" className="block">
          <strong>Note on Guest Mode:</strong> No financial numbers entered in Guest Mode are transmitted to or saved on our cloud database. Closing or refreshing your browser tab resets your guest session completely.
        </Notice>
      </>
    ),
  },
  {
    id: 'storage-security',
    title: 'Data storage & security architecture',
    body: (
      <>
        <p>
          For authenticated users, all data is stored within Supabase (PostgreSQL) databases backed by modern enterprise-grade security:
        </p>
        <ul>
          <li>
            <strong>Row-Level Security (RLS):</strong> Postgres database policies enforce strict row isolation. Only your unique user token can query or mutate your transactions and holdings.
          </li>
          <li>
            <strong>Encryption in transit &amp; at rest:</strong> All web traffic is encrypted using HTTPS/TLS 1.3, and underlying databases are encrypted at rest with AES-256.
          </li>
          <li>
            <strong>No plaintext passwords:</strong> Authentication passwords are encrypted with industry-standard cryptographic hashing and are never visible to platform administrators.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'third-parties',
    title: 'Third-party service providers',
    body: (
      <>
        <p>We rely on trusted third-party cloud infrastructure to operate FinanceDealer:</p>
        <ul>
          <li>
            <strong>Supabase:</strong> Managed PostgreSQL database, authentication, and security infrastructure.
          </li>
          <li>
            <strong>Resend:</strong> Secure transactional email delivery service used for delivering your requested financial summary reports and contact-form messages.
          </li>
          <li>
            <strong>Vercel / cloud hosting:</strong> Application hosting, edge computing, and content delivery networks.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your rights & data control',
    body: (
      <>
        <p>You maintain full sovereignty over your financial data. At any time, you can:</p>
        <ul>
          <li>Delete individual transaction or stock records directly from the application interface.</li>
          <li>Use the &quot;Clear all records&quot; action to wipe your ledger history.</li>
          <li>Disable or modify automated email summary dispatches in Settings.</li>
          <li>Request full account and associated record deletion by reaching out through our contact channels.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'updates',
    title: 'Updates to this policy',
    body: (
      <p>
        We may revise this Privacy Policy from time to time to reflect system enhancements or regulatory updates. The &quot;Updated&quot; date at the top of this document indicates the effective date of the latest iteration.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: (
      <p>
        If you have any questions, privacy concerns, or data requests regarding this Privacy Policy, please reach out via our{' '}
        <Link href="/contact">Contact &amp; Support page</Link>.
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <DocPage
      title="Privacy policy"
      note="What FinanceDealer stores, where it lives, who can see it, and how to remove it."
      updated="October 28, 2026"
      sections={SECTIONS}
    />
  );
}
