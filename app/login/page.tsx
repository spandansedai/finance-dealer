'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * Combined sign in / sign up page (single form, toggled via `mode`).
 * Handles Supabase auth directly: signInWithPassword for sign in, and signUp
 * for sign up, including the case where Supabase requires email confirmation
 * before a session exists.
 */
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError('An account with this email already exists. Please sign in instead.');
        setLoading(false);
        return;
      }

      // If email confirmation is required by the Supabase project settings,
      // there will be no active session yet after sign up.
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
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {mode === 'signin'
              ? 'Sign in to access your Finance-Dealer data.'
              : 'Create an account to start tracking your finances.'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-300">
            {error}
          </div>
        )}

        {info && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={loading}
              required
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 disabled:opacity-50 transition"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              required
              minLength={6}
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 disabled:opacity-50 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 cursor-pointer shadow-xs transition-all active:scale-[0.99]"
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-center">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
              setInfo(null);
            }}
            className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline transition cursor-pointer disabled:opacity-50"
          >
            {mode === 'signin'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </main>
  );
}
