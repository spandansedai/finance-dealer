/**
 * @file app/contact/page.tsx
 * @description Contact & Support page with feedback form and frequently asked questions.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Feedback');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    // Simulate clean submission
    setSubmitted(true);
  };

  const faqs = [
    {
      q: 'What is Guest Mode and is my data saved?',
      a: 'Guest Mode allows you to test FinanceDealer instantly without creating an account. All transactions and stock holdings in Guest Mode exist strictly in your browser RAM. Data is never sent to our servers and resets when you refresh the page. Sign in to save your data permanently to encrypted Supabase storage.',
    },
    {
      q: 'How frequently are NEPSE market prices updated?',
      a: 'FinanceDealer connects to market aggregators to fetch recent NEPSE closing and live trading prices with an active 3-minute poll cycle during market hours. You can also manually click the refresh button or override any fallback price directly in your portfolio table.',
    },
    {
      q: 'How do automated email reports work?',
      a: 'If you have an account, you can enable weekly or monthly summary digests in Settings. A scheduled cron job compiles your cash flow totals, savings rate, and portfolio performance and sends a beautiful, private summary report via Resend.',
    },
    {
      q: 'Does FinanceDealer charge any subscription fees?',
      a: 'FinanceDealer is currently free to use for personal budgeting, expense logging, and NEPSE portfolio tracking.',
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4 sm:p-8 md:p-12">
      <div className="max-w-4xl mx-auto space-y-10">
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
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Contact &amp; Support
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Have questions, feedback, or need technical assistance? We are here to help.
          </p>
        </div>

        {/* Grid: Feedback Form + Contact Info */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Contact / Feedback Form */}
          <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Send Feedback or Inquiry
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Submit a feature suggestion, report an issue, or ask a question.
            </p>

            {submitted ? (
              <div className="p-6 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-center space-y-2">
                <span className="text-3xl">✉️</span>
                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Message Sent Successfully
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 max-w-sm mx-auto">
                  Thank you for reaching out! We value your feedback and will review your note promptly.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setName('');
                    setEmail('');
                    setMessage('');
                  }}
                  className="mt-3 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition cursor-pointer"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Your Name *
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    placeholder="e.g. Aarav Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Email Address *
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="e.g. aarav@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Subject
                  </label>
                  <select
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
                  >
                    <option value="Feedback">Product Feedback</option>
                    <option value="Bug Report">Bug Report</option>
                    <option value="Feature Request">Feature Request (NEPSE / Taxes)</option>
                    <option value="Privacy Concern">Privacy or Account Query</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={4}
                    placeholder="Describe your inquiry or feedback..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-xs cursor-pointer active:scale-98"
                >
                  Submit Note
                </button>
              </form>
            )}
          </div>

          {/* Contact Details & Info */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-xs">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Direct Channels
              </h3>
              <div className="space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                <p>
                  📍 <strong>Location:</strong> Kathmandu, Nepal
                </p>
                <p>
                  📧 <strong>Email:</strong> support@financedealer.app
                </p>
                <p>
                  ⚡ <strong>Platform Version:</strong> v1.3 Production
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-2 text-xs text-emerald-900 dark:text-emerald-300">
              <p className="font-bold">🇳🇵 Built with Local Context</p>
              <p>
                Have ideas for specific Nepali banking integrations, ConnectIPS workflows, or NEPSE brokers? Send us a suggestion!
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <section className="space-y-5 pt-4">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-xs"
              >
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {faq.q}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
