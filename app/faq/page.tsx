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

const FAQ_DATA: FAQItem[] = [
  {
    id: 'what-is-financedealer',
    category: 'General',
    question: 'What is Finance-Dealer and who is it for?',
    answer: (
      <div className="space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
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
      <div className="space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
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
      <div className="space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        <p>
          Guest Mode gives you instant, frictionless access to test all core features of Finance-Dealer without needing to create an account or provide an email address.
        </p>
        <p>
          In Guest Mode, all income, expense entries, and stock holdings exist <strong>strictly in your browser&apos;s local volatile memory (RAM)</strong>. Zero data is ever sent to or stored on our cloud servers. Because of this ephemeral nature, <strong>your guest data will automatically reset when you refresh the page or close your browser tab</strong>.
        </p>
        <p>
          To permanently store and access your financial ledgers across multiple devices, simply{' '}
          <Link href="/login" className="font-semibold text-emerald-600 dark:text-emerald-400 underline hover:opacity-80">
            Sign In or Create a Free Account
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
      <div className="space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        <p>
          Finance-Dealer connects to live market price aggregators to fetch recent closing and active trading prices for Nepal Stock Exchange (NEPSE) listed securities. Live updates actively poll during regular trading hours (<strong>11:00 AM to 3:00 PM NPT, Sunday through Thursday</strong>).
        </p>
        <p>
          If market prices ever appear stale, if the NEPSE trading floor is closed, or if upstream data sources experience temporary network downtime:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-1">
          <li>
            Click the <strong>&quot;Refresh Prices&quot;</strong> button in your{' '}
            <Link href="/portfolio" className="font-semibold text-emerald-600 dark:text-emerald-400 underline hover:opacity-80">
              NEPSE Portfolio
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
      <div className="space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        <p>
          Automated email reports provide a scheduled digest of your financial health delivered directly to your inbox via Resend. The summary includes your total monthly income, expenses, net savings rate, and an overview of your NEPSE equity portfolio performance.
        </p>
        <p>
          <strong>To configure, opt in, or opt out:</strong>
        </p>
        <ol className="list-decimal list-inside space-y-1 pl-1">
          <li>
            Navigate to the{' '}
            <Link href="/settings" className="font-semibold text-emerald-600 dark:text-emerald-400 underline hover:opacity-80">
              Settings Page
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
      <div className="space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        <p>
          The <strong>Insights Engine</strong> on your Dashboard is a deterministic mathematical analysis tool. It processes your logged income, expense categories, and stock holdings using rule-based calculations to surface factual observations — such as flagging month-over-month spending increases, calculating your savings rate benchmark against recommended personal finance standards, or identifying high concentration risk in single NEPSE scrips.
        </p>
        <p className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200">
          <strong>Important Notice:</strong> Insights are strictly mathematical observations and organizational aids. They do <strong>NOT</strong> constitute certified financial, tax, legal, or investment advice. Finance-Dealer does not provide stock buy/sell recommendations or financial guarantees. Always conduct your own research and consult licensed professionals before making investment decisions.
        </p>
      </div>
    ),
  },
  {
    id: 'bug-feedback',
    category: 'Support',
    question: 'How do I report a bug, suggest a feature, or give feedback?',
    answer: (
      <div className="space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        <p>
          We actively welcome your feedback, bug reports, and feature requests to make Finance-Dealer the best personal finance tool for Nepal!
        </p>
        <p>
          You can reach us through any of the following channels:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-1">
          <li>
            Submit a note through the built-in{' '}
            <Link href="/contact" className="font-semibold text-emerald-600 dark:text-emerald-400 underline hover:opacity-80">
              Contact &amp; Support Form
            </Link>
            .
          </li>
          <li>
            Email us directly at:{' '}
            <a
              href="mailto:support@financedealer.app"
              className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 underline hover:opacity-80"
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
      <div className="space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
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
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4 sm:p-8 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8 sm:space-y-10">
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
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 sm:pb-8 space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-sm shadow-xs">
              FD
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Frequently Asked Questions
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 font-semibold border border-emerald-300 dark:border-emerald-800">
              Knowledge Base
            </span>
          </div>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-3xl leading-relaxed">
            Find answers to common questions about Finance-Dealer, NEPSE portfolio tracking, Supabase data security, guest mode, and automated financial reports.
          </p>
        </div>

        {/* Filter Controls & Search */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 text-sm">
                🔍
              </div>
              <input
                type="text"
                placeholder="Search questions (e.g. Supabase, NEPSE, Guest)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Expand / Collapse All */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={expandAll}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shadow-xs"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shadow-xs"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-zinc-100 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span>{category}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-emerald-700/80 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3.5">
          {filteredFaqs.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="text-3xl">🔍</div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-800 dark:text-zinc-200">
                No matching questions found
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                We couldn&apos;t find any questions matching &quot;{searchQuery}&quot;. Try adjusting your search query or select another category.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="mt-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition cursor-pointer"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = !!openItems[faq.id];

              return (
                <div
                  key={faq.id}
                  className={`border rounded-2xl transition-all overflow-hidden ${
                    isOpen
                      ? 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 shadow-xs'
                      : 'bg-white/80 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(faq.id)}
                    aria-expanded={isOpen}
                    className="w-full text-left p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          {faq.category}
                        </span>
                      </div>
                      <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {faq.question}
                      </h2>
                    </div>
                    <span
                      className={`shrink-0 mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : ''
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 sm:pb-6 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Contact & Support Help Box */}
        <section className="p-6 sm:p-8 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>💬</span>
                <span>Still have questions or found an issue?</span>
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-xl">
                We are constantly enhancing Finance-Dealer. If your question is not listed above or you would like to report a bug, drop us a message!
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                href="/contact"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition shadow-xs"
              >
                Contact Support →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
