/**
 * @file app/settings/page.tsx
 * @description Settings page for managing user preferences including automated financial summary emails.
 * Allows authenticated users to opt in/out of recurring reports, configure schedule frequency (weekly or monthly),
 * and trigger test summary dispatches.
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { EmailFrequency, UserEmailPreferences } from '@/types';

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
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          frequency,
          userId,
        }),
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
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4 sm:p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
              <span className="text-xs px-2.5 py-0.5 font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                Preferences
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Manage your account settings, automated financial summary reports, and notification schedules.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shadow-xs self-start sm:self-auto"
          >
            <span>&larr;</span>
            <span>Dashboard</span>
          </Link>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div
            className={`p-4 rounded-xl text-sm border flex items-center justify-between ${
              message.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            }`}
          >
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="text-xs font-bold underline opacity-70 hover:opacity-100 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Guest Mode Notice */}
        {!userId && authChecked && (
          <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/25 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm shadow-xs">
            <div>
              <strong className="block font-bold">Sign In Required for Automated Reports</strong>
              <span className="text-xs text-amber-800 dark:text-amber-300">
                Automated email summaries require a registered Finance-Dealer account to safely store your notification schedule and email address.
              </span>
            </div>
            <Link
              href="/login"
              className="px-4 py-2 font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs transition self-start sm:self-auto shrink-0 shadow-xs"
            >
              Sign In / Sign Up
            </Link>
          </div>
        )}

        {/* Automated Email Reports Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>📬</span>
                <span>Automated Financial Summary Emails</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Receive recurring email reports summarizing your salary, daily expenses, net savings rate, and NEPSE portfolio performance.
              </p>
            </div>
            {enabled && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                Active
              </span>
            )}
          </div>

          {loading ? (
            <div className="text-xs text-zinc-500 py-4">Loading your preferences...</div>
          ) : (
            <form onSubmit={handleSavePreferences} className="space-y-5">
              {/* Account Email Info */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Notification Recipient Email
                </label>
                <input
                  type="text"
                  disabled
                  value={userEmail || 'Guest Mode (Sign in to configure)'}
                  className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 cursor-not-allowed font-mono"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Reports are dispatched to your authenticated account email address.
                </p>
              </div>

              {/* Opt-in Toggle */}
              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80">
                <div>
                  <div className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Enable Recurring Email Reports
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Toggle automatic summary reports on your selected schedule.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={!userId}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-emerald-500 dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-600 rounded-full"></div>
                </label>
              </div>

              {/* Frequency Selection */}
              {enabled && (
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Report Delivery Frequency
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      className={`flex items-start p-3.5 rounded-xl border cursor-pointer transition-all ${
                        frequency === 'weekly'
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                          : 'border-zinc-200 dark:border-zinc-700/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="frequency"
                        value="weekly"
                        checked={frequency === 'weekly'}
                        onChange={() => setFrequency('weekly')}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="ml-3">
                        <span className="block text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Weekly Digest
                        </span>
                        <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Sent every 7 days with your week-to-date cash flow and stock portfolio updates.
                        </span>
                      </div>
                    </label>

                    <label
                      className={`flex items-start p-3.5 rounded-xl border cursor-pointer transition-all ${
                        frequency === 'monthly'
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                          : 'border-zinc-200 dark:border-zinc-700/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="frequency"
                        value="monthly"
                        checked={frequency === 'monthly'}
                        onChange={() => setFrequency('monthly')}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="ml-3">
                        <span className="block text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Monthly Summary
                        </span>
                        <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Sent every ~30 days with a full monthly breakdown of income, expenses, and asset gains.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Schedule Info */}
              {lastSentAt && (
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Last summary report dispatched:{' '}
                  <strong>{new Date(lastSentAt).toLocaleString()}</strong>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!userId || saving}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 transition shadow-xs cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>

                {userId && (
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={testing}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-50 cursor-pointer"
                  >
                    {testing ? 'Sending Test...' : 'Send Test Email Now'}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Additional Info / Security Reference */}
        <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/60 text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-200">
            Privacy &amp; Security Guarantee
          </h3>
          <p>
            Your financial data is private and secured by PostgreSQL Row-Level Security (RLS). Emails are only dispatched to users who explicitly opt in. You can change your frequency or unsubscribe at any time from this settings page.
          </p>
        </div>
      </div>
    </main>
  );
}
