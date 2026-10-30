/**
 * @file app/settings/page.tsx
 * @description Settings page for managing user preferences including automated financial summary emails.
 * Allows authenticated users to opt in/out of recurring reports, configure schedule frequency (weekly or monthly),
 * and trigger test summary dispatches.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { EmailFrequency, UserEmailPreferences } from '@/types';
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CardSubtitle,
  CardTitle,
  FieldHint,
  Input,
  Label,
  Notice,
  PageHeader,
  PageShell,
  Stamp,
  Tag,
} from '@/components/ui';

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Preference state
  const [enabled, setEnabled] = useState<boolean>(false);
  const [frequency, setFrequency] = useState<EmailFrequency>('weekly');
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load user auth and preferences
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;

      const currentUserId = data.user?.id ?? null;
      const currentUserEmail = data.user?.email ?? null;

      setUserId(currentUserId);
      setUserEmail(currentUserEmail);
      setAuthChecked(true);

      if (currentUserId) {
        setLoading(true);
        const { data: prefData, error } = await supabase
          .from('user_email_preferences')
          .select('*')
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (isMounted) {
          if (prefData) {
            setEnabled(prefData.enabled ?? false);
            setFrequency((prefData.frequency as EmailFrequency) || 'weekly');
            setLastSentAt(prefData.last_sent_at ?? null);
          }
          setLoading(false);
        }
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUserId = session?.user?.id ?? null;
      const currentUserEmail = session?.user?.email ?? null;

      setUserId(currentUserId);
      setUserEmail(currentUserEmail);

      if (currentUserId) {
        const { data: prefData } = await supabase
          .from('user_email_preferences')
          .select('*')
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (prefData) {
          setEnabled(prefData.enabled ?? false);
          setFrequency((prefData.frequency as EmailFrequency) || 'weekly');
          setLastSentAt(prefData.last_sent_at ?? null);
        }
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !userEmail) return;

    setSaving(true);
    setMessage(null);

    try {
      const payload: Partial<UserEmailPreferences> = {
        userId,
        email: userEmail,
        enabled,
        frequency,
        updatedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_email_preferences')
        .upsert(
          {
            user_id: userId,
            email: userEmail,
            enabled,
            frequency,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        throw new Error(error.message);
      }

      setMessage({
        type: 'success',
        text: 'Notification preferences saved successfully!',
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to save preferences. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!userEmail) return;

    setTesting(true);
    setMessage(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;
      if (!accessToken) throw new Error('Please sign in again.');

      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ frequency }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send test email');
      }

      setMessage({
        type: 'success',
        text: `Test email sent to ${userEmail}! Check your inbox or spam folder.`,
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Could not send test email.',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <PageShell width="narrow">
      <PageHeader
        title="Settings"
        back={{ href: '/', label: 'Dashboard' }}
        description={
          <>
            Manage your account and the automated summary emails that report on your cash flow
            and NEPSE portfolio.
          </>
        }
        actions={userEmail && <Stamp className="max-w-full truncate" label="Signed in" value={userEmail} />}
      />

      {/* Feedback Alert */}
      {message && (
        <Notice tone={message.type === 'success' ? 'gain' : 'loss'} role="status">
          <span>{message.text}</span>
          <Button variant="link" type="button" onClick={() => setMessage(null)}>
            Dismiss
          </Button>
        </Notice>
      )}

      {/* Guest Mode Notice */}
      {!userId && authChecked && (
        <Notice tone="warn">
          <span>
            <strong>Sign in to set up summary emails.</strong> They need an account to store
            your schedule and the address to send them to.
          </span>
          <ButtonLink variant="warn" size="sm" href="/login">
            Sign in or create an account
          </ButtonLink>
        </Notice>
      )}

      {/* Automated Email Reports */}
      <Card as="section">
        <CardHeader>
          <div>
            <CardTitle>Summary emails</CardTitle>
            <CardSubtitle>
              Recurring reports on your income, expenses, savings rate and NEPSE portfolio.
            </CardSubtitle>
          </div>
          {enabled && (
            <Tag tone="gain">
              <span className="pulse-live inline-block h-1.5 w-1.5 bg-current" aria-hidden="true" />
              Active
            </Tag>
          )}
        </CardHeader>

        <CardBody>
          {loading ? (
            <div className="space-y-3" aria-busy="true">
              <span className="skeleton h-9 w-full" />
              <span className="skeleton h-16 w-full" />
              <span className="skeleton h-9 w-40" />
            </div>
          ) : (
            <form onSubmit={handleSavePreferences} className="space-y-5">
              <div>
                <Label htmlFor="recipient">
                  Sent to
                </Label>
                <Input
                  id="recipient"
                  type="text"
                  disabled
                  value={userEmail || 'Sign in first'}
                  className="font-mono"
                />
                <FieldHint>Reports always go to the email address you signed in with.</FieldHint>
              </div>

              <label className="choice items-center justify-between">
                <span>
                  <span className="block text-body font-semibold text-ink">
                    Send recurring reports
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    Turn automatic summaries on or off for the schedule below.
                  </span>
                </span>
                <span className="toggle">
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={!userId}
                    onChange={(e) => setEnabled(e.target.checked)}
                    aria-label="Send recurring reports"
                  />
                  <span className="toggle-track" aria-hidden="true" />
                </span>
              </label>

              {enabled && (
                <fieldset className="space-y-2">
                  <Label as="legend">How often</Label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="choice">
                      <input
                        type="radio"
                        name="frequency"
                        value="weekly"
                        checked={frequency === 'weekly'}
                        onChange={() => setFrequency('weekly')}
                      />
                      <span>
                        <span className="block text-body font-semibold text-ink">Weekly digest</span>
                        <span className="mt-0.5 block text-xs text-ink-soft">
                          Every 7 days, covering the last 7 days of entries plus your portfolio.
                        </span>
                      </span>
                    </label>
                    <label className="choice">
                      <input
                        type="radio"
                        name="frequency"
                        value="monthly"
                        checked={frequency === 'monthly'}
                        onChange={() => setFrequency('monthly')}
                      />
                      <span>
                        <span className="block text-body font-semibold text-ink">Monthly summary</span>
                        <span className="mt-0.5 block text-xs text-ink-soft">
                          On the 1st of each month, covering the whole previous month.
                        </span>
                      </span>
                    </label>
                  </div>
                </fieldset>
              )}

              {lastSentAt && (
                <p className="text-xs text-ink-soft">
                  Last report sent{' '}
                  <span className="fig fig-sm">{new Date(lastSentAt).toLocaleString()}</span>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
                <Button variant="primary" type="submit" disabled={!userId || saving}>
                  {saving ? 'Saving\u2026' : 'Save preferences'}
                </Button>
                {userId && (
                  <Button type="button" onClick={handleSendTestEmail} disabled={testing}>
                    {testing ? 'Sending test\u2026' : 'Send a test email now'}
                  </Button>
                )}
              </div>
            </form>
          )}
        </CardBody>
      </Card>

      <Card as="section">
        <CardHeader>
          <CardTitle>Privacy &amp; security</CardTitle>
          <ButtonLink variant="link" href="/privacy">
            Privacy policy
          </ButtonLink>
        </CardHeader>
        <CardBody>
          <p className="text-body leading-relaxed text-ink-soft">
            Your financial data is private and protected by PostgreSQL Row-Level Security.
            Emails are only sent to people who opt in, and you can change the schedule or turn
            them off here at any time.
          </p>
        </CardBody>
      </Card>

    </PageShell>
  );
}
