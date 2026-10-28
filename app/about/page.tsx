/**
 * @file app/about/page.tsx
 * @description About Us page for FinanceDealer highlighting mission, capabilities,
 * design philosophy, and technology stack.
 */

import React from 'react';
import type { Metadata } from 'next';
import {
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  LinkTile,
  PageHeader,
  PageShell,
  Tag,
} from '@/components/ui';

export const metadata: Metadata = {
  title: 'About FinanceDealer | Nepali Personal Finance & NEPSE OS',
  description: 'Learn about the mission, features, and engineering behind FinanceDealer.',
};

const PILLARS = [
  {
    href: '/expenses',
    icon: 'Rs',
    title: 'NPR cash flow & savings ledger',
    body: 'Log daily income and expense transactions across bank, wallet, cash and Dollar Card accounts. See net surplus, savings rate and annual capacity instantly.',
  },
  {
    href: '/portfolio',
    icon: 'LTP',
    title: 'NEPSE portfolio engine',
    body: 'Track your scrips, cost basis, live and fallback valuations, unrealised profit and loss, and how much of the portfolio each position carries.',
  },
  {
    href: '/',
    icon: 'i',
    title: 'Deterministic insights',
    body: 'Factual, rule-based observations flag month-over-month spending surges, savings benchmarks and portfolio concentration. No predictions, no tips.',
  },
  {
    href: '/login',
    icon: 'RLS',
    title: 'Guest Mode & secure sync',
    body: 'Explore a sample book instantly with nothing leaving your browser, or sign in to keep your records in Supabase behind Row-Level Security.',
  },
];

const STACK = ['Next.js 16', 'React 19', 'TypeScript', 'Tailwind CSS', 'Recharts', 'Supabase', 'Resend'];

export default function AboutPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        title="About FinanceDealer"
        back={{ href: '/', label: 'Dashboard' }}
        description={
          <>
            A privacy-focused personal account book built for Nepali earners, savers and NEPSE
            investors, kept in rupees and lakhs.
          </>
        }
        actions={
          <ButtonLink variant="primary" href="/expenses">
            Open the ledger
          </ButtonLink>
        }
      />

      <Card as="section">
        <CardHeader>
          <CardTitle>Why it exists</CardTitle>
        </CardHeader>
        <CardBody className="doc">
          <p>
            Most financial tracking software is tailored for US/European banking systems and currencies ($ or &euro;), ignoring the realities of the Nepali economic context: NPR currency formats (lakhs &amp; crores), local expense classifications (rent, Bhatbhateni groceries, Dashain expenses), and direct tracking of Nepal Stock Exchange (NEPSE) scrips.
          </p>
          <p>
            <strong>FinanceDealer</strong> was built to bridge this gap. It combines everyday cash flow tracking with stock portfolio analytics, computing your true investable monthly surplus and giving you clarity over where your money is heading.
          </p>
        </CardBody>
      </Card>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="What it does">
        {PILLARS.map((pillar) => (
          <LinkTile key={pillar.title} href={pillar.href} icon={pillar.icon} title={pillar.title}>
            {pillar.body}
          </LinkTile>
        ))}
      </section>

      <Card as="section">
        <CardHeader>
          <CardTitle>How it is built</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {STACK.map((item) => (
              <Tag tone="brand" key={item}>
                {item}
              </Tag>
            ))}
          </div>
          <p className="text-body leading-relaxed text-ink-soft">
            Every calculation runs in your browser, so totals, returns and tax estimates update
            the moment you type, with no round trip to a server.
          </p>
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <ButtonLink variant="primary" size="lg" href="/expenses">
          Start tracking expenses
        </ButtonLink>
        <ButtonLink size="lg" href="/portfolio">
          Explore the NEPSE floor sheet
        </ButtonLink>
      </div>

    </PageShell>
  );
}
