/**
 * @file app/faq/page.tsx
 * @description Frequently Asked Questions (FAQ) page for Finance-Dealer.
 * Provides categorized, interactive expand-collapse accordion items answering common
 * questions about app capabilities, data privacy, Guest Mode, NEPSE market pricing,
 * automated email summaries, and feedback channels.
 */

'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

interface FAQItem {
  id: string;
  category: 'General' | 'Privacy & Security' | 'NEPSE & Markets' | 'Email Reports & Insights' | 'Support';
  question: string;
  answer: React.ReactNode;
}

const PROSE = 'space-y-2 text-xs sm:text-sm text-ink-soft leading-relaxed';
const INLINE_LINK = 'text-khata underline underline-offset-2 hover:text-khata-hover';

const FAQ_DATA: FAQItem[] = [
  {
    id: 'what-is-financedealer',
    category: 'General',
    question: 'What is Finance-Dealer and who is it for?',
    answer: (
      <div className={PROSE}>
        <p>
          <strong>Finance-Dealer</strong> is a privacy-first personal finance operating system tailored specifically for Nepali earners, savers, and NEPSE equity investors.
        </p>
        <p>
          Unlike generic international finance trackers that operate in US Dollars ($) or Euros (€), Finance-Dealer is built from the ground up for the Nepali economic landscape. It tracks your daily cash flow in Nepalese Rupees (NPR / Rs.), computes your true investable monthly surplus, and connects your savings directly with Nepal Stock Exchange (NEPSE) portfolio tracking.
        </p>
      </div>
    ),
  },
  {
    id: 'data-privacy-security',
    category: 'Privacy & Security',
    question: 'How is my data stored and is it private?',
    answer: (
      <div className={PROSE}>
        <p>
          Your financial privacy is our highest priority. All authenticated user data is stored in dedicated <strong>PostgreSQL</strong> databases managed through <strong>Supabase</strong> with <strong>Row-Level Security (RLS)</strong> enabled on every single table.
        </p>
        <p>
          In plain language: RLS enforces strict security rules directly at the database engine level. Your transactions, portfolio stocks, and notification preferences are tied exclusively to your unique encrypted user identifier. No other user, account, or external party can query, view, or alter your records. Furthermore, all communications between your browser and the database are encrypted in transit using industry-standard SSL/TLS.
        </p>
      </div>
    ),
  },
  {
    id: 'guest-mode',
    category: 'Privacy & Security',
    question: 'What happens to my data in Guest / Try-It mode?',
    answer: (
      <div className={PROSE}>
        <p>
          Guest Mode gives you instant, frictionless access to test all core features of Finance-Dealer without needing to create an account or provide an email address.
        </p>
        <p>
          In Guest Mode, all income, expense entries, and stock holdings exist <strong>strictly in your browser&apos;s local volatile memory (RAM)</strong>. Zero data is ever sent to or stored on our cloud servers. Because of this ephemeral nature, <strong>your guest data will automatically reset when you refresh the page or close your browser tab</strong>.
        </p>
        <p>
          To permanently store and access your financial ledgers across multiple devices, simply{' '}
          <Link href="/login" className={INLINE_LINK}>
            sign in or create a free account
          </Link>
          .
        </p>
      </div>
    ),
  },
  {
    id: 'nepse-tracking',
    category: 'NEPSE & Markets',
    question: 'How does the NEPSE live price tracking work, and what should I do if prices look stale or unavailable?',
    answer: (
      <div className={PROSE}>
        <p>
          Finance-Dealer connects to live market price aggregators to fetch recent closing and active trading prices for Nepal Stock Exchange (NEPSE) listed securities. Live updates actively poll during regular trading hours (<strong>11:00 AM to 3:00 PM NPT, Sunday through Thursday</strong>).
        </p>
        <p>
          If market prices ever appear stale, if the NEPSE trading floor is closed, or if upstream data sources experience temporary network downtime:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-1">
          <li>
            Use the <strong>&quot;Refresh prices&quot;</strong> control on the{' '}
            <Link href="/portfolio" className={INLINE_LINK}>
              floor sheet
            </Link>{' '}
            page to trigger an immediate live sync.
          </li>
          <li>
            Finance-Dealer automatically falls back to the most recent known closing price.
          </li>
          <li>
            You can also manually edit and override the unit price or cost basis for any stock directly in your portfolio table at any time.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'email-reports',
    category: 'Email Reports & Insights',
    question: 'How do automated email reports work, and how do I opt in or opt out?',
    answer: (
      <div className={PROSE}>
        <p>
          Automated email reports provide a scheduled digest of your financial health delivered directly to your inbox via Resend. The summary includes your total monthly income, expenses, net savings rate, and an overview of your NEPSE equity portfolio performance.
        </p>
        <p>
          <strong>To configure, opt in, or opt out:</strong>
        </p>
        <ol className="list-decimal list-inside space-y-1 pl-1">
          <li>
            Navigate to the{' '}
            <Link href="/settings" className={INLINE_LINK}>
              settings page
            </Link>
            .
          </li>
          <li>Toggle the <strong>&quot;Enable Recurring Email Reports&quot;</strong> switch on or off.</li>
          <li>Choose your preferred schedule frequency: <strong>Weekly Digest</strong> (every 7 days) or <strong>Monthly Summary</strong> (~30 days).</li>
          <li>Click <strong>&quot;Save Preferences&quot;</strong>. You can also click <em>&quot;Send Test Email Now&quot;</em> to preview what your summary report looks like immediately.</li>
        </ol>
        <p>
          Emails are strictly opt-in and sent only to authenticated account holders who have explicitly enabled the feature. You can unsubscribe at any time with a single click in Settings.
        </p>
      </div>
    ),
  },
  {
    id: 'insights-engine',
    category: 'Email Reports & Insights',
    question: 'What is the "Insights" / recommendations section (and what is it NOT)?',
    answer: (
      <div className={PROSE}>
        <p>
          The <strong>Insights Engine</strong> on your Dashboard is a deterministic mathematical analysis tool. It processes your logged income, expense categories, and stock holdings using rule-based calculations to surface factual observations — such as flagging month-over-month spending increases, calculating your savings rate benchmark against recommended personal finance standards, or identifying high concentration risk in single NEPSE scrips.
        </p>
        <div className="note note-warn !text-xs sm:!text-sm">
          <span>
            <strong>Important:</strong> Insights are strictly mathematical observations and
            organizational aids. They do <strong>not</strong> constitute certified financial, tax,
            legal, or investment advice. Finance-Dealer does not provide stock buy/sell
            recommendations or financial guarantees. Always conduct your own research and consult
            licensed professionals before making investment decisions.
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'bug-feedback',
    category: 'Support',
    question: 'How do I report a bug, suggest a feature, or give feedback?',
    answer: (
      <div className={PROSE}>
        <p>
          We actively welcome your feedback, bug reports, and feature requests to make Finance-Dealer the best personal finance tool for Nepal!
        </p>
        <p>
          You can reach us through any of the following channels:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-1">
          <li>
            Submit a note through the built-in{' '}
            <Link href="/contact" className={INLINE_LINK}>
              contact &amp; support form
            </Link>
            .
          </li>
          <li>
            Email us directly at:{' '}
            <a
              href="mailto:support@financedealer.app"
              className="font-mono font-semibold text-khata underline underline-offset-2 hover:text-khata-hover"
            >
              support@financedealer.app
            </a>
          </li>
        </ul>
        <p>
          Whether you want support for specific Nepali banking workflows (e.g. ConnectIPS, eSewa, Khalti), custom tax bracket configurations, or NEPSE broker integrations, let us know!
        </p>
      </div>
    ),
  },
  {
    id: 'is-free',
    category: 'General',
    question: 'Is Finance-Dealer free to use?',
    answer: (
      <div className={PROSE}>
        <p>
          Yes! Finance-Dealer is completely free to use for personal budgeting, income &amp; expense tracking, and NEPSE equity portfolio analytics.
        </p>
      </div>
    ),
  },
];

const CATEGORIES = [
  'All',
  'General',
  'Privacy & Security',
  'NEPSE & Markets',
  'Email Reports & Insights',
  'Support',
] as const;

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'what-is-financedealer': true,
    'data-privacy-security': true,
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const allOpen: Record<string, boolean> = {};
    FAQ_DATA.forEach((item) => {
      allOpen[item.id] = true;
    });
    setOpenItems(allOpen);
  };

  const collapseAll = () => {
    setOpenItems({});
  };

  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch =
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <main className="page bound">
      <span className="binding-label">FAQ</span>
      <div className="space-y-6">
        <header className="masthead">
          <div>
            <h1>Frequently asked questions</h1>
            <p className="masthead-note">
              Answers on data privacy, guest mode, NEPSE live pricing, email reports, and how to
              reach us.
            </p>
          </div>
          <Link href="/" className="link-ink">
            &larr; Dashboard
          </Link>
        </header>

        <div className="space-y-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="text"
              placeholder="Search questions"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="field sm:max-w-xs"
              aria-label="Search questions"
            />
            <div className="flex items-center gap-3">
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="link-ink">
                  Clear
                </button>
              )}
              <button type="button" onClick={expandAll} className="btn btn-sm">
                Expand all
              </button>
              <button type="button" onClick={collapseAll} className="btn btn-sm">
                Collapse all
              </button>
            </div>
          </div>

          <div className="scroll-x no-bar">
            <div className="seg">
              {CATEGORIES.map((category) => {
                const count =
                  category === 'All'
                    ? FAQ_DATA.length
                    : FAQ_DATA.filter((item) => item.category === category).length;
                const isActive = selectedCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    aria-pressed={isActive}
                  >
                    {category} <span className="opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredFaqs.length === 0 ? (
            <div className="empty">
              <p className="empty-mark">[ NO MATCHES ]</p>
              <p className="empty-title">No matching questions found</p>
              <p className="empty-body">
                We couldn&apos;t find any questions matching &quot;{searchQuery}&quot;. Try a
                different search or category.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="btn btn-ink btn-sm mt-3"
              >
                Reset filters
              </button>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = !!openItems[faq.id];

              return (
                <div key={faq.id} className="border border-rule bg-sheet transition-colors">
                  <button
                    type="button"
                    onClick={() => toggleItem(faq.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-start justify-between gap-4 p-3.5 text-left transition-colors hover:bg-sheet-alt sm:p-4"
                  >
                    <div>
                      <span className="tag mb-1.5 inline-block">{faq.category}</span>
                      <h2 className="font-display text-base font-semibold leading-snug text-ink sm:text-lg">
                        {faq.question}
                      </h2>
                    </div>
                    <span className="mt-1 shrink-0 font-mono text-sm text-ink-faint" aria-hidden="true">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-rule p-3.5 sm:p-4">{faq.answer}</div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <section className="sheet">
          <div className="sheet-bd flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-display text-lg font-semibold text-ink">
                Still have questions or found an issue?
              </h3>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-ink-soft">
                We are constantly improving Finance-Dealer. If your question isn&apos;t listed
                above or you&apos;d like to report a bug, send us a note.
              </p>
            </div>
            <Link href="/contact" className="btn btn-ink shrink-0">
              Contact support
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
