/**
 * @file app/contact/page.tsx
 * @description Contact & Support page with a feedback form (delivered by
 * /api/contact) and short answers to common questions.
 */

'use client';

import React, { useState } from 'react';
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CardSubtitle,
  CardTitle,
  EmptyBody,
  EmptyMark,
  EmptyState,
  EmptyTitle,
  Heading,
  Input,
  Label,
  LinkTile,
  Notice,
  PageHeader,
  PageShell,
  Select,
  Textarea,
} from '@/components/ui';

const FAQS = [
  {
    q: 'What is Guest Mode and is my data saved?',
    a: 'Guest Mode lets you try FinanceDealer instantly without an account. It opens with a sample book you can change freely. Everything stays in your browser memory, is never sent to our servers, and resets when you refresh. Sign in to keep your own records in Supabase.',
  },
  {
    q: 'How frequently are NEPSE market prices updated?',
    a: 'The floor sheet fetches recent NEPSE prices when it opens and every 3 minutes while it stays open. You can also refresh manually or override any fallback price directly in the portfolio table.',
  },
  {
    q: 'How do automated email reports work?',
    a: 'With an account, you can turn on summary emails in Settings. A scheduled job compiles your cash flow totals, savings rate and portfolio performance and sends a private summary via Resend.',
  },
  {
    q: 'Does FinanceDealer charge any subscription fees?',
    a: 'No. FinanceDealer is free to use for personal budgeting, expense logging, and NEPSE portfolio tracking.',
  },
];

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Feedback');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    setSending(true);
    setError(null);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message, website }),
      });
      const data = (await response.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Your message could not be sent. Please try again.');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your message could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setName('');
    setEmail('');
    setMessage('');
    setSubject('Feedback');
  };

  return (
    <PageShell width="narrow">
      <PageHeader
        title="Contact & support"
        back={{ href: '/', label: 'Dashboard' }}
        description={
          <>
            Questions, feedback, a bug, or an idea for a Nepali bank or broker integration?
            Send a note and it lands straight in the developer&rsquo;s inbox.
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <Card as="section" className="lg:col-span-7">
          <CardHeader>
            <div>
              <CardTitle>Send a message</CardTitle>
              <CardSubtitle>Every field except subject is required.</CardSubtitle>
            </div>
          </CardHeader>

          <CardBody>
            {submitted ? (
              <EmptyState>
                <EmptyMark>SENT</EmptyMark>
                <EmptyTitle>Thanks, your message is on its way</EmptyTitle>
                <EmptyBody>
                  Replies go to <span className="fig fig-sm">{email}</span>, so keep an eye on
                  that inbox (and its spam folder).
                </EmptyBody>
                <Button size="sm" type="button" onClick={resetForm} className="mt-4">
                  Send another message
                </Button>
              </EmptyState>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Notice tone="loss" role="alert">
                    {error}
                  </Notice>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">
                      Your name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      required
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={sending}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={sending}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject">
                    Subject
                  </Label>
                  <Select
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={sending}
                  >
                    <option value="Feedback">Product feedback</option>
                    <option value="Bug Report">Bug report</option>
                    <option value="Feature Request">Feature request (NEPSE / taxes)</option>
                    <option value="Privacy Concern">Privacy or account query</option>
                    <option value="Other">Other</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="message">
                    Message
                  </Label>
                  <Textarea
                    id="message"
                    required
                    rows={5}
                    maxLength={5000}
                    placeholder="What would you like to tell us?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={sending}
                  />
                </div>

                {/* Honeypot for bots; hidden from people and assistive tech. */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input
                    id="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <Button variant="primary" size="lg" block type="submit" disabled={sending}>
                  {sending ? 'Sending…' : 'Send message'}
                </Button>
              </form>
            )}
          </CardBody>
        </Card>

        <aside className="space-y-4 lg:col-span-5">
          <LinkTile href="/faq" icon="?" title="Browse the FAQ" titleAs="span">
            Answers on privacy, Guest Mode, NEPSE prices, Dollar Card rates and email reports.
          </LinkTile>
          <LinkTile href="/privacy" icon="RLS" title="Privacy & your data" titleAs="span">
            What is stored, where it lives, and how to ask for your account to be deleted.
          </LinkTile>
          <Notice tone="brand" className="block">
            <p className="font-semibold">Built for Nepal</p>
            <p className="mt-1 text-ink-soft">
              Ideas for ConnectIPS workflows, specific banks or NEPSE brokers are especially
              welcome.
            </p>
          </Notice>
        </aside>
      </div>

      <Card as="section">
        <CardHeader>
          <CardTitle>Quick answers</CardTitle>
          <ButtonLink variant="link" href="/faq">
            All questions
          </ButtonLink>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2">
          {FAQS.map((faq, idx) => (
            <CardBody
              key={faq.q}
              className={`space-y-1.5 border-rule ${idx < FAQS.length - 1 ? 'border-b' : ''} ${
                idx >= FAQS.length - 2 ? 'md:border-b-0' : ''
              } ${idx % 2 === 0 ? 'md:border-r' : ''}`}
            >
              <Heading as="h3" size="sm">{faq.q}</Heading>
              <p className="text-body leading-relaxed text-ink-soft">{faq.a}</p>
            </CardBody>
          ))}
        </div>
      </Card>

    </PageShell>
  );
}
