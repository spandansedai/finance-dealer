/**
 * @file app/login/page.tsx
 * @description Authentication page for Finance-Dealer.
 * Handles user sign-in and sign-up flows using Supabase Auth.
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logomark } from '@/components/Logomark';
import { supabase } from '@/lib/supabase';
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardSubtitle,
  CardTitle,
  FieldHint,
  Input,
  Label,
  Notice,
  PageShell,
} from '@/components/ui';

/**
 * Login & Registration Page component.
 */
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Handles the submission of the auth form.
   * Routes to Supabase signInWithPassword or signUp depending on the current mode.
   * 
   * @param e - Form submission event.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    if (mode === 'signin') {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push('/expenses');
      router.refresh();
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Check for email enumeration protection where user identities are empty
      // This happens if the user already exists in Supabase.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError('An account with this email already exists. Please sign in instead.');
        setLoading(false);
        return;
      }

      // If email confirmation is required by project settings, data.session will be null.
      if (data.session) {
        router.push('/expenses');
        router.refresh();
      } else {
        setInfo('Account created. Check your email to confirm before signing in.');
        setMode('signin');
      }
    }

    setLoading(false);
  };

  return (
    <PageShell>
      <div className="grid grid-cols-1 items-center gap-8 lg:min-h-[calc(100vh-12rem)] lg:grid-cols-2">
        {/* What you get */}
        <section className="hidden space-y-5 lg:block">
          <Logomark size={44} />
          <p className="page-title">
            Your rupees, your lakhs,
            <br />
            your NEPSE scrips, in one book.
          </p>
          <p className="masthead-note">
            Sign in to keep your ledger, accounts, Dollar Card spending, salary plan and floor
            sheet safely across devices.
          </p>
          <ul className="space-y-2.5 text-body text-ink-soft">
            {[
              'Records stored behind Row-Level Security, only ever visible to you',
              'Live NEPSE prices and the NRB buying rate for Dollar Card entries',
              'Optional summary emails on your own schedule',
            ].map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-khata" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </section>

        {/* Form */}
        <Card as="section" className="mx-auto w-full max-w-sm">
          <CardHeader>
            <div>
              <CardTitle as="h1">{mode === 'signin' ? 'Sign in' : 'Create an account'}</CardTitle>
              <CardSubtitle>
                {mode === 'signin'
                  ? 'Welcome back. Open your book where you left it.'
                  : 'Free, and takes less than a minute.'}
              </CardSubtitle>
            </div>
          </CardHeader>

          <CardBody className="space-y-4">
            <div className="seg flex w-full" role="group" aria-label="Sign in or sign up">
              {(['signin', 'signup'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className="flex-1"
                  aria-pressed={mode === value}
                  disabled={loading}
                  onClick={() => {
                    setMode(value);
                    setError(null);
                    setInfo(null);
                  }}
                >
                  {value === 'signin' ? 'Sign in' : 'Sign up'}
                </button>
              ))}
            </div>

            {error && (
              <Notice tone="loss" role="alert">
                {error}
              </Notice>
            )}

            {info && (
              <Notice tone="gain" role="status">
                {info}
              </Notice>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength={6}
                />
                {mode === 'signup' && <FieldHint>At least 6 characters.</FieldHint>}
              </div>

              <Button variant="primary" size="lg" block type="submit" disabled={loading}>
                {loading ? 'Please wait\u2026' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </Button>
            </form>
          </CardBody>

          <CardFooter className="text-center">
            Just looking?{' '}
            <ButtonLink variant="link" size="sm" href="/">
              Explore the sample book
            </ButtonLink>{' '}
            without an account.
          </CardFooter>
        </Card>
      </div>
    </PageShell>
  );
}
