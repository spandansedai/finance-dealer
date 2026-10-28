/**
 * @file app/api/contact/route.ts
 * @description Delivers contact-form messages to the site owner's inbox via Resend.
 *
 * The destination address is read from the `CONTACT_INBOX` environment variable
 * and never sent to the browser. If it is not configured the route answers 503
 * so the form can say so honestly instead of pretending the message was sent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const SUBJECTS = ['Feedback', 'Bug Report', 'Feature Request', 'Privacy Concern', 'Other'] as const;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export async function POST(request: NextRequest) {
  const inbox = process.env.CONTACT_INBOX;
  if (!inbox) {
    return NextResponse.json(
      { success: false, error: 'The contact form is not set up yet. Please try again later.' },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
  }

  // Honeypot: real visitors never see or fill this field.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ success: true });
  }

  const name = String(body.name ?? '').trim().slice(0, 120);
  const email = String(body.email ?? '').trim().slice(0, 200);
  const message = String(body.message ?? '').trim().slice(0, 5000);
  const subject = SUBJECTS.includes(body.subject as (typeof SUBJECTS)[number])
    ? (body.subject as string)
    : 'Other';

  if (!name || !message || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { success: false, error: 'Please fill in your name, a valid email address and a message.' },
      { status: 400 }
    );
  }

  const result = await sendEmail({
    to: inbox,
    replyTo: email,
    subject: `[FinanceDealer] ${subject} from ${name}`,
    text: `From: ${name} <${email}>\nSubject: ${subject}\n\n${message}`,
    html: `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;<br><strong>Subject:</strong> ${escapeHtml(subject)}</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: 'Your message could not be delivered. Please try again in a moment.' },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
